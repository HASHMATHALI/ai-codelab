export type SupportedLanguage = 
  | 'python' 
  | 'javascript' 
  | 'typescript' 
  | 'cpp' 
  | 'c' 
  | 'java' 
  | 'go' 
  | 'html' 
  | 'sql' 
  | 'css';

export type AiActionType = 
  | 'debug'
  | 'explain-error'
  | 'generate' 
  | 'explain' 
  | 'fix' 
  | 'socratic' 
  | 'test' 
  | 'optimize';

export type BugCategory =
  | 'Syntax Error'
  | 'Runtime Error'
  | 'Logic Bug'
  | 'Type Error'
  | 'Compilation Error'
  | 'Performance Issue'
  | 'Security Issue'
  | 'Edge Case'
  | 'Incorrect Assumption'
  | 'Unknown';

export type ConfidenceLevel =
  | 'high'     // High confidence
  | 'medium'   // Likely cause
  | 'low'      // Possible cause
  | 'needs_info'; // More information needed

export type DiagnosisStatus = 'confirmed' | 'likely' | 'uncertain' | 'needs_info';

export interface SecurityConcern {
  risk: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  remediation: string;
  location?: string;
}

export interface TestCaseItem {
  type: 'normal' | 'edge' | 'empty' | 'invalid' | 'boundary' | 'regression';
  title: string;
  code: string;
  explanation?: string;
}

export interface DebugReport {
  diagnosisStatus: DiagnosisStatus;
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
  whyNotCertain?: string;
  category: BugCategory;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  summary: string;
  location?: {
    line?: number;
    column?: number;
    snippet?: string;
  };
  observations: string[];
  inferences: string[];
  unknowns: string[];
  missingInformation?: string[];
  executionTrace: string[];
  likelyCauses: {
    cause: string;
    probability: 'Confirmed' | 'Likely' | 'Possible' | 'Unlikely';
    explanation: string;
  }[];
  fixedCode: string;
  diff: {
    original: string;
    fixed: string;
  };
  changes: string[];
  whyFixWorks: string;
  prevention: string[];
  securityConcerns?: SecurityConcern[];
  secretsDetected?: boolean;
  behaviorChangeWarning?: string;
  tests: TestCaseItem[];
}

export interface DebugInputs {
  code: string;
  language: SupportedLanguage;
  error?: string;
  expectedOutput?: string;
  actualOutput?: string;
  userDescription?: string;
}

export interface BugExample {
  id: string;
  title: string;
  category: BugCategory;
  language: SupportedLanguage;
  tagline: string;
  code: string;
  error?: string;
  expectedOutput?: string;
  actualOutput?: string;
  userDescription?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actionType?: AiActionType;
  codeSnippet?: string;
  suggestedReplacement?: string;
  debugReport?: DebugReport;
  complexity?: {
    time: string;
    space: string;
    explanation: string;
  };
}

export interface LabChallenge {
  id: string;
  title: string;
  category: 'GenAI Foundations' | 'Algorithms & Data Structures' | 'Fullstack Web' | 'Data Science & Prompt Engineering';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  instructions: string[];
  language: SupportedLanguage;
  starterCode: string;
  solutionCode: string;
  hints: string[];
  testCases: {
    input?: string;
    expected: string;
    description: string;
  }[];
}

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTimeMs: number;
  status: 'idle' | 'running' | 'success' | 'error';
  isActualExecution?: boolean;
  testResults?: {
    passed: boolean;
    name: string;
    actual?: string;
    expected?: string;
    error?: string;
  }[];
}

export interface AiSettings {
  apiKey: string;
  model: 'gemini-3.6-flash' | 'gemini-flash-latest' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.0-flash' | 'gemini-1.5-flash' | 'gemini-1.5-pro' | string;
  useMock: boolean;
  temperature: number;
  socraticMode: boolean;
}
