import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decode, decodeAudioData, createAudioContext } from '../utils/audioUtils';
import { calculateAudioVolume } from '../utils/audioAnalysis';
import { SAMPLE_RATE_INPUT, SAMPLE_RATE_OUTPUT, BUFFER_SIZE } from '../constants';

export interface LiveConfig {
  model: string;
  systemInstruction: string;
  voiceName: string;
}

// Pure Extractor Functions (Law of Demeter)
// These functions are the only place that understand the deep structure of LiveServerMessage.
// This prevents the main class from having "spaghetti" dependencies on the message structure.

const extractTranscription = (
  message: LiveServerMessage
): { text: string; isUser: boolean } | null => {
  const content = message.serverContent;
  if (!content) return null;

  if (content.outputTranscription?.text) {
    return { text: content.outputTranscription.text, isUser: false };
  }
  if (content.inputTranscription?.text) {
    return { text: content.inputTranscription.text, isUser: true };
  }
  return null;
};

const extractAudioData = (message: LiveServerMessage): string | null => {
  const parts = message.serverContent?.modelTurn?.parts;
  if (!parts || parts.length === 0) return null;
  const firstPart = parts[0];
  if (!firstPart) return null;
  return firstPart.inlineData?.data || null;
};

const isInterruption = (message: LiveServerMessage): boolean => {
  return !!message.serverContent?.interrupted;
};

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private inputCompressor: DynamicsCompressorNode | null = null;
  private inputAnalyzer: AnalyserNode | null = null;
  private processorInterval: number | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private session: Promise<any> | null = null;
  private onStatusChange: (status: string) => void;
  private onAudioUpdate: (volume: number, data: Uint8Array) => void;
  private onTranscription: (text: string, isUser: boolean) => void;
  private onAudioChunk: ((base64Audio: string, role: 'user' | 'assistant') => void) | undefined; // Optional callback to store audio chunks
  private userAudioBuffer: Float32Array[] = [];
  private isUserSpeaking: boolean = false;
  private stream: MediaStream | null = null;
  private analyzer: AnalyserNode | null = null;
  private isMuted: boolean = false;

  constructor(
    onStatusChange: (status: string) => void,
    onAudioUpdate: (volume: number, data: Uint8Array) => void,
    onTranscription: (text: string, isUser: boolean) => void,
    onAudioChunk?: (base64Audio: string, role: 'user' | 'assistant') => void
  ) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env.API_KEY as string | undefined);
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is required. Please set it in your environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.onStatusChange = onStatusChange;
    this.onAudioUpdate = onAudioUpdate;
    this.onTranscription = onTranscription;
    this.onAudioChunk = onAudioChunk;
  }

  async connect(config: LiveConfig) {
    try {
      this.onStatusChange('connecting');

      // 1. Setup Audio Contexts with 'interactive' latency hint for real-time performance
      this.inputAudioContext = createAudioContext({
        sampleRate: SAMPLE_RATE_INPUT,
        latencyHint: 'interactive',
      });
      this.outputAudioContext = createAudioContext({
        sampleRate: SAMPLE_RATE_OUTPUT,
        latencyHint: 'interactive',
      });

      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      // Analyzer for visualizer
      this.analyzer = this.outputAudioContext.createAnalyser();
      this.analyzer.fftSize = 256; // 128 bins
      this.analyzer.smoothingTimeConstant = 0.5;
      this.outputNode.connect(this.analyzer);
      this.startVisualizerLoop();

      // 2. Get Microphone Stream with enhanced audio constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      });

      // 3. Configure session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
        },
        systemInstruction: config.systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        // Optimize for speed by disabling thinking budget
        thinkingConfig: { thinkingBudget: 0 },
      };

      // 4. Connect to Gemini Live
      const sessionPromise = this.ai.live.connect({
        model: config.model,
        config: sessionConfig,
        callbacks: {
          onopen: () => {
            this.onStatusChange('connected');
            this.startInputStreaming(sessionPromise);
          },
          onmessage: msg => this.handleMessage(msg),
          onclose: () => {
            this.onStatusChange('disconnected');
            this.cleanup();
          },
          onerror: err => {
            console.error('Gemini Live Error:', err);
            this.onStatusChange('error');
            this.cleanup();
          },
        },
      });

      this.session = sessionPromise;
    } catch (error) {
      // Connection failed - log for debugging
      console.error('LiveClient connection error:', error);
      this.onStatusChange('error');
      this.cleanup();
      throw error; // Re-throw so caller knows connection failed
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private startInputStreaming(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.stream) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);

    // Add dynamics compressor for consistent volume levels (Normalization)
    this.inputCompressor = this.inputAudioContext.createDynamicsCompressor();
    this.inputCompressor.threshold.value = -24; // Lower threshold to catch more peaks
    this.inputCompressor.knee.value = 30; // Soft knee for natural transition
    this.inputCompressor.ratio.value = 12; // High compression ratio
    this.inputCompressor.attack.value = 0.003; // Fast attack
    this.inputCompressor.release.value = 0.25; // Moderate release

    // Use AnalyserNode instead of deprecated ScriptProcessorNode
    // This is the modern, non-deprecated approach for audio processing
    this.inputAnalyzer = this.inputAudioContext.createAnalyser();
    this.inputAnalyzer.fftSize = BUFFER_SIZE * 2; // fftSize must be power of 2
    this.inputAnalyzer.smoothingTimeConstant = 0; // No smoothing for real-time processing

    // Connect Graph: Source -> Compressor -> Analyzer
    // Note: We do NOT connect to destination to prevent echo/feedback
    // The analyzer is only used for reading audio data, not playback
    this.inputSource.connect(this.inputCompressor);
    this.inputCompressor.connect(this.inputAnalyzer);
    // Removed: this.inputAnalyzer.connect(this.inputAudioContext.destination);

    // Process audio using requestAnimationFrame for smooth, efficient processing
    const bufferLength = this.inputAnalyzer.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const sampleRate = this.inputAudioContext.sampleRate;
    const frameDuration = BUFFER_SIZE / sampleRate; // Duration of one buffer in seconds

    const processAudio = () => {
      if (!this.inputAudioContext || !this.inputAnalyzer || this.isMuted) {
        return;
      }

      // Get time-domain data (raw audio samples)
      this.inputAnalyzer.getFloatTimeDomainData(dataArray);

      // Store user audio for playback (copy the array to avoid reference issues)
      if (this.onAudioChunk) {
        const audioCopy = new Float32Array(dataArray);
        this.userAudioBuffer.push(audioCopy);

        // Detect if user is speaking (simple volume threshold)
        const volume = Math.max(...Array.from(dataArray).map(Math.abs));
        const wasSpeaking = this.isUserSpeaking;
        this.isUserSpeaking = volume > 0.01; // Threshold for speech detection

        // When user stops speaking, save the accumulated audio
        if (wasSpeaking && !this.isUserSpeaking && this.userAudioBuffer.length > 0) {
          // Combine all buffered audio into one chunk
          const totalLength = this.userAudioBuffer.reduce(
            (sum: number, buf: Float32Array) => sum + buf.length,
            0
          );
          const combinedAudio = new Float32Array(totalLength);
          let offset = 0;
          for (const buf of this.userAudioBuffer) {
            combinedAudio.set(buf, offset);
            offset += buf.length;
          }

          // Convert to PCM and store
          const pcmBlob = createPcmBlob(combinedAudio);
          // Extract base64 from PCM blob
          const base64Audio = pcmBlob.data;
          if (base64Audio) {
            this.onAudioChunk(base64Audio, 'user');
          }
          this.userAudioBuffer = []; // Clear buffer
        }
      }

      // Create PCM blob from the audio data for API
      const pcmBlob = createPcmBlob(dataArray);

      sessionPromise.then(session => {
        try {
          // Check if session is still valid before sending
          if (session && typeof session.sendRealtimeInput === 'function') {
            session.sendRealtimeInput({ media: pcmBlob });
          }
        } catch (error) {
          // Ignore errors if session is closing/closed
          // This is expected when disconnecting
          if (this.session === null) {
            // Only log if we're not intentionally disconnecting
            console.debug('Session send error (expected during disconnect):', error);
          }
        }
      }).catch(error => {
        // Session promise rejected - connection failed
        console.debug('Session promise rejected (connection failed):', error);
      });

      // Schedule next processing based on buffer duration
      this.processorInterval = window.setTimeout(
        processAudio,
        frameDuration * 1000 // Convert to milliseconds
      );
    };

    // Start processing
    processAudio();
  }

  private async handleMessage(rawMessage: LiveServerMessage) {
    // Extract data using pure functions
    // This ensures handlers (handleAudio, handleTranscription) only receive primitive data
    // and don't need to know about the LiveServerMessage structure.

    const transcription = extractTranscription(rawMessage);
    if (transcription) {
      this.handleTranscription(transcription.text, transcription.isUser);
    }

    const audioData = extractAudioData(rawMessage);
    if (audioData) {
      await this.handleAudio(audioData);
    }

    if (isInterruption(rawMessage)) {
      this.handleInterruption();
    }
  }

  private handleTranscription(text: string, isUser: boolean) {
    this.onTranscription(text, isUser);
  }

  private async handleAudio(base64Audio: string) {
    if (!this.outputAudioContext || !this.outputNode) return;

    // Store audio chunk for playback if callback provided
    if (this.onAudioChunk !== undefined) {
      this.onAudioChunk(base64Audio, 'assistant');
    }

    // Ensure context is running (browser policy)
    if (this.outputAudioContext.state === 'suspended') {
      try {
        await this.outputAudioContext.resume();
      } catch {
        return;
      }
    }

    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      this.outputAudioContext,
      SAMPLE_RATE_OUTPUT,
      1
    );

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);

    source.addEventListener('ended', () => {
      this.sources.delete(source);
    });

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);
  }

  private handleInterruption() {
    this.sources.forEach(source => {
      try {
        source.stop();
      } catch {
        // Ignore errors when stopping sources
      }
    });
    this.sources.clear();
    this.nextStartTime = 0;
    if (this.outputAudioContext) {
      this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  private startVisualizerLoop() {
    const update = () => {
      if (!this.analyzer || !this.outputAudioContext) return;

      const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
      this.analyzer.getByteFrequencyData(dataArray);

      const volume = calculateAudioVolume(dataArray);
      this.onAudioUpdate(volume, dataArray);

      requestAnimationFrame(update);
    };
    update();
  }

  toggleMute(muted: boolean) {
    this.isMuted = muted;
  }

  async disconnect() {
    if (this.session) {
      const currentSession = this.session;
      this.session = null; // Prevent re-entry
      try {
        const session = await currentSession;
        // Check if session is already closed before trying to close
        if (session && typeof session.close === 'function') {
          try {
            session.close();
          } catch (closeError) {
            // Session might already be closing/closed - ignore
            console.debug('Session already closing/closed:', closeError);
          }
        }
      } catch (error) {
        // Session promise rejected or session not available - already disconnected
        console.debug('Session disconnect error (expected if already disconnected):', error);
      }
    }
    this.cleanup();
    this.onStatusChange('disconnected');
  }

  private cleanup() {
    // 1. Stop Media Stream Tracks
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    // 2. Stop audio processing interval
    if (this.processorInterval !== null) {
      clearTimeout(this.processorInterval);
      this.processorInterval = null;
    }

    // 3. Disconnect Audio Nodes
    this.inputSource?.disconnect();
    this.inputSource = null;

    this.inputCompressor?.disconnect();
    this.inputCompressor = null;

    this.inputAnalyzer?.disconnect();
    this.inputAnalyzer = null;

    this.outputNode?.disconnect();
    this.outputNode = null;

    this.analyzer?.disconnect();
    this.analyzer = null; // This effectively stops the visualizer loop

    // 4. Close Audio Contexts
    if (this.inputAudioContext) {
      this.inputAudioContext.close().catch(console.error);
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close().catch(console.error);
      this.outputAudioContext = null;
    }

    // 5. Clear Buffer Sources
    this.sources.forEach(s => {
      try {
        s.stop();
      } catch {
        // Ignore errors when stopping sources
      }
    });
    this.sources.clear();

    this.session = null;
  }
}
