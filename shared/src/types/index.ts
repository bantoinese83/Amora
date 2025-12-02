/**
 * Shared Types
 * Types used by both client and server
 */

export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    isPremium: boolean;
  };
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface MessageLog {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface SessionAnalysis {
  mood: string;
  icon: string;
  title: string;
  summary: string;
  keyInsight: string;
  actionItem: string;
  encouragement: string;
  // Enhanced fields for richer analysis
  themes?: string[]; // Main themes discussed (e.g., ["work stress", "relationships", "self-care"])
  patterns?: string[]; // Behavioral or emotional patterns identified
  growthAreas?: string[]; // Areas for personal growth
  strengths?: string[]; // Personal strengths recognized
  personalizedInsight?: string; // Deeper, more personalized reflection
  nextSteps?: string[]; // Concrete next steps beyond the action item
  emotionalJourney?: string; // Description of emotional progression during session
  keyMoments?: Array<{
    moment: string;
    significance: string;
  }>; // Notable moments in the conversation
  reflectionPrompt?: string; // A question for deeper reflection
}

export interface AudioChunk {
  audio: string; // Base64 encoded audio
  role: 'user' | 'assistant';
  timestamp: number; // Relative timestamp in milliseconds from session start
}

export interface Session {
  id: string;
  date: string; // ISO date string
  durationSeconds: number;
  preview: string; // First few words or summary
  transcript: MessageLog[];
  analysis?: SessionAnalysis;
  audioChunks?: AudioChunk[]; // Audio chunks with role and timestamp for playback
}

export interface User {
  id: string;
  email: string;
  name: string;
  is_premium: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithPreferences extends User {
  selected_voice: string;
}
