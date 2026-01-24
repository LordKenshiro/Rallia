import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { PaymentSettingsClient } from './client';

export async function generateMetadata() {
  const t = await getTranslations('settings');
  return {
    title: t('orgPayments.title'),
    description: t('orgPayments.description'),
  };
}

export default async function PaymentSettingsPage() {
  const t = await getTranslations('settings');
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in');
  }

  // Get user's organization membership
  const { data: membership } = await supabase
    .from('organization_member')
    .select(
      `
      role,
      organization:organization_id (
        id,
        name,
        slug
      )
    `
    )
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single();

  if (!membership || !membership.organization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-0">{t('orgPayments.title')}</h1>
          <p className="text-muted-foreground">{t('orgPayments.description')}</p>
        </div>
        <div className="rounded-lg border border-[var(--secondary-200)] dark:border-[var(--secondary-800)] p-6">
          <p className="text-muted-foreground text-sm">{t('orgPayments.noOrganization')}</p>
        </div>
      </div>
    );
  }

  const organization = membership.organization as { id: string; name: string; slug: string };

  // Get Stripe account status
  const { data: stripeAccount } = await supabase
    .from('organization_stripe_account')
    .select('*')
    .eq('organization_id', organization.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-0">{t('orgPayments.title')}</h1>
        <p className="text-muted-foreground">{t('orgPayments.description')}</p>
      </div>

      <PaymentSettingsClient
        organizationId={organization.id}
        organizationName={organization.name}
        stripeAccount={stripeAccount}
        isOwner={membership.role === 'owner'}
      />
    </div>
  );
}
