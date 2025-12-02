import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AnalysisService } from '../services/analysisService';
import { Modal } from './common/Modal';
import { DownloadIcon, ShareIcon } from './common/Icons';
import { formatDuration } from '../utils/formatters';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Skeleton } from './common/Skeleton';
import { downloadTranscriptAsText } from '../utils/fileUtils';
import { generateShareImage } from '../utils/shareUtils';
import { SessionAnalysis } from '../types';
import { getIconComponent } from '../utils/iconUtils';
import { AudioPlayer } from './common/AudioPlayer';
import { MessageBubble } from './common/MessageBubble';
import { logger } from '../utils/logger';
import { getSubscriptionLimits } from '../services/subscriptionService';
import { UpgradePrompt } from './UpgradePrompt';
import { ActivityRings } from './common/ActivityRings';

export const PostSessionSummary: React.FC = () => {
  const { modals, closeModal, updateSession, authState, sessions } = useApp();
  const session = modals.summary;
  const isPremium = authState.user?.isPremium || false;
  const limits = getSubscriptionLimits(isPremium);

  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const generationRef = useRef<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) {
      setAnalysis(null);
      setIsSaving(false);
      generationRef.current = null;
      return;
    }

    // Check if this is an optimistic session (temporary ID)
    const isOptimistic = session.id.startsWith('temp-');
    if (isOptimistic) {
      setIsSaving(true);
      setIsLoading(true);
      // Wait for real session to be saved (will be updated via modal prop change)
      return;
    }

    setIsSaving(false);

    // 1. If the session object already has analysis (e.g. opened from history), use it.
    if (session.analysis) {
      setAnalysis(session.analysis);
      setIsLoading(false);
      return;
    }

    // 2. If we have already generated analysis for this session ID in this component instance, use it.
    if (analysis && generationRef.current === session.id) {
      return;
    }

    // 3. Check analysis limit for free users
    if (!isPremium) {
      // Count how many sessions already have analysis
      const analysisCount = sessions.filter(
        s => s.analysis !== null && s.analysis !== undefined
      ).length;

      if (analysisCount >= limits.maxAnalyses) {
        // Free user has reached analysis limit
        setIsLoading(false);
        setAnalysis(null);
        return;
      }
    }

    // 4. Generate Analysis
    const generate = async () => {
      // Prevent double-firing
      if (generationRef.current === session.id) return;
      generationRef.current = session.id;

      setIsLoading(true);
      try {
        const service = new AnalysisService();
        const result = await service.generateAnalysis(session.transcript);

        // Update local state
        setAnalysis(result);

        // Persist to App Context / Storage
        updateSession(session.id, { analysis: result, preview: result.summary });
      } catch (e) {
        logger.error(
          'Failed to generate analysis',
          { sessionId: session.id },
          e instanceof Error ? e : undefined
        );
      } finally {
        setIsLoading(false);
      }
    };

    generate();
  }, [session, updateSession, analysis]);

  const handleShare = async () => {
    if (analysis && session) {
      setIsSharing(true);
      try {
        await generateShareImage(analysis, new Date(session.date).toLocaleDateString());
      } catch (e) {
        logger.error('Share failed', { sessionId: session.id }, e instanceof Error ? e : undefined);
      } finally {
        setIsSharing(false);
      }
    }
  };

  if (!session) return null;

  return (
    <Modal
      isOpen={!!session}
      onClose={() => closeModal('summary')}
      className="max-w-lg w-auto max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div className="text-center transform transition-all scale-100 opacity-100 overflow-y-auto flex-1 min-h-0" style={{ isolation: 'isolate' }}>
        {/* Header Status */}
        <div className="mb-4">
          <div className="w-14 h-14 bg-amora-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-xl">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="text-white">
                {analysis?.icon
                  ? getIconComponent(analysis.icon, 'w-8 h-8')
                  : getIconComponent(analysis?.mood, 'w-8 h-8')}
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {isSaving
              ? 'Saving your conversation...'
              : isLoading
                ? 'Reflecting on your conversation...'
                : analysis?.title || 'All done!'}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <p className="text-slate-600 text-xs">
              {formatDuration(session.durationSeconds)} • {session.transcript.length}{' '}
              {session.transcript.length === 1 ? 'exchange' : 'exchanges'}
            </p>
            <span className="text-slate-400">•</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full">
              <span className="text-[10px] text-slate-600 font-medium">Therapist</span>
              <span className="text-slate-400">•</span>
              <span className="text-[10px] text-slate-600 font-medium">Coach</span>
              <span className="text-slate-400">•</span>
              <span className="text-[10px] text-slate-600 font-medium">Journal</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 py-8 animate-in fade-in">
            <Skeleton variant="rectangular" height={96} className="w-full" />
            <Skeleton variant="rectangular" height={96} className="w-full" />
            <Skeleton variant="rectangular" height={64} className="w-full" />
          </div>
        ) : !isPremium &&
          !session.analysis &&
          !analysis &&
          (() => {
            const analysisCount = sessions.filter(
              s => s.analysis !== null && s.analysis !== undefined
            ).length;
            return analysisCount >= limits.maxAnalyses;
          })() ? (
          <div className="space-y-4 py-8 animate-in fade-in">
            <UpgradePrompt
              reason="analysis_limit"
              currentCount={
                sessions.filter(s => s.analysis !== null && s.analysis !== undefined).length
              }
              maxCount={limits.maxAnalyses}
            />
          </div>
        ) : !analysis ? (
          <div className="space-y-4 py-8 animate-in fade-in text-center">
            <Card className="p-4">
              <p className="text-slate-700 text-sm">
                Session completed. View your conversation transcript below.
              </p>
            </Card>
          </div>
        ) : (
          <div className="space-y-3 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Activity Rings */}
            <div className="mb-4">
              <ActivityRings
                durationSeconds={session.durationSeconds}
                transcriptLength={session.transcript.length}
                className="bg-white border border-slate-200"
              />
            </div>

            {/* Mood & Summary */}
            <div className="space-y-3">
              <Card className="flex flex-col items-center justify-center text-center p-3">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                  Vibe
                </span>
                <span className="font-semibold text-amora-600 text-sm">{analysis?.mood}</span>
              </Card>
              <Card className="p-3 flex flex-col justify-center">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                  Summary
                </span>
                <p className="text-xs text-slate-700 leading-tight">{analysis?.summary}</p>
              </Card>
            </div>

            {/* Key Insight */}
            <Card className="border-l-4 border-l-amora-500 bg-amora-50 p-3">
              <h3 className="text-amora-700 font-semibold mb-1.5 text-xs">Key Insight</h3>
              <p className="text-slate-700 italic text-xs leading-relaxed">
                "{analysis?.keyInsight}"
              </p>
            </Card>

            {/* Action Item */}
            <Card className="p-3">
              <h3 className="text-green-600 font-semibold mb-1.5 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Try This
              </h3>
              <p className="text-slate-700 text-xs leading-relaxed">{analysis?.actionItem}</p>
            </Card>

            {/* Encouragement */}
            <div className="text-center py-3 px-2">
              <p className="text-amora-700 font-medium text-sm leading-relaxed">
                {analysis?.encouragement}
              </p>
            </div>

            {/* Audio Player */}
            {session.audioChunks && session.audioChunks.length > 0 && (
              <div className="mt-4">
                <AudioPlayer audioChunks={session.audioChunks} />
              </div>
            )}

            {/* Transcript Toggle */}
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowTranscript(!showTranscript)}
                fullWidth
                className="flex items-center justify-center gap-2"
              >
                {showTranscript ? 'Hide' : 'Show'} Full Conversation ({session.transcript.length}{' '}
                {session.transcript.length === 1 ? 'exchange' : 'exchanges'})
              </Button>
            </div>

            {/* Full Transcript */}
            {showTranscript && (
              <Card className="mt-4 max-h-96 overflow-y-auto bg-slate-50">
                <div ref={transcriptRef} className="space-y-4 p-4">
                  {session.transcript.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
          <Button
            variant="white"
            onClick={() => closeModal('summary')}
            fullWidth
            className="text-sm py-2"
          >
            Done
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              onClick={handleShare}
              fullWidth
              disabled={isLoading || isSharing}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs py-2"
            >
              {isSharing ? (
                <div className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShareIcon className="w-3 h-3" />
              )}
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>

            <Button
              variant="ghost"
              onClick={() => downloadTranscriptAsText(session)}
              fullWidth
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-xs py-2"
            >
              <DownloadIcon className="w-3 h-3" />
              Conversation
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
