import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, BarChart, Clock, Calendar, Users } from "lucide-react";
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

  // Fetch assessments from Supabase - all assessments within the organization
  const { data: assessments, isLoading, error } = useQuery({
    queryKey: ['assessments', user?.organization],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Assessment[];
    },
    enabled: !!user?.id && user?.role === 'admin'
  });

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
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
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case 'Active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'Completed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">Completed</Badge>;
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assessments</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor your assessment portfolio</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 shadow-lg" onClick={() => navigate("/create-assessment")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Assessment
        </Button>
      </div>

      <Card className="mb-8 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Search Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by title, code or description..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full max-w-md"
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssessments && filteredAssessments.length > 0 ? (
            filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="group relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30 border border-gray-200/60 aspect-square flex flex-col">
                <CardContent className="p-0 flex flex-col h-full">
                  {/* Header with Status Badge */}
                  <div className="p-4 pb-3 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2" title={assessment.name}>
                        {assessment.name}
                      </h3>
                      {getStatusBadge(assessment.status || 'Scheduled')}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium text-primary">{assessment.code}</span>
                    </div>
                  </div>

                  {/* Key Information */}
                  <div className="p-4 space-y-3 flex-grow">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{assessment.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(assessment.start_time)}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {assessment.is_practice && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-0">
                          Practice
                        </Badge>
                      )}
                      {assessment.reattempt && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-0">
                          Reattempt
                        </Badge>
                      )}
                      {assessment.is_ai_proctored && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-0">
                          AI Proctored
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Buttons - Always Visible */}
                  <div className="border-t border-gray-100 p-3 bg-gray-50/50 flex-shrink-0">
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleViewAssessment(assessment)}
                        className="h-9 w-9 hover:bg-blue-100 hover:text-blue-700"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditAssessment(assessment)}
                        className="h-9 w-9 hover:bg-green-100 hover:text-green-700"
                        title="Edit Assessment"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild
                        className="h-9 w-9 hover:bg-purple-100 hover:text-purple-700"
                        title="View Results"
                      >
                        <Link to={`/results/${assessment.id}`}>
                          <BarChart className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedAssessment(assessment);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="h-9 w-9 hover:bg-red-100 hover:text-red-700"
                        title="Delete Assessment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No assessments found</h3>
                <p className="text-muted-foreground mb-4">Get started by creating your first assessment.</p>
                <Button onClick={() => navigate("/create-assessment")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assessment
                </Button>
              </div>
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
