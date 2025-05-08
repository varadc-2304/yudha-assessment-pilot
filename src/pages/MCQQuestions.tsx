
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Plus, Edit, Trash2 } from "lucide-react";
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
import { MCQQuestion } from "@/types/assessment";

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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<MCQQuestion | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch MCQ questions with their options
  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['mcq-questions'],
    queryFn: async () => {
      const { data: mcqQuestions, error: questionsError } = await supabase
        .from('mcq_questions')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (questionsError) throw questionsError;

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
      const assessmentIds = [...new Set(mcqQuestions.map(q => q.assessment_id))];
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
    }
  });

  // Delete MCQ question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete the MCQ question (cascade will delete options)
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

  const filteredQuestions = questions?.filter((question) =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">MCQ Questions</h1>
        <Button className="bg-yudha-600 hover:bg-yudha-700">
          <Plus className="mr-2 h-4 w-4" />
          Add MCQ Question
        </Button>
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
                    <Button variant="outline" size="sm">
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
