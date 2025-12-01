/**
 * Clipboard utilities for quick copy/share functionality
 */

import { logger } from './logger';

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    logger.debug('Failed to copy to clipboard', {}, error instanceof Error ? error : undefined);
    return false;
  }
}

export function formatTranscriptForSharing(
  transcript: Array<{ role: string; text: string }>
): string {
  return transcript
    .map(msg => `${msg.role === 'user' ? 'You' : 'Amora'}: ${msg.text}`)
    .join('\n\n');
}
