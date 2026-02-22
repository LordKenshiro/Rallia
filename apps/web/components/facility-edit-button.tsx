'use client';

import { Button } from '@/components/ui/button';
import { EditFacilityDialog } from '@/components/edit-facility-dialog';
import { Edit } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface FacilityEditButtonProps {
  facilityId: string;
}

export function FacilityEditButton({ facilityId }: FacilityEditButtonProps) {
  const t = useTranslations('facilities');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <Edit className="mr-2 size-4" />
        {t('detail.editButton')}
      </Button>
      <EditFacilityDialog open={dialogOpen} onOpenChange={setDialogOpen} facilityId={facilityId} />
    </>
  );
}
