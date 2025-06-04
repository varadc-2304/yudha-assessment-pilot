
export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Assessment {
  id: string;
  name: string;
  code: string;
  description?: string;
  instructions?: string;
  duration_minutes: number;
  start_time: string;
  end_time?: string | null;
  created_at: string;
  updated_at?: string;
  is_practice: boolean;
  is_dynamic?: boolean;
  is_ai_proctored?: boolean;
  reattempt: boolean;
  status?: string;
  created_by?: string | null;
  questions?: Question[];
}

export interface MCQQuestion {
  id: string;
  type: "mcq";
  question: string;
  description?: string;
  options: MCQOption[];
  marks: number;
  assessmentId?: string;
  assessment?: { name: string, code: string };
  imageUrl?: string | null;
  orderIndex?: number;
}

export interface CodingQuestion {
  id: string;
  type: "coding";
  question: string;
  description?: string;
  sampleInput?: string;
  sampleOutput?: string;
  marks: number;
  language: "c" | "cpp" | "java" | "python";
  supportedLanguages?: string[];
  timeLimit?: number; // in seconds
  assessmentId?: string;
  assessment?: { name: string, code: string };
  imageUrl?: string | null;
  orderIndex?: number;
  examples?: CodingExample[];
  testCases?: TestCase[];
}

export interface CodingExample {
  id: string;
  input: string;
  output: string;
  explanation?: string;
  orderIndex: number;
}

export interface TestCase {
  id: string;
  input: string;
  output: string;
  marks: number;
  isHidden: boolean;
  orderIndex: number;
}

export interface CodingLanguage {
  id: string;
  coding_question_id: string;
  coding_lang: string;
  solution_template: string;
  constraints?: string[];
}

export type Question = MCQQuestion | CodingQuestion;

export interface AssessmentResult {
  id: string;
  assessment_id: string;
  user_id: string;
  userName: string;
  total_score: number;
  percentage: number;
  total_marks: number;
  completed_at: string;
  created_at: string;
  is_cheated?: boolean;
}

export interface Submission {
  id: string;
  assessment_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string | null;
  is_terminated?: boolean;
  fullscreen_violations?: number;
}

export interface QuestionSubmission {
  id: string;
  submission_id: string;
  question_id: string;
  question_type: string;
  marks_obtained: number;
  mcq_option_id?: string;
  code_solution?: string;
  language?: string;
  test_results?: any;
  is_correct?: boolean;
}

// Assessment stats for dashboard
export interface AssessmentStats {
  totalAssessments: number;
  totalSubmissions: number;
  averageScore: number;
  passRate: number;
}
