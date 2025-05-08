
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
import { AssessmentResult } from "@/types/assessment";

// Mock data for assessment results
const mockResults: AssessmentResult[] = [
  {
    id: "1",
    assessmentId: "1",
    userId: "user1",
    userName: "John Doe",
    score: 85,
    percentageScore: 85,
    timeTaken: 32,
    passed: true,
    submittedAt: "2025-04-30T14:25:00Z",
  },
  {
    id: "2",
    assessmentId: "1",
    userId: "user2",
    userName: "Jane Smith",
    score: 92,
    percentageScore: 92,
    timeTaken: 28,
    passed: true,
    submittedAt: "2025-04-30T15:10:00Z",
  },
  {
    id: "3",
    assessmentId: "1",
    userId: "user3",
    userName: "Mike Johnson",
    score: 78,
    percentageScore: 78,
    timeTaken: 40,
    passed: true,
    submittedAt: "2025-05-01T09:45:00Z",
  },
  {
    id: "4",
    assessmentId: "1",
    userId: "user4",
    userName: "Sarah Williams",
    score: 65,
    percentageScore: 65,
    timeTaken: 42,
    passed: true,
    submittedAt: "2025-05-01T11:30:00Z",
  },
  {
    id: "5",
    assessmentId: "1",
    userId: "user5",
    userName: "Robert Brown",
    score: 45,
    percentageScore: 45,
    timeTaken: 38,
    passed: false,
    submittedAt: "2025-05-02T10:15:00Z",
  },
];

const timeSeriesData = [
  { date: "04/29", avgScore: 82 },
  { date: "04/30", avgScore: 88 },
  { date: "05/01", avgScore: 72 },
  { date: "05/02", avgScore: 65 },
  { date: "05/03", avgScore: 76 },
  { date: "05/04", avgScore: 80 },
  { date: "05/05", avgScore: 74 },
];

const COLORS = ["#8884d8", "#FF8042"];

const Results: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId?: string }>();
  const [searchTerm, setSearchTerm] = useState("");

  // All results if no assessmentId is specified, otherwise filter by assessmentId
  const filteredResults = assessmentId
    ? mockResults.filter((result) => result.assessmentId === assessmentId)
    : mockResults;

  const searchedResults = filteredResults.filter((result) =>
    result.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const passCount = filteredResults.filter((result) => result.passed).length;
  const avgScore = filteredResults.reduce((acc, curr) => acc + curr.score, 0) / filteredResults.length;
  const avgTime = filteredResults.reduce((acc, curr) => acc + curr.timeTaken, 0) / filteredResults.length;

  const pieData = [
    { name: "Passed", value: passCount },
    { name: "Failed", value: filteredResults.length - passCount },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {assessmentId ? "Assessment Results" : "All Results"}
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
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((passCount / filteredResults.length) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTime.toFixed(1)} min</div>
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
              placeholder="Search by user name..."
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
                  <th className="text-left py-3 px-4">User</th>
                  <th className="text-center py-3 px-4">Score</th>
                  <th className="text-center py-3 px-4">Time Taken</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {searchedResults.map((result) => (
                  <tr key={result.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{result.userName}</td>
                    <td className="py-3 px-4 text-center">{result.score}%</td>
                    <td className="py-3 px-4 text-center">{result.timeTaken} min</td>
                    <td className="py-3 px-4 text-center">
                      {result.passed ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Passed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">Failed</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{formatDate(result.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {searchedResults.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500">No results found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Results;
