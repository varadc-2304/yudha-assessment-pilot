
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, FileText, Users, CheckCircle, TrendingUp, Award, Clock, Target } from "lucide-react";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  console.log("Dashboard - Current user:", user);
  console.log("Dashboard - User organization_id:", user?.organization_id);

  // Query to fetch organization and its assigned assessments
  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      console.log("Dashboard - Fetching organization for ID:", user?.organization_id);
      const { data, error } = await supabase
        .from('organizations')
        .select('assigned_assessments_code')
        .eq('id', user?.organization_id)
        .single();
      
      if (error) {
        console.error("Dashboard - Error fetching organization:", error);
        throw error;
      }
      console.log("Dashboard - Organization data:", data);
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization_id
  });

  // Query to fetch only assigned assessments
  const { data: assessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['organization-assessments', user?.organization_id, organization?.assigned_assessments_code],
    queryFn: async () => {
      console.log("Dashboard - Fetching assessments for organization");
      const assignedCodes = organization?.assigned_assessments_code || [];
      console.log("Dashboard - Assigned codes:", assignedCodes);
      
      if (assignedCodes.length === 0) {
        console.log("Dashboard - No assigned codes found");
        return [];
      }

      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .in('code', assignedCodes)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Dashboard - Error fetching assessments:", error);
        throw error;
      }
      console.log("Dashboard - Fetched assessments:", data);
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!organization
  });

  // Query to fetch organization students
  const { data: orgStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['organization-students', user?.organization_id],
    queryFn: async () => {
      console.log("Dashboard - Fetching organization students");
      const { data, error } = await supabase
        .from('auth')
        .select('id')
        .eq('organization_id', user?.organization_id)
        .eq('role', 'student');
      
      if (error) {
        console.error("Dashboard - Error fetching students:", error);
        throw error;
      }
      console.log("Dashboard - Organization students:", data);
      return data;
    },
    enabled: !!user?.id && user?.role === 'admin' && !!user?.organization_id
  });

  // Query to fetch results for assigned assessments only from organization students
  const { data: results, isLoading: isLoadingResults } = useQuery({
    queryKey: ['organization-results', user?.organization_id, assessments, orgStudents],
    queryFn: async () => {
      console.log("Dashboard - Fetching results");
      if (!assessments || assessments.length === 0 || !orgStudents || orgStudents.length === 0) {
        console.log("Dashboard - No assessments or students available");
        return [];
      }
      
      const assessmentIds = assessments.map(a => a.id);
      const studentIds = orgStudents.map(s => s.id);
      console.log("Dashboard - Assessment IDs:", assessmentIds);
      console.log("Dashboard - Student IDs:", studentIds);
      
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .in('assessment_id', assessmentIds)
        .in('user_id', studentIds);
      
      if (error) {
        console.error("Dashboard - Error fetching results:", error);
        throw error;
      }
      console.log("Dashboard - Fetched results:", data);
      return data;
    },
    enabled: !!assessments && assessments.length > 0 && !!orgStudents && orgStudents.length > 0
  });

  // Calculate statistics based on fetched data
  const stats = React.useMemo(() => {
    if (!assessments || !results || !orgStudents) {
      return {
        totalAssessments: 0,
        totalSubmissions: 0,
        averageScore: 0,
        passRate: 0,
      };
    }

    // Only count assessments that have been attempted by organization students
    const attemptedAssessmentIds = new Set(results.map(r => r.assessment_id));
    const attemptedAssessments = assessments.filter(a => attemptedAssessmentIds.has(a.id));
    
    const totalAssessments = attemptedAssessments.length;
    const totalSubmissions = results.length;
    
    let totalScorePercentage = 0;
    let passCount = 0;

    results.forEach(result => {
      totalScorePercentage += result.percentage;
      if (result.percentage >= 60) { // Assuming 60% is passing
        passCount++;
      }
    });

    const averageScore = totalSubmissions > 0 
      ? parseFloat((totalScorePercentage / totalSubmissions).toFixed(1))
      : 0;
      
    const passRate = totalSubmissions > 0
      ? parseFloat(((passCount / totalSubmissions) * 100).toFixed(1))
      : 0;

    console.log("Dashboard - Stats:", { totalAssessments, totalSubmissions, averageScore, passRate });

    return {
      totalAssessments,
      totalSubmissions,
      averageScore,
      passRate,
    };
  }, [assessments, results, orgStudents]);

  // Query to fetch assessment analytics for attempted assessments only
  const { data: recentAssessments, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['organization-all-assessments', user?.organization_id, assessments, results],
    queryFn: async () => {
      if (!assessments || assessments.length === 0 || !results || results.length === 0) {
        console.log("Dashboard - No assessments or results for analytics");
        return [];
      }
      
      // Only include assessments that have been attempted
      const attemptedAssessmentIds = new Set(results.map(r => r.assessment_id));
      const attemptedAssessments = assessments.filter(a => attemptedAssessmentIds.has(a.id));
      
      console.log("Dashboard - Attempted assessments:", attemptedAssessments);
      
      // For each attempted assessment, calculate submission count and average score
      const assessmentData = attemptedAssessments.map(assessment => {
        const assessmentResults = results.filter(r => r.assessment_id === assessment.id);
        const submissions = assessmentResults.length;
        const totalScore = assessmentResults.reduce((sum, result) => sum + result.percentage, 0);
        const avgScore = submissions > 0 ? Math.round(totalScore / submissions) : 0;
        
        return {
          id: assessment.id,
          title: assessment.name,
          code: assessment.code,
          submissions,
          avgScore
        };
      });
      
      console.log("Dashboard - Assessment analytics data:", assessmentData);
      return assessmentData;
    },
    enabled: !!assessments && assessments.length > 0 && !!results && results.length > 0
  });

  // Generate chart data based on recent assessments
  const chartData = React.useMemo(() => {
    if (!recentAssessments) return [];
    
    return recentAssessments.map(assessment => ({
      name: assessment.code,
      submissions: assessment.submissions,
      avgScore: assessment.avgScore
    }));
  }, [recentAssessments]);

  const isLoading = isLoadingAssessments || isLoadingResults || isLoadingRecent || isLoadingStudents;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Attempted Assessments",
      value: stats.totalAssessments,
      description: "Assessments with student submissions",
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      change: "+12%"
    },
    {
      title: "Total Submissions",
      value: stats.totalSubmissions,
      description: "From organization students",
      icon: Users,
      gradient: "from-green-500 to-green-600",
      change: "+18%"
    },
    {
      title: "Average Score",
      value: `${stats.averageScore}%`,
      description: "Organization-wide performance",
      icon: Target,
      gradient: "from-purple-500 to-purple-600",
      change: "+5%"
    },
    {
      title: "Pass Rate",
      value: `${stats.passRate}%`,
      description: "Students above 60% threshold",
      icon: Award,
      gradient: "from-orange-500 to-orange-600",
      change: "+8%"
    }
  ];

  return (
    <div className="section-spacing">
      {/* Header Section */}
      <div className="page-header">
        <h1 className="page-title">Organization Dashboard</h1>
        <p className="page-subtitle">
          Monitor assessment performance and track organizational metrics
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={stat.title} className="card-modern card-interactive animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                  <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                <stat.icon size={20} className="text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Chart Section */}
      <Card className="card-modern animate-fade-in" style={{ animationDelay: '400ms' }}>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Assessment Analytics</CardTitle>
              <CardDescription className="mt-1">
                Performance metrics for attempted assessments
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp size={20} className="text-green-500" />
              <span className="text-sm font-medium text-green-600">Trending Up</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  className="rounded-lg"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left" 
                    dataKey="submissions" 
                    fill="#3b82f6" 
                    name="Submissions" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="right" 
                    dataKey="avgScore" 
                    fill="#10b981" 
                    name="Avg. Score (%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <BarChart size={48} className="text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-muted-foreground font-medium">No assessment data available</p>
                  <p className="text-sm text-muted-foreground/70">Data will appear when students attempt assessments</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Assessments Table */}
      <Card className="card-modern animate-fade-in" style={{ animationDelay: '600ms' }}>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Attempted Assessments</CardTitle>
              <CardDescription className="mt-1">
                Performance data for assessments with student submissions
              </CardDescription>
            </div>
            <Clock size={20} className="text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {recentAssessments && recentAssessments.length > 0 ? (
            <div className="table-modern">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header text-left">Assessment</th>
                    <th className="table-header text-center">Code</th>
                    <th className="table-header text-center">Submissions</th>
                    <th className="table-header text-center">Avg. Score</th>
                    <th className="table-header text-center">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.map((assessment, index) => (
                    <tr key={assessment.id} className="table-row">
                      <td className="table-cell">
                        <div className="font-medium text-foreground">{assessment.title}</div>
                      </td>
                      <td className="table-cell text-center">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {assessment.code}
                        </code>
                      </td>
                      <td className="table-cell text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {assessment.submissions}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="font-semibold text-foreground">{assessment.avgScore}%</span>
                      </td>
                      <td className="table-cell text-center">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${assessment.avgScore}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <FileText size={48} className="mx-auto text-muted-foreground/50" />
              <div>
                <p className="text-muted-foreground font-medium">No attempted assessments available</p>
                <p className="text-sm text-muted-foreground/70">Data will appear when students from your organization attempt assessments</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
