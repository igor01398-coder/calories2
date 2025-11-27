
export interface GeneratedImage {
  original: string; // Base64
  modified: string | null; // Base64
  prompt: string;
  timestamp: number;
}

export enum AppView {
  INTRO = 'INTRO', // New Start Screen
  HOME = 'HOME', // This is the Map View
  CAMERA = 'CAMERA',
  EDITOR = 'EDITOR',
  GALLERY = 'GALLERY'
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  targetPromptHint: string;
  difficulty: 'Novice' | 'Geologist' | 'Expert';
  xpReward: number;
  rankRequirement: string;
  lat: number;
  lng: number;
  fragmentId: number; // 0, 1, or 2 for main missions. -1 for side missions.
  quiz?: {
    question: string;
    answer: string;
  };
  uploadInstruction?: string; // New field for specific upload/description instructions
  type?: 'main' | 'side'; // Distinguish between main story and side missions
}

export interface PlayerStats {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  rank: string;
  mana: number; // AP for generating images
  maxMana: number;
  sosCount: number; // Number of times player can ask for help
}

export interface PuzzleProgress {
  m1Heights?: {
    tiger: string;
    leopard: string;
    lion: string;
    elephant: string;
  };
  m1Reason?: string;
  quizInput?: string;
  quizSelect1?: string;
  quizSelect2?: string;
  imageDescription?: string;
  uploadedImage?: string | null;
  
  // Solved Status Flags
  m1Part1Solved?: boolean;
  m1Part2Solved?: boolean;
  isQuizSolved?: boolean;
}

// Encyclopedia Types
export type EncyclopediaCategory = 'Geology' | 'History' | 'Ecology' | 'Tech';

export interface EncyclopediaEntry {
  id: string;
  title: string;
  category: EncyclopediaCategory;
  summary: string;
  content: string;
  relatedMissionId?: string; // Optional link to a specific mission
}
