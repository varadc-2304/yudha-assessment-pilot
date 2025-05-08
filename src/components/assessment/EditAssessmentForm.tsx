
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
          <Label htmlFor="name">Assessment Name*</Label>
          <Input
            id="name"
            {...register("name", { required: "Assessment name is required" })}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Assessment Code*</Label>
          <Input
            id="code"
            {...register("code", { required: "Assessment code is required" })}
          />
          {errors.code && (
            <p className="text-sm text-red-500">{errors.code.message as string}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          {...register("instructions")}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Duration (minutes)*</Label>
          <Input
            id="duration_minutes"
            type="number"
            {...register("duration_minutes", { 
              required: "Duration is required",
              valueAsNumber: true,
              min: { value: 1, message: "Duration must be at least 1 minute" } 
            })}
          />
          {errors.duration_minutes && (
            <p className="text-sm text-red-500">{errors.duration_minutes.message as string}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time*</Label>
          <Input
            id="start_time"
            type="datetime-local"
            {...register("start_time", { required: "Start time is required" })}
          />
          {errors.start_time && (
            <p className="text-sm text-red-500">{errors.start_time.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="datetime-local"
            {...register("end_time")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="is_practice"
            checked={watch("is_practice")}
            onCheckedChange={(checked) => setValue("is_practice", !!checked)}
          />
          <Label htmlFor="is_practice" className="cursor-pointer">Practice Assessment</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="reattempt"
            checked={watch("reattempt")}
            onCheckedChange={(checked) => setValue("reattempt", !!checked)}
          />
          <Label htmlFor="reattempt" className="cursor-pointer">Allow Reattempt</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Assessment"}
        </Button>
      </div>
    </form>
  );
};

export default EditAssessmentForm;
