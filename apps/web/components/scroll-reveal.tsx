'use client';

import { useRef, useEffect, RefObject } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollReveal({ children, className = '' }: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(elementRef as RefObject<Element>, {
    threshold: 0.1,
    freezeOnceVisible: true,
  });

  useEffect(() => {
    if (isVisible && elementRef.current) {
      elementRef.current.classList.add('is-visible');
    }
  }, [isVisible]);

  return (
    <div ref={elementRef} className={`animate-on-scroll ${className}`}>
      {children}
    </div>
  );
}
