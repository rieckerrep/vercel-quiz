import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PerformanceFallbackProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  timeout?: number;
}

export const PerformanceFallback: React.FC<PerformanceFallbackProps> = ({
  children,
  fallback,
  loadingComponent,
  timeout = 2000
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const [connectionSpeed, setConnectionSpeed] = useState<'fast' | 'slow' | 'offline'>('fast');

  useEffect(() => {
    // Verbindungsgeschwindigkeit überprüfen
    const checkConnectionSpeed = async () => {
      try {
        const startTime = performance.now();
        await fetch('/api/ping');
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (responseTime > 1000) {
          setConnectionSpeed('slow');
        } else {
          setConnectionSpeed('fast');
        }
      } catch (error) {
        setConnectionSpeed('offline');
      }
    };

    checkConnectionSpeed();

    // Timeout für Fallback
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowFallback(true);
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout]);

  // Ladezustand simulieren
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Skeleton Loading
  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  );

  // Progressive Loading basierend auf Verbindungsgeschwindigkeit
  if (connectionSpeed === 'slow') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {loadingComponent || <SkeletonLoader />}
        <div className="mt-4 text-sm text-gray-500">
          Langsame Verbindung erkannt. Inhalte werden schrittweise geladen...
        </div>
      </motion.div>
    );
  }

  if (connectionSpeed === 'offline') {
    return (
      <div className="text-center p-4">
        <div className="text-red-500 mb-2">Offline-Modus</div>
        <div className="text-sm text-gray-500">
          Bitte überprüfen Sie Ihre Internetverbindung.
        </div>
      </div>
    );
  }

  // Standard-Fallback-Logik
  if (isLoading) {
    return <>{loadingComponent || <SkeletonLoader />}</>;
  }

  if (showFallback) {
    return <>{fallback || <SkeletonLoader />}</>;
  }

  return <>{children}</>;
};

// Beispiel für die Verwendung:
export const withPerformanceFallback = (
  Component: React.ComponentType,
  options: Omit<PerformanceFallbackProps, 'children'> = {}
) => {
  return (props: any) => (
    <PerformanceFallback {...options}>
      <Component {...props} />
    </PerformanceFallback>
  );
}; 