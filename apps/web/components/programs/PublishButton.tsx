'use client';

import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

interface PublishButtonProps {
  programId: string;
}

export function PublishButton({ programId }: PublishButtonProps) {
  const router = useRouter();
  const t = useTranslations('programs');
  const tCommon = useTranslations('common');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/programs/${programId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || tCommon('error'));
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button variant="default" onClick={handlePublish} disabled={isPublishing}>
        {isPublishing ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Send className="mr-2 size-4" />
        )}
        {t('detail.publish')}
      </Button>
    </div>
  );
}
