
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import AssessmentConstraints from "@/components/assessment/AssessmentConstraints";

const assessmentSchema = z.object({
  name: z.string().min(3, { message: "Assessment name must be at least 3 characters" }),
  code: z.string().min(2, { message: "Assessment code is required" }),
  instructions: z.string().optional(),
  duration_minutes: z.coerce.number().min(1, { message: "Duration must be at least 1 minute" }),
  start_time: z.string().min(1, { message: "Start time is required" }),
  end_time: z.string().optional(),
  is_practice: z.boolean().default(false),
  is_dynamic: z.boolean().default(false),
  reattempt: z.boolean().default(false)
});

type AssessmentFormValues = z.infer<typeof assessmentSchema>;

interface AssessmentConstraint {
  id?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'mcq' | 'coding';
  number_of_questions: number;
}

const CreateAssessment: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [constraints, setConstraints] = useState<AssessmentConstraint[]>([]);

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      name: "",
      code: "",
      instructions: "",
      duration_minutes: 60,
      start_time: new Date().toISOString().slice(0, 16),
      end_time: "",
      is_practice: false,
      is_dynamic: false,
      reattempt: false
    }
  });

  const isDynamic = form.watch("is_dynamic");

  const onSubmit = async (values: AssessmentFormValues) => {
    try {
      // Validate constraints if dynamic assessment
      if (values.is_dynamic && constraints.length === 0) {
        toast({
          title: "Error",
          description: "Dynamic assessments must have at least one constraint",
          variant: "destructive"
        });
        return;
      }

      // Convert form timestamps to proper ISO format
      const startTime = new Date(values.start_time).toISOString();
      const endTime = values.end_time ? new Date(values.end_time).toISOString() : null;
      
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          name: values.name,
          code: values.code,
          instructions: values.instructions,
          duration_minutes: values.duration_minutes,
          start_time: startTime,
          end_time: endTime,
          is_practice: values.is_practice,
          is_dynamic: values.is_dynamic,
          reattempt: values.reattempt,
          created_by: null // Will be replaced with actual user ID when auth is implemented
        })
        .select()
        .single();

      if (error) throw error;

      // Insert constraints if dynamic assessment
      if (values.is_dynamic && constraints.length > 0) {
        const constraintsToInsert = constraints.map(constraint => ({
          assessment_id: data.id,
          topic: constraint.topic,
          difficulty: constraint.difficulty,
          question_type: constraint.question_type,
          number_of_questions: constraint.number_of_questions
        }));

        const { error: constraintsError } = await supabase
          .from('assessment_constraints')
          .insert(constraintsToInsert);

        if (constraintsError) throw constraintsError;
      }

      toast({
        title: "Assessment Created",
        description: "The assessment has been successfully created."
      });
      
      // Invalidate assessments query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      navigate("/assessments");
    } catch (error: any) {
      console.error("Error creating assessment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assessment",
        variant: "destructive"
      });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create Assessment</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. JavaScript Fundamentals" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. JS-2023" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Instructions for participants..."
                        className="min-h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="is_practice"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Practice Assessment</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Mark as a practice assessment (doesn't count towards grades)
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_dynamic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Dynamic Assessment</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Generate questions dynamically based on constraints
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="reattempt"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Allow Reattempts</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow students to retake this assessment
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Dynamic Assessment Constraints */}
              {isDynamic && (
                <AssessmentConstraints
                  constraints={constraints}
                  onChange={setConstraints}
                  disabled={!isDynamic}
                />
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/assessments")}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Assessment</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAssessment;
