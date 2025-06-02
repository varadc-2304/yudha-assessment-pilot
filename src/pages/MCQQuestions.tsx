import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Plus, Edit, Trash2, Database } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MCQQuestion } from "@/types/assessment";
import CreateMCQForm from "@/components/mcq/CreateMCQForm";
import EditMCQForm from "@/components/mcq/EditMCQForm";
import MCQQuestionBankSelector from "@/components/mcq/MCQQuestionBankSelector";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type DatabaseMCQQuestion = {
  id: string;
  title: string;
  description: string;
  assessment_id: string;
  marks: number;
  order_index: number;
  image_url: string | null;
  created_at: string;
  mcq_options: Array<{
    id: string;
    text: string;
    is_correct: boolean;
    order_index: number;
  }>;
};

const MCQQuestions: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<MCQQuestion | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");

  // Fetch all organization assessments for dropdown - now includes all organization admins
  const { data: orgAssessments } = useQuery({
    queryKey: ['org-assessments-for-questions', user?.organization],
    queryFn: async () => {
      // Get all users with admin role in the same organization
      const { data: adminUsers, error: adminError } = await supabase
        .from('auth')
        .select('id')
        .eq('role', 'admin')
        .eq('organization', user?.organization);
      
      if (adminError) throw adminError;
      
      if (!adminUsers || adminUsers.length === 0) {
        return [];
      }
      
      const adminIds = adminUsers.map(admin => admin.id);
      
      // Get assessments created by any admin in the organization
      const { data, error } = await supabase
        .from('assessments')
        .select('id, name, code, created_by')
        .in('created_by', adminIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization
  });

  // Fetch MCQ questions with their options - now includes all organization assessments
  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['mcq-questions', user?.organization],
    queryFn: async () => {
      // Get all users with admin role in the same organization
      const { data: adminUsers, error: adminError } = await supabase
        .from('auth')
        .select('id')
        .eq('role', 'admin')
        .eq('organization', user?.organization);
      
      if (adminError) throw adminError;
      
      if (!adminUsers || adminUsers.length === 0) {
        return [];
      }
      
      const adminIds = adminUsers.map(admin => admin.id);
      
      // Get all assessments created by admins in the organization
      const { data: orgAssessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select('id')
        .in('created_by', adminIds);
      
      if (assessmentsError) throw assessmentsError;
      
      if (!orgAssessments || orgAssessments.length === 0) {
        return [];
      }
      
      const assessmentIds = orgAssessments.map(a => a.id);
      
      // Now get MCQ questions for these assessments
      const { data: mcqQuestions, error: questionsError } = await supabase
        .from('mcq_questions')
        .select('*')
        .in('assessment_id', assessmentIds)
        .order('order_index', { ascending: true });
      
      if (questionsError) throw questionsError;
      
      if (!mcqQuestions || mcqQuestions.length === 0) {
        return [];
      }

      // For each question, fetch its options
      const questionsWithOptions = await Promise.all(
        mcqQuestions.map(async (question) => {
          const { data: options, error: optionsError } = await supabase
            .from('mcq_options')
            .select('*')
            .eq('mcq_question_id', question.id)
            .order('order_index', { ascending: true });
          
          if (optionsError) throw optionsError;
          
          return {
            ...question,
            mcq_options: options
          };
        })
      );

      // Also fetch assessment names to display
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, name, code')
        .in('id', assessmentIds);
      
      const assessmentMap = new Map();
      if (assessments) {
        assessments.forEach(a => assessmentMap.set(a.id, { name: a.name, code: a.code }));
      }

      // Map database questions to the format expected by the UI
      return questionsWithOptions.map((q: DatabaseMCQQuestion) => ({
        id: q.id,
        type: "mcq" as const,
        question: q.title,
        description: q.description,
        marks: q.marks,
        assessment: assessmentMap.get(q.assessment_id) || { name: 'Unknown', code: '' },
        assessmentId: q.assessment_id,
        imageUrl: q.image_url,
        options: q.mcq_options.map(o => ({
          id: o.id,
          text: o.text,
          isCorrect: o.is_correct
        }))
      }));
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization
  });

  // Delete MCQ question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mcq_questions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      toast({
        title: "Question deleted",
        description: "The question has been successfully deleted."
      });
      queryClient.invalidateQueries({ queryKey: ['mcq-questions'] });
    },
    onError: (err: any) => {
      console.error("Error deleting question:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete question",
        variant: "destructive"
      });
    }
  });

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleDelete = (id: string) => {
    deleteQuestionMutation.mutate(id);
  };

  const handleEdit = (question: MCQQuestion) => {
    setSelectedQuestion(question);
    setShowEditForm(true);
  };

  const handleAddFromBank = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setShowBankSelector(true);
  };

  const filteredQuestions = questions?.filter((question) =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get unique assessments for the dropdown
  const uniqueAssessments = Array.from(
    new Map(questions?.map(q => [q.assessmentId, q.assessment])).entries()
  ).map(([id, assessment]) => ({ id, ...assessment }));

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading questions: {(error as any).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['mcq-questions'] })} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // If create form is shown, render the form component
  if (showCreateForm) {
    return <CreateMCQForm />;
  }

  // If edit form is shown, render the edit form component
  if (showEditForm && selectedQuestion) {
    return (
      <EditMCQForm 
        questionId={selectedQuestion.id} 
        onCancel={() => {
          setShowEditForm(false);
          setSelectedQuestion(null);
        }} 
      />
    );
  }

  // If bank selector is shown, render the bank selector component
  if (showBankSelector && selectedAssessmentId) {
    return (
      <MCQQuestionBankSelector 
        assessmentId={selectedAssessmentId}
        onCancel={() => {
          setShowBankSelector(false);
          setSelectedAssessmentId("");
        }} 
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">MCQ Questions</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-yudha-600 hover:bg-yudha-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Question
            </DropdownMenuItem>
            {orgAssessments && orgAssessments.length > 0 && (
              <>
                <DropdownMenuItem disabled className="text-xs text-gray-500">
                  Add from Question Bank:
                </DropdownMenuItem>
                {orgAssessments.map((assessment) => (
                  <DropdownMenuItem 
                    key={assessment.id} 
                    onClick={() => handleAddFromBank(assessment.id)}
                    className="pl-6"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    {assessment.name} ({assessment.code})
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Search Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((question) => (
              <Card key={question.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        <span className="mr-2">Q:</span>
                        {question.question}
                      </CardTitle>
                      {question.assessment && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Assessment: {question.assessment.name} ({question.assessment.code})
                        </p>
                      )}
                    </div>
                    <span className="bg-yudha-100 text-yudha-800 text-xs px-2 py-1 rounded">
                      {question.marks} marks
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {question.description && (
                    <p className="text-gray-700 mb-4">{question.description}</p>
                  )}
                  {question.imageUrl && (
                    <div className="mb-4">
                      <img 
                        src={question.imageUrl} 
                        alt={question.question}
                        className="max-w-md rounded-md shadow-sm border" 
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.options.map((option) => (
                      <div 
                        key={option.id} 
                        className={`
                          p-3 rounded-md border flex items-start
                          ${option.isCorrect ? "border-green-400 bg-green-50" : "border-gray-200"}
                        `}
                      >
                        {option.isCorrect && (
                          <Check className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        )}
                        <span>{option.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(question)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        setSelectedQuestion(question);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-lg text-gray-500">No questions found.</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedQuestion && handleDelete(selectedQuestion.id)}
              disabled={deleteQuestionMutation.isPending}
            >
              {deleteQuestionMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCQQuestions;
