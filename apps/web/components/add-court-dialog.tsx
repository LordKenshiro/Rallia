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
import { Loader2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

type SurfaceType = (typeof SURFACE_TYPES)[number];

interface AddCourtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
}

export function AddCourtDialog({ open, onOpenChange, facilityId }: AddCourtDialogProps) {
  const t = useTranslations('courts');
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [courtNumber, setCourtNumber] = useState<number | ''>('');
  const [surfaceType, setSurfaceType] = useState<SurfaceType | ''>('');
  const [indoor, setIndoor] = useState(false);
  const [lighting, setLighting] = useState(false);
  const [multiSport, setMultiSport] = useState(false);
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setCourtNumber('');
    setSurfaceType('');
    setIndoor(false);
    setLighting(false);
    setMultiSport(false);
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    if (!saving) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase.from('court').insert({
        facility_id: facilityId,
        name: name || null,
        court_number: courtNumber || null,
        surface_type: surfaceType || null,
        indoor,
        lighting,
        lines_marked_for_multiple_sports: multiSport,
        notes: notes || null,
        availability_status: 'available' as const,
        is_active: true,
      });

      if (insertError) throw insertError;

      resetForm();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error('Error adding court:', err);
      setError(t('add.error'));
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim() || courtNumber;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('add.title')}</DialogTitle>
          <DialogDescription>{t('add.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('add.nameLabel')}</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('add.namePlaceholder')}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courtNumber">{t('add.numberLabel')}</Label>
              <Input
                id="courtNumber"
                type="number"
                min="1"
                value={courtNumber}
                onChange={e => setCourtNumber(e.target.value ? parseInt(e.target.value) : '')}
                placeholder={t('add.numberPlaceholder')}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surfaceType">{t('add.surfaceLabel')}</Label>
            <select
              id="surfaceType"
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

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="indoor"
                checked={indoor}
                onChange={e => setIndoor(e.target.checked)}
                className="size-4 rounded border-gray-300"
                disabled={saving}
              />
              <div>
                <Label htmlFor="indoor" className="cursor-pointer">
                  {t('add.indoorLabel')}
                </Label>
                <p className="text-sm text-muted-foreground">{t('add.indoorHint')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="lighting"
                checked={lighting}
                onChange={e => setLighting(e.target.checked)}
                className="size-4 rounded border-gray-300"
                disabled={saving}
              />
              <div>
                <Label htmlFor="lighting" className="cursor-pointer">
                  {t('add.lightingLabel')}
                </Label>
                <p className="text-sm text-muted-foreground">{t('add.lightingHint')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="multiSport"
                checked={multiSport}
                onChange={e => setMultiSport(e.target.checked)}
                className="size-4 rounded border-gray-300"
                disabled={saving}
              />
              <div>
                <Label htmlFor="multiSport" className="cursor-pointer">
                  {t('add.multiSportLabel')}
                </Label>
                <p className="text-sm text-muted-foreground">{t('add.multiSportHint')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('add.notesLabel')}</Label>
            <textarea
              id="notes"
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
                  {t('add.adding')}
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  {t('add.addButton')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
