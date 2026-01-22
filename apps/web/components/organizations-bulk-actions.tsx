'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from '@/i18n/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface OrganizationsBulkActionsProps {
  selectedIds: string[];
  onDeleteComplete: () => void;
}

export function OrganizationsBulkActions({
  selectedIds,
  onDeleteComplete,
}: OrganizationsBulkActionsProps) {
  const t = useTranslations('admin.organizations');
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationIds: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete organizations');
      }

      setShowConfirmDialog(false);
      onDeleteComplete();
      router.refresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete organizations');
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted/50 border-b">
        <span className="text-sm font-medium">
          {t('bulkActions.selected', { count: selectedIds.length })}
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirmDialog(true)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('bulkActions.delete')}
        </Button>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulkActions.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('bulkActions.confirmDescription', { count: selectedIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isDeleting}
            >
              {t('bulkActions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('bulkActions.deleting')}
                </>
              ) : (
                t('bulkActions.confirmDelete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
