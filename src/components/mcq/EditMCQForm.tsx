
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MCQQuestion } from '@/types/assessment';

const mcqFormSchema = z.object({
  title: z.string().min(3, { message: 'Question title must be at least 3 characters long' }),
  description: z.string().optional(),
  marks: z.coerce.number().min(1, { message: 'Marks must be at least 1' }),
  assessment_id: z.string().uuid({ message: 'Please select an assessment' }),
  order_index: z.coerce.number().min(0, { message: 'Order index must be a non-negative number' }),
  image_url: z.string().optional()
});

type MCQFormValues = z.infer<typeof mcqFormSchema>;

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface EditMCQFormProps {
  questionId: string;
  onCancel: () => void;
}

const EditMCQForm: React.FC<EditMCQFormProps> = ({ questionId, onCancel }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<MCQFormValues>({
    resolver: zodResolver(mcqFormSchema),
    defaultValues: {
      title: '',
      description: '',
      marks: 1,
      order_index: 0,
      image_url: ''
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

  // Fetch the MCQ question data
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        // Fetch question data
        const { data: questionData, error: questionError } = await supabase
          .from('mcq_questions')
          .select('*')
          .eq('id', questionId)
          .single();
        
        if (questionError) throw questionError;

        // Fetch options
        const { data: optionsData, error: optionsError } = await supabase
          .from('mcq_options')
          .select('*')
          .eq('mcq_question_id', questionId)
          .order('order_index', { ascending: true });
        
        if (optionsError) throw optionsError;

        // Set form values
        form.setValue('title', questionData.title);
        form.setValue('description', questionData.description || '');
        form.setValue('marks', questionData.marks);
        form.setValue('assessment_id', questionData.assessment_id);
        form.setValue('order_index', questionData.order_index);
        form.setValue('image_url', questionData.image_url || '');
        
        // Set image URL if it exists
        if (questionData.image_url) {
          setImageUrl(questionData.image_url);
        }

        // Set options
        setOptions(optionsData.map(option => ({
          id: option.id,
          text: option.text,
          isCorrect: option.is_correct
        })));

        setLoading(false);
      } catch (error) {
        console.error("Error fetching question:", error);
        toast({
          title: "Error",
          description: "Failed to load question data",
          variant: "destructive"
        });
        onCancel();
      }
    };

    fetchQuestion();
  }, [questionId, form, toast, onCancel]);

  const updateMCQMutation = useMutation({
    mutationFn: async (data: MCQFormValues & { options: Option[] }) => {
      // Update the MCQ question
      const { error: questionError } = await supabase
        .from('mcq_questions')
        .update({
          title: data.title,
          description: data.description || '',
          assessment_id: data.assessment_id,
          marks: data.marks,
          order_index: data.order_index,
          image_url: data.image_url || null
        })
        .eq('id', questionId);
      
      if (questionError) throw questionError;
      
      // Handle options - get existing options
      const { data: existingOptions, error: fetchError } = await supabase
        .from('mcq_options')
        .select('id')
        .eq('mcq_question_id', questionId);
      
      if (fetchError) throw fetchError;
      
      const existingIds = new Set(existingOptions.map(o => o.id));
      const currentIds = new Set(data.options.map(o => o.id));
      
      // Options to delete
      const toDelete = existingOptions.filter(o => !currentIds.has(o.id)).map(o => o.id);
      
      // Delete removed options
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('mcq_options')
          .delete()
          .in('id', toDelete);
        
        if (deleteError) throw deleteError;
      }
      
      // Update or insert options
      for (const [index, option] of data.options.entries()) {
        if (existingIds.has(option.id)) {
          // Update existing
          const { error: updateError } = await supabase
            .from('mcq_options')
            .update({
              text: option.text,
              is_correct: option.isCorrect,
              order_index: index
            })
            .eq('id', option.id);
          
          if (updateError) throw updateError;
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('mcq_options')
            .insert({
              mcq_question_id: questionId,
              text: option.text,
              is_correct: option.isCorrect,
              order_index: index
            });
          
          if (insertError) throw insertError;
        }
      }
      
      return true;
    },
    onSuccess: () => {
      toast({
        title: "MCQ Question Updated",
        description: "The MCQ question has been successfully updated."
      });
      onCancel();
    },
    onError: (error: any) => {
      console.error("Error updating MCQ question:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update MCQ question",
        variant: "destructive"
      });
    }
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `mcq_images/${fileName}`;

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assessment_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage
        .from('assessment_images')
        .getPublicUrl(filePath);

      setImageUrl(data.publicUrl);
      form.setValue('image_url', data.publicUrl);
      
      toast({
        title: "Image Uploaded",
        description: "The image has been successfully uploaded."
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

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
    updateMCQMutation.mutate({ ...values, options });
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit MCQ Question</CardTitle>
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
                    value={field.value}
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

            {/* Image URL field */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <div className="space-y-3">
                    {imageUrl && (
                      <div className="w-full max-w-md mx-auto">
                        <img 
                          src={imageUrl} 
                          alt="Question" 
                          className="rounded-md shadow-sm border" 
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="Enter image URL or upload"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setImageUrl(e.target.value || null);
                          }}
                        />
                      </FormControl>
                      <div className="relative">
                        <Input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                        <Label 
                          htmlFor="image-upload" 
                          className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow cursor-pointer hover:bg-primary/90"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? "Uploading..." : "Upload"}
                        </Label>
                      </div>
                    </div>
                  </div>
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
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMCQMutation.isPending}
              >
                {updateMCQMutation.isPending ? "Updating..." : "Update Question"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EditMCQForm;
