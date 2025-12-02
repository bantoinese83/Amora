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

    const prompt = `<role>
Expert therapeutic analyst extracting insights from conversations to help users understand themselves and take action.
</role>

<process>
(1) Identify: mood (single word), main theme (title/summary), icon (heart/sparkles/sun/moon/leaf/cloud/fire/star/lightbulb)
(2) Extract: 2-4 themes, 1-3 patterns, 2-3 strengths
(3) Growth: 1-3 growth areas, 2-3 next steps
(4) Journey: emotional evolution (1-2 sentences), 2-3 key moments with significance
(5) Insights: specific psychological insight, 2-3 sentence personalized reflection, one concrete action
(6) Reflection: thoughtful self-reflection question
</process>

<constraints>
Title: 3-5 words. Mood: single word. Icon: heart/sparkles/sun/moon/leaf/cloud/fire/star/lightbulb. Summary: one sentence. Key Insight: one sentence, specific not generic. Action Item: concrete, specific. Encouragement: warm, personalized. Themes: 2-4 specific strings. Patterns: 1-3 behavioral/emotional patterns. Growth Areas: 1-3 strings. Strengths: 2-3 specific strings. Personalized Insight: 2-3 sentences. Next Steps: 2-3 concrete actions. Emotional Journey: 1-2 sentences. Key Moments: 2-3 objects with moment + significance. Reflection Prompt: one thoughtful question.
</constraints>

<examples>
Ex1 - Overwhelm:
User: I'm overwhelmed with work deadlines. I can't focus, everything feels urgent.
Amora: What about the deadlines feels most pressing?
User: Maybe I could pick one thing and focus on that.

Output: {
  "title": "Finding Focus Amidst Overwhelm", "mood": "overwhelmed", "icon": "cloud",
  "summary": "User felt overwhelmed by deadlines, then identified prioritizing one task as a strategy.",
  "keyInsight": "When everything feels urgent, it creates paralysis; breaking tasks into smaller steps restores control.",
  "actionItem": "Choose one specific task and commit 30 minutes to it today.",
  "encouragement": "You're taking the first step by acknowledging how you feel—that's progress.",
  "themes": ["work stress", "time management", "overwhelm"],
  "patterns": ["seeing all tasks as equally urgent", "difficulty prioritizing when stressed"],
  "growthAreas": ["task prioritization", "stress management"],
  "strengths": ["self-awareness", "willingness to try new approach"],
  "personalizedInsight": "You recognized overwhelm was creating a cycle where everything felt equally important. By identifying one manageable task, you're breaking that cycle. This shows you can step back and find solutions even when stuck.",
  "nextSteps": ["Create priority list with 3 tasks", "Set timer for focused sessions"],
  "emotionalJourney": "Started overwhelmed and paralyzed, moved to identifying strategy and feeling more control.",
  "keyMoments": [
    {"moment": "User said 'everything feels urgent'", "significance": "Revealed core issue—inability to prioritize when all tasks feel equal."},
    {"moment": "User suggested 'pick one thing'", "significance": "Showed ability to generate own solution, demonstrating self-efficacy."}
  ],
  "reflectionPrompt": "What makes one task feel more urgent than another, and how can you use that to guide priorities?"
}

Ex2 - Connection:
User: I had a great conversation with my friend. We connected, I felt understood.
Amora: What made it feel special?
User: It made me realize I need more of that in my life.

Output: {
  "title": "Celebrating Connection", "mood": "grateful", "icon": "heart",
  "summary": "User shared positive experience of feeling understood and recognized need for more connections.",
  "keyInsight": "Meaningful connections provide validation and emotional support that boost well-being.",
  "actionItem": "Reach out to another friend this week to nurture social connections.",
  "encouragement": "You're cultivating meaningful relationships—keep nurturing those connections.",
  "themes": ["friendship", "connection", "emotional needs"],
  "patterns": ["recognizing positive experiences", "identifying what's missing"],
  "growthAreas": ["actively seeking connections", "expressing needs"],
  "strengths": ["ability to recognize what feels good", "self-awareness of needs"],
  "personalizedInsight": "You experienced a positive connection and immediately recognized its value and your need for more. This self-awareness is a strength—you know what nourishes you emotionally.",
  "nextSteps": ["Schedule regular check-in with friend", "Join community aligned with interests"],
  "emotionalJourney": "Started grateful for positive experience, moved to recognizing deeper need and feeling motivated.",
  "keyMoments": [
    {"moment": "User said 'I felt understood'", "significance": "Highlighted core emotional need—feeling truly understood, not just social interaction."},
    {"moment": "User realized 'I need more of that'", "significance": "Showed ability to translate positive experience into actionable insight."}
  ],
  "reflectionPrompt": "What specific qualities made you feel understood, and how can you bring those to other relationships?"
}
</examples>

<conversation>
${conversationText}
</conversation>

Analyze following the process. Generate complete JSON with all fields. Be specific, personalized, actionable. Connect insights directly to what user shared.`;

    try {
      // Re-check API key before making request (in case it was updated)
      const apiKey =
        import.meta.env.VITE_GEMINI_API_KEY || (process.env.API_KEY as string | undefined);
      if (!apiKey) {
        throw new Error('API key not available for analysis');
      }

      logger.debug('Starting analysis generation', { transcriptLength: transcript.length });

      // Add timeout wrapper (60 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Analysis generation timed out after 60 seconds'));
        }, 60000);
      });

      const analysisPromise = this.ai.models.generateContent({
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
              // Optional fields - let the AI generate them naturally
              themes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              patterns: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              growthAreas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              personalizedInsight: { type: Type.STRING },
              nextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              emotionalJourney: { type: Type.STRING },
              keyMoments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    moment: { type: Type.STRING },
                    significance: { type: Type.STRING },
                  },
                },
              },
              reflectionPrompt: { type: Type.STRING },
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

      const response = await Promise.race([analysisPromise, timeoutPromise]);

      logger.debug('Received response from AI', { hasResponse: !!response });

      const text = response.text;
      if (!text) throw new Error('No response from AI');

      const parsed = JSON.parse(text) as SessionAnalysis;
      logger.debug('Successfully parsed analysis', {
        hasThemes: !!parsed.themes,
        hasPatterns: !!parsed.patterns,
        hasKeyMoments: !!parsed.keyMoments,
      });

      return parsed;
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
        themes: ['reflection', 'mindfulness'],
        patterns: ['self-awareness'],
        growthAreas: ['emotional regulation'],
        strengths: ['self-reflection', 'courage to share'],
        personalizedInsight: 'You showed courage by taking time to reflect on your experiences.',
        nextSteps: ['Continue practicing mindfulness', 'Journal about today'],
        emotionalJourney: 'You moved from feeling uncertain to more centered.',
        keyMoments: [
          {
            moment: 'Opening up about your feelings',
            significance:
              'This moment showed your willingness to be vulnerable and seek understanding.',
          },
        ],
        reflectionPrompt: 'What did you learn about yourself today?',
      };
    }
  }
}
