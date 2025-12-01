import React from 'react';
import {
  HeartIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  LeafIcon,
  CloudIcon,
  FireIcon,
  StarIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '../components/common/Icons';

type IconName =
  | 'heart'
  | 'sparkles'
  | 'sun'
  | 'moon'
  | 'leaf'
  | 'cloud'
  | 'fire'
  | 'star'
  | 'lightbulb'
  | 'check';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: HeartIcon,
  sparkles: SparklesIcon,
  sun: SunIcon,
  moon: MoonIcon,
  leaf: LeafIcon,
  cloud: CloudIcon,
  fire: FireIcon,
  star: StarIcon,
  lightbulb: LightBulbIcon,
  check: CheckCircleIcon,
};

/**
 * Maps mood strings to icon names
 */
const moodToIconMap: Record<string, IconName> = {
  happy: 'sun',
  sad: 'cloud',
  calm: 'leaf',
  anxious: 'moon',
  excited: 'sparkles',
  grateful: 'heart',
  reflective: 'moon',
  peaceful: 'leaf',
  energetic: 'fire',
  hopeful: 'star',
  inspired: 'lightbulb',
  content: 'heart',
  thoughtful: 'lightbulb',
  // Default fallback
  default: 'check',
};

/**
 * Get icon component from icon name or mood
 */
export function getIconComponent(
  iconNameOrMood?: string,
  className: string = 'w-8 h-8'
): React.ReactElement {
  const defaultIconName: IconName = 'check';

  if (!iconNameOrMood) {
    const Icon = iconMap[defaultIconName] || CheckCircleIcon;
    return <Icon className={className} />;
  }

  const lowerName = iconNameOrMood.toLowerCase();

  // First try direct icon name
  const directIcon = iconMap[lowerName];
  if (directIcon) {
    const Icon = directIcon;
    return <Icon className={className} />;
  }

  // Then try mood mapping
  const moodIcon = moodToIconMap[lowerName];
  if (moodIcon && iconMap[moodIcon]) {
    const Icon = iconMap[moodIcon];
    return <Icon className={className} />;
  }

  // Fallback
  const Icon = iconMap[defaultIconName] || CheckCircleIcon;
  return <Icon className={className} />;
}
