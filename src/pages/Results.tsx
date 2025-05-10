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

const COLORS = ["#8884d8", "#FF8042"];
const PASS_THRESHOLD = 60; // Assuming 60% is passing

const Results: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId?: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  // First, fetch all assessments created by this admin
  const { data: adminAssessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['admin-assessments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('id')
        .eq('created_by', user?.id);
      
      if (error) throw error;
      return data.map(a => a.id);
    },
    enabled: !!user?.id
  });

  // Fetch results data
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['results', assessmentId, user?.id],
    queryFn: async () => {
      // If specific assessment ID is provided, check if it belongs to current admin
      if (assessmentId) {
        const { data: assessmentCheck, error: checkError } = await supabase
          .from('assessments')
          .select('created_by')
          .eq('id', assessmentId)
          .single();
        
        if (checkError) throw checkError;
        
        // If assessment doesn't belong to current admin, return empty
        if (assessmentCheck && assessmentCheck.created_by !== user?.id) {
          return [];
        }
        
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
          assessments(name, code),
          auth(name, email, prn, department)
        `)
        .eq('assessment_id', assessmentId);
        
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
            code: result.assessments.code
          }
        }));
      } 
      // If no specific assessment ID, fetch results for all of admin's assessments
      else {
        if (!adminAssessments || adminAssessments.length === 0) {
          return [];
        }
        
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
          assessments(name, code),
          auth(name, email, prn, department)
        `)
        .in('assessment_id', adminAssessments);
        
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
            code: result.assessments.code
          }
        }));
      }
    },
    enabled: !!user?.id && (!!assessmentId || (!!adminAssessments && adminAssessments.length > 0))
  });

  // Fetch assessment details if assessmentId is provided
  const { data: assessmentDetails } = useQuery({
    queryKey: ['assessment-details', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return null;
      
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('created_by', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId && !!user?.id
  });

  // Filter results based on search term
  const filteredResults = results?.filter(result => 
    result.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (result.userEmail && result.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (result.userPrn && result.userPrn.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (result.userDepartment && result.userDepartment.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Calculate statistics for the results
  const stats = React.useMemo(() => {
    if (!filteredResults.length) {
      return { avgScore: 0, passRate: 0, avgTime: 0 };
    }

    const totalPercentage = filteredResults.reduce((sum, result) => sum + result.percentage, 0);
    const passCount = filteredResults.filter(result => result.percentage >= PASS_THRESHOLD).length;
    
    // Average time calculation would require submission data which we don't have here
    // For now, we'll use a placeholder
    
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
  // This is a simplified version since we don't have time series data
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

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading results: {(error as any).message}</p>
      </div>
    );
  }

  if (isLoading || isLoadingAssessments) {
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
            : "All Results"
          }
        </h1>
        {assessmentId && (
          <Button variant="outline" asChild>
            <Link to="/results">View All Results</Link>
          </Button>
        )}
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
              placeholder="Search by name, email, PRN, or department..."
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
                  <th className="text-center py-3 px-4">Department</th>
                  <th className="text-center py-3 px-4">Score</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Submitted At</th>
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
                        {result.userDepartment || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {result.percentage}% ({result.total_score}/{result.total_marks})
                      </td>
                      <td className="py-3 px-4 text-center">
                        {result.percentage >= PASS_THRESHOLD ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Passed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">Failed</Badge>
                        )}
                        {result.is_cheated && (
                          <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800">Flagged</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">{formatDate(result.completed_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={assessmentId ? 5 : 6} className="text-center py-8">
                      <p className="text-gray-500">No results found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Results;
