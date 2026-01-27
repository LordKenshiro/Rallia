'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  children?: ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  asButton?: boolean;
}

export function BackButton({
  children,
  className,
  variant = 'outline',
  asButton = false,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.back();
  };

  if (asButton) {
    return (
      <Button variant={variant} onClick={handleClick} className={className}>
        <ArrowLeft className="mr-2 size-4" />
        {children}
      </Button>
    );
  }

  // Icon-only button (no children)
  if (!children) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center p-2 rounded-md transition-colors',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-muted active:bg-muted/80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        aria-label="Go back"
      >
        <ArrowLeft className="size-5" />
      </button>
    );
  }

  // Text button with icon
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center text-sm font-medium transition-colors',
        'text-muted-foreground hover:text-foreground',
        'hover:underline-offset-4 hover:underline',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm',
        'mb-2',
        className
      )}
    >
      <ArrowLeft className="mr-2 size-4 shrink-0" />
      {children}
    </button>
  );
}
