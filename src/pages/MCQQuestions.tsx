
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Plus } from "lucide-react";
import { MCQQuestion } from "@/types/assessment";

// Mock data for MCQ questions
const mockMCQQuestions: MCQQuestion[] = [
  {
    id: "1",
    type: "mcq",
    question: "What is the correct way to declare a variable in JavaScript?",
    options: [
      { id: "1a", text: "var x = 5;", isCorrect: false },
      { id: "1b", text: "let x = 5;", isCorrect: true },
      { id: "1c", text: "const x = 5;", isCorrect: false },
      { id: "1d", text: "All of the above", isCorrect: false },
    ],
    marks: 5,
  },
  {
    id: "2",
    type: "mcq",
    question: "Which hook is used for side effects in React?",
    options: [
      { id: "2a", text: "useState", isCorrect: false },
      { id: "2b", text: "useEffect", isCorrect: true },
      { id: "2c", text: "useContext", isCorrect: false },
      { id: "2d", text: "useReducer", isCorrect: false },
    ],
    marks: 5,
  },
  {
    id: "3",
    type: "mcq",
    question: "What does CSS stand for?",
    options: [
      { id: "3a", text: "Computer Style Sheets", isCorrect: false },
      { id: "3b", text: "Creative Style Sheets", isCorrect: false },
      { id: "3c", text: "Cascading Style Sheets", isCorrect: true },
      { id: "3d", text: "Colorful Style Sheets", isCorrect: false },
    ],
    marks: 3,
  },
];

const MCQQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<MCQQuestion[]>(mockMCQQuestions);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredQuestions = questions.filter((question) =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">MCQ Questions</h1>
        <Button className="bg-yudha-600 hover:bg-yudha-700">
          <Plus className="mr-2 h-4 w-4" />
          Add MCQ Question
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Search Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              placeholder="Search questions..."
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {question.options.map((option) => (
                    <div 
                      key={option.id} 
                      className={`
                        p-3 rounded-md border flex items-start
                        ${option.isCorrect ? "border-green-400 bg-green-50" : "border-gray-200"}
                      `}
                    >
                      {option.isCorrect && (
                        <Check className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      )}
                      <span>{option.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-lg text-gray-500">No questions found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MCQQuestions;
