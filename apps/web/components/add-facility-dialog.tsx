'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

interface Sport {
  id: string;
  name: string;
  slug: string;
}

interface AddFacilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function AddFacilityDialog({ open, onOpenChange, organizationId }: AddFacilityDialogProps) {
  const t = useTranslations('facilities');
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sports state
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [timezone, setTimezone] = useState('');
  const [membershipRequired, setMembershipRequired] = useState(false);

  // Google Places search state
  const [isSearching, setIsSearching] = useState(false);

  // Fetch sports on mount
  useEffect(() => {
    const fetchSports = async () => {
      try {
        const response = await fetch('/api/sports');
        if (response.ok) {
          const data = await response.json();
          setSports(data.sports || []);
        }
      } catch (err) {
        console.error('Error fetching sports:', err);
      } finally {
        setLoadingSports(false);
      }
    };

    fetchSports();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAddress('');
    setCity('');
    setPostalCode('');
    setCountry('');
    setLatitude('');
    setLongitude('');
    setTimezone('');
    setMembershipRequired(false);
    setSelectedSports([]);
    setError(null);
  };

  const toggleSport = (sportId: string) => {
    setSelectedSports(prev =>
      prev.includes(sportId) ? prev.filter(id => id !== sportId) : [...prev, sportId]
    );
  };

  const handleClose = () => {
    if (!saving) {
      resetForm();
      onOpenChange(false);
    }
  };

  const generateSlug = (name: string) => {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) +
      '-' +
      Date.now().toString(36)
    );
  };

  // Google Places search triggered by button click
  const searchGooglePlaces = async () => {
    if (!name || name.length < 3) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: name }),
      });

      if (response.ok) {
        const data = await response.json();

        // Auto-fill fields from parsed Google Places result
        if (data.parsed) {
          const parsed = data.parsed;
          if (parsed.name) setName(parsed.name);
          if (parsed.address) setAddress(parsed.address);
          if (parsed.city) setCity(parsed.city);
          if (parsed.country) setCountry(parsed.country);
          if (parsed.postalCode) setPostalCode(parsed.postalCode);
          if (parsed.latitude) setLatitude(String(parsed.latitude));
          if (parsed.longitude) setLongitude(String(parsed.longitude));
          if (parsed.timezone) setTimezone(parsed.timezone);
        }
      }
    } catch (err) {
      console.error('Google Places search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const slug = generateSlug(name);

      const { data: facility, error: insertError } = await supabase
        .from('facility')
        .insert({
          organization_id: organizationId,
          name,
          slug,
          description: description || null,
          address: address || null,
          city: city || null,
          postal_code: postalCode || null,
          country: (country as 'Canada' | 'United States') || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          timezone: timezone || null,
          membership_required: membershipRequired,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Insert facility_sport records
      if (selectedSports.length > 0) {
        const facilitySportRecords = selectedSports.map(sportId => ({
          facility_id: facility.id,
          sport_id: sportId,
        }));

        const { error: sportError } = await supabase
          .from('facility_sport')
          .insert(facilitySportRecords);

        if (sportError) {
          console.error('Error creating facility sports:', sportError);
          // Continue even if this fails - facility is created
        }
      }

      resetForm();
      onOpenChange(false);
      router.push(`/dashboard/facilities/${facility.id}`);
      router.refresh();
    } catch (err) {
      console.error('Error creating facility:', err);
      setError(t('new.error'));
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addFacility')}</DialogTitle>
          <DialogDescription>{t('new.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              {t('edit.nameLabel')} <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('edit.namePlaceholder')}
                disabled={saving}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={searchGooglePlaces}
                disabled={isSearching || name.length < 3 || saving}
                title={t('edit.searchPlace')}
              >
                {isSearching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('edit.searchPlaceHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('edit.descriptionLabel')}</Label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('edit.descriptionPlaceholder')}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">{t('edit.addressLabel')}</Label>
              <Input
                id="address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={t('edit.addressPlaceholder')}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">{t('edit.cityLabel')}</Label>
              <Input
                id="city"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder={t('edit.cityPlaceholder')}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t('edit.postalCodeLabel')}</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                placeholder={t('edit.postalCodePlaceholder')}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t('edit.countryLabel')}</Label>
              <select
                id="country"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
              >
                <option value="">{t('edit.selectCountry')}</option>
                <option value="Canada">Canada</option>
                <option value="United States">United States</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('edit.timezoneLabel')}</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
              >
                <option value="">{t('edit.selectTimezone')}</option>
                <option value="America/Toronto">America/Toronto (Eastern)</option>
                <option value="America/New_York">America/New_York (Eastern)</option>
                <option value="America/Chicago">America/Chicago (Central)</option>
                <option value="America/Denver">America/Denver (Mountain)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                <option value="America/Vancouver">America/Vancouver (Pacific)</option>
                <option value="America/Edmonton">America/Edmonton (Mountain)</option>
                <option value="America/Winnipeg">America/Winnipeg (Central)</option>
                <option value="America/Halifax">America/Halifax (Atlantic)</option>
                <option value="America/St_Johns">America/St_Johns (Newfoundland)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="latitude">{t('edit.latitudeLabel')}</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                placeholder={t('edit.latitudePlaceholder')}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">{t('edit.longitudeLabel')}</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                placeholder={t('edit.longitudePlaceholder')}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="membershipRequired"
              checked={membershipRequired}
              onChange={e => setMembershipRequired(e.target.checked)}
              className="size-4 rounded border-gray-300"
              disabled={saving}
            />
            <div>
              <Label htmlFor="membershipRequired" className="cursor-pointer">
                {t('edit.membershipRequiredLabel')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('edit.membershipRequiredHint')}</p>
            </div>
          </div>

          {/* Sports Selection */}
          <div className="space-y-2">
            <Label>{t('edit.sportsLabel')}</Label>
            {loadingSports ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm text-muted-foreground">{t('edit.loadingSports')}</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
                {sports.map(sport => {
                  const isSelected = selectedSports.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id)}
                      disabled={saving}
                      className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full"
                    >
                      <Badge
                        variant={isSelected ? 'default' : 'outline'}
                        className={cn(
                          'px-3 py-1.5 text-sm font-medium transition-all cursor-pointer hover:scale-105',
                          isSelected
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {sport.name
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t('edit.sportsHint')}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              {t('edit.cancelButton')}
            </Button>
            <Button type="submit" disabled={saving || !isValid}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('new.creating')}
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  {t('new.createButton')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
