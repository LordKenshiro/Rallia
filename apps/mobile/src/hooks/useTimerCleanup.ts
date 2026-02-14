/**
 * useTimerCleanup Hook
 * Manages setTimeout calls with automatic cleanup on unmount
 * Prevents memory leaks from dangling timers
 */
import { useEffect, useRef, useCallback } from 'react';

export const useTimerCleanup = () => {
  const timers = useRef<Set<NodeJS.Timeout>>(new Set());

  // Schedule a timer with automatic tracking
  const scheduleTimer = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timerId = setTimeout(() => {
      callback();
      timers.current.delete(timerId); // Remove from tracking after execution
    }, delay);

    timers.current.add(timerId);
    return timerId;
  }, []);

  // Manual timer cancellation
  const cancelTimer = useCallback((timerId: NodeJS.Timeout) => {
    clearTimeout(timerId);
    timers.current.delete(timerId);
  }, []);

  // Clear all timers
  const cancelAllTimers = useCallback(() => {
    timers.current.forEach(timerId => clearTimeout(timerId));
    timers.current.clear();
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach(timerId => clearTimeout(timerId));
      currentTimers.clear();
    };
  }, []);

  return {
    scheduleTimer,
    cancelTimer,
    cancelAllTimers,
  };
};
