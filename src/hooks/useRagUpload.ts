import { useState, useCallback } from 'react';
import { RagService } from '../services/ragService';

export function useRagUpload(onSuccess: (storeName: string) => void) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [ragService] = useState(() => new RagService());

  const uploadFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);
      setStatus('Getting ready...');

      try {
        const storeName = await ragService.indexDocument(file, setStatus);
        setStatus('Success!');
        // Delay to show success state before callback
        setTimeout(() => {
          setIsProcessing(false);
          onSuccess(storeName);
        }, 1000);
      } catch {
        setError('Something went wrong. Please try again.');
        setIsProcessing(false);
      }
    },
    [ragService, onSuccess]
  );

  return {
    isProcessing,
    status,
    error,
    uploadFile,
  };
}
