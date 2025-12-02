import React, { useMemo } from 'react';
import { a, useSpring } from '@react-spring/web';
import { MessageLog } from '../types';

interface OverlayProps {
  fill: any;
  transcripts?: MessageLog[];
}

// Constants for font sizing
const MAX_FONT_SIZE_SPEAKER = 52;
const MAX_FONT_SIZE_TEXT = 48;
const MIN_FONT_SIZE_SPEAKER = 28;
const MIN_FONT_SIZE_TEXT = 24;
const MAX_HEIGHT_NO_SCROLL = 600; // Max height before enabling scroll
const LINE_HEIGHT_MULTIPLIER = 1.06; // Line height relative to font size

// Helper function to split text into lines that fit the design
const splitIntoLines = (text: string, maxChars: number = 40): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word.length > maxChars ? word.substring(0, maxChars) : word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

export const Overlay: React.FC<OverlayProps> = ({ fill, transcripts = [] }) => {
  const hasTranscripts = transcripts.length > 0;

  // Smooth transition animations
  const welcomeSpring = useSpring({
    opacity: hasTranscripts ? 0 : 1,
    transform: hasTranscripts ? 'translateY(-20px)' : 'translateY(0px)',
    config: { tension: 200, friction: 30 },
  });

  const transcriptSpring = useSpring({
    opacity: hasTranscripts ? 1 : 0,
    transform: hasTranscripts ? 'translateY(0px)' : 'translateY(20px)',
    config: { tension: 200, friction: 30 },
    delay: hasTranscripts ? 200 : 0,
  });

  // Calculate font sizes and layout based on transcript count
  const { fontSizeSpeaker, fontSizeText, lineHeight, needsScroll, totalHeight } = useMemo(() => {
    if (!hasTranscripts) {
      return {
        fontSizeSpeaker: MAX_FONT_SIZE_SPEAKER,
        fontSizeText: MAX_FONT_SIZE_TEXT,
        lineHeight: MAX_FONT_SIZE_TEXT * LINE_HEIGHT_MULTIPLIER,
        needsScroll: false,
        totalHeight: 720,
      };
    }

    // Calculate base height with max font sizes
    let baseHeight = 100; // Top padding
    transcripts.forEach((msg) => {
      const lines = splitIntoLines(msg.text);
      baseHeight += MAX_FONT_SIZE_SPEAKER + lines.length * (MAX_FONT_SIZE_TEXT * LINE_HEIGHT_MULTIPLIER) + 40;
    });

    // If content fits without scroll, use max font sizes
    if (baseHeight <= MAX_HEIGHT_NO_SCROLL) {
      return {
        fontSizeSpeaker: MAX_FONT_SIZE_SPEAKER,
        fontSizeText: MAX_FONT_SIZE_TEXT,
        lineHeight: MAX_FONT_SIZE_TEXT * LINE_HEIGHT_MULTIPLIER,
        needsScroll: false,
        totalHeight: Math.max(baseHeight, 720),
      };
    }

    // Calculate scale factor to fit content
    const scaleFactor = MAX_HEIGHT_NO_SCROLL / baseHeight;
    
    // Calculate scaled font sizes (but don't go below minimum)
    const scaledSpeakerSize = Math.max(
      MAX_FONT_SIZE_SPEAKER * scaleFactor,
      MIN_FONT_SIZE_SPEAKER
    );
    const scaledTextSize = Math.max(
      MAX_FONT_SIZE_TEXT * scaleFactor,
      MIN_FONT_SIZE_TEXT
    );

    // Recalculate height with scaled fonts
    let scaledHeight = 100;
    transcripts.forEach((msg) => {
      const lines = splitIntoLines(msg.text);
      scaledHeight += scaledSpeakerSize + lines.length * (scaledTextSize * LINE_HEIGHT_MULTIPLIER) + 40;
    });

    // If still too tall even with minimum fonts, enable scroll
    const finalNeedsScroll = scaledHeight > MAX_HEIGHT_NO_SCROLL;
    
    // Use the actual calculated height, ensuring we have enough space
    const finalHeight = finalNeedsScroll ? scaledHeight : scaledHeight;
    
    return {
      fontSizeSpeaker: finalNeedsScroll ? MIN_FONT_SIZE_SPEAKER : scaledSpeakerSize,
      fontSizeText: finalNeedsScroll ? MIN_FONT_SIZE_TEXT : scaledTextSize,
      lineHeight: (finalNeedsScroll ? MIN_FONT_SIZE_TEXT : scaledTextSize) * LINE_HEIGHT_MULTIPLIER,
      needsScroll: finalNeedsScroll,
      totalHeight: Math.max(finalHeight, 720),
    };
  }, [transcripts, hasTranscripts]);

  return (
    <div className={`overlay ${needsScroll ? 'overlay-scrollable' : ''}`}>
      {/* Welcome Text - Fades out when transcripts appear */}
      <a.div
        style={{
          ...welcomeSpring,
          position: hasTranscripts ? 'absolute' : 'relative',
          width: '100%',
          pointerEvents: hasTranscripts ? 'none' : 'auto',
        }}
      >
        <a.svg viewBox="0 0 650 720" fill={fill} xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <text
            style={{ whiteSpace: 'pre' }}
            fontFamily="Inter"
            fontSize={10.5}
            fontWeight={500}
            letterSpacing="0em"
            fill="currentColor"
          >
            <tspan x={40} y={175.318}>
              MODUS OPERANDI
            </tspan>
            <tspan x={40} y={188.318}>
              FOR THE VOICE AI SESSION
            </tspan>
          </text>

          <text
            fill="#8b5cf6"
            style={{ whiteSpace: 'pre' }}
            fontFamily="Inter"
            fontSize={52}
            fontWeight="bold"
            letterSpacing="0em"
          >
            <tspan x={40} y={257.909}>
              Amora —
            </tspan>
          </text>

          <text
            style={{ whiteSpace: 'pre' }}
            fontFamily="Inter"
            fontSize={48}
            fontWeight="bold"
            letterSpacing="0em"
            fill="currentColor"
          >
            <tspan x={40} y={321.909}>
              Your AI companion for
            </tspan>
            <tspan x={40} y={372.909}>
              therapy, coaching, and
            </tspan>
            <tspan x={40} y={423.909}>
              journaling. Click the orb
            </tspan>
            <tspan x={40} y={474.909}>
              to begin your session.
            </tspan>
          </text>

          <text
            style={{ whiteSpace: 'pre' }}
            fontFamily="Inter"
            fontSize={10.5}
            fontWeight={500}
            letterSpacing="0em"
            fill="currentColor"
          >
            <tspan x={326} y={640.318}>
              Therapist • Coach • Journal
            </tspan>
          </text>
        </a.svg>
      </a.div>

      {/* Transcripts - Fades in smoothly */}
      {hasTranscripts && (
        <a.div
          style={{
            ...transcriptSpring,
            position: 'relative',
            width: '100%',
          }}
        >
          <a.svg
            viewBox={`0 0 650 ${totalHeight + 100}`}
            fill={fill}
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
            preserveAspectRatio="xMinYMin none"
            style={{ height: 'auto', minHeight: '100%', overflow: 'visible' }}
          >
          {transcripts.map((msg, msgIndex) => {
            const isUser = msg.role === 'user';
            const speaker = isUser ? 'You' : 'Amora';
            const lines = splitIntoLines(msg.text);
            
            // Calculate Y position for this message
            let startY = 100;
            for (let i = 0; i < msgIndex; i++) {
              const prevLines = splitIntoLines(transcripts[i].text);
              startY += fontSizeSpeaker + prevLines.length * lineHeight + 40; // Previous message height + spacing
            }

            return (
              <g key={msg.id} className="animate-in fade-in">
                {/* Speaker name with purple color */}
                <text
                  fill="#8b5cf6"
                  style={{ whiteSpace: 'pre' }}
                  fontFamily="Inter"
                  fontSize={fontSizeSpeaker}
                  fontWeight="bold"
                  letterSpacing="0em"
                >
                  <tspan x={40} y={startY}>
                    {speaker} —
                  </tspan>
                </text>

                {/* Message text */}
                <text
                  style={{ whiteSpace: 'pre' }}
                  fontFamily="Inter"
                  fontSize={fontSizeText}
                  fontWeight="bold"
                  letterSpacing="0em"
                  fill="currentColor"
                >
                  {lines.map((line, lineIndex) => (
                    <tspan key={lineIndex} x={40} y={startY + fontSizeSpeaker + lineIndex * lineHeight}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
          </a.svg>
        </a.div>
      )}
    </div>
  );
};

