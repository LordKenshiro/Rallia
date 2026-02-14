import { BetaSignupForm } from '@/components/beta-signup-form';
import { ScrollReveal } from '@/components/scroll-reveal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Gift, MessageSquare, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('beta');
  return {
    title: t('title'),
  };
}

export default async function BetaPage() {
  const t = await getTranslations('beta');

  const benefits = [
    { key: 'priority', icon: Crown },
    { key: 'influence', icon: MessageSquare },
    { key: 'exclusive', icon: Gift },
    { key: 'community', icon: Users },
  ] as const;

  const trustIndicators = [
    { key: 'secure', icon: Shield },
    { key: 'fast', icon: Zap },
    { key: 'premium', icon: Sparkles },
  ] as const;

  return (
    <div className="flex flex-col items-center w-full gap-16 pb-16 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--primary-200)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,var(--primary-900)_1px,transparent_0)] bg-[size:32px_32px] opacity-40" />
      </div>

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] size-16 rounded-full bg-[var(--primary-300)] dark:bg-[var(--primary-700)] opacity-20 blur-xl animate-float" />
        <div className="absolute top-40 right-[15%] size-24 rounded-full bg-[var(--secondary-300)] dark:bg-[var(--secondary-700)] opacity-20 blur-xl animate-float-delayed" />
        <div className="absolute bottom-[30%] left-[5%] size-20 rounded-full bg-[var(--accent-300)] dark:bg-[var(--accent-700)] opacity-20 blur-xl animate-float-slow" />
        <div className="absolute bottom-[20%] right-[10%] size-14 rounded-full bg-[var(--primary-400)] dark:bg-[var(--primary-600)] opacity-20 blur-xl animate-float" />
      </div>

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center gap-6 animate-fade-in hero-gradient rounded-3xl p-8 md:p-12 shadow-luma-lg w-full relative overflow-hidden">
        {/* Decorative circles in hero */}
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-[var(--secondary-200)] dark:bg-[var(--secondary-800)] opacity-30 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 size-32 rounded-full bg-[var(--primary-200)] dark:bg-[var(--primary-800)] opacity-30 blur-2xl" />

        <Badge className="badge-interactive text-sm px-4 py-1.5 bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white animate-pulse-subtle">
          {t('hero.badge')}
        </Badge>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mt-4 mb-2 bg-gradient-to-r from-[var(--primary-700)] via-[var(--secondary-600)] to-[var(--primary-700)] bg-clip-text text-transparent dark:text-white dark:bg-none">
          {t('hero.headline')}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mt-4">
          {t('hero.subheadline')}
        </p>
      </section>

      {/* Benefits Section */}
      <section className="flex flex-col items-center w-full gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {benefits.map(({ key, icon: Icon }, index) => (
            <ScrollReveal key={key}>
              <Card
                className="h-full border-[var(--primary-200)] dark:border-[var(--primary-800)] hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-[var(--primary-300)] dark:hover:border-[var(--primary-700)] group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--primary-100)] to-[var(--primary-200)] dark:from-[var(--primary-700)] dark:to-[var(--primary-800)] group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <Icon className="size-8 text-[var(--primary-700)] dark:text-[var(--primary-200)]" />
                    </div>
                    <CardTitle className="text-lg">{t(`benefits.${key}.title`)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-center">
                    {t(`benefits.${key}.description`)}
                  </CardDescription>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Form Section with CTA Gradient */}
      <section className="flex flex-col items-center w-full gap-8 cta-gradient py-12 px-6 md:px-12 rounded-3xl shadow-luma relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 size-32 rounded-full bg-[var(--primary-300)] dark:bg-[var(--primary-700)] opacity-20 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-40 rounded-full bg-[var(--secondary-300)] dark:bg-[var(--secondary-700)] opacity-20 blur-3xl" />

        <div className="text-center max-w-xl relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('formSection.title')}</h2>
          <p className="text-muted-foreground">{t('formSection.subtitle')}</p>
        </div>

        <div className="relative z-10 w-full flex justify-center">
          <BetaSignupForm />
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 relative z-10">
          {trustIndicators.map(({ key, icon: Icon }) => (
            <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="size-4 text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
              <span>{t(`trust.${key}`)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
