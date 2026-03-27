import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
}

export const useTimer = ({ initialSeconds, onComplete }: UseTimerProps) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const prevInitialSeconds = useRef(initialSeconds);

  // Update secondsRemaining only if initialSeconds actually changed AND we are not currently running
  useEffect(() => {
    if (prevInitialSeconds.current !== initialSeconds) {
      if (!isActive) {
        setSecondsRemaining(initialSeconds);
      }
      prevInitialSeconds.current = initialSeconds;
    }
  }, [initialSeconds, isActive]);

  const start = useCallback(() => setIsActive(true), []);
  const pause = useCallback(() => setIsActive(false), []);
  const reset = useCallback(() => {
    setIsActive(false);
    setSecondsRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isActive && secondsRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isActive && secondsRemaining === 0) {
      // Automatic Loop: Reset to initialSeconds and keep isActive true
      setSecondsRemaining(initialSeconds);
      if (onComplete) {
        onComplete();
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isActive, secondsRemaining, onComplete, initialSeconds]);

  return {
    secondsRemaining,
    isActive,
    start,
    pause,
    reset,
  };
};
