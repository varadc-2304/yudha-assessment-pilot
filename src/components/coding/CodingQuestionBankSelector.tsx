
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { CodingQuestionBank } from '@/types/questionBank';

interface Props {
  assessmentId: string;
  onCancel: () => void;
}

const CodingQuestionBankSelector: React.FC<Props> = ({ assessmentId, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestionBank | null>(null);
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Fetch coding questions from bank - now includes questions created by all organization admins
  const { data: bankQuestions, isLoading } = useQuery({
    queryKey: ['coding-question-bank', user?.organization],
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

      // Get questions created by any admin in the organization
      const { data: questions, error } = await supabase
        .from('coding_question_bank')
        .select('*')
        .in('created_by', adminIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!questions) return [];

      const questionsWithRelatedData = await Promise.all(
        questions.map(async (question) => {
          // Fetch examples
          const { data: examples, error: examplesError } = await supabase
            .from('coding_examples_bank')
            .select('*')
            .eq('coding_question_bank_id', question.id)
            .order('order_index', { ascending: true });

          if (examplesError) throw examplesError;

          // Fetch languages
          const { data: languages, error: languagesError } = await supabase
            .from('coding_languages_bank')
            .select('*')
            .eq('coding_question_bank_id', question.id);

          if (languagesError) throw languagesError;

          // Fetch test cases
          const { data: testCases, error: testCasesError } = await supabase
            .from('test_cases_bank')
            .select('*')
            .eq('coding_question_bank_id', question.id)
            .order('order_index', { ascending: true });

          if (testCasesError) throw testCasesError;

          return {
            ...question,
            examples: examples || [],
            languages: languages || [],
            testCases: testCases || []
          };
        })
      );

      return questionsWithRelatedData;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization
  });

  // Get unique topics and difficulties for filter options
  const topics = React.useMemo(() => {
    if (!bankQuestions) return [];
    const uniqueTopics = [...new Set(bankQuestions.map(q => q.topic).filter(Boolean))];
    return uniqueTopics.sort();
  }, [bankQuestions]);

  const difficulties = React.useMemo(() => {
    if (!bankQuestions) return [];
    const uniqueDifficulties = [...new Set(bankQuestions.map(q => q.difficulty).filter(Boolean))];
    return uniqueDifficulties.sort();
  }, [bankQuestions]);

  // Add question from bank to assessment
  const addFromBankMutation = useMutation({
    mutationFn: async ({ questionId, orderIdx }: { questionId: string; orderIdx: number }) => {
      const bankQuestion = bankQuestions?.find(q => q.id === questionId);
      if (!bankQuestion) throw new Error('Question not found');

      // Calculate total marks from test cases
      const totalMarks = bankQuestion.testCases.reduce((sum, tc) => sum + tc.marks, 0);

      // Insert coding question
      const { data: newQuestion, error: questionError } = await supabase
        .from('coding_questions')
        .insert({
          assessment_id: assessmentId,
          title: bankQuestion.title,
          description: bankQuestion.description,
          marks: totalMarks,
          image_url: bankQuestion.image_url,
          order_index: orderIdx
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Insert examples
      if (bankQuestion.examples.length > 0) {
        const examplesToInsert = bankQuestion.examples.map(example => ({
          coding_question_id: newQuestion.id,
          input: example.input,
          output: example.output,
          explanation: example.explanation,
          order_index: example.order_index
        }));

        const { error: examplesError } = await supabase
          .from('coding_examples')
          .insert(examplesToInsert);

        if (examplesError) throw examplesError;
      }

      // Insert languages - handle constraints as string
      if (bankQuestion.languages.length > 0) {
        const languagesToInsert = bankQuestion.languages.map(language => ({
          coding_question_id: newQuestion.id,
          coding_lang: language.coding_lang,
          solution_template: language.solution_template,
          constraints: language.constraints ? [language.constraints] : []
        }));

        const { error: languagesError } = await supabase
          .from('coding_languages')
          .insert(languagesToInsert);

        if (languagesError) throw languagesError;
      }

      // Insert test cases
      if (bankQuestion.testCases.length > 0) {
        const testCasesToInsert = bankQuestion.testCases.map(testCase => ({
          coding_question_id: newQuestion.id,
          input: testCase.input,
          output: testCase.output,
          marks: testCase.marks,
          is_hidden: testCase.is_hidden,
          order_index: testCase.order_index
        }));

        const { error: testCasesError } = await supabase
          .from('test_cases')
          .insert(testCasesToInsert);

        if (testCasesError) throw testCasesError;
      }

      return newQuestion;
    },
    onSuccess: () => {
      toast({
        title: "Question added",
        description: "Coding question has been successfully added from the bank."
      });
      queryClient.invalidateQueries({ queryKey: ['coding-questions'] });
      onCancel();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add question from bank",
        variant: "destructive"
      });
    }
  });

  const filteredQuestions = bankQuestions?.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTopic = selectedTopic === 'all' || question.topic === selectedTopic;
    const matchesDifficulty = selectedDifficulty === 'all' || question.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesTopic && matchesDifficulty;
  }) || [];

  const handleAddQuestion = () => {
    if (selectedQuestion && orderIndex) {
      addFromBankMutation.mutate({ questionId: selectedQuestion.id, orderIdx: orderIndex });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Coding Question from Bank</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="number"
              placeholder="Order Index"
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
              className="w-32"
              min="1"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((question) => {
                  const totalMarks = question.testCases.reduce((sum, tc) => sum + tc.marks, 0);
                  const languages = question.languages.map(l => l.coding_lang);
                  
                  return (
                    <Card 
                      key={question.id} 
                      className={`cursor-pointer transition-colors ${selectedQuestion?.id === question.id ? 'ring-2 ring-yudha-600' : ''}`}
                      onClick={() => setSelectedQuestion(question)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{question.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-wrap gap-1">
                              {languages.map((lang) => (
                                <Badge key={lang} variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                                  {lang}
                                </Badge>
                              ))}
                            </div>
                            {question.topic && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {question.topic}
                              </span>
                            )}
                            {question.difficulty && (
                              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                                {question.difficulty}
                              </span>
                            )}
                            <span className="bg-yudha-100 text-yudha-800 text-xs px-2 py-1 rounded">
                              {totalMarks} marks
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-3 whitespace-pre-wrap">{question.description}</p>
                        
                        {question.examples.length > 0 && (
                          <div className="mb-3">
                            <h4 className="font-medium text-sm mb-2">Examples:</h4>
                            <div className="space-y-2">
                              {question.examples.slice(0, 2).map((example, index) => (
                                <div key={example.id} className="text-xs bg-gray-50 p-2 rounded">
                                  <div><strong>Input:</strong> {example.input}</div>
                                  <div><strong>Output:</strong> {example.output}</div>
                                </div>
                              ))}
                              {question.examples.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{question.examples.length - 2} more examples
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-600">
                          Test Cases: {question.testCases.length} 
                          ({question.testCases.filter(tc => !tc.is_hidden).length} visible, {question.testCases.filter(tc => tc.is_hidden).length} hidden)
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No coding questions found matching the selected filters.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddQuestion}
              disabled={!selectedQuestion || !orderIndex || addFromBankMutation.isPending}
            >
              {addFromBankMutation.isPending ? "Adding..." : "Add Question"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodingQuestionBankSelector;
