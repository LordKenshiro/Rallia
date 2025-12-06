import { OrganizationSignInForm } from '@/components/organization-sign-in-form';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Organization Sign In - Rallia',
    description:
      'Sign in to create or claim your organization on Rallia. Support for clubs, municipalities, and cities.',
  };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations('signIn');
  const supabase = await createClient();
  const params = await searchParams;

  // Check if user is already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already authenticated, redirect to post-auth flow
  if (user) {
    redirect('/sign-in/post-auth');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
        <p className="text-sm text-muted-foreground">{t('welcomeMessage')}</p>
      </div>

      <OrganizationSignInForm initialError={params.error} />
    </div>
  );
}
