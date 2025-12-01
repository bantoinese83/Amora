import { Session } from '../types';

export function downloadTranscriptAsText(session: Session) {
  if (!session.transcript || session.transcript.length === 0) return;

  const dateStr = new Date(session.date).toLocaleDateString();
  const timeStr = new Date(session.date).toLocaleTimeString();

  let content = `Amora Session\nDate: ${dateStr} ${timeStr}\nDuration: ${session.durationSeconds} seconds\n\n------------------\n\n`;

  session.transcript.forEach(msg => {
    const role = msg.role === 'user' ? 'You' : 'Amora';
    content += `[${role}]: ${msg.text}\n\n`;
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `Amora-Session-${new Date(session.date).toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
