
import React from "react";
import { cn } from "@/lib/utils";

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="flex justify-center items-center">
      <div 
        className={cn(
          "animate-spin rounded-full border-solid border-t-transparent",
          "border-yudha-600",
          sizeClasses[size],
          className
        )}
      />
    </div>
  );
};
