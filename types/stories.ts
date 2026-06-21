export interface Story {
  id: string;
  title: string;
  content: string;
  theme?: string;
  ageGroup?: string;
  keywords: string[];
  rhymeScheme?: string;
  language: string;
  wordCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryTheme {
  id: string;
  name: string;
  description: string;
}

export interface AgeGroup {
  id: string;
  range: string;
  minAge: number;
  maxAge: number;
  complexity: "simple" | "moderate" | "advanced";
}

export type RhymeScheme = "AABB" | "ABAB" | "ABCB" | "ABBA";
