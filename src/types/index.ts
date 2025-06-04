export interface User {
  id: number;
  email: string;
  name?: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  user_id: number;
  title: string;
  description?: string;
  university_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Survey {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  scale_min: number;
  scale_max: number;
  max_questions: number;
  status: 'draft' | 'active' | 'inactive';
  access_link?: string;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  targetCount?: number;
  target?: number;
}

export interface Question {
  id: string;
  text: string;
  category: string;
  order: number;
  surveyId: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  organization: string;
  age: number;
  education: string;
  major: string;
  createdAt: Date;
}

export interface Response {
  id: string;
  studentId: string;
  surveyId: string;
  answers: Answer[];
  completedAt: Date;
  overallScore: number;
}

export interface Answer {
  questionId: string;
  value: number;
  category: string;
}

export interface Report {
  id: string;
  studentId: string;
  surveyId: string;
  workspaceId: string;
  responseId: string;
  studentInfo: {
    name: string;
    organization: string;
    age: string;
    email: string;
    education: string;
    major: string;
  };
  responses: Answer[];
  overallScore: number;
  categoryScores: CategoryScore[];
  aiAnalysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    summary: string;
  };
  generatedAt: Date;
  response?: SurveyResponse;
}

export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  level: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

// 백엔드 스키마 추가 타입들
export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface WorkspaceCreate {
  title: string;
  description?: string;
  university_name?: string;
}

export interface WorkspaceUpdate {
  title?: string;
  description?: string;
  university_name?: string;
}

export interface SurveyCreate {
  workspace_id: string;
  title: string;
  description?: string;
  scale_min?: number;
  scale_max?: number;
  max_questions?: number;
  questions?: Array<{
    text: string;
    category: string;
    order: number;
  }>;
  targetCount?: number;
  status?: 'draft' | 'active' | 'inactive';
}

export interface UserCreate {
  email: string;
  password: string;
  name?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface ReportSummary {
  workspace_id: string;
  workspace_name: string;
  student_name: string;
  student_email: string;
  organization: string;
  education: string;
  major: string;
  survey_title: string;
  submitted_at: string;
  total_score: number;
  average_score: number;
}

export interface WorkspaceReport {
  workspace_info: {
    id: string;
    title: string;
    description: string;
    university_name: string;
  };
  students: StudentReport[];
}

export interface StudentReport {
  student_info: {
    name: string;
    email: string;
    organization: string;
    education: string;
    major: string;
  };
  test_results: TestResult[];
  total_tests: number;
  average_total_score: number;
}

export interface TestResult {
  survey_title: string;
  submitted_at: string;
  total_score: number;
  average_score: number;
  answers: {
    [key: string]: number;
  };
}

export interface SurveyResponseAnalytics {
  total_score: number;
  total_possible: number;
  percentage: number;
  category_scores: {
    category_id: string;
    category_name: string;
    score: number;
    max_possible: number;
    percentage: number;
  }[];
  strengths: string[];
  weaknesses: string[];
  percentile: number;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  message: string;
  analytics: SurveyResponseAnalytics;
} 