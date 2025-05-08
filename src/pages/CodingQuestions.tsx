
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Code, Plus, Edit, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { CodingQuestion } from "@/types/assessment";
import CreateCodingForm from "@/components/coding/CreateCodingForm";
import EditCodingForm from "@/components/coding/EditCodingForm";

type DatabaseCodingQuestion = {
  id: string;
  title: string;
  description: string;
  assessment_id: string;
  marks: number;
  order_index: number;
  image_url: string | null;
  created_at: string;
  coding_languages: Array<{
    id: string;
    coding_lang: string;
    solution_template: string;
  }>;
  coding_examples: Array<{
    id: string;
    input: string;
    output: string;
    explanation: string;
    order_index: number;
  }>;
  test_cases: Array<{
    id: string;
    input: string;
    output: string;
    marks: number;
    is_hidden: boolean;
    order_index: number;
  }>;
};

const CodingQuestions: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Fetch coding questions with their related data
  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['coding-questions'],
    queryFn: async () => {
      const { data: codingQuestions, error: questionsError } = await supabase
        .from('coding_questions')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (questionsError) throw questionsError;

      // For each question, fetch its related data
      const questionsWithRelatedData = await Promise.all(
        codingQuestions.map(async (question) => {
          // Fetch coding languages
          const { data: languages, error: langsError } = await supabase
            .from('coding_languages')
            .select('*')
            .eq('coding_question_id', question.id);
          
          if (langsError) throw langsError;
          
          // Fetch examples
          const { data: examples, error: examplesError } = await supabase
            .from('coding_examples')
            .select('*')
            .eq('coding_question_id', question.id)
            .order('order_index', { ascending: true });
          
          if (examplesError) throw examplesError;

          // Fetch test cases
          const { data: testCases, error: testCasesError } = await supabase
            .from('test_cases')
            .select('*')
            .eq('coding_question_id', question.id)
            .order('order_index', { ascending: true });
          
          if (testCasesError) throw testCasesError;
          
          return {
            ...question,
            coding_languages: languages || [],
            coding_examples: examples || [],
            test_cases: testCases || []
          };
        })
      );

      // Also fetch assessment names to display
      const assessmentIds = [...new Set(codingQuestions.map(q => q.assessment_id))];
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, name, code')
        .in('id', assessmentIds);
      
      const assessmentMap = new Map();
      if (assessments) {
        assessments.forEach(a => assessmentMap.set(a.id, { name: a.name, code: a.code }));
      }

      // Calculate total marks
      const calculateTotalMarks = (testCases: any[]) => {
        return testCases.reduce((sum, testCase) => sum + testCase.marks, 0);
      };

      // Map database questions to the format expected by the UI
      return questionsWithRelatedData.map((q: DatabaseCodingQuestion) => {
        const totalMarks = calculateTotalMarks(q.test_cases);
        const languages = q.coding_languages.map(lang => lang.coding_lang);
        const primaryLanguage = languages.length > 0 ? languages[0] : 'python';
          
        return {
          id: q.id,
          type: "coding" as const,
          question: q.title,
          description: q.description,
          marks: totalMarks,
          language: primaryLanguage as any,
          supportedLanguages: languages,
          assessment: assessmentMap.get(q.assessment_id) || { name: 'Unknown', code: '' },
          assessmentId: q.assessment_id,
          imageUrl: q.image_url,
          examples: q.coding_examples.map(e => ({
            id: e.id,
            input: e.input,
            output: e.output,
            explanation: e.explanation,
            orderIndex: e.order_index
          })),
          testCases: q.test_cases.map(t => ({
            id: t.id,
            input: t.input,
            output: t.output,
            marks: t.marks,
            isHidden: t.is_hidden,
            orderIndex: t.order_index
          }))
        };
      });
    }
  });

  // Delete coding question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete the coding question (cascade will delete related data)
      const { error } = await supabase
        .from('coding_questions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      toast({
        title: "Question deleted",
        description: "The coding question has been successfully deleted."
      });
      queryClient.invalidateQueries({ queryKey: ['coding-questions'] });
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

  const handleEdit = (question: CodingQuestion) => {
    setSelectedQuestion(question);
    setShowEditForm(true);
  };

  const filteredQuestions = questions?.filter((question) =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading questions: {(error as any).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['coding-questions'] })} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // If create form is shown, render the form component
  if (showCreateForm) {
    return <CreateCodingForm />;
  }

  // If edit form is shown, render the edit form component
  if (showEditForm && selectedQuestion) {
    return (
      <EditCodingForm 
        questionId={selectedQuestion.id} 
        onCancel={() => {
          setShowEditForm(false);
          setSelectedQuestion(null);
        }} 
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coding Questions</h1>
        <Button className="bg-yudha-600 hover:bg-yudha-700" onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Coding Question
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
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-2">
                        {question.supportedLanguages && question.supportedLanguages.map((lang) => (
                          <Badge key={lang} variant="outline" className="bg-blue-100 text-blue-800">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                      <span className="bg-yudha-100 text-yudha-800 text-xs px-2 py-1 rounded">
                        {question.marks} marks
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {question.description && (
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{question.description}</p>
                  )}
                  
                  {/* Examples */}
                  {question.examples && question.examples.length > 0 && (
                    <div className="mb-4 space-y-3">
                      <h3 className="font-medium text-gray-900">Examples:</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {question.examples.map((example, index) => (
                          <div key={example.id} className="border rounded-md p-3">
                            <div className="font-medium mb-2">Example {index + 1}</div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">Input:</div>
                              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 mb-2 overflow-auto max-h-20">
                                {example.input}
                              </pre>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">Output:</div>
                              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 mb-2 overflow-auto max-h-20">
                                {example.output}
                              </pre>
                            </div>
                            {example.explanation && (
                              <div>
                                <div className="text-sm font-medium text-gray-700">Explanation:</div>
                                <p className="text-sm mt-1">{example.explanation}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Test Cases */}
                  {question.testCases && question.testCases.length > 0 && (
                    <div className="mb-4 space-y-3">
                      <h3 className="font-medium text-gray-900">Test Cases:</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {question.testCases.filter(tc => !tc.isHidden).map((testCase, index) => (
                          <div key={testCase.id} className="border rounded-md p-3">
                            <div className="flex justify-between mb-2">
                              <span className="font-medium">Test Case {index + 1}</span>
                              <Badge>{testCase.marks} {testCase.marks === 1 ? 'mark' : 'marks'}</Badge>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">Input:</div>
                              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 mb-2 overflow-auto max-h-20">
                                {testCase.input}
                              </pre>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">Expected Output:</div>
                              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-20">
                                {testCase.output}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Hidden Test Cases Count */}
                      {question.testCases.some(tc => tc.isHidden) && (
                        <div className="text-sm text-gray-600">
                          + {question.testCases.filter(tc => tc.isHidden).length} hidden test {question.testCases.filter(tc => tc.isHidden).length === 1 ? 'case' : 'cases'}
                        </div>
                      )}
                    </div>
                  )}
                  
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
              <p className="text-lg text-gray-500">No coding questions found.</p>
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
              Are you sure you want to delete this coding question? This action cannot be undone.
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

export default CodingQuestions;
