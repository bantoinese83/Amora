import { useState, useEffect, useRef, useCallback } from 'react';
import { formatTimer } from '../utils/formatters';

export function useSessionTimer(duration: number, isActive: boolean, onComplete: () => void) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, onComplete]);

  const resetTimer = useCallback(() => {
    setTimeLeft(duration);
  }, [duration]);

  return { timeLeft, formattedTime: formatTimer(timeLeft), resetTimer };
}
