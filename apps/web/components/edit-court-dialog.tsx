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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// These must match the surface_type_enum in the database
const SURFACE_TYPES = [
  'hard',
  'clay',
  'grass',
  'synthetic',
  'carpet',
  'concrete',
  'asphalt',
] as const;

// These must match the availability_enum in the database
const AVAILABILITY_STATUSES = ['available', 'maintenance', 'closed', 'reserved'] as const;

type SurfaceType = (typeof SURFACE_TYPES)[number];
type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

interface Court {
  id: string;
  name: string | null;
  court_number: number | null;
  surface_type: string | null;
  indoor: boolean | null;
  lighting: boolean | null;
  lines_marked_for_multiple_sports: boolean | null;
  availability_status: string | null;
  notes: string | null;
}

interface EditCourtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court: Court;
}

export function EditCourtDialog({ open, onOpenChange, court }: EditCourtDialogProps) {
  const t = useTranslations('courts');
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(court.name || '');
  const [courtNumber, setCourtNumber] = useState<number | ''>(court.court_number || '');
  const [surfaceType, setSurfaceType] = useState<SurfaceType | ''>(
    (court.surface_type as SurfaceType) || ''
  );
  const [indoor, setIndoor] = useState(court.indoor ?? false);
  const [lighting, setLighting] = useState(court.lighting ?? false);
  const [multiSport, setMultiSport] = useState(court.lines_marked_for_multiple_sports ?? false);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(
    (court.availability_status as AvailabilityStatus) || 'available'
  );
  const [notes, setNotes] = useState(court.notes || '');

  // Reset form when court changes
  useEffect(() => {
    setName(court.name || '');
    setCourtNumber(court.court_number || '');
    setSurfaceType((court.surface_type as SurfaceType) || '');
    setIndoor(court.indoor ?? false);
    setLighting(court.lighting ?? false);
    setMultiSport(court.lines_marked_for_multiple_sports ?? false);
    setAvailabilityStatus((court.availability_status as AvailabilityStatus) || 'available');
    setNotes(court.notes || '');
    setError(null);
  }, [court]);

  const handleClose = () => {
    if (!saving) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('court')
        .update({
          name: name || null,
          court_number: courtNumber || null,
          surface_type: surfaceType || null,
          indoor,
          lighting,
          lines_marked_for_multiple_sports: multiSport,
          availability_status: availabilityStatus,
          notes: notes || null,
        })
        .eq('id', court.id);

      if (updateError) throw updateError;

      onOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error('Error updating court:', err);
      setError(t('edit.error'));
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim() || courtNumber;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
          <DialogDescription>{court.name || `Court ${court.court_number}`}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('add.nameLabel')}</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('add.namePlaceholder')}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-courtNumber">{t('add.numberLabel')}</Label>
              <Input
                id="edit-courtNumber"
                type="number"
                min="1"
                value={courtNumber}
                onChange={e => setCourtNumber(e.target.value ? parseInt(e.target.value) : '')}
                placeholder={t('add.numberPlaceholder')}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-surfaceType">{t('add.surfaceLabel')}</Label>
              <select
                id="edit-surfaceType"
                value={surfaceType}
                onChange={e => setSurfaceType(e.target.value as SurfaceType | '')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
              >
                <option value="">{t('add.surfacePlaceholder')}</option>
                {SURFACE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {t(`surface.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">{t('table.status')}</Label>
              <select
                id="edit-status"
                value={availabilityStatus}
                onChange={e => setAvailabilityStatus(e.target.value as AvailabilityStatus)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
              >
                {AVAILABILITY_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="edit-indoor"
                checked={indoor}
                onChange={e => setIndoor(e.target.checked)}
                className="size-4 rounded border-gray-300"
                disabled={saving}
              />
              <div>
                <Label htmlFor="edit-indoor" className="cursor-pointer">
                  {t('add.indoorLabel')}
                </Label>
                <p className="text-sm text-muted-foreground">{t('add.indoorHint')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="edit-lighting"
                checked={lighting}
                onChange={e => setLighting(e.target.checked)}
                className="size-4 rounded border-gray-300"
                disabled={saving}
              />
              <div>
                <Label htmlFor="edit-lighting" className="cursor-pointer">
                  {t('add.lightingLabel')}
                </Label>
                <p className="text-sm text-muted-foreground">{t('add.lightingHint')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="edit-multiSport"
                checked={multiSport}
                onChange={e => setMultiSport(e.target.checked)}
                className="size-4 rounded border-gray-300"
                disabled={saving}
              />
              <div>
                <Label htmlFor="edit-multiSport" className="cursor-pointer">
                  {t('add.multiSportLabel')}
                </Label>
                <p className="text-sm text-muted-foreground">{t('add.multiSportHint')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">{t('add.notesLabel')}</Label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('add.notesPlaceholder')}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              {t('add.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !isValid}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('edit.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  {t('edit.saveButton')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
