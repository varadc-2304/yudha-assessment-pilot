
import React from "react";
import { Assessment } from "@/types/assessment";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface EditAssessmentFormProps {
  assessment: Assessment;
  onUpdate: (data: Partial<Assessment>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const EditAssessmentForm: React.FC<EditAssessmentFormProps> = ({
  assessment,
  onUpdate,
  onCancel,
  isSubmitting
}) => {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      name: assessment.name,
      code: assessment.code,
      instructions: assessment.instructions || "",
      duration_minutes: assessment.duration_minutes,
      start_time: assessment.start_time ? format(new Date(assessment.start_time), "yyyy-MM-dd'T'HH:mm") : "",
      end_time: assessment.end_time ? format(new Date(assessment.end_time), "yyyy-MM-dd'T'HH:mm") : "",
      is_practice: assessment.is_practice,
      reattempt: assessment.reattempt
    }
  });

  // Initialize checkbox states
  React.useEffect(() => {
    setValue("is_practice", assessment.is_practice);
    setValue("reattempt", assessment.reattempt);
  }, [assessment, setValue]);

  const onSubmit = (data: any) => {
    // Format dates for submission
    const formattedData = {
      ...data,
      start_time: new Date(data.start_time).toISOString(),
      end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
    };
    onUpdate(formattedData);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            id="reattempt"
            checked={watch("reattempt")}
            onCheckedChange={(checked) => setValue("reattempt", !!checked)}
            className="h-5 w-5 border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <Label htmlFor="reattempt" className="cursor-pointer font-medium">Allow Reattempt</Label>
        </div>
      </div>

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
