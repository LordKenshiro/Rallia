'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface StripeAccount {
  id: string;
  organization_id: string;
  stripe_account_id: string;
  stripe_account_type: string | null;
  onboarding_complete: boolean | null;
  charges_enabled: boolean | null;
  payouts_enabled: boolean | null;
  default_currency: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PaymentSettingsClientProps {
  organizationId: string;
  organizationName: string;
  stripeAccount: StripeAccount | null;
  isOwner: boolean;
}

export function PaymentSettingsClient({
  organizationId,
  organizationName: _organizationName,
  stripeAccount: initialStripeAccount,
  isOwner,
}: PaymentSettingsClientProps) {
  const t = useTranslations('settings.orgPayments');
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeAccount, setStripeAccount] = useState(initialStripeAccount);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Check for success/error in URL params
  useEffect(() => {
    if (searchParams.get('stripe_connected') === 'true') {
      setShowSuccess(true);
      refreshAccountStatus();
      // Clear success message after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }

    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(t(`errors.${errorParam}`) || t('errors.unknown'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, t]);

  // Refresh account status from database
  const refreshAccountStatus = async () => {
    const { data } = await supabase
      .from('organization_stripe_account')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (data) {
      setStripeAccount(data);
    }
  };

  // Start Stripe Connect onboarding
  const handleConnectStripe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Stripe');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  // Continue incomplete onboarding
  const handleContinueOnboarding = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to continue onboarding');
      }

      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  // Open Stripe Express Dashboard
  const handleOpenDashboard = () => {
    // The Stripe Express dashboard URL
    window.open('https://dashboard.stripe.com/', '_blank');
  };

  // Render based on connection status
  const renderContent = () => {
    // Not connected
    if (!stripeAccount) {
      return (
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--secondary-50)] dark:bg-[var(--secondary-900)]">
            <CreditCard className="size-6 text-muted-foreground mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium">{t('notConnected.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('notConnected.description')}</p>
            </div>
          </div>

          {isOwner ? (
            <Button onClick={handleConnectStripe} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('connecting')}
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 size-4" />
                  {t('connectButton')}
                </>
              )}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{t('ownerOnly')}</p>
          )}
        </div>
      );
    }

    // Onboarding incomplete
    if (!stripeAccount.onboarding_complete) {
      return (
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <AlertCircle className="size-6 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-amber-800 dark:text-amber-200">
                {t('onboardingIncomplete.title')}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('onboardingIncomplete.description')}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {isOwner && (
              <Button onClick={handleContinueOnboarding} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t('continuing')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-4" />
                    {t('continueOnboarding')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Fully connected
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <CheckCircle2 className="size-6 text-green-600 dark:text-green-400 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-medium text-green-800 dark:text-green-200">
              {t('connected.title')}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('connected.description')}
            </p>
          </div>
        </div>

        {/* Account Status */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatusCard
            label={t('status.chargesEnabled')}
            enabled={stripeAccount.charges_enabled ?? false}
            enabledText={t('status.enabled')}
            disabledText={t('status.disabled')}
          />
          <StatusCard
            label={t('status.payoutsEnabled')}
            enabled={stripeAccount.payouts_enabled ?? false}
            enabledText={t('status.enabled')}
            disabledText={t('status.disabled')}
          />
        </div>

        {/* Account Info */}
        <div className="rounded-lg border border-[var(--secondary-200)] dark:border-[var(--secondary-800)] p-4 space-y-3">
          <h3 className="font-medium">{t('accountInfo.title')}</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('accountInfo.accountId')}</span>
              <span className="font-mono">{stripeAccount.stripe_account_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('accountInfo.accountType')}</span>
              <span className="capitalize">{stripeAccount.stripe_account_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('accountInfo.currency')}</span>
              <span>{(stripeAccount.default_currency ?? 'CAD').toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleOpenDashboard}>
            <ExternalLink className="mr-2 size-4" />
            {t('openDashboard')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-300">{t('successMessage')}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <XCircle className="size-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="rounded-lg border border-[var(--secondary-200)] dark:border-[var(--secondary-800)] p-6">
        {renderContent()}
      </div>

      {/* Help Text */}
      <div className="text-sm text-muted-foreground">
        <p>{t('helpText')}</p>
      </div>
    </div>
  );
}

interface StatusCardProps {
  label: string;
  enabled: boolean;
  enabledText: string;
  disabledText: string;
}

function StatusCard({ label, enabled, enabledText, disabledText }: StatusCardProps) {
  return (
    <div className="rounded-lg border border-[var(--secondary-200)] dark:border-[var(--secondary-800)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {enabled ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {enabled ? enabledText : disabledText}
        </span>
      </div>
    </div>
  );
}
