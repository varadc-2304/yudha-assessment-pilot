
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Search } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MCQQuestionBank } from '@/types/questionBank';

interface Props {
  assessmentId: string;
  onCancel: () => void;
}

const MCQQuestionBankSelector: React.FC<Props> = ({ assessmentId, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<MCQQuestionBank | null>(null);
  const [orderIndex, setOrderIndex] = useState<number>(1);

  // Fetch MCQ questions from bank
  const { data: bankQuestions, isLoading } = useQuery({
    queryKey: ['mcq-question-bank', user?.id],
    queryFn: async () => {
      const { data: questions, error } = await supabase
        .from('mcq_question_bank')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!questions) return [];

      const questionsWithOptions = await Promise.all(
        questions.map(async (question) => {
          const { data: options, error: optionsError } = await supabase
            .from('mcq_options_bank')
            .select('*')
            .eq('mcq_question_bank_id', question.id)
            .order('order_index', { ascending: true });

          if (optionsError) throw optionsError;

          return {
            ...question,
            options: options || []
          };
        })
      );

      return questionsWithOptions;
    },
    enabled: !!user?.id
  });

  // Add question from bank to assessment
  const addFromBankMutation = useMutation({
    mutationFn: async ({ questionId, orderIdx }: { questionId: string; orderIdx: number }) => {
      const bankQuestion = bankQuestions?.find(q => q.id === questionId);
      if (!bankQuestion) throw new Error('Question not found');

      // Insert MCQ question
      const { data: newQuestion, error: questionError } = await supabase
        .from('mcq_questions')
        .insert({
          assessment_id: assessmentId,
          title: bankQuestion.title,
          description: bankQuestion.description,
          marks: bankQuestion.marks,
          image_url: bankQuestion.image_url,
          order_index: orderIdx
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Insert MCQ options
      const optionsToInsert = bankQuestion.options.map(option => ({
        mcq_question_id: newQuestion.id,
        text: option.text,
        is_correct: option.is_correct,
        order_index: option.order_index
      }));

      const { error: optionsError } = await supabase
        .from('mcq_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      return newQuestion;
    },
    onSuccess: () => {
      toast({
        title: "Question added",
        description: "Question has been successfully added from the bank."
      });
      queryClient.invalidateQueries({ queryKey: ['mcq-questions'] });
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

  const filteredQuestions = bankQuestions?.filter(question =>
    question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAddQuestion = () => {
    if (selectedQuestion && orderIndex) {
      addFromBankMutation.mutate({ questionId: selectedQuestion.id, orderIdx: orderIndex });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Question from Bank</DialogTitle>
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

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((question) => (
                  <Card 
                    key={question.id} 
                    className={`cursor-pointer transition-colors ${selectedQuestion?.id === question.id ? 'ring-2 ring-yudha-600' : ''}`}
                    onClick={() => setSelectedQuestion(question)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{question.title}</CardTitle>
                        <span className="bg-yudha-100 text-yudha-800 text-xs px-2 py-1 rounded">
                          {question.marks} marks
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-3">{question.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {question.options.map((option) => (
                          <div 
                            key={option.id} 
                            className={`p-2 rounded border text-sm ${option.is_correct ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                          >
                            {option.is_correct && <Check className="h-4 w-4 text-green-600 inline mr-1" />}
                            {option.text}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No questions found in the bank.</p>
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

export default MCQQuestionBankSelector;
