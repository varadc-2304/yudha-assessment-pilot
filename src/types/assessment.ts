
export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MCQQuestion {
  id: string;
  type: "mcq";
  question: string;
  options: MCQOption[];
  marks: number;
}

export interface CodingQuestion {
  id: string;
  type: "coding";
  question: string;
  sampleInput?: string;
  sampleOutput?: string;
  marks: number;
  language: "javascript" | "python" | "java" | "cpp";
  timeLimit?: number; // in seconds
}

export type Question = MCQQuestion | CodingQuestion;

export interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  passingScore: number;
  totalMarks: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  userId: string;
  userName: string;
  score: number;
  percentageScore: number;
  timeTaken: number; // in minutes
  passed: boolean;
  submittedAt: string;
}

// Assessment stats for dashboard
export interface AssessmentStats {
  totalAssessments: number;
  totalSubmissions: number;
  averageScore: number;
  passRate: number;
}
