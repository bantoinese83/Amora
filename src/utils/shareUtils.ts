import { SessionAnalysis } from '../types';

export async function generateShareImage(
  analysis: SessionAnalysis,
  dateStr: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Setup High Res Canvas (4:5 Aspect Ratio for social media)
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  // --- Background ---
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#2e1065'); // Violet 950
  gradient.addColorStop(1, '#0f172a'); // Slate 950
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // --- Background Decor (Glows) ---
  const drawGlow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  drawGlow(width, 0, 800, 'rgba(124, 58, 237, 0.2)'); // Top Right
  drawGlow(0, height, 800, 'rgba(236, 72, 153, 0.15)'); // Bottom Left

  // --- Helper: Rounded Rect ---
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  // --- Helper: Text Wrap ---
  const drawWrappedText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  };

  // --- Content Drawing ---

  // 1. Icon (drawn as SVG path on canvas)
  // For canvas, we'll draw a simple circle with icon indicator
  // In a production app, you might want to use a canvas library or pre-render SVG
  const iconSize = 120;
  const iconX = width / 2;
  const iconY = 220;

  // Draw icon background circle
  ctx.beginPath();
  ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(124, 58, 237, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(221, 214, 254, 0.5)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Draw icon indicator (simplified representation)
  // In production, you'd render the actual SVG path
  ctx.fillStyle = '#ddd6fe';
  ctx.font = 'bold 60px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const iconChar = analysis.icon?.[0]?.toUpperCase() || analysis.mood?.[0]?.toUpperCase() || '✓';
  ctx.fillText(iconChar, iconX, iconY);

  // 2. Title
  ctx.font = 'bold 70px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(analysis.title, width / 2, 380);

  // 3. Date
  ctx.font = '40px Inter, sans-serif';
  ctx.fillStyle = '#94a3b8'; // Slate 400
  ctx.fillText(dateStr, width / 2, 450);

  // 4. Mood Badge
  ctx.font = 'bold 36px Inter, sans-serif';
  const moodText = `Vibe: ${analysis.mood}`;
  const moodMetrics = ctx.measureText(moodText);
  const moodWidth = moodMetrics.width + 80;
  const moodHeight = 80;
  const moodY = 510;

  drawRoundedRect(
    (width - moodWidth) / 2,
    moodY,
    moodWidth,
    moodHeight,
    40,
    'rgba(124, 58, 237, 0.3)'
  ); // Amora purple low opacity

  ctx.fillStyle = '#ddd6fe'; // Violet 200
  ctx.textBaseline = 'middle';
  ctx.fillText(moodText, width / 2, moodY + moodHeight / 2 + 2); // +2 optical alignment

  // 5. Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, 660);
  ctx.lineTo(width - 150, 660);
  ctx.stroke();

  // 6. Summary
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e2e8f0'; // Slate 200
  ctx.font = '40px Inter, sans-serif';
  let cursorY = 760;
  cursorY = drawWrappedText(analysis.summary, 120, cursorY, width - 240, 60);

  // 7. Key Insight Box
  cursorY += 80;
  const boxHeight = 350;
  drawRoundedRect(80, cursorY, width - 160, boxHeight, 40, 'rgba(255,255,255,0.05)');

  // Insight Label
  ctx.fillStyle = '#a78bfa'; // Amora 400
  ctx.font = 'bold 32px Inter, sans-serif';
  ctx.fillText('KEY INSIGHT', 130, cursorY + 70);

  // Insight Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 44px Inter, sans-serif';
  drawWrappedText(`"${analysis.keyInsight}"`, 130, cursorY + 140, width - 260, 65);

  // 8. Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '30px Inter, sans-serif';
  ctx.fillText('Amora • AI Voice Companion', width / 2, height - 60);

  // --- Export Logic (Web Share API + Download Fallback) ---
  return new Promise(resolve => {
    canvas.toBlob(async blob => {
      if (!blob) {
        resolve();
        return;
      }

      const fileName = `Amora-Insight-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Try Web Share API (Mobile/Supported Browsers)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Amora Session Insight',
            text: `My reflection session summary: ${analysis.title}`,
            files: [file],
          });
          resolve();
          return;
        } catch (e) {
          console.warn('Share cancelled or failed, falling back to download', e);
        }
      }

      // Fallback to Download (Desktop)
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
