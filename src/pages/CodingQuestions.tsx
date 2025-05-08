
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Code, Edit, Trash2 } from "lucide-react";
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
import { CodingQuestion } from "@/types/assessment";

type DatabaseCodingQuestion = {
  id: string;
  title: string;
  description: string;
  assessment_id: string;
  image_url: string | null;
  marks: number;
  order_index: number;
  created_at: string;
  language?: string;
  examples?: Array<{
    id: string;
    input: string;
    output: string;
    explanation?: string;
    order_index: number;
  }>;
  test_cases?: Array<{
    id: string;
    input: string;
    output: string;
    marks: number;
    is_hidden: boolean;
    order_index: number;
  }>;
  coding_languages?: Array<{
    id: string;
    coding_lang: string;
    solution_template: string;
    constraints?: string[];
  }>;
};

const CodingQuestions: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch coding questions with their details
  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['coding-questions'],
    queryFn: async () => {
      const { data: codingQuestions, error: questionsError } = await supabase
        .from('coding_questions')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (questionsError) throw questionsError;

      // For each question, fetch examples, test cases, and languages
      const questionsWithDetails = await Promise.all(
        codingQuestions.map(async (question) => {
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
          
          // Fetch coding languages
          const { data: codingLanguages, error: languagesError } = await supabase
            .from('coding_languages')
            .select('*')
            .eq('coding_question_id', question.id);
          
          if (languagesError) throw languagesError;
          
          const primaryLanguage = codingLanguages && codingLanguages.length > 0
            ? codingLanguages[0].coding_lang
            : 'javascript';
          
          // Calculate total marks from test cases
          const totalMarks = testCases?.reduce((sum, tc) => sum + tc.marks, 0) || question.marks;
          
          return {
            ...question,
            examples,
            test_cases: testCases,
            coding_languages: codingLanguages,
            language: primaryLanguage,
            marks: totalMarks
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

      // Map database questions to the format expected by the UI
      return questionsWithDetails.map((q: DatabaseCodingQuestion) => ({
        id: q.id,
        type: "coding" as const,
        question: q.title,
        description: q.description,
        marks: q.marks,
        language: q.language as any || "javascript",
        assessment: assessmentMap.get(q.assessment_id) || { name: 'Unknown', code: '' },
        assessmentId: q.assessment_id,
        imageUrl: q.image_url,
        orderIndex: q.order_index,
        sampleInput: q.examples && q.examples.length > 0 ? q.examples[0].input : undefined,
        sampleOutput: q.examples && q.examples.length > 0 ? q.examples[0].output : undefined,
        examples: q.examples?.map(e => ({
          id: e.id,
          input: e.input,
          output: e.output,
          explanation: e.explanation,
          orderIndex: e.order_index
        })),
        testCases: q.test_cases?.map(tc => ({
          id: tc.id,
          input: tc.input,
          output: tc.output,
          marks: tc.marks,
          isHidden: tc.is_hidden,
          orderIndex: tc.order_index
        })),
        timeLimit: 600, // Default time limit in seconds (10 minutes)
        languages: q.coding_languages?.map(l => l.coding_lang) || []
      }));
    }
  });

  // Delete coding question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete the coding question (cascade will delete examples, test cases, etc.)
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

  const filteredQuestions = questions?.filter((question) =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const languageColors: Record<string, string> = {
    javascript: "bg-yellow-100 text-yellow-800",
    python: "bg-blue-100 text-blue-800",
    java: "bg-red-100 text-red-800",
    cpp: "bg-purple-100 text-purple-800",
  };

  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return "No limit";
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
  };

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coding Questions</h1>
        <Button className="bg-yudha-600 hover:bg-yudha-700">
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
              placeholder="Search coding questions..."
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
                  
                  <div className="flex flex-wrap gap-3 mb-4">
                    {question.languages && question.languages.map(lang => (
                      <Badge 
                        key={lang}
                        className={`${languageColors[lang] || "bg-gray-100 text-gray-800"}`}
                      >
                        <Code className="h-3 w-3 mr-1" />
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </Badge>
                    ))}
                    {question.timeLimit && (
                      <Badge variant="outline" className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(question.timeLimit)}
                      </Badge>
                    )}
                    {question.testCases && (
                      <Badge variant="outline">
                        {question.testCases.filter(tc => !tc.isHidden).length} visible / {question.testCases.filter(tc => tc.isHidden).length} hidden tests
                      </Badge>
                    )}
                  </div>
                  
                  {/* Display examples */}
                  {question.examples && question.examples.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Sample Input:</h4>
                        <div className="bg-gray-50 p-3 rounded border font-mono text-sm overflow-x-auto">
                          {question.examples[0].input}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Sample Output:</h4>
                        <div className="bg-gray-50 p-3 rounded border font-mono text-sm overflow-x-auto">
                          {question.examples[0].output}
                        </div>
                      </div>
                      {question.examples[0].explanation && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-semibold mb-1">Explanation:</h4>
                          <div className="bg-gray-50 p-3 rounded border text-sm">
                            {question.examples[0].explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
