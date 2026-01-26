'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Clock, Loader2, Percent, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface CancellationPolicy {
  id: string;
  organization_id: string;
  free_cancellation_hours: number | null;
  partial_refund_hours: number | null;
  partial_refund_percent: number | null;
  no_refund_hours: number | null;
}

export default function PoliciesPage() {
  const t = useTranslations('settings');
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);

  // Form state
  const [freeCancellationHours, setFreeCancellationHours] = useState('24');
  const [partialRefundHours, setPartialRefundHours] = useState('12');
  const [partialRefundPercent, setPartialRefundPercent] = useState('50');
  const [noRefundHours, setNoRefundHours] = useState('2');

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError(t('policies.notAuthenticated'));
          setLoading(false);
          return;
        }

        // Get user's organization
        const { data: membership, error: membershipError } = await supabase
          .from('organization_member')
          .select('organization_id')
          .eq('user_id', user.id)
          .is('left_at', null)
          .single();

        if (membershipError || !membership) {
          setError(t('policies.noOrganization'));
          setLoading(false);
          return;
        }

        setOrganizationId(membership.organization_id);

        // Fetch cancellation policy
        const { data: policyData } = await supabase
          .from('cancellation_policy')
          .select('*')
          .eq('organization_id', membership.organization_id)
          .single();

        if (policyData) {
          setPolicy(policyData);
          setFreeCancellationHours(String(policyData.free_cancellation_hours || 24));
          setPartialRefundHours(String(policyData.partial_refund_hours || 12));
          setPartialRefundPercent(String(policyData.partial_refund_percent || 50));
          setNoRefundHours(String(policyData.no_refund_hours || 2));
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching policy:', err);
        setError(t('policies.fetchError'));
        setLoading(false);
      }
    }

    fetchPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!organizationId) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const policyData = {
        organization_id: organizationId,
        free_cancellation_hours: parseInt(freeCancellationHours),
        partial_refund_hours: parseInt(partialRefundHours),
        partial_refund_percent: parseInt(partialRefundPercent),
        no_refund_hours: parseInt(noRefundHours),
      };

      if (policy?.id) {
        const { error: updateError } = await supabase
          .from('cancellation_policy')
          .update(policyData)
          .eq('id', policy.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cancellation_policy')
          .insert(policyData);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving policy:', err);
      setError(t('policies.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Generate policy preview text
  const getPolicyPreview = () => {
    const free = parseInt(freeCancellationHours);
    const partial = parseInt(partialRefundHours);
    const percent = parseInt(partialRefundPercent);
    const noRefund = parseInt(noRefundHours);

    return t('policies.preview.text', {
      freeHours: free,
      partialHours: partial,
      partialPercent: percent,
      noRefundHours: noRefund,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !organizationId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-0">{t('policies.title')}</h1>
        <p className="text-muted-foreground">{t('policies.description')}</p>
      </div>

      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle>{t('policies.cancellation.title')}</CardTitle>
          <CardDescription>{t('policies.cancellation.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Free Cancellation */}
          <div className="flex items-start gap-4 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <Clock className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-green-800 dark:text-green-200">
                  {t('policies.cancellation.freePeriod')}
                </Label>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t('policies.cancellation.freePeriodDescription')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={freeCancellationHours} onValueChange={setFreeCancellationHours}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="48">48</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {t('policies.cancellation.hoursBeforeBooking')}
                </span>
              </div>
            </div>
          </div>

          {/* Partial Refund */}
          <div className="flex items-start gap-4 p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <Percent className="size-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-yellow-800 dark:text-yellow-200">
                  {t('policies.cancellation.partialPeriod')}
                </Label>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  {t('policies.cancellation.partialPeriodDescription')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={partialRefundHours} onValueChange={setPartialRefundHours}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {t('policies.cancellation.hoursBeforeBooking')}
                </span>
                <span className="text-sm text-muted-foreground mx-2">→</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={partialRefundPercent}
                  onChange={e => setPartialRefundPercent(e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {t('policies.cancellation.percentRefund')}
                </span>
              </div>
            </div>
          </div>

          {/* No Refund */}
          <div className="flex items-start gap-4 p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
              <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-red-800 dark:text-red-200">
                  {t('policies.cancellation.noRefundPeriod')}
                </Label>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('policies.cancellation.noRefundPeriodDescription')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={noRefundHours} onValueChange={setNoRefundHours}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="0">0</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {t('policies.cancellation.hoursBeforeBooking')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policy Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('policies.preview.title')}</CardTitle>
          <CardDescription>{t('policies.preview.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm whitespace-pre-line">{getPolicyPreview()}</p>
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
          {saving ? t('policies.saving') : t('policies.save')}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{t('policies.saveSuccess')}</p>}
      </div>
    </div>
  );
}
