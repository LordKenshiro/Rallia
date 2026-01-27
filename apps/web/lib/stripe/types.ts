/**
 * Stripe Connect Types
 */

export interface StripeAccountStatus {
  stripeAccountId: string;
  accountType: 'express' | 'standard' | 'custom';
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  defaultCurrency: string;
}

export interface CreateConnectAccountParams {
  organizationId: string;
  organizationName: string;
  organizationEmail: string;
  country?: string;
  returnUrl: string;
  refreshUrl: string;
}

export interface CreateConnectAccountResult {
  accountId: string;
  onboardingUrl: string;
}

export interface StripeAccountDetails {
  id: string;
  email: string | null;
  businessProfile: {
    name: string | null;
    url: string | null;
  } | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  capabilities: {
    cardPayments: string | null;
    transfers: string | null;
  };
  externalAccounts: {
    data: Array<{
      id: string;
      bank_name?: string | null;
      last4?: string | null;
    }>;
  } | null;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface StripeConnectConfig {
  secretKey: string;
  webhookSecret: string;
  clientId?: string;
}
