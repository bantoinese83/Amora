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
export declare enum ConnectionStatus {
    DISCONNECTED = "disconnected",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    ERROR = "error"
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
    audio: string;
    role: 'user' | 'assistant';
    timestamp: number;
}
export interface Session {
    id: string;
    date: string;
    durationSeconds: number;
    preview: string;
    transcript: MessageLog[];
    analysis?: SessionAnalysis;
    audioChunks?: AudioChunk[];
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
//# sourceMappingURL=index.d.ts.map