'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Building2,
  Clock,
  Contact,
  Database,
  Dumbbell,
  FileText,
  ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState, useId } from 'react';

import {
  useFacilityActions,
  useContactActions,
  useCourtActions,
  useFormData,
} from './OrganizationFormContext';
import { Facility, UpdateFacilityImage, Country, FacilityType, isExistingImage } from './types';

interface FacilityCardProps {
  facility: Facility;
  facilityIndex: number;
}

export function FacilityCard({ facility, facilityIndex }: FacilityCardProps) {
  const { orgData, sports, loadingSports, dataProviders, loadingDataProviders, isUpdateMode } =
    useFormData();
  const {
    handleFacilityChange,
    removeFacility,
    handleImageUpload,
    removeImage,
    getImageSrc,
    getImageIdentifier,
    handleUseOrgContactToggle,
  } = useFacilityActions();
  const { addContact, removeContact, updateContact } = useContactActions();
  const { addCourtRow, removeCourtRow, updateCourtRow } = useCourtActions();

  // Use React's useId() for stable IDs that match between server and client
  const instanceId = useId();

  const t = useTranslations(
    isUpdateMode ? 'admin.organizations.update' : 'admin.organizations.create'
  );

  // ============ GOOGLE PLACES SEARCH ============
  const [isSearching, setIsSearching] = useState(false);

  // Manual Google Places search triggered by button click
  const searchGooglePlaces = async () => {
    const query = facility.name;
    if (!query || query.length < 3) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        const data = await response.json();

        // Auto-fill fields from parsed Google Places result
        if (data.parsed) {
          const { name, address, city, country, postalCode, latitude, longitude, timezone } =
            data.parsed;
          handleFacilityChange(facility.id, 'name', name);
          handleFacilityChange(facility.id, 'address', address);
          handleFacilityChange(facility.id, 'city', city);
          handleFacilityChange(facility.id, 'country', country);
          handleFacilityChange(facility.id, 'postalCode', postalCode);
          handleFacilityChange(facility.id, 'latitude', String(latitude));
          handleFacilityChange(facility.id, 'longitude', String(longitude));
          if (timezone) handleFacilityChange(facility.id, 'timezone', timezone);
        }
      }
    } catch (error) {
      console.error('Google Places search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">
              {t('sections.facility')} {facilityIndex + 1}
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeFacility(facility.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        {/* Facility Images */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground m-0">
              {t('sections.facilityImages')}
            </h4>
          </div>
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => handleImageUpload(facility.id, e.target.files)}
              className="hidden"
              id={`facility-${instanceId}-images`}
            />
            <label
              htmlFor={`facility-${instanceId}-images`}
              className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground m-0">{t('actions.uploadImages')}</p>
              </div>
            </label>
            {facility.images.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-3">
                {facility.images.map((image, imageIndex) => {
                  const imageSrc = getImageSrc(image);
                  const imageIdentifier = getImageIdentifier(image);
                  return (
                    <div
                      key={imageIdentifier}
                      className="relative group rounded-lg overflow-hidden border-2 border-muted hover:border-primary/50 transition-colors"
                    >
                      {isUpdateMode && isExistingImage(image as UpdateFacilityImage) ? (
                        <Image
                          src={imageSrc}
                          alt={`Image ${imageIndex + 1}`}
                          width={96}
                          height={96}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <img
                          src={imageSrc}
                          alt={`Preview ${imageIndex + 1}`}
                          className="w-full h-24 object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(facility.id, imageIdentifier)}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Facility Basic Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground m-0">
              {t('sections.facilityInfo')}
            </h4>
          </div>

          <div className="bg-muted/20 rounded-lg p-4 space-y-4">
            {/* Active Status Toggle */}
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/30">
              <input
                type="checkbox"
                id={`facility-is-active-${instanceId}`}
                checked={facility.isActive ?? true}
                onChange={e => handleFacilityChange(facility.id, 'isActive', e.target.checked)}
                className="rounded border-input h-4 w-4"
              />
              <label
                htmlFor={`facility-is-active-${instanceId}`}
                className="text-sm font-medium cursor-pointer"
              >
                {t('fields.isActive')}
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('fields.facilityName')} <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={facility.name}
                    onChange={e => handleFacilityChange(facility.id, 'name', e.target.value)}
                    required
                    className="bg-background flex-1"
                    placeholder={t('fields.facilityNamePlaceholder')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={searchGooglePlaces}
                    disabled={isSearching || facility.name.length < 3}
                    title={t('actions.searchPlace')}
                  >
                    {isSearching ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.facilityType')}</label>
                <select
                  value={facility.facilityType}
                  onChange={e =>
                    handleFacilityChange(
                      facility.id,
                      'facilityType',
                      e.target.value as FacilityType
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t('fields.selectFacilityType')}</option>
                  <option value="park">{t('facilityTypes.park')}</option>
                  <option value="club">{t('facilityTypes.club')}</option>
                  <option value="community_club">{t('facilityTypes.community_club')}</option>
                  <option value="indoor_center">{t('facilityTypes.indoor_center')}</option>
                  <option value="private">{t('facilityTypes.private')}</option>
                  <option value="other">{t('facilityTypes.other')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.latitude')}</label>
                <Input
                  type="number"
                  step="any"
                  value={facility.latitude}
                  onChange={e => handleFacilityChange(facility.id, 'latitude', e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.longitude')}</label>
                <Input
                  type="number"
                  step="any"
                  value={facility.longitude}
                  onChange={e => handleFacilityChange(facility.id, 'longitude', e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/30">
              <input
                type="checkbox"
                id={`membership-required-${instanceId}`}
                checked={facility.membershipRequired}
                onChange={e =>
                  handleFacilityChange(facility.id, 'membershipRequired', e.target.checked)
                }
                className="rounded border-input h-4 w-4"
              />
              <label
                htmlFor={`membership-required-${instanceId}`}
                className="text-sm font-medium cursor-pointer"
              >
                {t('fields.membershipRequired')}
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.address')}</label>
                <Input
                  value={facility.address}
                  onChange={e => handleFacilityChange(facility.id, 'address', e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.city')}</label>
                <Input
                  value={facility.city}
                  onChange={e => handleFacilityChange(facility.id, 'city', e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.country')}</label>
                <select
                  value={facility.country}
                  onChange={e =>
                    handleFacilityChange(facility.id, 'country', e.target.value as Country)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t('fields.selectCountry')}</option>
                  <option value="Canada">Canada</option>
                  <option value="United States">United States</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.postalCode')}</label>
                <Input
                  value={facility.postalCode}
                  onChange={e => handleFacilityChange(facility.id, 'postalCode', e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                {t('fields.description')}
              </label>
              <textarea
                value={facility.description || ''}
                onChange={e => handleFacilityChange(facility.id, 'description', e.target.value)}
                rows={2}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={t('fields.facilityDescriptionPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Data Provider & Timezone Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground m-0">
              {t('sections.dataProvider')}
            </h4>
          </div>

          <div className="bg-muted/20 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('fields.timezone')}
                </label>
                <select
                  value={facility.timezone || ''}
                  onChange={e => handleFacilityChange(facility.id, 'timezone', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t('fields.selectTimezone')}</option>
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
                <label className="text-sm font-medium">{t('fields.dataProvider')}</label>
                {loadingDataProviders ? (
                  <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('loading.dataProviders')}
                  </div>
                ) : (
                  <select
                    value={facility.dataProviderId || ''}
                    onChange={e =>
                      handleFacilityChange(facility.id, 'dataProviderId', e.target.value || null)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t('fields.selectDataProvider')}</option>
                    {dataProviders.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider_type})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.externalProviderId')}</label>
                <Input
                  value={facility.externalProviderId || ''}
                  onChange={e =>
                    handleFacilityChange(facility.id, 'externalProviderId', e.target.value)
                  }
                  className="bg-background"
                  placeholder={t('fields.externalProviderIdPlaceholder')}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground m-0">{t('fields.dataProviderHint')}</p>
          </div>
        </div>

        {/* Facility Contacts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Contact className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground m-0">
                {t('sections.contacts')}
              </h4>
            </div>
          </div>

          <div className="space-y-3">
            {facility.contacts.map((contact, contactIndex) => (
              <Card
                key={contact.id}
                className={cn(
                  'overflow-hidden transition-colors',
                  contact.isPrimary ? 'border-primary/50 bg-primary/5' : 'border-muted'
                )}
              >
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-semibold m-0">
                        {t('sections.contact')} {contactIndex + 1}
                      </h5>
                      {contact.isPrimary && (
                        <Badge variant="default" className="text-xs">
                          {t('fields.isPrimary')}
                        </Badge>
                      )}
                    </div>
                    {facility.contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(facility.id, contact.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {contactIndex === 0 && (
                    <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={
                          (orgData.email !== '' ||
                            orgData.phone !== '' ||
                            orgData.website !== '') &&
                          contact.email === orgData.email &&
                          contact.phone === orgData.phone &&
                          contact.website === orgData.website
                        }
                        onChange={e => {
                          handleUseOrgContactToggle(facility.id, e.target.checked);
                        }}
                        className="rounded border-input h-4 w-4"
                      />
                      <span className="text-sm font-medium">{t('actions.useOrgContact')}</span>
                    </label>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t('fields.contactType')} <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={contact.contactType}
                        onChange={e =>
                          updateContact(facility.id, contact.id, 'contactType', e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                        disabled
                      >
                        <option value="reservation">{t('contactTypes.reservation')}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('fields.phone')}</label>
                      <Input
                        type="tel"
                        value={contact.phone}
                        onChange={e =>
                          updateContact(facility.id, contact.id, 'phone', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('fields.email')}</label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={e =>
                          updateContact(facility.id, contact.id, 'email', e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('fields.website')}</label>
                      <Input
                        type="url"
                        value={contact.website}
                        onChange={e =>
                          updateContact(facility.id, contact.id, 'website', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {facility.contacts.length > 1 && (
                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={e => {
                          // Prevent unchecking if this is the only primary contact
                          if (!e.target.checked && contact.isPrimary) {
                            const otherPrimaryExists = facility.contacts.some(
                              c => c.id !== contact.id && c.isPrimary
                            );
                            if (!otherPrimaryExists) return;
                          }
                          updateContact(facility.id, contact.id, 'isPrimary', e.target.checked);
                        }}
                        className="rounded border-input h-4 w-4"
                      />
                      <label className="text-sm">{t('fields.markAsPrimary')}</label>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                addContact(facility.id);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('actions.addContact')}
            </Button>
          </div>
        </div>

        {/* Sports Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground m-0">
              {t('sections.sports')}
            </h4>
          </div>
          {loadingSports ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm text-muted-foreground">{t('loading.sports')}</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-4 bg-muted/20 rounded-lg">
              {sports.map(sport => {
                const isSelected = facility.selectedSports.includes(sport.id);
                return (
                  <label
                    key={sport.id}
                    className="cursor-pointer"
                    htmlFor={`sport-${instanceId}-${sport.id}`}
                  >
                    <input
                      type="checkbox"
                      id={`sport-${instanceId}-${sport.id}`}
                      checked={isSelected}
                      onChange={e => {
                        const updated = e.target.checked
                          ? [...facility.selectedSports, sport.id]
                          : facility.selectedSports.filter(id => id !== sport.id);
                        handleFacilityChange(facility.id, 'selectedSports', updated);
                      }}
                      className="hidden"
                    />
                    <Badge
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'px-4 py-2 text-sm font-medium transition-all cursor-pointer hover:scale-105',
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
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Court Rows */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground m-0">
                {t('sections.courts')}
              </h4>
            </div>
            <Badge variant="secondary" className="text-xs">
              {facility.courtRows.reduce((acc, row) => acc + row.quantity, 0)} courts
            </Badge>
          </div>

          <div className="space-y-3">
            {facility.courtRows.map((courtRow, rowIndex) => (
              <Card key={courtRow.id} className="overflow-hidden border-muted">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold m-0">
                      {t('sections.courtRow')} {rowIndex + 1}
                    </h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCourtRow(facility.id, courtRow.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t('fields.surfaceType')} <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={courtRow.surfaceType}
                        onChange={e =>
                          updateCourtRow(facility.id, courtRow.id, 'surfaceType', e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        <option value="">{t('fields.selectSurfaceType')}</option>
                        <option value="hard">{t('surfaceTypes.hard')}</option>
                        <option value="clay">{t('surfaceTypes.clay')}</option>
                        <option value="grass">{t('surfaceTypes.grass')}</option>
                        <option value="synthetic">{t('surfaceTypes.synthetic')}</option>
                        <option value="carpet">{t('surfaceTypes.carpet')}</option>
                        <option value="asphalt">{t('surfaceTypes.asphalt')}</option>
                        <option value="concrete">{t('surfaceTypes.concrete')}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t('fields.quantity')} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={courtRow.quantity}
                        onChange={e =>
                          updateCourtRow(
                            facility.id,
                            courtRow.id,
                            'quantity',
                            parseInt(e.target.value) || 1
                          )
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('fields.sports')}</label>
                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
                        {facility.selectedSports.length === 0 ? (
                          <p className="text-sm text-muted-foreground m-0">
                            {t('fields.selectSportsFirst')}
                          </p>
                        ) : (
                          facility.selectedSports.map(sportId => {
                            const sport = sports.find(s => s.id === sportId);
                            if (!sport) return null;
                            const isSelected = courtRow.sportIds.includes(sport.id);
                            return (
                              <label key={sport.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={e => {
                                    const updated = e.target.checked
                                      ? [...courtRow.sportIds, sport.id]
                                      : courtRow.sportIds.filter(id => id !== sport.id);
                                    updateCourtRow(facility.id, courtRow.id, 'sportIds', updated);
                                  }}
                                  className="rounded border-input h-4 w-4"
                                />
                                <span className="text-sm">
                                  {sport.name
                                    .split(' ')
                                    .map(
                                      word =>
                                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                    )
                                    .join(' ')}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('fields.options')}</label>
                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={courtRow.lighting}
                            onChange={e =>
                              updateCourtRow(facility.id, courtRow.id, 'lighting', e.target.checked)
                            }
                            className="rounded border-input h-4 w-4"
                          />
                          <span className="text-sm">{t('fields.lighting')}</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={courtRow.indoor}
                            onChange={e =>
                              updateCourtRow(facility.id, courtRow.id, 'indoor', e.target.checked)
                            }
                            className="rounded border-input h-4 w-4"
                          />
                          <span className="text-sm">{t('fields.indoor')}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                addCourtRow(facility.id);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('actions.addCourtRow')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
