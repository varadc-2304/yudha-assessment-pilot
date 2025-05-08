
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const mcqFormSchema = z.object({
  title: z.string().min(3, { message: 'Question title must be at least 3 characters long' }),
  description: z.string().optional(),
  marks: z.coerce.number().min(1, { message: 'Marks must be at least 1' }),
  assessment_id: z.string().uuid({ message: 'Please select an assessment' }),
  order_index: z.coerce.number().min(0, { message: 'Order index must be a non-negative number' })
});

type MCQFormValues = z.infer<typeof mcqFormSchema>;

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

const CreateMCQForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [options, setOptions] = useState<Option[]>([
    { id: crypto.randomUUID(), text: '', isCorrect: false },
    { id: crypto.randomUUID(), text: '', isCorrect: false }
  ]);

  const form = useForm<MCQFormValues>({
    resolver: zodResolver(mcqFormSchema),
    defaultValues: {
      title: '',
      description: '',
      marks: 1,
      order_index: 0
    }
  });

  // Fetch assessments for dropdown
  const { data: assessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, name, code')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createMCQMutation = useMutation({
    mutationFn: async (data: MCQFormValues & { options: Option[] }) => {
      // First insert the MCQ question
      const { data: mcqQuestion, error: questionError } = await supabase
        .from('mcq_questions')
        .insert({
          title: data.title,
          description: data.description || '',
          assessment_id: data.assessment_id,
          marks: data.marks,
          order_index: data.order_index
        })
        .select()
        .single();
      
      if (questionError) throw questionError;
      
      // Then insert all options
      const optionsToInsert = data.options.map((option, index) => ({
        mcq_question_id: mcqQuestion.id,
        text: option.text,
        is_correct: option.isCorrect,
        order_index: index
      }));
      
      const { error: optionsError } = await supabase
        .from('mcq_options')
        .insert(optionsToInsert);
        
      if (optionsError) throw optionsError;
      
      return mcqQuestion;
    },
    onSuccess: () => {
      toast({
        title: "MCQ Question Created",
        description: "The MCQ question has been successfully created."
      });
      navigate("/mcq-questions");
    },
    onError: (error: any) => {
      console.error("Error creating MCQ question:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create MCQ question",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: MCQFormValues) => {
    // Validate that at least one option is marked as correct
    if (!options.some(option => option.isCorrect)) {
      toast({
        title: "Validation Error",
        description: "At least one option must be marked as correct",
        variant: "destructive"
      });
      return;
    }

    // Validate that all options have text
    if (options.some(option => option.text.trim() === '')) {
      toast({
        title: "Validation Error",
        description: "All options must have text",
        variant: "destructive"
      });
      return;
    }

    // Submit data
    createMCQMutation.mutate({ ...values, options });
  };

  const addOption = () => {
    setOptions(prev => [...prev, { id: crypto.randomUUID(), text: '', isCorrect: false }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      toast({
        title: "Error",
        description: "MCQ questions must have at least two options",
        variant: "destructive"
      });
      return;
    }
    setOptions(prev => prev.filter(option => option.id !== id));
  };

  const updateOptionText = (id: string, text: string) => {
    setOptions(prev => prev.map(option => 
      option.id === id ? { ...option, text } : option
    ));
  };

  const updateOptionCorrect = (id: string, isCorrect: boolean) => {
    setOptions(prev => prev.map(option => 
      option.id === id ? { ...option, isCorrect } : option
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create MCQ Question</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="assessment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingAssessments}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an assessment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assessments?.map((assessment) => (
                        <SelectItem key={assessment.id} value={assessment.id}>
                          {assessment.name} ({assessment.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the question text" 
                      className="min-h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter additional description or context" 
                      className="min-h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="marks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marks</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order_index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Index</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-medium">Options</Label>
                <Button type="button" variant="outline" onClick={addOption} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
              
              {options.map((option, index) => (
                <div key={option.id} className="flex items-start space-x-3 p-3 border rounded-md">
                  <Checkbox
                    id={`correct-${option.id}`}
                    checked={option.isCorrect}
                    onCheckedChange={(checked) => updateOptionCorrect(option.id, Boolean(checked))}
                    className="mt-2"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`option-${option.id}`} className={option.isCorrect ? "font-medium" : ""}>
                      Option {index + 1}{option.isCorrect ? " (Correct answer)" : ""}
                    </Label>
                    <Textarea
                      id={`option-${option.id}`}
                      value={option.text}
                      onChange={(e) => updateOptionText(option.id, e.target.value)}
                      placeholder="Enter option text"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(option.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/mcq-questions")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMCQMutation.isPending}
              >
                {createMCQMutation.isPending ? "Creating..." : "Create Question"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateMCQForm;
