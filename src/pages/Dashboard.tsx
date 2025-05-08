
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, FileText, Users, CheckCircle } from "lucide-react";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Mock data for the dashboard
const assessmentStatsData = {
  totalAssessments: 24,
  totalSubmissions: 256,
  averageScore: 76.4,
  passRate: 82.1,
};

const recentAssessments = [
  { id: "1", title: "JavaScript Fundamentals", submissions: 45, avgScore: 78 },
  { id: "2", title: "React Components & Hooks", submissions: 32, avgScore: 82 },
  { id: "3", title: "Data Structures Basics", submissions: 28, avgScore: 71 },
  { id: "4", title: "API Integration Test", submissions: 19, avgScore: 65 },
];

const chartData = [
  { name: "JavaScript", submissions: 68, avgScore: 78 },
  { name: "React", submissions: 52, avgScore: 82 },
  { name: "Data Structures", submissions: 41, avgScore: 71 },
  { name: "API Integration", submissions: 38, avgScore: 65 },
  { name: "Python Basics", submissions: 32, avgScore: 88 },
  { name: "SQL", submissions: 25, avgScore: 72 },
];

const Dashboard: React.FC = () => {
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
            <div className="text-2xl font-bold">{assessmentStatsData.totalAssessments}</div>
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
            <div className="text-2xl font-bold">{assessmentStatsData.totalSubmissions}</div>
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
            <div className="text-2xl font-bold">{assessmentStatsData.averageScore}%</div>
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
            <div className="text-2xl font-bold">{assessmentStatsData.passRate}%</div>
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
            Submissions and average scores by assessment category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Assessment</th>
                  <th className="text-center py-3 px-4 font-medium">Submissions</th>
                  <th className="text-center py-3 px-4 font-medium">Avg. Score</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((assessment) => (
                  <tr key={assessment.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{assessment.title}</td>
                    <td className="py-3 px-4 text-center">{assessment.submissions}</td>
                    <td className="py-3 px-4 text-center">{assessment.avgScore}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
