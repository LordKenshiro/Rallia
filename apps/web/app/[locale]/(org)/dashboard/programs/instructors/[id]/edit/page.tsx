'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Link, useRouter } from '@/i18n/navigation';
import { BackButton } from '@/components/back-button';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Instructor {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  hourly_rate_cents: number | null;
  currency: string;
  specializations: string[];
  is_external: boolean;
  is_active: boolean;
}

export default function EditInstructorPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('programs.instructors.edit');
  const tCommon = useTranslations('common');
  const instructorId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    bio: '',
    hourlyRateCents: '',
    specializations: '',
    isExternal: true,
    isActive: true,
  });

  const fetchInstructor = useCallback(async () => {
    try {
      const response = await fetch(`/api/instructors/${instructorId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/dashboard/programs/instructors');
          return;
        }
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToLoad'));
      }

      const data = await response.json();
      setInstructor(data);

      // Pre-populate form
      setFormData({
        displayName: data.display_name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        hourlyRateCents: data.hourly_rate_cents ? (data.hourly_rate_cents / 100).toString() : '',
        specializations: Array.isArray(data.specializations) ? data.specializations.join(', ') : '',
        isExternal: data.is_external ?? true,
        isActive: data.is_active ?? true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [instructorId, router, t]);

  useEffect(() => {
    fetchInstructor();
  }, [fetchInstructor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/instructors/${instructorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          bio: formData.bio || undefined,
          hourlyRateCents: formData.hourlyRateCents
            ? Math.round(parseFloat(formData.hourlyRateCents) * 100)
            : undefined,
          specializations: formData.specializations
            ? formData.specializations
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            : undefined,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToUpdate'));
      }

      router.push(`/dashboard/programs/instructors/${instructorId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">{t('instructorNotFound')}</p>
        <BackButton asButton>{t('backToInstructors')}</BackButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-8 max-w-2xl mx-auto">
      <div>
        <BackButton className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          {t('backToInstructor')}
        </BackButton>
        <h1 className="text-3xl font-bold mb-0">{t('title')}</h1>
        <p className="text-muted-foreground mb-0">{t('description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('sections.details')}</CardTitle>
            <CardDescription>{tCommon('optional')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('fields.name')} *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                placeholder={t('placeholders.name')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('fields.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('placeholders.email')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('fields.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('placeholders.phone')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t('fields.bio')}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                placeholder={t('placeholders.bio')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourlyRate">{t('fields.hourlyRate')}</Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourlyRateCents}
                onChange={e => setFormData({ ...formData, hourlyRateCents: e.target.value })}
                placeholder={t('placeholders.hourlyRate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specializations">{t('fields.specializations')}</Label>
              <Input
                id="specializations"
                value={formData.specializations}
                onChange={e => setFormData({ ...formData, specializations: e.target.value })}
                placeholder={t('placeholders.specializations')}
              />
              <p className="text-xs text-muted-foreground">{t('descriptions.specializations')}</p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="isActive">{t('fields.isActive')}</Label>
                <p className="text-sm text-muted-foreground">{t('descriptions.isActive')}</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/programs/instructors/${instructorId}`}>
              {t('actions.cancel')}
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('actions.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
