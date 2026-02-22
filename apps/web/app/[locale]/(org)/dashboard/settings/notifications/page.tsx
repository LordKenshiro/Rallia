'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useOrganization } from '@/components/organization-context';
import { organizationPreferencesService } from '@rallia/shared-services';
import type { OrgNotificationTypeEnum, DeliveryChannelEnum } from '@rallia/shared-types';
import {
  Bell,
  Calendar,
  Check,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  RotateCcw,
  Save,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

// Notification type categories for organization
interface NotificationCategory {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  types: OrgNotificationTypeEnum[];
}

interface PreferenceState {
  [key: string]: boolean; // key = `${notificationType}:${channel}`
}

export default function NotificationPreferencesPage() {
  const t = useTranslations('settings.notificationPreferences');
  const { selectedOrganization, isLoading: orgLoading } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [preferences, setPreferences] = useState<PreferenceState>({});
  const [originalPreferences, setOriginalPreferences] = useState<PreferenceState>({});

  // Notification categories with translation keys
  const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
    {
      id: 'bookings',
      labelKey: 'categories.bookings.label',
      descriptionKey: 'categories.bookings.description',
      icon: <Calendar className="size-5" />,
      types: ['booking_created', 'booking_cancelled_by_player', 'booking_modified'],
    },
    {
      id: 'members',
      labelKey: 'categories.members.label',
      descriptionKey: 'categories.members.description',
      icon: <Users className="size-5" />,
      types: ['new_member_joined', 'member_left', 'member_role_changed'],
    },
    {
      id: 'payments',
      labelKey: 'categories.payments.label',
      descriptionKey: 'categories.payments.description',
      icon: <DollarSign className="size-5" />,
      types: ['payment_received', 'payment_failed', 'refund_processed'],
    },
    {
      id: 'reports',
      labelKey: 'categories.reports.label',
      descriptionKey: 'categories.reports.description',
      icon: <FileText className="size-5" />,
      types: ['daily_summary', 'weekly_report'],
    },
  ];

  // Channel icons and labels
  const CHANNELS: Array<{
    id: DeliveryChannelEnum;
    labelKey: string;
    icon: React.ReactNode;
  }> = [
    { id: 'email', labelKey: 'email', icon: <Mail className="size-4" /> },
    { id: 'sms', labelKey: 'sms', icon: <MessageSquare className="size-4" /> },
  ];

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!selectedOrganization) return;

    try {
      setLoading(true);
      const resolved = await organizationPreferencesService.getResolvedPreferences(
        selectedOrganization.id
      );

      const prefState: PreferenceState = {};
      Object.entries(resolved).forEach(([type, channels]) => {
        Object.entries(channels).forEach(([channel, pref]) => {
          prefState[`${type}:${channel}`] = pref.enabled;
        });
      });

      setPreferences(prefState);
      setOriginalPreferences(prefState);
      setError(null);
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [selectedOrganization, t]);

  useEffect(() => {
    if (!orgLoading && selectedOrganization) {
      loadPreferences();
    }
  }, [orgLoading, selectedOrganization, loadPreferences]);

  // Toggle a preference
  const togglePreference = (type: OrgNotificationTypeEnum, channel: DeliveryChannelEnum) => {
    const key = `${type}:${channel}`;
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSuccess(false);
  };

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

  // Save preferences
  const handleSave = async () => {
    if (!selectedOrganization) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Find changed preferences
      const changedPrefs: Array<{
        notificationType: OrgNotificationTypeEnum;
        channel: DeliveryChannelEnum;
        enabled: boolean;
      }> = [];

      Object.entries(preferences).forEach(([key, enabled]) => {
        if (originalPreferences[key] !== enabled) {
          const [type, channel] = key.split(':') as [OrgNotificationTypeEnum, DeliveryChannelEnum];
          changedPrefs.push({ notificationType: type, channel, enabled });
        }
      });

      if (changedPrefs.length > 0) {
        await organizationPreferencesService.setPreferences(selectedOrganization.id, changedPrefs);
      }

      setOriginalPreferences(preferences);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!selectedOrganization) return;

    setSaving(true);
    setError(null);

    try {
      await organizationPreferencesService.resetAllPreferences(selectedOrganization.id);
      await loadPreferences();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError(t('failedToReset'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <Skeleton className="h-5 w-40" />
                <div className="flex gap-4">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Bell className="size-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('noOrganization')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-0">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      {/* Channel Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span className="font-medium">{t('channels')}</span>
        {CHANNELS.map(channel => (
          <div key={channel.id} className="flex items-center gap-1.5">
            {channel.icon}
            <span>{t(channel.labelKey)}</span>
          </div>
        ))}
      </div>

      {/* Categories */}
      <Accordion type="multiple" defaultValue={NOTIFICATION_CATEGORIES.map(c => c.id)}>
        {NOTIFICATION_CATEGORIES.map(category => (
          <AccordionItem key={category.id} value={category.id} className="border rounded-lg mb-4">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">{category.icon}</div>
                <div className="text-left">
                  <p className="font-medium mb-0">{t(category.labelKey)}</p>
                  <p className="text-sm text-muted-foreground font-normal mb-0">
                    {t(category.descriptionKey)}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                {category.types.map(type => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-medium text-sm mb-0">{t(`types.${type}`)}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      {CHANNELS.map(channel => {
                        const key = `${type}:${channel.id}`;
                        const isEnabled = preferences[key] ?? false;
                        const hasChanged = preferences[key] !== originalPreferences[key];

                        return (
                          <div key={channel.id} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-12">
                              {t(channel.labelKey)}
                            </span>
                            <div className="relative">
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={() => togglePreference(type, channel.id)}
                              />
                              {hasChanged && (
                                <div className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          <RotateCcw className="size-4 mr-2" />
          {t('resetToDefaults')}
        </Button>

        <div className="flex items-center gap-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="size-4" />
              {t('savedSuccessfully')}
            </p>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {saving ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Bell className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">{t('aboutTitle')}</p>
              <p>{t('aboutDescription')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
