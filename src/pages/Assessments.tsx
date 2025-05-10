
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Assessment } from "@/types/assessment";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import AssessmentDetail from "@/components/assessment/AssessmentDetail";
import EditAssessmentForm from "@/components/assessment/EditAssessmentForm";
import { useAuth } from "@/contexts/AuthContext";

const Assessments: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch assessments from Supabase - only those created by the current admin
  const { data: assessments, isLoading, error } = useQuery({
    queryKey: ['assessments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Assessment[];
    },
    enabled: !!user?.id
  });

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verify this assessment belongs to the current admin
      const { data: assessmentCheck, error: checkError } = await supabase
        .from('assessments')
        .select('created_by')
        .eq('id', id)
        .single();
      
      if (checkError) throw checkError;
      
      if (assessmentCheck.created_by !== user?.id) {
        throw new Error("You don't have permission to delete this assessment");
      }
      
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      toast({
        title: "Assessment deleted",
        description: "The assessment has been successfully deleted."
      });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
    onError: (err: any) => {
      console.error("Error deleting assessment:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete assessment",
        variant: "destructive"
      });
    }
  });

  // Update assessment mutation
  const updateAssessmentMutation = useMutation({
    mutationFn: async (data: { id: string; assessment: Partial<Assessment> }) => {
      const { id, assessment } = data;
      
      // Verify this assessment belongs to the current admin
      const { data: assessmentCheck, error: checkError } = await supabase
        .from('assessments')
        .select('created_by')
        .eq('id', id)
        .single();
      
      if (checkError) throw checkError;
      
      if (assessmentCheck.created_by !== user?.id) {
        throw new Error("You don't have permission to update this assessment");
      }
      
      const { error } = await supabase
        .from('assessments')
        .update(assessment)
        .eq('id', id);
      
      if (error) throw error;
      return { id, assessment };
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      toast({
        title: "Assessment updated",
        description: "The assessment has been successfully updated."
      });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
    onError: (err: any) => {
      console.error("Error updating assessment:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update assessment",
        variant: "destructive"
      });
    }
  });

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleDelete = (id: string) => {
    deleteAssessmentMutation.mutate(id);
  };

  const handleUpdate = (assessmentData: Partial<Assessment>) => {
    if (selectedAssessment) {
      updateAssessmentMutation.mutate({
        id: selectedAssessment.id,
        assessment: assessmentData
      });
    }
  };

  const handleViewAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsViewDialogOpen(true);
  };

  const handleEditAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsEditDialogOpen(true);
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

  // Filter assessments based on search term
  const filteredAssessments = assessments?.filter(assessment =>
    assessment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (assessment.instructions && assessment.instructions.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading assessments: {(error as any).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['assessments'] })} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <Button className="bg-yudha-600 hover:bg-yudha-700" onClick={() => navigate("/create-assessment")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Assessment
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Search Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="Search by title, code or description..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredAssessments && filteredAssessments.length > 0 ? (
            filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold">{assessment.name}</h3>
                        {getStatusBadge(assessment.status || 'Scheduled')}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">Code: <span className="font-medium">{assessment.code}</span></p>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {assessment.instructions || "No instructions provided."}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Duration:</span>{" "}
                          <span className="font-medium">{assessment.duration_minutes} min</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Start:</span>{" "}
                          <span className="font-medium">{formatDate(assessment.start_time)}</span>
                        </div>
                        {assessment.end_time && (
                          <div>
                            <span className="text-gray-500">End:</span>{" "}
                            <span className="font-medium">{formatDate(assessment.end_time)}</span>
                          </div>
                        )}
                        {assessment.is_practice && (
                          <Badge variant="secondary">Practice</Badge>
                        )}
                        {assessment.reattempt && (
                          <Badge variant="secondary">Reattempt Allowed</Badge>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-6 flex flex-row md:flex-col justify-between items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewAssessment(assessment)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditAssessment(assessment)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAssessment(assessment);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/results/${assessment.id}`}>
                          <BarChart className="h-4 w-4 mr-2" />
                          Results
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-lg text-gray-500">No assessments found.</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assessment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the assessment "{selectedAssessment?.name}"? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedAssessment && handleDelete(selectedAssessment.id)}
              disabled={deleteAssessmentMutation.isPending}
            >
              {deleteAssessmentMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Assessment Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assessment Details</DialogTitle>
          </DialogHeader>
          {selectedAssessment && (
            <AssessmentDetail 
              assessment={selectedAssessment} 
              onClose={() => setIsViewDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Assessment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Assessment</DialogTitle>
          </DialogHeader>
          {selectedAssessment && (
            <EditAssessmentForm 
              assessment={selectedAssessment} 
              onUpdate={handleUpdate}
              onCancel={() => setIsEditDialogOpen(false)}
              isSubmitting={updateAssessmentMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assessments;
