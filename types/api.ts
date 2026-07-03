export interface GenerateStoryRequest {
  prompt: string;
  ageGroup?: "2-4" | "4-6" | "6-8" | "8-10";
  theme?: string;
  maxLength?: number;
  useCredit?: boolean;
  locale?: string;
}

export interface GenerateStoryResponse {
  success: boolean;
  data?: {
    pages: Record<string, string>;
    title: string;
    rhymeScheme: string;
    wordCount: number;
    generatedAt: string;
    inspiration?: string[];
    illustratedStory: Record<string, string>;
    usedCredit?: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
