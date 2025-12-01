import { GoogleGenAI, Type } from '@google/genai';
import { MessageLog, SessionAnalysis } from '../types';
import { logger } from '../utils/logger';

export class AnalysisService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey =
      import.meta.env.VITE_GEMINI_API_KEY || (process.env.API_KEY as string | undefined);
    if (!apiKey) {
      const error = new Error(
        'VITE_GEMINI_API_KEY is required. Please set it in your environment variables.'
      );
      logger.error('AnalysisService API key missing', {
        hasViteKey: !!import.meta.env.VITE_GEMINI_API_KEY,
        hasProcessKey: !!process.env.API_KEY,
        viteKeyLength: import.meta.env.VITE_GEMINI_API_KEY?.length || 0,
        processKeyLength: (process.env.API_KEY as string | undefined)?.length || 0,
        envKeys: Object.keys(import.meta.env).filter(
          k => k.includes('GEMINI') || k.includes('API')
        ),
      });
      throw error;
    }
    logger.debug('AnalysisService initializing', { apiKeyLength: apiKey.length });
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateAnalysis(transcript: MessageLog[]): Promise<SessionAnalysis> {
    if (!transcript || transcript.length === 0) {
      throw new Error('Transcript is empty');
    }

    // Convert transcript to a clean string format for the model
    const conversationText = transcript
      .map(t => `${t.role === 'user' ? 'User' : 'Amora'}: ${t.text}`)
      .join('\n');

    const prompt = `<task>
Analyze the following therapeutic conversation between a user and an AI companion named Amora. Extract key insights and provide a structured summary.
</task>

<constraints>
- Title: Must be 3-5 words, relevant to the conversation theme
- Mood: Single word describing the user's primary emotional state
- Icon: Must be one of: heart, sparkles, sun, moon, leaf, cloud, fire, star, lightbulb
- Summary: Exactly one sentence, capturing the main topic
- Key Insight: One sentence psychological reflection based on what the user shared
- Action Item: One small, concrete, positive action the user can take
- Encouragement: One warm, personalized sentence
</constraints>

<examples>
Example 1:
Conversation:
User: I'm feeling really overwhelmed with work deadlines.
Amora: That sounds stressful. What about the deadlines feels most pressing?
User: I just can't seem to focus, everything feels urgent.
Amora: It sounds like you're dealing with a lot at once. What's one thing you could do right now to feel more in control?

Output:
{
  "title": "Finding Focus Amidst Overwhelm",
  "mood": "overwhelmed",
  "icon": "cloud",
  "summary": "User discussed feeling overwhelmed by work deadlines and difficulty focusing.",
  "keyInsight": "When everything feels urgent, it can create paralysis; breaking tasks into smaller steps can restore a sense of control.",
  "actionItem": "Choose one specific task to complete today and commit to focusing on just that for 30 minutes.",
  "encouragement": "You're taking the first step by acknowledging how you feel—that's already progress."
}

Example 2:
Conversation:
User: I had a great conversation with my friend today.
Amora: That sounds wonderful! What made it feel special?
User: We really connected, I felt understood.
Amora: That sense of being understood is so important. How does that connection make you feel?

Output:
{
  "title": "Celebrating Connection",
  "mood": "grateful",
  "icon": "heart",
  "summary": "User shared a positive experience of feeling understood in a friendship.",
  "keyInsight": "Meaningful connections provide validation and emotional support that can boost overall well-being.",
  "actionItem": "Reach out to another friend this week to nurture your social connections.",
  "encouragement": "You're cultivating meaningful relationships—keep nurturing those connections that make you feel seen."
}
</examples>

<context>
Conversation:
${conversationText}
</context>

<output_format>
Return a JSON object with the following structure:
{
  "title": "string (3-5 words)",
  "mood": "string (one word)",
  "icon": "string (heart|sparkles|sun|moon|leaf|cloud|fire|star|lightbulb)",
  "summary": "string (one sentence)",
  "keyInsight": "string (one sentence)",
  "actionItem": "string (one concrete action)",
  "encouragement": "string (one warm sentence)"
}
</output_format>`;

    try {
      // Re-check API key before making request (in case it was updated)
      const apiKey =
        import.meta.env.VITE_GEMINI_API_KEY || (process.env.API_KEY as string | undefined);
      if (!apiKey) {
        throw new Error('API key not available for analysis');
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              mood: { type: Type.STRING },
              icon: { type: Type.STRING },
              summary: { type: Type.STRING },
              keyInsight: { type: Type.STRING },
              actionItem: { type: Type.STRING },
              encouragement: { type: Type.STRING },
            },
            required: [
              'title',
              'mood',
              'icon',
              'summary',
              'keyInsight',
              'actionItem',
              'encouragement',
            ],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error('No response from AI');

      return JSON.parse(text) as SessionAnalysis;
    } catch (error) {
      logger.error(
        'Analysis generation failed',
        { transcriptLength: transcript.length },
        error instanceof Error ? error : undefined
      );
      // Fallback for UI if generation fails
      return {
        title: 'Daily Reflection',
        mood: 'Calm',
        icon: 'leaf',
        summary: 'A moment of reflection.',
        keyInsight: 'Taking time for yourself is the first step to clarity.',
        actionItem: 'Take a few deep breaths before continuing your day.',
        encouragement: "You're doing great.",
      };
    }
  }
}
