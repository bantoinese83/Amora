import { useState, useCallback } from 'react';

export function usePinInput(length: number = 4, onSuccess: () => void) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const reset = useCallback(() => {
    setValues(Array(length).fill(''));
    setError(false);
    setAttempts(0);
  }, [length]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
    setError(false); // Clear error on new input

    // Auto-focus next input
    if (value && index < length - 1) {
      setTimeout(() => {
        document.getElementById(`pin-${index + 1}`)?.focus();
      }, 10);
    }

    // Check completion - trigger onSuccess callback
    // The parent component will handle validation
    const isComplete = newValues.every(v => v !== '');
    if (isComplete && index === length - 1) {
      // Call onSuccess - parent handles validation
      onSuccess();
    }
  };

  return { values, error, handleDigitChange, attempts, reset };
}
