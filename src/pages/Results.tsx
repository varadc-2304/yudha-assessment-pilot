import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AssessmentResult } from "@/types/assessment";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Eye } from "lucide-react";
import AskAIDialog from "@/components/results/AskAIDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLORS = ["#8884d8", "#FF8042"];
const PASS_THRESHOLD = 60; // Assuming 60% is passing

const Results: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId?: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [askAIOpen, setAskAIOpen] = useState(false);
  const [proctoringDialogOpen, setProctoringDialogOpen] = useState(false);
  const [selectedUserAssessment, setSelectedUserAssessment] = useState<{userId: string, assessmentId: string} | null>(null);
  const { user } = useAuth();

  // First, fetch organization and its assigned assessments
  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('assigned_assessments_code')
        .eq('id', user?.organization_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization_id
  });

  // Fetch assigned assessments
  const { data: orgAssessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['org-assessments', user?.organization_id, organization?.assigned_assessments_code],
    queryFn: async () => {
      const assignedCodes = organization?.assigned_assessments_code || [];
      
      if (assignedCodes.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('assessments')
        .select('id, name, code')
        .in('code', assignedCodes);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!organization
  });

  // Fetch results data for assigned assessments only
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['results', assessmentId, user?.organization_id, orgAssessments],
    queryFn: async () => {
      if (!orgAssessments || orgAssessments.length === 0) {
        return [];
      }

      // If specific assessment ID is provided, verify it's in assigned assessments
      let assessmentIds: string[] = [];
      
      if (assessmentId) {
        if (orgAssessments.some(a => a.id === assessmentId)) {
          assessmentIds = [assessmentId];
        } else {
          return []; // Assessment not in assigned list
        }
      } else {
        assessmentIds = orgAssessments.map(a => a.id);
      }
      
      if (assessmentIds.length === 0) {
        return [];
      }
      
      // Get organization students only
      const { data: orgStudents, error: studentsError } = await supabase
        .from('auth')
        .select('id')
        .eq('organization_id', user?.organization_id)
        .eq('role', 'student');
      
      if (studentsError) throw studentsError;
      
      if (!orgStudents || orgStudents.length === 0) {
        return [];
      }
      
      const studentIds = orgStudents.map(s => s.id);
      
      let query = supabase.from('results').select(`
        id,
        assessment_id,
        user_id,
        total_score,
        percentage,
        total_marks,
        completed_at,
        created_at,
        is_cheated,
        assessments(name, code, is_ai_proctored),
        auth(name, email, prn, department)
      `)
      .in('assessment_id', assessmentIds)
      .in('user_id', studentIds);
      
      const { data, error } = await query.order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(result => ({
        id: result.id,
        assessment_id: result.assessment_id,
        user_id: result.user_id,
        userName: result.auth.name || 'Unknown',
        userEmail: result.auth.email,
        userPrn: result.auth.prn,
        userDepartment: result.auth.department,
        total_score: result.total_score,
        percentage: result.percentage,
        total_marks: result.total_marks,
        completed_at: result.completed_at,
        created_at: result.created_at,
        is_cheated: result.is_cheated,
        assessment: {
          name: result.assessments.name,
          code: result.assessments.code,
          is_ai_proctored: result.assessments.is_ai_proctored
        }
      }));
    },
    enabled: !!user?.id && user?.role === 'admin' && !!orgAssessments && orgAssessments.length > 0
  });

  // Fetch proctoring data for selected user and assessment
  const { data: proctoringData, isLoading: isProctoringLoading } = useQuery({
    queryKey: ['proctoring-data', selectedUserAssessment?.userId, selectedUserAssessment?.assessmentId],
    queryFn: async () => {
      if (!selectedUserAssessment) return null;
      
      const { data, error } = await supabase
        .from('submissions')
        .select('face_violations, recording_url')
        .eq('user_id', selectedUserAssessment.userId)
        .eq('assessment_id', selectedUserAssessment.assessmentId);
      
      if (error) throw error;
      
      // Find the record with data
      const recordWithData = data.find(record => 
        (record.face_violations && record.face_violations.length > 0) || 
        record.recording_url
      );
      
      return recordWithData || { face_violations: [], recording_url: null };
    },
    enabled: !!selectedUserAssessment
  });

  // Fetch assessment details if assessmentId is provided
  const { data: assessmentDetails } = useQuery({
    queryKey: ['assessment-details', assessmentId, orgAssessments],
    queryFn: async () => {
      if (!assessmentId || !orgAssessments) return null;
      
      // Verify the assessment is in the assigned list
      const assessment = orgAssessments.find(a => a.id === assessmentId);
      if (!assessment) return null;
      
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId && !!user?.id && user?.role === 'admin' && !!orgAssessments
  });

  // Filter results based on search term
  const filteredResults = results?.filter(result => 
    result.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (result.userEmail && result.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (result.userPrn && result.userPrn.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Calculate statistics for the results
  const stats = React.useMemo(() => {
    if (!filteredResults.length) {
      return { avgScore: 0, passRate: 0, avgTime: 0 };
    }

    const totalPercentage = filteredResults.reduce((sum, result) => sum + result.percentage, 0);
    const passCount = filteredResults.filter(result => result.percentage >= PASS_THRESHOLD).length;
    
    return {
      avgScore: parseFloat((totalPercentage / filteredResults.length).toFixed(1)),
      passRate: parseFloat(((passCount / filteredResults.length) * 100).toFixed(1)),
      avgTime: 30 // Placeholder
    };
  }, [filteredResults]);

  // Generate pie chart data for pass/fail distribution
  const pieData = [
    { name: "Passed", value: filteredResults.filter(r => r.percentage >= PASS_THRESHOLD).length },
    { name: "Failed", value: filteredResults.filter(r => r.percentage < PASS_THRESHOLD).length }
  ];

  // Generate time series data for score trends
  const generateTimeSeriesData = () => {
    if (!filteredResults.length) return [];
    
    // Group results by date
    const dateMap = new Map();
    
    filteredResults.forEach(result => {
      const date = new Date(result.completed_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { sum: 0, count: 0 });
      }
      
      const entry = dateMap.get(date);
      entry.sum += result.percentage;
      entry.count += 1;
    });
    
    // Convert to array for chart
    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        avgScore: Math.round(data.sum / data.count)
      }))
      .sort((a, b) => {
        // Simple sort by month and day (not perfect but works for basic cases)
        const monthA = new Date(`${a.date} 2023`).getMonth();
        const monthB = new Date(`${b.date} 2023`).getMonth();
        
        if (monthA !== monthB) return monthA - monthB;
        
        const dayA = parseInt(a.date.split(' ')[1]);
        const dayB = parseInt(b.date.split(' ')[1]);
        return dayA - dayB;
      });
  };

  const timeSeriesData = generateTimeSeriesData();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewProctoring = (userId: string, assessmentId: string) => {
    setSelectedUserAssessment({ userId, assessmentId });
    setProctoringDialogOpen(true);
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading results: {(error as any).message}</p>
      </div>
    );
  }

  if (isLoading || isLoadingAssessments || isLoadingOrg) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {assessmentId && assessmentDetails 
            ? `Results: ${assessmentDetails.name} (${assessmentDetails.code})`
            : "Organization Results"
          }
        </h1>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setAskAIOpen(true)}
            className="flex items-center gap-2"
          >
            <Bot className="h-4 w-4" />
            Ask AI
          </Button>
          {assessmentId && (
            <Button variant="outline" asChild>
              <Link to="/results">View All Results</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredResults.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Score Trend</CardTitle>
            <CardDescription>Average scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {timeSeriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name="Avg. Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-full">
                  <p className="text-gray-500">No trend data available.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pass/Fail Distribution</CardTitle>
            <CardDescription>Assessment outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {filteredResults.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500">No data available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Results</CardTitle>
          <div className="pt-3">
            <Input
              placeholder="Search by name, email, or PRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Student</th>
                  {!assessmentId && (
                    <th className="text-left py-3 px-4">Assessment</th>
                  )}
                  <th className="text-center py-3 px-4">Score</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Cheating</th>
                  <th className="text-center py-3 px-4">Submitted At</th>
                  <th className="text-center py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length > 0 ? (
                  filteredResults.map((result) => (
                    <tr key={result.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{result.userName}</div>
                          {result.userPrn && (
                            <div className="text-xs text-gray-500">{result.userPrn}</div>
                          )}
                        </div>
                      </td>
                      {!assessmentId && (
                        <td className="py-3 px-4">
                          <Link 
                            to={`/results/${result.assessment_id}`}
                            className="text-yudha-600 hover:underline"
                          >
                            {result.assessment?.name} ({result.assessment?.code})
                          </Link>
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        {result.percentage}% ({result.total_score}/{result.total_marks})
                      </td>
                      <td className="py-3 px-4 text-center">
                        {result.percentage >= PASS_THRESHOLD ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Passed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">Failed</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {result.is_cheated ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Flagged</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Clean</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">{formatDate(result.completed_at)}</td>
                      <td className="py-3 px-4 text-center">
                        {result.assessment?.is_ai_proctored ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProctoring(result.user_id, result.assessment_id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={assessmentId ? 6 : 7} className="text-center py-8">
                      <p className="text-gray-500">No results found for organization students.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Proctoring Data Dialog */}
      <Dialog open={proctoringDialogOpen} onOpenChange={setProctoringDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proctoring Data</DialogTitle>
          </DialogHeader>
          
          {isProctoringLoading ? (
            <div className="flex justify-center items-center h-32">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Face Violations */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Face Violations</h3>
                {proctoringData?.face_violations && proctoringData.face_violations.length > 0 ? (
                  <div className="space-y-2">
                    {proctoringData.face_violations.map((violation: any, index: number) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="text-sm">
                          <strong>Type:</strong> {violation.type || 'Unknown'}
                        </div>
                        {violation.timestamp && (
                          <div className="text-sm text-gray-600">
                            <strong>Time:</strong> {new Date(violation.timestamp).toLocaleString()}
                          </div>
                        )}
                        {violation.confidence && (
                          <div className="text-sm text-gray-600">
                            <strong>Confidence:</strong> {(violation.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No face violations recorded.</p>
                )}
              </div>

              {/* Recording Video */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Recording</h3>
                {proctoringData?.recording_url ? (
                  <video 
                    controls 
                    className="w-full max-w-2xl rounded-md"
                    preload="metadata"
                  >
                    <source src={proctoringData.recording_url} type="video/webm" />
                    <source src={proctoringData.recording_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <p className="text-gray-500">No recording available.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AskAIDialog
        open={askAIOpen}
        onOpenChange={setAskAIOpen}
        assessmentId={assessmentId}
        assessmentName={assessmentDetails?.name}
        allAssessments={orgAssessments}
        resultsData={filteredResults}
      />
    </div>
  );
};

export default Results;
