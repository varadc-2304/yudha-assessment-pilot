
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, FileText, Users, CheckCircle } from "lucide-react";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Dashboard: React.FC = () => {
  // Query to fetch assessment stats
  const { data: assessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['all-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Query to fetch results stats
  const { data: results, isLoading: isLoadingResults } = useQuery({
    queryKey: ['all-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('results')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate statistics based on fetched data
  const stats = React.useMemo(() => {
    if (!assessments || !results) {
      return {
        totalAssessments: 0,
        totalSubmissions: 0,
        averageScore: 0,
        passRate: 0,
      };
    }

    const totalAssessments = assessments.length;
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

    return {
      totalAssessments,
      totalSubmissions,
      averageScore,
      passRate,
    };
  }, [assessments, results]);

  // Query to fetch recent assessment data
  const { data: recentAssessments, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['recent-assessments'],
    queryFn: async () => {
      // Fetch the most recent assessments
      const { data: recentAssessments, error: assessmentError } = await supabase
        .from('assessments')
        .select('id, name, code')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (assessmentError) throw assessmentError;

      // For each assessment, get submission count and average score
      const assessmentData = await Promise.all(
        recentAssessments.map(async (assessment) => {
          const { data: assessmentResults, error: resultsError } = await supabase
            .from('results')
            .select('percentage')
            .eq('assessment_id', assessment.id);
          
          if (resultsError) throw resultsError;
          
          const submissions = assessmentResults?.length || 0;
          const totalScore = assessmentResults?.reduce((sum, result) => sum + result.percentage, 0) || 0;
          const avgScore = submissions > 0 ? Math.round(totalScore / submissions) : 0;
          
          return {
            id: assessment.id,
            title: assessment.name,
            code: assessment.code,
            submissions,
            avgScore
          };
        })
      );
      
      return assessmentData;
    }
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

  const isLoading = isLoadingAssessments || isLoadingResults || isLoadingRecent;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="h-4 w-4 text-yudha-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              Assessment templates available
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Users className="h-4 w-4 text-yudha-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              Across all assessments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart className="h-4 w-4 text-yudha-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              Mean score percentage
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-yudha-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passRate}%</div>
            <p className="text-xs text-muted-foreground">
              Assessment completion rate
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assessment Analytics</CardTitle>
          <CardDescription>
            Submissions and average scores by assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="submissions" fill="#8884d8" name="Submissions" />
                  <Bar yAxisId="right" dataKey="avgScore" fill="#82ca9d" name="Avg. Score (%)" />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">No assessment data available.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Assessments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
          <CardDescription>
            Latest assessment performance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {recentAssessments && recentAssessments.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Assessment</th>
                    <th className="text-center py-3 px-4 font-medium">Code</th>
                    <th className="text-center py-3 px-4 font-medium">Submissions</th>
                    <th className="text-center py-3 px-4 font-medium">Avg. Score</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.map((assessment) => (
                    <tr key={assessment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{assessment.title}</td>
                      <td className="py-3 px-4 text-center">{assessment.code}</td>
                      <td className="py-3 px-4 text-center">{assessment.submissions}</td>
                      <td className="py-3 px-4 text-center">{assessment.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No assessment data available.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
