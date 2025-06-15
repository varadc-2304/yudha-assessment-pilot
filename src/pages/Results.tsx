import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AssessmentResult, FaceViolation, ProctoringData } from "@/types/assessment";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Eye, Shield, AlertTriangle, CheckCircle, Video, Clock, User2, Calendar } from "lucide-react";
import AskAIDialog from "@/components/results/AskAIDialog";
import VideoPlayer from "@/components/video/VideoPlayer";
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

  console.log("Current user:", user);
  console.log("User organization_id:", user?.organization_id);

  // First, fetch organization and its assigned assessments
  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      console.log("Fetching organization for ID:", user?.organization_id);
      const { data, error } = await supabase
        .from('organizations')
        .select('assigned_assessments_code')
        .eq('id', user?.organization_id)
        .single();
      
      if (error) {
        console.error("Error fetching organization:", error);
        throw error;
      }
      console.log("Organization data:", data);
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization_id
  });

  // Fetch assigned assessments
  const { data: orgAssessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['org-assessments', user?.organization_id, organization?.assigned_assessments_code],
    queryFn: async () => {
      console.log("Fetching assessments for organization");
      const assignedCodes = organization?.assigned_assessments_code || [];
      console.log("Assigned codes:", assignedCodes);
      
      if (assignedCodes.length === 0) {
        console.log("No assigned codes found");
        return [];
      }

      const { data, error } = await supabase
        .from('assessments')
        .select('id, name, code')
        .in('code', assignedCodes);
      
      if (error) {
        console.error("Error fetching assessments:", error);
        throw error;
      }
      console.log("Fetched assessments:", data);
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!organization
  });

  // Fetch results data for assigned assessments only
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['results', assessmentId, user?.organization_id, orgAssessments],
    queryFn: async () => {
      console.log("Fetching results data");
      console.log("orgAssessments:", orgAssessments);
      
      if (!orgAssessments || orgAssessments.length === 0) {
        console.log("No org assessments available");
        return [];
      }

      // If specific assessment ID is provided, verify it's in assigned assessments
      let assessmentIds: string[] = [];
      
      if (assessmentId) {
        console.log("Checking specific assessment ID:", assessmentId);
        if (orgAssessments.some(a => a.id === assessmentId)) {
          assessmentIds = [assessmentId];
          console.log("Assessment found in assigned list");
        } else {
          console.log("Assessment not in assigned list");
          return []; // Assessment not in assigned list
        }
      } else {
        assessmentIds = orgAssessments.map(a => a.id);
        console.log("Using all assessment IDs:", assessmentIds);
      }
      
      if (assessmentIds.length === 0) {
        console.log("No assessment IDs to query");
        return [];
      }
      
      // Get organization students only
      console.log("Fetching organization students");
      const { data: orgStudents, error: studentsError } = await supabase
        .from('auth')
        .select('id')
        .eq('organization_id', user?.organization_id)
        .eq('role', 'student');
      
      if (studentsError) {
        console.error("Error fetching students:", studentsError);
        throw studentsError;
      }
      
      console.log("Organization students:", orgStudents);
      
      if (!orgStudents || orgStudents.length === 0) {
        console.log("No students found in organization");
        return [];
      }
      
      const studentIds = orgStudents.map(s => s.id);
      console.log("Student IDs:", studentIds);
      
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
      
      if (error) {
        console.error("Error fetching results:", error);
        throw error;
      }
      
      console.log("Fetched results:", data);
      
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
      const recordWithData = data.find(record => {
        const violations = record.face_violations;
        return (violations && Array.isArray(violations) && violations.length > 0) || record.recording_url;
      });
      
      if (recordWithData) {
        // Convert face_violations to string array safely
        const violations = Array.isArray(recordWithData.face_violations) 
          ? recordWithData.face_violations.map(v => String(v))
          : [];
          
        return {
          face_violations: violations,
          recording_url: recordWithData.recording_url
        };
      }
      
      return { face_violations: [], recording_url: null };
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

  // Get student and assessment info for the dialog
  const getStudentInfo = () => {
    if (!selectedUserAssessment) return null;
    const result = filteredResults.find(r => 
      r.user_id === selectedUserAssessment.userId && 
      r.assessment_id === selectedUserAssessment.assessmentId
    );
    return result;
  };

  const studentInfo = getStudentInfo();

  if (error) {
    console.error("Results page error:", error);
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

  console.log("Final filtered results:", filteredResults);

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {!assessmentId && <TableHead>Assessment</TableHead>}
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Cheating</TableHead>
                <TableHead className="text-center">Submitted At</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length > 0 ? (
                filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{result.userName}</div>
                        {result.userPrn && (
                          <div className="text-xs text-gray-500">{result.userPrn}</div>
                        )}
                      </div>
                    </TableCell>
                    {!assessmentId && (
                      <TableCell>
                        <Link 
                          to={`/results/${result.assessment_id}`}
                          className="text-yudha-600 hover:underline"
                        >
                          {result.assessment?.name} ({result.assessment?.code})
                        </Link>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {result.percentage}% ({result.total_score}/{result.total_marks})
                    </TableCell>
                    <TableCell className="text-center">
                      {result.percentage >= PASS_THRESHOLD ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Passed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {result.is_cheated ? (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Flagged</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Clean</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{formatDate(result.completed_at)}</TableCell>
                    <TableCell className="text-center">
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
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={assessmentId ? 6 : 7} className="text-center py-8">
                    <p className="text-gray-500">No results found for organization students.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Enhanced Proctoring Data Dialog */}
      <Dialog open={proctoringDialogOpen} onOpenChange={setProctoringDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-slate-50 to-white">
          {/* Enhanced Header */}
          <DialogHeader className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-700/90"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-1">
                    AI Proctoring Analysis
                  </DialogTitle>
                  <p className="text-blue-100 text-sm font-medium">
                    Comprehensive monitoring and violation detection
                  </p>
                </div>
              </div>

              {/* Student Info Card */}
              {studentInfo && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <User2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-100 uppercase tracking-wide">Student</p>
                        <p className="text-white font-semibold">{studentInfo.userName}</p>
                        <p className="text-blue-100 text-sm">{studentInfo.userPrn}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-100 uppercase tracking-wide">Assessment</p>
                        <p className="text-white font-semibold">{studentInfo.assessment?.name}</p>
                        <p className="text-blue-100 text-sm">{studentInfo.assessment?.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-100 uppercase tracking-wide">Completed</p>
                        <p className="text-white font-semibold">{formatDate(studentInfo.completed_at)}</p>
                        <p className="text-blue-100 text-sm">Score: {studentInfo.percentage}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {isProctoringLoading ? (
              <div className="flex flex-col justify-center items-center h-96 bg-gray-50">
                <div className="p-4 bg-white rounded-full shadow-lg mb-4">
                  <LoadingSpinner size="lg" />
                </div>
                <p className="text-gray-600 font-medium">Analyzing proctoring data...</p>
                <p className="text-gray-500 text-sm">Please wait while we load the monitoring results</p>
              </div>
            ) : (
              <div className="p-8 space-y-8">
                {/* Recording Section */}
                {proctoringData?.recording_url ? (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Video className="h-6 w-6 text-white" />
                        <h3 className="text-xl font-bold text-white">Session Recording</h3>
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          Available
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6">
                      <VideoPlayer 
                        videoUrl={proctoringData.recording_url}
                        violations={proctoringData.face_violations}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                    <div className="text-center">
                      <div className="p-4 bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Video className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recording Available</h3>
                      <p className="text-gray-600">Session recording was not captured for this assessment.</p>
                    </div>
                  </div>
                )}

                {/* Violations Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-white" />
                        <h3 className="text-xl font-bold text-white">Violation Analysis</h3>
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {proctoringData?.face_violations?.length || 0} detected
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {proctoringData?.face_violations && proctoringData.face_violations.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              </div>
                              <div>
                                <p className="text-sm text-red-600 font-medium">Total Violations</p>
                                <p className="text-2xl font-bold text-red-700">{proctoringData.face_violations.length}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-amber-100 rounded-lg">
                                <Clock className="h-5 w-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm text-amber-600 font-medium">Risk Level</p>
                                <p className="text-lg font-bold text-amber-700">
                                  {proctoringData.face_violations.length > 5 ? 'High' : 
                                   proctoringData.face_violations.length > 2 ? 'Medium' : 'Low'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Shield className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm text-blue-600 font-medium">Status</p>
                                <p className="text-lg font-bold text-blue-700">
                                  {proctoringData.face_violations.length > 0 ? 'Flagged' : 'Clean'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Violation Log</h4>
                          {proctoringData.face_violations.map((violation, index) => {
                            const timestampMatch = violation.match(/\[(\d{2}):(\d{2})\]/);
                            return (
                              <div 
                                key={index} 
                                className="flex items-start gap-4 p-5 bg-gradient-to-r from-red-50 to-red-25 border border-red-200 rounded-xl hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex-shrink-0 mt-1">
                                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    {timestampMatch && (
                                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 font-mono">
                                        {timestampMatch[1]}:{timestampMatch[2]}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                      Violation Detected
                                    </Badge>
                                  </div>
                                  <p className="text-gray-800 font-medium leading-relaxed">
                                    {violation.replace(/\[\d{2}:\d{2}\]\s*/, '')}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="p-4 bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900 mb-2">Clean Session</h4>
                        <p className="text-gray-600 max-w-md mx-auto">
                          No violations were detected during this assessment session. The student maintained proper conduct throughout.
                        </p>
                        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                          <p className="text-green-800 font-medium">✓ Assessment completed with full integrity</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
