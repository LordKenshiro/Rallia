'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/components/organization-context';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface OrganizationSettings {
  id: string;
  organization_id: string;
  slot_duration_minutes: number | null;
  allow_same_day_booking: boolean | null;
  min_booking_notice_hours: number | null;
  max_advance_booking_days: number | null;
  require_booking_approval: boolean | null;
  approval_timeout_hours: number | null;
}

interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const supabase = createClient();
  const { selectedOrganization, isLoading: orgLoading } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);

  // Form state
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [slotDuration, setSlotDuration] = useState('60');
  const [allowSameDay, setAllowSameDay] = useState(true);
  const [minNoticeHours, setMinNoticeHours] = useState('2');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');

  useEffect(() => {
    async function fetchData() {
      if (orgLoading) return;

      if (!selectedOrganization) {
        setError(t('general.noOrganization'));
        setLoading(false);
        return;
      }

      try {
        // Fetch organization details
        const { data: org, error: orgError } = await supabase
          .from('organization')
          .select('id, name, email, phone, website, address, city, postal_code')
          .eq('id', selectedOrganization.id)
          .single();

        if (orgError || !org) {
          setError(t('general.fetchError'));
          setLoading(false);
          return;
        }

        setOrganization(org);
        setOrgName(org.name || '');
        setOrgEmail(org.email || '');
        setOrgPhone(org.phone || '');
        setOrgWebsite(org.website || '');

        // Fetch organization settings
        const { data: orgSettings } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', selectedOrganization.id)
          .single();

        if (orgSettings) {
          setSettings(orgSettings);
          setSlotDuration(String(orgSettings.slot_duration_minutes || 60));
          setAllowSameDay(orgSettings.allow_same_day_booking ?? true);
          setMinNoticeHours(String(orgSettings.min_booking_notice_hours || 2));
          setMaxAdvanceDays(String(orgSettings.max_advance_booking_days || 30));
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError(t('general.fetchError'));
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedOrganization, orgLoading, supabase, t]);

  const handleSave = async () => {
    if (!selectedOrganization) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Update organization details
      const { error: orgUpdateError } = await supabase
        .from('organization')
        .update({
          name: orgName,
          email: orgEmail || null,
          phone: orgPhone || null,
          website: orgWebsite || null,
        })
        .eq('id', selectedOrganization.id);

      if (orgUpdateError) throw orgUpdateError;

      // Upsert organization settings
      const settingsData = {
        organization_id: selectedOrganization.id,
        slot_duration_minutes: parseInt(slotDuration),
        allow_same_day_booking: allowSameDay,
        min_booking_notice_hours: parseInt(minNoticeHours),
        max_advance_booking_days: parseInt(maxAdvanceDays),
      };

      if (settings?.id) {
        const { error: settingsError } = await supabase
          .from('organization_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (settingsError) throw settingsError;
      } else {
        const { error: settingsError } = await supabase
          .from('organization_settings')
          .insert(settingsData);

        if (settingsError) throw settingsError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(t('general.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-0">{t('general.title')}</h1>
        <p className="text-muted-foreground">{t('general.description')}</p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('general.orgInfo.title')}</CardTitle>
          <CardDescription>{t('general.orgInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">{t('general.orgInfo.name')}</Label>
              <Input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgEmail">{t('general.orgInfo.email')}</Label>
              <Input
                id="orgEmail"
                type="email"
                value={orgEmail}
                onChange={e => setOrgEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgPhone">{t('general.orgInfo.phone')}</Label>
              <Input
                id="orgPhone"
                type="tel"
                value={orgPhone}
                onChange={e => setOrgPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgWebsite">{t('general.orgInfo.website')}</Label>
              <Input
                id="orgWebsite"
                type="url"
                value={orgWebsite}
                onChange={e => setOrgWebsite(e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('general.booking.title')}</CardTitle>
          <CardDescription>{t('general.booking.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="slotDuration">{t('general.booking.slotDuration')}</Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 {t('general.booking.minutes')}</SelectItem>
                  <SelectItem value="60">60 {t('general.booking.minutes')}</SelectItem>
                  <SelectItem value="90">90 {t('general.booking.minutes')}</SelectItem>
                  <SelectItem value="120">120 {t('general.booking.minutes')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('general.booking.slotDurationHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minNotice">{t('general.booking.minNotice')}</Label>
              <Select value={minNoticeHours} onValueChange={setMinNoticeHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 {t('general.booking.hours')}</SelectItem>
                  <SelectItem value="1">1 {t('general.booking.hour')}</SelectItem>
                  <SelectItem value="2">2 {t('general.booking.hours')}</SelectItem>
                  <SelectItem value="4">4 {t('general.booking.hours')}</SelectItem>
                  <SelectItem value="8">8 {t('general.booking.hours')}</SelectItem>
                  <SelectItem value="24">24 {t('general.booking.hours')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('general.booking.minNoticeHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAdvance">{t('general.booking.maxAdvance')}</Label>
              <Select value={maxAdvanceDays} onValueChange={setMaxAdvanceDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 {t('general.booking.days')}</SelectItem>
                  <SelectItem value="14">14 {t('general.booking.days')}</SelectItem>
                  <SelectItem value="30">30 {t('general.booking.days')}</SelectItem>
                  <SelectItem value="60">60 {t('general.booking.days')}</SelectItem>
                  <SelectItem value="90">90 {t('general.booking.days')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('general.booking.maxAdvanceHint')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5">
              <Label>{t('general.booking.allowSameDay')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('general.booking.allowSameDayHint')}
              </p>
            </div>
            <Switch checked={allowSameDay} onCheckedChange={setAllowSameDay} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {saving ? t('general.saving') : t('general.save')}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{t('general.saveSuccess')}</p>}
      </div>
    </div>
  );
}
