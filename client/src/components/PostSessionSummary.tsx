import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AnalysisService } from '../services/analysisService';
import { Modal } from './common/Modal';
import {
  DownloadIcon,
  ShareIcon,
  TrendingUpIcon,
  TargetIcon,
  PuzzleIcon,
  ChartBarIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  ArrowRightIcon,
  CheckCircleOutlineIcon,
  SparklesIcon,
  LightBulbIcon,
  PlayIcon,
} from './common/Icons';
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
import { BentoCard } from './common/BentoCard';
import { BentoGrid } from './common/BentoGrid';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

// Section Header Component with Dynamic Icon
const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}> = ({ title, icon, color = 'amora', subtitle }) => {
  const colorClasses = {
    amora: 'text-amora-600 bg-amora-50 border-amora-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  };

  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 mb-3 px-3 py-2 rounded-lg border',
        colorClasses[color as keyof typeof colorClasses] || colorClasses.amora
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

// Tag Component for themes, patterns, etc.
const Tag: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'info' }> = ({
  children,
  variant = 'default',
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <motion.span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        variants[variant]
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.span>
  );
};

// Key Moment Card
const KeyMomentCard: React.FC<{ moment: string; significance: string; index: number }> = ({
  moment,
  significance,
  index,
}) => {
  return (
    <motion.div
      className="bg-gradient-to-br from-amora-50 to-purple-50 border border-amora-200 rounded-lg p-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amora-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 mb-1">"{moment}"</p>
          <p className="text-xs text-slate-600 leading-relaxed">{significance}</p>
        </div>
      </div>
    </motion.div>
  );
};

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
      className="max-w-6xl w-auto max-h-[90vh] overflow-hidden flex flex-col"
    >
      <div
        className="text-center transform transition-all scale-100 opacity-100 overflow-y-auto flex-1 min-h-0"
        style={{ isolation: 'isolate' }}
      >
        {/* Enhanced Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative w-20 h-20 bg-gradient-to-br from-amora-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
            {isLoading ? (
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="text-white transform -rotate-3">
                {analysis?.icon
                  ? getIconComponent(analysis.icon, 'w-10 h-10')
                  : getIconComponent(analysis?.mood, 'w-10 h-10')}
              </div>
            )}
          </div>
          <motion.h2
            className="text-2xl font-bold text-slate-900 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isSaving
              ? 'Saving your conversation...'
              : isLoading
                ? 'Reflecting on your conversation...'
                : analysis?.title || 'All done!'}
          </motion.h2>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full">
              <span className="text-xs text-slate-600 font-medium">
                {formatDuration(session.durationSeconds)}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-600 font-medium">
                {session.transcript.length}{' '}
                {session.transcript.length === 1 ? 'exchange' : 'exchanges'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amora-50 to-purple-50 border border-amora-200 rounded-full">
              <SparklesIcon className="w-3 h-3 text-amora-600" />
              <span className="text-[10px] text-amora-700 font-semibold uppercase tracking-wide">
                AI Analysis
              </span>
            </div>
          </div>
        </motion.div>

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
          <BentoGrid className="grid-cols-1 md:grid-cols-3 gap-4">
            {/* Activity Rings - Large Card */}
            <BentoCard size="lg" className="md:col-span-2 md:row-span-2">
              <SectionHeader
                title="Session Activity"
                icon={<ChartBarIcon className="w-4 h-4" />}
                color="blue"
                subtitle="Your engagement metrics"
              />
              <div className="flex flex-col h-full justify-center p-1">
                <ActivityRings
                  durationSeconds={session.durationSeconds}
                  transcriptLength={session.transcript.length}
                  className="bg-transparent border-0 p-0"
                />
              </div>
            </BentoCard>

            {/* Mood & Emotional Journey - Small Cards */}
            <BentoCard
              size="sm"
              className="bg-gradient-to-br from-amora-50 to-purple-50 border-amora-200"
            >
              <SectionHeader
                title="Mood"
                icon={getIconComponent(analysis.mood, 'w-4 h-4')}
                color="purple"
              />
              <div className="text-center">
                <motion.span
                  className="font-bold text-amora-700 text-xl block mb-2"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  {analysis.mood}
                </motion.span>
                {analysis.emotionalJourney && (
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    {analysis.emotionalJourney}
                  </p>
                )}
              </div>
            </BentoCard>

            {/* Summary - Medium Card */}
            <BentoCard size="md" className="md:col-span-2">
              <SectionHeader
                title="Conversation Summary"
                icon={<LightBulbIcon className="w-4 h-4" />}
                color="amora"
              />
              <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
            </BentoCard>

            {/* Key Insight - Medium Card */}
            <BentoCard
              size="md"
              className="md:col-span-2 border-l-4 border-l-amora-500 bg-gradient-to-r from-amora-50/50 to-transparent"
            >
              <SectionHeader
                title="Key Insight"
                icon={<TargetIcon className="w-4 h-4" />}
                color="amora"
                subtitle="What stood out"
              />
              <p className="text-slate-700 italic text-sm leading-relaxed">
                "{analysis.keyInsight}"
              </p>
              {analysis.personalizedInsight && (
                <motion.div
                  className="mt-3 pt-3 border-t border-amora-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {analysis.personalizedInsight}
                  </p>
                </motion.div>
              )}
            </BentoCard>

            {/* Themes - Small Card */}
            {analysis.themes && analysis.themes.length > 0 && (
              <BentoCard size="sm" className="bg-blue-50/50 border-blue-200">
                <SectionHeader
                  title="Themes"
                  icon={<PuzzleIcon className="w-4 h-4" />}
                  color="blue"
                />
                <div className="flex flex-wrap gap-1.5">
                  {analysis.themes.map((theme, idx) => (
                    <Tag key={idx} variant="info">
                      {theme}
                    </Tag>
                  ))}
                </div>
              </BentoCard>
            )}

            {/* Strengths - Small Card */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <BentoCard size="sm" className="bg-green-50/50 border-green-200">
                <SectionHeader
                  title="Your Strengths"
                  icon={<CheckCircleOutlineIcon className="w-4 h-4" />}
                  color="green"
                />
                <div className="space-y-1.5">
                  {analysis.strengths.map((strength, idx) => (
                    <motion.div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-slate-700"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <CheckCircleOutlineIcon className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span>{strength}</span>
                    </motion.div>
                  ))}
                </div>
              </BentoCard>
            )}

            {/* Patterns - Small Card */}
            {analysis.patterns && analysis.patterns.length > 0 && (
              <BentoCard size="sm" className="bg-indigo-50/50 border-indigo-200">
                <SectionHeader
                  title="Patterns"
                  icon={<TrendingUpIcon className="w-4 h-4" />}
                  color="indigo"
                />
                <div className="space-y-1.5">
                  {analysis.patterns.map((pattern, idx) => (
                    <motion.div
                      key={idx}
                      className="text-xs text-slate-700 leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      • {pattern}
                    </motion.div>
                  ))}
                </div>
              </BentoCard>
            )}

            {/* Growth Areas - Small Card */}
            {analysis.growthAreas && analysis.growthAreas.length > 0 && (
              <BentoCard size="sm" className="bg-orange-50/50 border-orange-200">
                <SectionHeader
                  title="Growth Areas"
                  icon={<AcademicCapIcon className="w-4 h-4" />}
                  color="orange"
                />
                <div className="space-y-1.5">
                  {analysis.growthAreas.map((area, idx) => (
                    <motion.div
                      key={idx}
                      className="text-xs text-slate-700 leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      • {area}
                    </motion.div>
                  ))}
                </div>
              </BentoCard>
            )}

            {/* Action Item - Medium Card */}
            <BentoCard
              size="md"
              className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
            >
              <SectionHeader
                title="Try This"
                icon={<ArrowRightIcon className="w-4 h-4" />}
                color="green"
                subtitle="Your next step"
              />
              <p className="text-slate-700 text-sm leading-relaxed font-medium">
                {analysis.actionItem}
              </p>
              {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                <motion.div
                  className="mt-3 pt-3 border-t border-green-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-xs font-semibold text-green-700 mb-1.5">More steps:</p>
                  <ul className="space-y-1">
                    {analysis.nextSteps.map((step, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <ArrowRightIcon className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </BentoCard>

            {/* Key Moments - Full Width */}
            {analysis.keyMoments && analysis.keyMoments.length > 0 && (
              <BentoCard size="lg" className="md:col-span-3">
                <SectionHeader
                  title="Key Moments"
                  icon={<SparklesIcon className="w-4 h-4" />}
                  color="purple"
                  subtitle="Notable moments from your conversation"
                />
                <div className="space-y-2">
                  {analysis.keyMoments.map((km, idx) => (
                    <KeyMomentCard
                      key={idx}
                      moment={km.moment}
                      significance={km.significance}
                      index={idx}
                    />
                  ))}
                </div>
              </BentoCard>
            )}

            {/* Reflection Prompt - Full Width */}
            {analysis.reflectionPrompt && (
              <BentoCard
                size="lg"
                className="md:col-span-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
              >
                <SectionHeader
                  title="Reflection"
                  icon={<QuestionMarkCircleIcon className="w-4 h-4" />}
                  color="indigo"
                  subtitle="A question to ponder"
                />
                <p className="text-slate-800 text-base font-medium leading-relaxed italic">
                  {analysis.reflectionPrompt}
                </p>
              </BentoCard>
            )}

            {/* Encouragement - Full Width */}
            <BentoCard
              size="lg"
              className="md:col-span-3 bg-gradient-to-r from-amora-50 via-purple-50 to-pink-50 border-amora-200"
            >
              <div className="text-center py-3">
                <motion.p
                  className="text-amora-800 font-semibold text-lg leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {analysis.encouragement}
                </motion.p>
              </div>
            </BentoCard>

            {/* Audio Player - Full Width if available */}
            {session.audioChunks && session.audioChunks.length > 0 && (
              <BentoCard size="lg" className="md:col-span-3">
                <SectionHeader
                  title="Session Audio"
                  icon={<PlayIcon className="w-4 h-4" />}
                  color="blue"
                />
                <AudioPlayer audioChunks={session.audioChunks} />
              </BentoCard>
            )}

            {/* Transcript Toggle - Full Width */}
            <div className="md:col-span-3">
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

            {/* Full Transcript - Full Width */}
            {showTranscript && (
              <BentoCard
                size="lg"
                className="md:col-span-3 max-h-96 overflow-y-auto bg-slate-50/50"
              >
                <div ref={transcriptRef} className="space-y-4">
                  {session.transcript.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </div>
              </BentoCard>
            )}
          </BentoGrid>
        )}

        {/* Footer Actions */}
        <div className="space-y-2 mt-6 pt-4 border-t border-slate-200">
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
