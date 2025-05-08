
import React from "react";
import { Assessment } from "@/types/assessment";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AssessmentDetailProps {
  assessment: Assessment;
  onClose: () => void;
}

const AssessmentDetail: React.FC<AssessmentDetailProps> = ({ assessment, onClose }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">Scheduled</Badge>;
      case 'Active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">Active</Badge>;
      case 'Completed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">{assessment.name}</CardTitle>
          {assessment.status && getStatusBadge(assessment.status)}
        </div>
        <div className="text-sm text-gray-500">
          Assessment Code: <span className="font-medium">{assessment.code}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {assessment.description && (
          <div>
            <h3 className="text-md font-semibold mb-1">Description</h3>
            <p className="text-gray-700">{assessment.description}</p>
          </div>
        )}
        
        {assessment.instructions && (
          <div>
            <h3 className="text-md font-semibold mb-1">Instructions</h3>
            <p className="text-gray-700 whitespace-pre-line">{assessment.instructions}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <h3 className="text-md font-semibold mb-1">Duration</h3>
            <p className="text-gray-700">{assessment.duration_minutes} minutes</p>
          </div>
          
          <div>
            <h3 className="text-md font-semibold mb-1">Start Time</h3>
            <p className="text-gray-700">{formatDate(assessment.start_time)}</p>
          </div>
          
          {assessment.end_time && (
            <div>
              <h3 className="text-md font-semibold mb-1">End Time</h3>
              <p className="text-gray-700">{formatDate(assessment.end_time)}</p>
            </div>
          )}
          
          <div>
            <h3 className="text-md font-semibold mb-1">Created At</h3>
            <p className="text-gray-700">{formatDate(assessment.created_at)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          {assessment.is_practice && (
            <Badge variant="secondary">Practice Assessment</Badge>
          )}
          {assessment.reattempt && (
            <Badge variant="secondary">Reattempt Allowed</Badge>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Close
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentDetail;
