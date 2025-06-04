
export interface MCQQuestionBank {
  id: string;
  title: string;
  description: string;
  marks: number;
  image_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  options: MCQOptionBank[];
}

export interface MCQOptionBank {
  id: string;
  mcq_question_bank_id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export interface CodingQuestionBank {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  examples: CodingExampleBank[];
  languages: CodingLanguageBank[];
  testCases: TestCaseBank[];
}

export interface CodingExampleBank {
  id: string;
  coding_question_bank_id: string;
  input: string;
  output: string;
  explanation?: string;
  order_index: number;
}

export interface CodingLanguageBank {
  id: string;
  coding_question_bank_id: string;
  coding_lang: string;
  solution_template: string;
  constraints?: string;
}

export interface TestCaseBank {
  id: string;
  coding_question_bank_id: string;
  input: string;
  output: string;
  marks: number;
  is_hidden: boolean;
  order_index: number;
}
