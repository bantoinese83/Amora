import { useState } from 'react';
import { preferencesRepository } from '../repositories/preferencesRepository';

export function usePinInput(length: number = 4, onSuccess: () => void) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

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

    // Check completion
    const isComplete = newValues.every(v => v !== '');
    if (isComplete && index === length - 1) {
      const enteredPin = newValues.join('');
      const isValid = preferencesRepository.validatePin(enteredPin);

      if (isValid) {
        onSuccess();
        setValues(Array(length).fill(''));
        setError(false);
        setAttempts(0);
      } else {
        setError(true);
        setAttempts(prev => prev + 1);
        setTimeout(() => {
          setValues(Array(length).fill(''));
          setError(false);
          document.getElementById('pin-0')?.focus();
        }, 800);
      }
    }
  };

  return { values, error, handleDigitChange, attempts };
}
