
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";
import { CodingQuestion } from "@/types/assessment";

// Mock data for Coding questions
const mockCodingQuestions: CodingQuestion[] = [
  {
    id: "1",
    type: "coding",
    question: "Write a function to find the sum of all elements in an array.",
    sampleInput: "[1, 2, 3, 4, 5]",
    sampleOutput: "15",
    marks: 10,
    language: "javascript",
    timeLimit: 300,
  },
  {
    id: "2",
    type: "coding",
    question: "Create a function that reverses a string.",
    sampleInput: "hello",
    sampleOutput: "olleh",
    marks: 8,
    language: "python",
    timeLimit: 240,
  },
  {
    id: "3",
    type: "coding",
    question: "Implement a binary search algorithm.",
    sampleInput: "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], target = 7",
    sampleOutput: "6",
    marks: 15,
    language: "java",
    timeLimit: 600,
  },
];

const languageColors: Record<string, string> = {
  javascript: "bg-yellow-100 text-yellow-800",
  python: "bg-blue-100 text-blue-800",
  java: "bg-red-100 text-red-800",
  cpp: "bg-purple-100 text-purple-800",
};

const CodingQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<CodingQuestion[]>(mockCodingQuestions);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredQuestions = questions.filter((question) =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return "No limit";
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coding Questions</h1>
        <Button className="bg-yudha-600 hover:bg-yudha-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Coding Question
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Search Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="Search coding questions..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((question) => (
            <Card key={question.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">
                    <span className="mr-2">Q:</span>
                    {question.question}
                  </CardTitle>
                  <span className="bg-yudha-100 text-yudha-800 text-xs px-2 py-1 rounded">
                    {question.marks} marks
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Badge className={`${languageColors[question.language]} hover:${languageColors[question.language]}`}>
                    {question.language.charAt(0).toUpperCase() + question.language.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(question.timeLimit)}
                  </Badge>
                </div>
                
                {(question.sampleInput || question.sampleOutput) && (
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {question.sampleInput && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Sample Input:</h4>
                        <div className="bg-gray-50 p-3 rounded border font-mono text-sm">
                          {question.sampleInput}
                        </div>
                      </div>
                    )}
                    {question.sampleOutput && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Sample Output:</h4>
                        <div className="bg-gray-50 p-3 rounded border font-mono text-sm">
                          {question.sampleOutput}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-lg text-gray-500">No coding questions found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodingQuestions;
