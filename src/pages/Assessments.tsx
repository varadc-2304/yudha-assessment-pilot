
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, Eye, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Assessment } from "@/types/assessment";

// Mock data for assessments
const mockAssessments: Assessment[] = [
  {
    id: "1",
    title: "JavaScript Fundamentals",
    description: "Basic JavaScript concepts and syntax assessment",
    duration: 45,
    passingScore: 60,
    totalMarks: 100,
    questions: [],
    createdAt: "2025-04-29T10:30:00Z",
    updatedAt: "2025-04-29T10:30:00Z",
  },
  {
    id: "2",
    title: "React Components & Hooks",
    description: "Understanding React components and hooks usage",
    duration: 60,
    passingScore: 65,
    totalMarks: 100,
    questions: [],
    createdAt: "2025-05-01T14:20:00Z",
    updatedAt: "2025-05-02T09:15:00Z",
  },
  {
    id: "3",
    title: "Data Structures Basics",
    description: "Arrays, linked lists, stacks, and queues implementation",
    duration: 90,
    passingScore: 70,
    totalMarks: 100,
    questions: [],
    createdAt: "2025-05-03T11:45:00Z",
    updatedAt: "2025-05-03T11:45:00Z",
  },
  {
    id: "4",
    title: "API Integration Test",
    description: "Working with RESTful APIs and handling responses",
    duration: 60,
    passingScore: 60,
    totalMarks: 80,
    questions: [],
    createdAt: "2025-05-04T16:10:00Z",
    updatedAt: "2025-05-05T10:20:00Z",
  },
];

const Assessments: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [assessments, setAssessments] = useState<Assessment[]>(mockAssessments);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredAssessments = assessments.filter((assessment) =>
    assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setAssessments((prev) => prev.filter((assessment) => assessment.id !== id));
    setIsDeleteDialogOpen(false);
    toast({
      title: "Assessment deleted",
      description: "The assessment has been successfully deleted.",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <Button className="bg-yudha-600 hover:bg-yudha-700">
          <Plus className="mr-2 h-4 w-4" />
          <Link to="/create-assessment">Create Assessment</Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Search Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {filteredAssessments.length > 0 ? (
          filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-6">
                    <h3 className="text-xl font-semibold mb-2">{assessment.title}</h3>
                    <p className="text-gray-600 mb-4">{assessment.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Duration:</span>{" "}
                        <span className="font-medium">{assessment.duration} min</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Passing Score:</span>{" "}
                        <span className="font-medium">{assessment.passingScore}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Marks:</span>{" "}
                        <span className="font-medium">{assessment.totalMarks}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>{" "}
                        <span className="font-medium">{formatDate(assessment.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 flex flex-row md:flex-col justify-between items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/assessments/${assessment.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/assessments/${assessment.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assessment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the assessment "{selectedAssessment?.title}"? 
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
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assessments;
