import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
}

export const useTimer = ({ initialSeconds, onComplete }: UseTimerProps) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Sync with initialSeconds when not active
  useEffect(() => {
    if (!isActive) {
      setSecondsRemaining(initialSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeconds]);

  const start = useCallback(() => {
    if (initialSeconds > 0) {
      setIsActive(true);
    }
  }, [initialSeconds]);

  const pause = useCallback(() => setIsActive(false), []);
  const reset = useCallback(() => {
    setIsActive(false);
    setSecondsRemaining(initialSeconds);
  }, [initialSeconds]);

  // Main countdown interval
  useEffect(() => {
    if (isActive && initialSeconds > 0) {
      intervalRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isActive, initialSeconds]);

  // Handle completion and loop
  useEffect(() => {
    if (isActive && secondsRemaining === 0 && initialSeconds > 0) {
      setSecondsRemaining(initialSeconds);
      if (onComplete) {
        onComplete();
      }
    }
  }, [isActive, secondsRemaining, initialSeconds, onComplete]);

  return {
    secondsRemaining,
    isActive,
    start,
    pause,
    reset,
  };
};
