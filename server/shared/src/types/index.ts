/**
 * Shared Types
 * Types used by both client and server
 */

export interface AuthState {
  isAuthenticated: boolean;
  user?: {
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
