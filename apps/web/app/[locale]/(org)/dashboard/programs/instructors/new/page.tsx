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
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function NewInstructorPage() {
  const router = useRouter();
  const t = useTranslations('programs.instructors.new');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    bio: '',
    hourlyRateCents: '',
    specializations: '',
    isExternal: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/instructors', {
        method: 'POST',
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
          isExternal: formData.isExternal,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToCreate'));
      }

      router.push('/dashboard/programs/instructors');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-8 max-w-2xl mx-auto">
      <div>
        <BackButton className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          {t('backToInstructors')}
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
                <Label htmlFor="isExternal">{t('fields.isExternal')}</Label>
                <p className="text-sm text-muted-foreground">{t('descriptions.isExternal')}</p>
              </div>
              <Switch
                id="isExternal"
                checked={formData.isExternal}
                onCheckedChange={checked => setFormData({ ...formData, isExternal: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/programs/instructors">{t('actions.cancel')}</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('actions.add')}
          </Button>
        </div>
      </form>
    </div>
  );
}
