import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const codingFormSchema = z.object({
  title: z.string().min(3, { message: 'Question title must be at least 3 characters long' }),
  description: z.string().optional(),
  assessment_id: z.string().uuid({ message: 'Please select an assessment' }),
  order_index: z.coerce.number().min(0, { message: 'Order index must be a non-negative number' })
});

type CodingFormValues = z.infer<typeof codingFormSchema>;

interface LanguageOption {
  id: string;
  languageType: "c" | "cpp" | "java" | "python";
  solutionTemplate: string;
}

interface Example {
  id: string;
  input: string;
  output: string;
  explanation: string;
  order_index: number;
}

interface TestCase {
  id: string;
  input: string;
  output: string;
  marks: number;
  is_hidden: boolean;
  order_index: number;
}

const CreateCodingForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>([
    { id: crypto.randomUUID(), languageType: "python", solutionTemplate: "# Write your solution here" }
  ]);
  const [examples, setExamples] = useState<Example[]>([{
    id: crypto.randomUUID(),
    input: '',
    output: '',
    explanation: '',
    order_index: 0
  }]);

  const [testCases, setTestCases] = useState<TestCase[]>([{
    id: crypto.randomUUID(),
    input: '',
    output: '',
    marks: 1,
    is_hidden: false,
    order_index: 0
  }]);

  const form = useForm<CodingFormValues>({
    resolver: zodResolver(codingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      order_index: 0,
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

  const createCodingMutation = useMutation({
    mutationFn: async (data: CodingFormValues & { 
      languageOptions: LanguageOption[],
      examples: Example[], 
      testCases: TestCase[] 
    }) => {
      // First insert the coding question
      const { data: codingQuestion, error: questionError } = await supabase
        .from('coding_questions')
        .insert({
          title: data.title,
          description: data.description || '',
          assessment_id: data.assessment_id,
          order_index: data.order_index,
        })
        .select()
        .single();
      
      if (questionError) throw questionError;

      // Insert the programming languages and solution templates
      const langPromises = data.languageOptions.map(lang => {
        return supabase
          .from('coding_languages')
          .insert({
            coding_question_id: codingQuestion.id,
            coding_lang: lang.languageType,
            solution_template: lang.solutionTemplate
          });
      });
      
      await Promise.all(langPromises);
      
      // Insert examples
      const examplePromises = data.examples.map((example, index) => {
        return supabase
          .from('coding_examples')
          .insert({
            coding_question_id: codingQuestion.id,
            input: example.input,
            output: example.output,
            explanation: example.explanation || null,
            order_index: index
          });
      });
      
      await Promise.all(examplePromises);
      
      // Insert test cases
      const testCasePromises = data.testCases.map((testCase, index) => {
        return supabase
          .from('test_cases')
          .insert({
            coding_question_id: codingQuestion.id,
            input: testCase.input,
            output: testCase.output,
            marks: testCase.marks,
            is_hidden: testCase.is_hidden,
            order_index: index
          });
      });
      
      await Promise.all(testCasePromises);
      
      return codingQuestion;
    },
    onSuccess: () => {
      toast({
        title: "Coding Question Created",
        description: "The coding question has been successfully created."
      });
      navigate("/coding-questions");
    },
    onError: (error: any) => {
      console.error("Error creating coding question:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create coding question",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: CodingFormValues) => {
    // Validate language options
    if (languageOptions.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one programming language must be specified",
        variant: "destructive"
      });
      return;
    }

    // Check if solution templates are provided
    if (languageOptions.some(lang => !lang.solutionTemplate.trim())) {
      toast({
        title: "Validation Error",
        description: "All programming languages must have a solution template",
        variant: "destructive"
      });
      return;
    }

    // Validate examples
    if (examples.some(example => !example.input.trim() || !example.output.trim())) {
      toast({
        title: "Validation Error",
        description: "All examples must have input and output values",
        variant: "destructive"
      });
      return;
    }

    // Validate test cases
    if (testCases.some(testCase => !testCase.input.trim() || !testCase.output.trim())) {
      toast({
        title: "Validation Error",
        description: "All test cases must have input and output values",
        variant: "destructive"
      });
      return;
    }

    // Submit data
    createCodingMutation.mutate({ 
      ...values, 
      languageOptions,
      examples: examples.map((ex, i) => ({ ...ex, order_index: i })),
      testCases: testCases.map((tc, i) => ({ ...tc, order_index: i }))
    });
  };

  // Default templates for different languages
  const getDefaultTemplate = (lang: "c" | "cpp" | "java" | "python") => {
    switch (lang) {
      case "c":
        return "#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}";
      case "cpp":
        return "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}";
      case "java":
        return "public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}";
      case "python":
        return "# Write your solution here";
      default:
        return "# Write your solution here";
    }
  };

  // Language management
  const addLanguageOption = () => {
    setLanguageOptions(prev => [
      ...prev,
      { 
        id: crypto.randomUUID(), 
        languageType: "python", 
        solutionTemplate: getDefaultTemplate("python")
      }
    ]);
  };

  const removeLanguageOption = (id: string) => {
    if (languageOptions.length <= 1) {
      toast({
        title: "Error",
        description: "At least one programming language is required",
        variant: "destructive"
      });
      return;
    }
    setLanguageOptions(prev => prev.filter(lang => lang.id !== id));
  };

  const updateLanguageType = (id: string, value: "c" | "cpp" | "java" | "python") => {
    setLanguageOptions(prev => prev.map(lang => 
      lang.id === id ? { 
        ...lang, 
        languageType: value,
        solutionTemplate: getDefaultTemplate(value)
      } : lang
    ));
  };

  const updateSolutionTemplate = (id: string, value: string) => {
    setLanguageOptions(prev => prev.map(lang => 
      lang.id === id ? { ...lang, solutionTemplate: value } : lang
    ));
  };

  // Example management
  const addExample = () => {
    setExamples(prev => [
      ...prev, 
      {
        id: crypto.randomUUID(),
        input: '',
        output: '',
        explanation: '',
        order_index: prev.length
      }
    ]);
  };

  const removeExample = (id: string) => {
    if (examples.length <= 1) {
      toast({
        title: "Error",
        description: "At least one example is required",
        variant: "destructive"
      });
      return;
    }
    setExamples(prev => prev.filter(example => example.id !== id));
  };

  const updateExample = (id: string, field: keyof Example, value: string | number | boolean) => {
    setExamples(prev => prev.map(example => 
      example.id === id ? { ...example, [field]: value } : example
    ));
  };

  // Test case management
  const addTestCase = () => {
    setTestCases(prev => [
      ...prev, 
      {
        id: crypto.randomUUID(),
        input: '',
        output: '',
        marks: 1,
        is_hidden: false,
        order_index: prev.length
      }
    ]);
  };

  const removeTestCase = (id: string) => {
    if (testCases.length <= 1) {
      toast({
        title: "Error",
        description: "At least one test case is required",
        variant: "destructive"
      });
      return;
    }
    setTestCases(prev => prev.filter(testCase => testCase.id !== id));
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string | number | boolean) => {
    setTestCases(prev => prev.map(testCase => 
      testCase.id === id ? { ...testCase, [field]: value } : testCase
    ));
  };

  // Add handleCancel function
  const handleCancel = () => {
    navigate("/coding-questions");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Coding Question</CardTitle>
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
                  <FormLabel>Question Title</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the question title" 
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter detailed question description" 
                      className="min-h-32"
                      {...field} 
                    />
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

            {/* Programming Languages Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel className="text-lg font-medium">Programming Languages</FormLabel>
                <Button type="button" variant="outline" onClick={addLanguageOption} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Language
                </Button>
              </div>
              
              {languageOptions.map((lang, index) => (
                <div key={lang.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Language {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLanguageOption(lang.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <FormLabel>Programming Language</FormLabel>
                      <Select
                        value={lang.languageType}
                        onValueChange={(value: any) => updateLanguageType(lang.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="c">C</SelectItem>
                          <SelectItem value="cpp">C++</SelectItem>
                          <SelectItem value="java">Java</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <FormLabel>Solution Template</FormLabel>
                      <Textarea 
                        value={lang.solutionTemplate}
                        onChange={(e) => updateSolutionTemplate(lang.id, e.target.value)}
                        placeholder="Starter code for students"
                        className="font-mono min-h-32"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Examples Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel className="text-lg font-medium">Examples</FormLabel>
                <Button type="button" variant="outline" onClick={addExample} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Example
                </Button>
              </div>
              
              {examples.map((example, index) => (
                <div key={example.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Example {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExample(example.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <FormLabel>Input</FormLabel>
                      <Textarea 
                        value={example.input}
                        onChange={(e) => updateExample(example.id, 'input', e.target.value)}
                        placeholder="Example input"
                        className="font-mono"
                      />
                    </div>
                    
                    <div>
                      <FormLabel>Output</FormLabel>
                      <Textarea 
                        value={example.output}
                        onChange={(e) => updateExample(example.id, 'output', e.target.value)}
                        placeholder="Example output"
                        className="font-mono"
                      />
                    </div>
                    
                    <div>
                      <FormLabel>Explanation (Optional)</FormLabel>
                      <Textarea 
                        value={example.explanation}
                        onChange={(e) => updateExample(example.id, 'explanation', e.target.value)}
                        placeholder="Explain why this is the expected output"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Test Cases Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel className="text-lg font-medium">Test Cases</FormLabel>
                <Button type="button" variant="outline" onClick={addTestCase} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Test Case
                </Button>
              </div>
              
              {testCases.map((testCase, index) => (
                <div key={testCase.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Test Case {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestCase(testCase.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <FormLabel>Input</FormLabel>
                      <Textarea 
                        value={testCase.input}
                        onChange={(e) => updateTestCase(testCase.id, 'input', e.target.value)}
                        placeholder="Test case input"
                        className="font-mono"
                      />
                    </div>
                    
                    <div>
                      <FormLabel>Output</FormLabel>
                      <Textarea 
                        value={testCase.output}
                        onChange={(e) => updateTestCase(testCase.id, 'output', e.target.value)}
                        placeholder="Expected output"
                        className="font-mono"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FormLabel>Marks</FormLabel>
                        <Input 
                          type="number" 
                          min="1"
                          value={testCase.marks}
                          onChange={(e) => updateTestCase(testCase.id, 'marks', parseInt(e.target.value, 10) || 1)}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-6">
                        <Checkbox 
                          id={`hidden-${testCase.id}`}
                          checked={testCase.is_hidden}
                          onCheckedChange={(checked) => updateTestCase(testCase.id, 'is_hidden', Boolean(checked))}
                        />
                        <label
                          htmlFor={`hidden-${testCase.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Hidden test case (not visible to students)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCodingMutation.isPending}
              >
                {createCodingMutation.isPending ? "Creating..." : "Create Question"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateCodingForm;
