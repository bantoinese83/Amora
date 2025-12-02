import { useState, useEffect } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'slow';

interface UseNetworkStatusReturn {
  isOnline: boolean;
  networkStatus: NetworkStatus;
  connectionQuality: 'excellent' | 'good' | 'poor';
}

/**
 * Hook to monitor network connectivity and connection quality
 * Provides real-time network status for better UX
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>(
    'excellent'
  );

  useEffect(() => {
    // Monitor online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkStatus('online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkStatus('offline');
      setConnectionQuality('poor');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection quality using Network Information API if available
    const checkConnectionQuality = () => {
      // @ts-ignore - navigator.connection is not in TypeScript types but exists in some browsers
      const connection =
        // @ts-ignore
        navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      if (connection) {
        // Check effective type (4G, 3G, 2G, slow-2g)
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink; // Mbps

        if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
          setConnectionQuality('poor');
          setNetworkStatus('slow');
        } else if (effectiveType === '3g' || downlink < 1.5) {
          setConnectionQuality('good');
          setNetworkStatus('online');
        } else {
          setConnectionQuality('excellent');
          setNetworkStatus('online');
        }

        // Monitor connection changes
        connection.addEventListener('change', checkConnectionQuality);
      }
    };

    // Initial check
    checkConnectionQuality();

    // Periodic quality check (fallback if Network API not available)
    const qualityCheckInterval = setInterval(() => {
      if (navigator.onLine) {
        // Simple latency check via fetch
        const startTime = window.performance.now();
        fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' })
          .then(() => {
            const latency = window.performance.now() - startTime;
            if (latency > 2000) {
              setConnectionQuality('poor');
              setNetworkStatus('slow');
            } else if (latency > 1000) {
              setConnectionQuality('good');
            } else {
              setConnectionQuality('excellent');
            }
          })
          .catch(() => {
            setConnectionQuality('poor');
            setNetworkStatus('slow');
          });
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityCheckInterval);
      // @ts-ignore - navigator.connection cleanup
      const connection =
        // @ts-ignore
        navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        connection.removeEventListener('change', checkConnectionQuality);
      }
    };
  }, []);

  return { isOnline, networkStatus, connectionQuality };
}
