import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';

interface ActivityData {
  label: string;
  value: number;
  color: string;
  size: number;
  current: number;
  target: number;
  unit: string;
}

interface CircleProgressProps {
  data: ActivityData;
  index: number;
}

const CircleProgress = ({ data, index }: CircleProgressProps) => {
  const strokeWidth = 16;
  const radius = (data.size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = ((100 - data.value) / 100) * circumference;
  const gradientId = `gradient-${data.label.toLowerCase()}`;
  const gradientUrl = `url(#${gradientId})`;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: index * 0.2, ease: 'easeOut' }}
    >
      <div className="relative">
        <svg
          width={data.size}
          height={data.size}
          viewBox={`0 0 ${data.size} ${data.size}`}
          className="transform -rotate-90"
          aria-label={`${data.label} Activity Progress - ${data.value}%`}
        >
          <title>{`${data.label} Activity Progress - ${data.value}%`}</title>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: data.color, stopOpacity: 1 }} />
              <stop
                offset="100%"
                style={{
                  stopColor:
                    data.color === '#8b5cf6'
                      ? '#a78bfa'
                      : data.color === '#06b6d4'
                        ? '#22d3ee'
                        : '#10b981',
                  stopOpacity: 1,
                }}
              />
            </linearGradient>
          </defs>
          <circle
            cx={data.size / 2}
            cy={data.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200/50"
          />
          <motion.circle
            cx={data.size / 2}
            cy={data.size / 2}
            r={radius}
            fill="none"
            stroke={gradientUrl}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: progress }}
            transition={{
              duration: 1.8,
              delay: index * 0.2,
              ease: 'easeInOut',
            }}
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.15))',
            }}
          />
        </svg>
      </div>
    </motion.div>
  );
};

interface DetailedActivityInfoProps {
  activities: ActivityData[];
}

const DetailedActivityInfo = ({ activities }: DetailedActivityInfoProps) => {
  return (
    <motion.div
      className="flex flex-col gap-6 ml-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {activities.map(activity => (
        <motion.div key={activity.label} className="flex flex-col">
          <span className="text-sm font-medium text-slate-600">{activity.label}</span>
          <span className="text-2xl font-semibold" style={{ color: activity.color }}>
            {activity.current}/{activity.target}
            <span className="text-base ml-1 text-slate-600">{activity.unit}</span>
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
};

interface ActivityRingsProps {
  durationSeconds: number;
  transcriptLength: number;
  className?: string;
}

export const ActivityRings: React.FC<ActivityRingsProps> = ({
  durationSeconds,
  transcriptLength,
  className,
}) => {
  // Calculate metrics based on session data
  // Duration: target 15 minutes (900 seconds) for ideal session
  const durationMinutes = Math.round(durationSeconds / 60);
  const durationTarget = 15;
  const durationValue = Math.min(100, Math.round((durationMinutes / durationTarget) * 100));

  // Exchanges: target 10 exchanges for meaningful conversation
  const exchangesTarget = 10;
  const exchangesValue = Math.min(100, Math.round((transcriptLength / exchangesTarget) * 100));

  // Engagement: combination of duration and exchanges (target 75%)
  const engagementScore = Math.round((durationValue + exchangesValue) / 2);
  const engagementValue = Math.min(100, engagementScore);

  const activities: ActivityData[] = [
    {
      label: 'DURATION',
      value: durationValue,
      color: '#8b5cf6', // Amora purple
      size: 200,
      current: durationMinutes,
      target: durationTarget,
      unit: 'MIN',
    },
    {
      label: 'EXCHANGES',
      value: exchangesValue,
      color: '#06b6d4', // Cyan
      size: 160,
      current: transcriptLength,
      target: exchangesTarget,
      unit: 'EX',
    },
    {
      label: 'ENGAGEMENT',
      value: engagementValue,
      color: '#10b981', // Green
      size: 120,
      current: engagementScore,
      target: 75,
      unit: '%',
    },
  ];

  return (
    <div className={cn('relative w-full max-w-3xl mx-auto p-6 rounded-3xl', className)}>
      <div className="flex flex-col items-center gap-6">
        <motion.h2
          className="text-xl font-medium text-slate-900"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Session Activity
        </motion.h2>
        <div className="flex items-center">
          <div className="relative w-[180px] h-[180px]">
            {activities.map((activity, index) => (
              <CircleProgress key={activity.label} data={activity} index={index} />
            ))}
          </div>
          <DetailedActivityInfo activities={activities} />
        </div>
      </div>
    </div>
  );
};
