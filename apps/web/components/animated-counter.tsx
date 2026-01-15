'use client';

import { RefObject, useEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

interface AnimatedCounterProps {
  value: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 2000, className }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState('0');
  const elementRef = useRef<HTMLSpanElement>(null);
  const isVisible = useIntersectionObserver(elementRef as RefObject<Element>, {
    threshold: 0.3,
    freezeOnceVisible: true,
  });
  const hasAnimated = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;

    hasAnimated.current = true;

    // If user prefers reduced motion, show final value immediately
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    // Extract number and suffix (e.g., "2,500+" => number: 2500, suffix: "+")
    const matches = value.match(/^([\d,.]+)(.*)$/);
    if (!matches) {
      setDisplayValue(value);
      return;
    }

    const [, numStr, suffix] = matches;
    const targetNum = parseFloat(numStr.replace(/,/g, ''));

    if (isNaN(targetNum)) {
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    const formatNumber = (num: number) => {
      // Keep the original formatting (with commas)
      return num.toLocaleString();
    };

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentNum = Math.floor(targetNum * easeProgress);

      setDisplayValue(formatNumber(currentNum) + suffix);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value); // Ensure final value is exact
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value, duration, prefersReducedMotion]);

  return (
    <span ref={elementRef} className={className}>
      {displayValue}
    </span>
  );
}
