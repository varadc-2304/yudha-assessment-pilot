
import React, { useState, useEffect } from "react";
import { Assessment } from "@/types/assessment";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AssessmentConstraints from "./AssessmentConstraints";

interface AssessmentConstraint {
  id?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'mcq' | 'coding';
  number_of_questions: number;
}

interface EditAssessmentFormProps {
  assessment: Assessment;
  onUpdate: (data: Partial<Assessment>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface FormData {
  name: string;
  code: string;
  instructions: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_practice: boolean;
  is_dynamic: boolean;
  is_ai_proctored: boolean;
  reattempt: boolean;
}

const EditAssessmentForm: React.FC<EditAssessmentFormProps> = ({
  assessment,
  onUpdate,
  onCancel,
  isSubmitting
}) => {
  const { toast } = useToast();
  const [constraints, setConstraints] = useState<AssessmentConstraint[]>([]);
  const [loadingConstraints, setLoadingConstraints] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    defaultValues: {
      name: assessment.name,
      code: assessment.code,
      instructions: assessment.instructions || "",
      duration_minutes: assessment.duration_minutes,
      start_time: assessment.start_time ? format(new Date(assessment.start_time), "yyyy-MM-dd'T'HH:mm") : "",
      end_time: assessment.end_time ? format(new Date(assessment.end_time), "yyyy-MM-dd'T'HH:mm") : "",
      is_practice: assessment.is_practice,
      is_dynamic: assessment.is_dynamic || false,
      is_ai_proctored: assessment.is_ai_proctored || true,
      reattempt: assessment.reattempt
    }
  });

  const isDynamic = watch("is_dynamic");

  // Load existing constraints when component mounts or when dynamic toggle changes
  useEffect(() => {
    const loadConstraints = async () => {
      if (!assessment.is_dynamic) return;
      
      setLoadingConstraints(true);
      try {
        const { data, error } = await supabase
          .from('assessment_constraints')
          .select('*')
          .eq('assessment_id', assessment.id);

        if (error) throw error;
        
        // Type the data properly for our local constraint interface
        const typedConstraints: AssessmentConstraint[] = (data || []).map(item => ({
          id: item.id,
          topic: item.topic,
          difficulty: item.difficulty as 'easy' | 'medium' | 'hard',
          question_type: item.question_type as 'mcq' | 'coding',
          number_of_questions: item.number_of_questions
        }));
        
        setConstraints(typedConstraints);
      } catch (error: any) {
        console.error('Error loading constraints:', error);
        toast({
          title: "Error",
          description: "Failed to load assessment constraints",
          variant: "destructive"
        });
      } finally {
        setLoadingConstraints(false);
      }
    };

    loadConstraints();
  }, [assessment.id, assessment.is_dynamic, toast]);

  // Initialize checkbox states
  React.useEffect(() => {
    setValue("is_practice", assessment.is_practice);
    setValue("is_dynamic", assessment.is_dynamic || false);
    setValue("is_ai_proctored", assessment.is_ai_proctored || true);
    setValue("reattempt", assessment.reattempt);
  }, [assessment, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      // Validate constraints if dynamic assessment
      if (data.is_dynamic && constraints.length === 0) {
        toast({
          title: "Error",
          description: "Dynamic assessments must have at least one constraint",
          variant: "destructive"
        });
        return;
      }

      // Format dates for submission
      const formattedData = {
        ...data,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
      };

      // Update assessment
      await onUpdate(formattedData);

      // Handle constraints if dynamic assessment
      if (data.is_dynamic) {
        // Delete existing constraints
        const { error: deleteError } = await supabase
          .from('assessment_constraints')
          .delete()
          .eq('assessment_id', assessment.id);

        if (deleteError) throw deleteError;

        // Insert new constraints
        if (constraints.length > 0) {
          const constraintsToInsert = constraints.map(constraint => ({
            assessment_id: assessment.id,
            topic: constraint.topic,
            difficulty: constraint.difficulty,
            question_type: constraint.question_type,
            number_of_questions: constraint.number_of_questions
          }));

          const { error: insertError } = await supabase
            .from('assessment_constraints')
            .insert(constraintsToInsert);

          if (insertError) throw insertError;
        }
      } else {
        // If not dynamic, remove all constraints
        const { error: deleteError } = await supabase
          .from('assessment_constraints')
          .delete()
          .eq('assessment_id', assessment.id);

        if (deleteError) throw deleteError;
      }

    } catch (error: any) {
      console.error('Error updating assessment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update assessment",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="font-medium text-gray-700">Assessment Name*</Label>
          <Input
            id="name"
            className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            {...register("name", { required: "Assessment name is required" })}
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1 animate-fade-in">{errors.name.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="code" className="font-medium text-gray-700">Assessment Code*</Label>
          <Input
            id="code"
            className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            {...register("code", { required: "Assessment code is required" })}
          />
          {errors.code && (
            <p className="text-sm text-red-500 mt-1 animate-fade-in">{errors.code.message as string}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions" className="font-medium text-gray-700">Instructions</Label>
        <Textarea
          id="instructions"
          className="min-h-32 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          {...register("instructions")}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration_minutes" className="font-medium text-gray-700">Duration (minutes)*</Label>
          <Input
            id="duration_minutes"
            type="number"
            className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            {...register("duration_minutes", { 
              required: "Duration is required",
              valueAsNumber: true,
              min: { value: 1, message: "Duration must be at least 1 minute" } 
            })}
          />
          {errors.duration_minutes && (
            <p className="text-sm text-red-500 mt-1 animate-fade-in">{errors.duration_minutes.message as string}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time" className="font-medium text-gray-700">Start Time*</Label>
          <Input
            id="start_time"
            type="datetime-local"
            className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            {...register("start_time", { required: "Start time is required" })}
          />
          {errors.start_time && (
            <p className="text-sm text-red-500 mt-1 animate-fade-in">{errors.start_time.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time" className="font-medium text-gray-700">End Time</Label>
          <Input
            id="end_time"
            type="datetime-local"
            className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            {...register("end_time")}
            value={watch("end_time") || ""} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="flex items-center space-x-2 rounded-md border p-4 shadow-sm bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
          <Checkbox 
            id="is_practice"
            checked={watch("is_practice")}
            onCheckedChange={(checked) => setValue("is_practice", !!checked)}
            className="h-5 w-5 border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <Label htmlFor="is_practice" className="cursor-pointer font-medium">Practice Assessment</Label>
        </div>

        <div className="flex items-center space-x-2 rounded-md border p-4 shadow-sm bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
          <Checkbox 
            id="is_dynamic"
            checked={watch("is_dynamic")}
            onCheckedChange={(checked) => setValue("is_dynamic", !!checked)}
            className="h-5 w-5 border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <Label htmlFor="is_dynamic" className="cursor-pointer font-medium">Dynamic Assessment</Label>
        </div>

        <div className="flex items-center space-x-2 rounded-md border p-4 shadow-sm bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
          <Checkbox 
            id="is_ai_proctored"
            checked={watch("is_ai_proctored")}
            onCheckedChange={(checked) => setValue("is_ai_proctored", !!checked)}
            className="h-5 w-5 border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <Label htmlFor="is_ai_proctored" className="cursor-pointer font-medium">AI Proctored</Label>
        </div>

        <div className="flex items-center space-x-2 rounded-md border p-4 shadow-sm bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
          <Checkbox 
            id="reattempt"
            checked={watch("reattempt")}
            onCheckedChange={(checked) => setValue("reattempt", !!checked)}
            className="h-5 w-5 border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <Label htmlFor="reattempt" className="cursor-pointer font-medium">Allow Reattempt</Label>
        </div>
      </div>

      {/* Dynamic Assessment Constraints */}
      {isDynamic && (
        <div className="pt-4">
          {loadingConstraints ? (
            <div className="text-center py-4">Loading constraints...</div>
          ) : (
            <AssessmentConstraints
              constraints={constraints}
              onChange={setConstraints}
              disabled={!isDynamic}
            />
          )}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="hover:bg-gray-100 transition-colors duration-200"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all duration-200"
        >
          {isSubmitting ? "Updating..." : "Update Assessment"}
        </Button>
      </div>
    </form>
  );
};

export default EditAssessmentForm;
