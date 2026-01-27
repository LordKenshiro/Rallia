/**
 * Stripe Connect Service
 *
 * Handles Stripe Connect account creation, onboarding, and management.
 */

import Stripe from 'stripe';
import { getStripeClient } from './client';
import type {
  CreateConnectAccountParams,
  CreateConnectAccountResult,
  StripeAccountDetails,
  StripeAccountStatus,
} from './types';

/**
 * Map of common country names to ISO 3166-1 alpha-2 codes
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  'united states of america': 'US',
  canada: 'CA',
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  france: 'FR',
  germany: 'DE',
  australia: 'AU',
  mexico: 'MX',
  spain: 'ES',
  italy: 'IT',
  netherlands: 'NL',
  belgium: 'BE',
  switzerland: 'CH',
  austria: 'AT',
  ireland: 'IE',
  portugal: 'PT',
  brazil: 'BR',
  japan: 'JP',
  singapore: 'SG',
  'hong kong': 'HK',
  'new zealand': 'NZ',
};

/**
 * Normalize a country value to ISO 3166-1 alpha-2 code
 */
function normalizeCountryCode(country: string | undefined): string {
  if (!country) return 'CA'; // Default to Canada

  // Already a 2-letter code
  if (country.length === 2) {
    return country.toUpperCase();
  }

  // Look up by name
  const normalized = country.toLowerCase().trim();
  const code = COUNTRY_NAME_TO_CODE[normalized];

  if (code) {
    return code;
  }

  // If not found, assume it's already a code or return default
  console.warn(`Unknown country: "${country}", defaulting to CA`);
  return 'CA';
}

/**
 * Create a Stripe Express Connect account for an organization
 */
export async function createConnectAccount(
  params: CreateConnectAccountParams
): Promise<CreateConnectAccountResult> {
  const stripe = getStripeClient();

  // Normalize country to ISO code
  const countryCode = normalizeCountryCode(params.country);

  // Create Express Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    country: countryCode,
    email: params.organizationEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'company',
    business_profile: {
      name: params.organizationName,
      mcc: '7941', // Sports Clubs/Fields
    },
    metadata: {
      organization_id: params.organizationId,
    },
  });

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
  });

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}

/**
 * Create a new account link for an existing Connect account
 * Used when onboarding was interrupted or for updates
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
  type: 'account_onboarding' | 'account_update' = 'account_onboarding'
): Promise<string> {
  const stripe = getStripeClient();

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type,
  });

  return accountLink.url;
}

/**
 * Create a login link to the Stripe Express dashboard
 */
export async function createLoginLink(accountId: string): Promise<string> {
  const stripe = getStripeClient();

  const loginLink = await stripe.accounts.createLoginLink(accountId);

  return loginLink.url;
}

/**
 * Retrieve Connect account details
 */
export async function getAccountDetails(accountId: string): Promise<StripeAccountDetails> {
  const stripe = getStripeClient();

  const account = await stripe.accounts.retrieve(accountId);

  return {
    id: account.id,
    email: account.email || null,
    businessProfile: account.business_profile
      ? {
          name: account.business_profile.name || null,
          url: account.business_profile.url || null,
        }
      : null,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    capabilities: {
      cardPayments: account.capabilities?.card_payments || null,
      transfers: account.capabilities?.transfers || null,
    },
    externalAccounts: account.external_accounts
      ? {
          data: (account.external_accounts.data || []).map(ea => ({
            id: ea.id,
            bank_name: (ea as Stripe.BankAccount).bank_name,
            last4: (ea as Stripe.BankAccount).last4,
          })),
        }
      : null,
  };
}

/**
 * Check if an account has completed onboarding and is ready for payments
 */
export async function getAccountStatus(accountId: string): Promise<StripeAccountStatus> {
  const details = await getAccountDetails(accountId);

  return {
    stripeAccountId: details.id,
    accountType: 'express',
    onboardingComplete: details.detailsSubmitted,
    chargesEnabled: details.chargesEnabled,
    payoutsEnabled: details.payoutsEnabled,
    defaultCurrency: 'CAD',
  };
}

/**
 * Delete a Connect account (only for testing)
 * Note: In production, accounts should be deauthorized, not deleted
 */
export async function deleteAccount(accountId: string): Promise<void> {
  const stripe = getStripeClient();

  await stripe.accounts.del(accountId);
}

/**
 * Verify a webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripeClient();

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Handle account.updated webhook event
 * Returns the fields to update in the database
 */
export function handleAccountUpdated(account: Stripe.Account): Partial<{
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  default_currency: string;
}> {
  return {
    onboarding_complete: account.details_submitted ?? false,
    charges_enabled: account.charges_enabled ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
    default_currency: account.default_currency?.toUpperCase() || 'CAD',
  };
}
