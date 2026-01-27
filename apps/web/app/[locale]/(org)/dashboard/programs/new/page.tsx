'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link, useRouter } from '@/i18n/navigation';
import { BackButton } from '@/components/back-button';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Facility {
  id: string;
  name: string;
}

interface Sport {
  id: string;
  name: string;
  slug: string;
}

export default function NewProgramPage() {
  const t = useTranslations('programs.new');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: 'program' as 'program' | 'lesson',
    description: '',
    facilityId: '',
    sportId: '',
    // Schedule
    startDate: '',
    endDate: '',
    registrationOpensAt: '',
    registrationDeadline: '',
    // Capacity
    minParticipants: '',
    maxParticipants: '',
    waitlistEnabled: true,
    waitlistLimit: '',
    // Pricing
    priceCents: 0,
    allowInstallments: false,
    installmentCount: 2,
    depositCents: '',
    // Eligibility
    ageMin: '',
    ageMax: '',
    skillLevelMin: '',
    skillLevelMax: '',
    // Cancellation Policy
    fullRefundDays: 7,
    partialRefundDays: 3,
    partialRefundPercent: 50,
    noRefundAfterStart: true,
    prorateBySessionsAttended: true,
    // Options
    autoBlockCourts: false,
    coverImageUrl: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [facilitiesRes, sportsRes] = await Promise.all([
        fetch('/api/facilities'),
        fetch('/api/sports'),
      ]);

      if (facilitiesRes.ok) {
        const data = await facilitiesRes.json();
        setFacilities(data.facilities || []);
      }

      if (sportsRes.ok) {
        const data = await sportsRes.json();
        setSports(data.sports || data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          facilityId: formData.facilityId || undefined,
          sportId: formData.sportId || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          registrationOpensAt: formData.registrationOpensAt || undefined,
          registrationDeadline: formData.registrationDeadline || undefined,
          minParticipants: formData.minParticipants
            ? parseInt(formData.minParticipants)
            : undefined,
          maxParticipants: formData.maxParticipants
            ? parseInt(formData.maxParticipants)
            : undefined,
          priceCents: Math.round(formData.priceCents * 100),
          allowInstallments: formData.allowInstallments,
          installmentCount: formData.allowInstallments ? formData.installmentCount : 1,
          depositCents: formData.depositCents
            ? Math.round(parseFloat(formData.depositCents) * 100)
            : undefined,
          waitlistEnabled: formData.waitlistEnabled,
          waitlistLimit: formData.waitlistLimit ? parseInt(formData.waitlistLimit) : undefined,
          autoBlockCourts: formData.autoBlockCourts,
          ageMin: formData.ageMin ? parseInt(formData.ageMin) : undefined,
          ageMax: formData.ageMax ? parseInt(formData.ageMax) : undefined,
          skillLevelMin: formData.skillLevelMin || undefined,
          skillLevelMax: formData.skillLevelMax || undefined,
          cancellationPolicy: {
            full_refund_days_before_start: formData.fullRefundDays,
            partial_refund_days_before_start: formData.partialRefundDays,
            partial_refund_percent: formData.partialRefundPercent,
            no_refund_after_start: formData.noRefundAfterStart,
            prorate_by_sessions_attended: formData.prorateBySessionsAttended,
          },
          coverImageUrl: formData.coverImageUrl || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToCreate'));
      }

      const program = await response.json();
      router.push(`/dashboard/programs/${program.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];

  return (
    <div className="flex flex-col w-full gap-8 max-w-3xl mx-auto">
      <div>
        <BackButton className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          {t('backToPrograms')}
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

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('fields.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('placeholders.name')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t('fields.type')} *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'program' | 'lesson') =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="program">{t('types.program')}</SelectItem>
                  <SelectItem value="lesson">{t('types.lesson')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('fields.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('placeholders.description')}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Sport */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.location')}</CardTitle>
            <CardDescription>{t('sections.locationDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facility">{t('fields.facility')}</Label>
                <Select
                  value={formData.facilityId}
                  onValueChange={value => setFormData({ ...formData, facilityId: value })}
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.selectFacility')} />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map(facility => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sport">{t('fields.sport')}</Label>
                <Select
                  value={formData.sportId}
                  onValueChange={value => setFormData({ ...formData, sportId: value })}
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.selectSport')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map(sport => (
                      <SelectItem key={sport.id} value={sport.id}>
                        {sport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.schedule')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('fields.startDate')} *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t('fields.endDate')}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationOpensAt">{t('fields.registrationOpensAt')}</Label>
                <Input
                  id="registrationOpensAt"
                  type="datetime-local"
                  value={formData.registrationOpensAt}
                  onChange={e => setFormData({ ...formData, registrationOpensAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationDeadline">{t('fields.registrationDeadline')}</Label>
                <Input
                  id="registrationDeadline"
                  type="datetime-local"
                  value={formData.registrationDeadline}
                  onChange={e => setFormData({ ...formData, registrationDeadline: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.capacity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minParticipants">{t('fields.minParticipants')}</Label>
                <Input
                  id="minParticipants"
                  type="number"
                  min="1"
                  value={formData.minParticipants}
                  onChange={e => setFormData({ ...formData, minParticipants: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">{t('fields.maxParticipants')}</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={e => setFormData({ ...formData, maxParticipants: e.target.value })}
                  placeholder={t('placeholders.maxParticipants')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="waitlistEnabled">{t('fields.waitlistEnabled')}</Label>
                <p className="text-sm text-muted-foreground">{t('fields.waitlistDescription')}</p>
              </div>
              <Switch
                id="waitlistEnabled"
                checked={formData.waitlistEnabled}
                onCheckedChange={checked => setFormData({ ...formData, waitlistEnabled: checked })}
              />
            </div>

            {formData.waitlistEnabled && (
              <div className="space-y-2">
                <Label htmlFor="waitlistLimit">{t('fields.waitlistLimit')}</Label>
                <Input
                  id="waitlistLimit"
                  type="number"
                  min="1"
                  value={formData.waitlistLimit}
                  onChange={e => setFormData({ ...formData, waitlistLimit: e.target.value })}
                  placeholder={t('placeholders.noLimit')}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.pricing')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t('fields.price')} *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.priceCents}
                onChange={e =>
                  setFormData({ ...formData, priceCents: parseFloat(e.target.value) || 0 })
                }
                placeholder={t('placeholders.price')}
                required
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="allowInstallments">{t('fields.allowInstallments')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('fields.installmentDescription')}
                </p>
              </div>
              <Switch
                id="allowInstallments"
                checked={formData.allowInstallments}
                onCheckedChange={checked =>
                  setFormData({ ...formData, allowInstallments: checked })
                }
              />
            </div>

            {formData.allowInstallments && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installmentCount">{t('fields.installmentCount')}</Label>
                  <Select
                    value={formData.installmentCount.toString()}
                    onValueChange={value =>
                      setFormData({ ...formData, installmentCount: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">{t('installments.2')}</SelectItem>
                      <SelectItem value="3">{t('installments.3')}</SelectItem>
                      <SelectItem value="4">{t('installments.4')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depositCents">{t('fields.deposit')}</Label>
                  <Input
                    id="depositCents"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.depositCents}
                    onChange={e => setFormData({ ...formData, depositCents: e.target.value })}
                    placeholder={t('placeholders.deposit')}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eligibility */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.eligibility')}</CardTitle>
            <CardDescription>{t('sections.eligibilityDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageMin">{t('fields.ageMin')}</Label>
                <Input
                  id="ageMin"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.ageMin}
                  onChange={e => setFormData({ ...formData, ageMin: e.target.value })}
                  placeholder={t('placeholders.noMinimum')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageMax">{t('fields.ageMax')}</Label>
                <Input
                  id="ageMax"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.ageMax}
                  onChange={e => setFormData({ ...formData, ageMax: e.target.value })}
                  placeholder={t('placeholders.noMaximum')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skillLevelMin">{t('fields.skillLevelMin')}</Label>
                <Select
                  value={formData.skillLevelMin}
                  onValueChange={value => setFormData({ ...formData, skillLevelMin: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.anyLevel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {skillLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        {t(`skillLevels.${level}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skillLevelMax">{t('fields.skillLevelMax')}</Label>
                <Select
                  value={formData.skillLevelMax}
                  onValueChange={value => setFormData({ ...formData, skillLevelMax: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.anyLevel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {skillLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        {t(`skillLevels.${level}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Policy */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.cancellationPolicy')}</CardTitle>
            <CardDescription>{t('sections.cancellationPolicyDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullRefundDays">{t('fields.fullRefundDays')}</Label>
                <Input
                  id="fullRefundDays"
                  type="number"
                  min="0"
                  value={formData.fullRefundDays}
                  onChange={e =>
                    setFormData({ ...formData, fullRefundDays: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partialRefundDays">{t('fields.partialRefundDays')}</Label>
                <Input
                  id="partialRefundDays"
                  type="number"
                  min="0"
                  value={formData.partialRefundDays}
                  onChange={e =>
                    setFormData({ ...formData, partialRefundDays: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="partialRefundPercent">{t('fields.partialRefundPercent')}</Label>
              <Input
                id="partialRefundPercent"
                type="number"
                min="0"
                max="100"
                value={formData.partialRefundPercent}
                onChange={e =>
                  setFormData({ ...formData, partialRefundPercent: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="noRefundAfterStart">{t('fields.noRefundAfterStart')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('fields.noRefundAfterStartDescription')}
                </p>
              </div>
              <Switch
                id="noRefundAfterStart"
                checked={formData.noRefundAfterStart}
                onCheckedChange={checked =>
                  setFormData({ ...formData, noRefundAfterStart: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="prorateBySessionsAttended">
                  {t('fields.prorateBySessionsAttended')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('fields.prorateBySessionsAttendedDescription')}
                </p>
              </div>
              <Switch
                id="prorateBySessionsAttended"
                checked={formData.prorateBySessionsAttended}
                onCheckedChange={checked =>
                  setFormData({ ...formData, prorateBySessionsAttended: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.options')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="autoBlockCourts">{t('fields.autoBlockCourts')}</Label>
                <p className="text-sm text-muted-foreground">{t('fields.autoBlockDescription')}</p>
              </div>
              <Switch
                id="autoBlockCourts"
                checked={formData.autoBlockCourts}
                onCheckedChange={checked => setFormData({ ...formData, autoBlockCourts: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/programs">{t('actions.cancel')}</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('actions.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
