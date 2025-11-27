'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function WaitlistForm() {
  const t = useTranslations('winter.waitlist.form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Capture IP address and location
      const ipResponse = await fetch('/api/get-location');
      let locationData = null;

      if (ipResponse.ok) {
        locationData = await ipResponse.json();
      }

      const formData = {
        name,
        email,
        phone: phone || undefined,
        ipAddress: locationData?.ipAddress || 'unknown',
        location: locationData?.location || 'unknown',
      };

      // Submit to API
      const response = await fetch('/api/submit-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      setSubmitStatus('success');
      setName('');
      setEmail('');
      setPhone('');
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <Card className="w-full max-w-md border-[var(--secondary-200)] dark:border-[var(--secondary-800)]">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="size-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <svg
                className="size-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold">{t('successMessage')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-[var(--secondary-200)] dark:border-[var(--secondary-800)]">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="name"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('nameLabel')}
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('emailLabel')}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('phoneLabel')}
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="button-scale w-full bg-[var(--secondary-500)] hover:bg-[var(--secondary-600)] dark:bg-[var(--secondary-500)] dark:hover:bg-[var(--secondary-600)]"
          >
            {isSubmitting ? 'Submitting...' : t('submitButton')}
          </Button>
          <p className="text-xs text-center text-muted-foreground">{t('noCard')}</p>
        </form>
      </CardContent>
    </Card>
  );
}
