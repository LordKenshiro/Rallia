'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useRouter } from '@/i18n/navigation';
import { Building2, Loader2, Mail, Phone, Plus, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  OrganizationFormProvider,
  useOrganizationFormContext,
  useFormSubmission,
  FacilityCard,
  AdminOrganizationFormProps,
  OrganizationNature,
  Country,
  ExistingImage,
  NewImage,
  CreateFacility,
  UpdateFacility,
  isExistingImage,
  isNewImage,
} from './organization-form';

// Internal form content component that uses the context
function OrganizationFormContent() {
  const router = useRouter();
  const {
    isUpdateMode,
    orgData,
    orgSlug,
    facilities,
    isSubmitting,
    errorMessage,
    showSuccessModal,
    createdOrganization,
    handleOrgChange,
    addFacility,
    generateSlug,
    setIsSubmitting,
    setErrorMessage,
    setShowSuccessModal,
    setCreatedOrganization,
    resetForm,
    originalFacilityIds,
  } = useOrganizationFormContext();

  const t = useTranslations(
    isUpdateMode ? 'admin.organizations.update' : 'admin.organizations.create'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Validate required fields
      if (!orgData.name || !orgData.nature) {
        throw new Error(t('validation.requiredFields'));
      }

      // Validate at least one facility
      if (facilities.length === 0) {
        throw new Error(t('validation.atLeastOneFacility'));
      }

      // Validate facilities
      for (let i = 0; i < facilities.length; i++) {
        const facility = facilities[i];
        if (!facility.name) {
          throw new Error(t('validation.facilityNameRequired', { index: i + 1 }));
        }
        if (facility.selectedSports.length === 0) {
          throw new Error(t('validation.facilitySportsRequired', { index: i + 1 }));
        }
        if (!facility.country) {
          throw new Error(t('validation.facilityCountryRequired', { index: i + 1 }));
        }
      }

      // Prepare form data with images
      const formData = new FormData();

      // Organization data
      formData.append(
        'organization',
        JSON.stringify({
          ...orgData,
          slug: isUpdateMode ? orgSlug : generateSlug(orgData.name),
        })
      );

      // Facilities data
      const facilitiesData = facilities.map(facility => {
        if (isUpdateMode) {
          // Update mode: separate existing and new images
          const updateFacility = facility as UpdateFacility;
          // Get facility_files junction table IDs of images to keep
          const existingFacilityFileIds = updateFacility.images
            .filter((img): img is ExistingImage => isExistingImage(img))
            .map(img => img.id); // This is the facility_files.id

          const newImageCount = updateFacility.images.filter((img): img is NewImage =>
            isNewImage(img)
          ).length;

          // Only include id if this is an existing facility from the database
          // New facilities added during edit have client-generated UUIDs that don't exist in DB
          const isExistingFacility = originalFacilityIds.has(facility.id);

          return {
            ...updateFacility,
            id: isExistingFacility ? updateFacility.id : undefined, // Don't send id for new facilities
            images: [], // Remove image objects
            imageCount: newImageCount,
            existingFacilityFileIds: existingFacilityFileIds,
          };
        } else {
          // Create mode: simple image count
          const createFacility = facility as CreateFacility;
          return {
            ...createFacility,
            id: undefined, // Never send id in create mode
            images: createFacility.images.map(() => ({})), // Keep structure but remove file references
            imageCount: createFacility.images.length,
          };
        }
      });
      formData.append('facilities', JSON.stringify(facilitiesData));

      // Add images
      facilities.forEach((facility, facilityIndex) => {
        if (isUpdateMode) {
          const updateFacility = facility as UpdateFacility;
          // Use a separate counter for new images to match API expectations (0-indexed)
          let newImageIndex = 0;
          updateFacility.images.forEach(image => {
            // Update mode: only add new images
            if (isNewImage(image)) {
              formData.append(`facility_${facilityIndex}_image_${newImageIndex}`, image.file);
              newImageIndex++;
            }
          });
        } else {
          const createFacility = facility as CreateFacility;
          createFacility.images.forEach((image, imageIndex) => {
            // Create mode: add all images
            formData.append(`facility_${facilityIndex}_image_${imageIndex}`, image.file);
          });
        }
      });

      const endpoint = isUpdateMode
        ? `/api/admin/organizations/${orgSlug}`
        : '/api/admin/organizations/create';
      const method = isUpdateMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || (isUpdateMode ? t('error.updateFailed') : t('error.createFailed'))
        );
      }

      const result = await response.json();

      if (isUpdateMode) {
        // Update mode: redirect to organization page
        router.push(`/admin/organizations/${orgSlug}`);
        router.refresh();
      } else {
        // Create mode: show success modal
        setCreatedOrganization({
          slug: result.organization.slug,
          name: result.organization.name,
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error(`Organization ${isUpdateMode ? 'update' : 'creation'} error:`, error);
      setErrorMessage(error instanceof Error ? error.message : t('error.createFailed'));
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="bg-muted/30 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('formTitle')}</CardTitle>
            <CardDescription className="m-0">{t('formDescription')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {errorMessage && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Organization Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground m-0">
                {t('sections.organization')}
              </h3>
            </div>

            <div className="bg-muted/20 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="org-name" className="text-sm font-medium">
                    {t('fields.orgName')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="org-name"
                    name="name"
                    value={orgData.name}
                    onChange={handleOrgChange}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="org-nature" className="text-sm font-medium">
                    {t('fields.orgNature')} <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="org-nature"
                    name="nature"
                    value={orgData.nature}
                    onChange={handleOrgChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="public">{t('natures.public')}</option>
                    <option value="private">{t('natures.private')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="org-email"
                    className="text-sm font-medium flex items-center gap-2"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('fields.email')}
                  </label>
                  <Input
                    id="org-email"
                    name="email"
                    type="email"
                    value={orgData.email}
                    onChange={handleOrgChange}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="org-phone"
                    className="text-sm font-medium flex items-center gap-2"
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('fields.phone')}
                  </label>
                  <Input
                    id="org-phone"
                    name="phone"
                    type="tel"
                    value={orgData.phone}
                    onChange={handleOrgChange}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="org-website"
                    className="text-sm font-medium flex items-center gap-2"
                  >
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('fields.website')}
                  </label>
                  <Input
                    id="org-website"
                    name="website"
                    type="url"
                    value={orgData.website}
                    onChange={handleOrgChange}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Facilities Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground m-0">
                  {t('sections.facilities')}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              {facilities.map((facility, facilityIndex) => (
                <FacilityCard key={facility.id} facility={facility} facilityIndex={facilityIndex} />
              ))}
            </div>

            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFacility}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('actions.addFacility')}
              </Button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUpdateMode ? t('actions.updating') : t('actions.creating')}
                </>
              ) : isUpdateMode ? (
                t('actions.update')
              ) : (
                t('actions.create')
              )}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Success Modal - Only shown in create mode */}
      {!isUpdateMode && (
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="">
            <DialogHeader>
              <DialogTitle>{t('success.title')}</DialogTitle>
              <DialogDescription>{t('success.description')}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/admin/organizations');
                }}
                className="w-full sm:w-auto"
              >
                {t('success.backToList')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  resetForm();
                }}
                className="w-full sm:w-auto"
              >
                {t('success.createAnother')}
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  if (createdOrganization) {
                    router.push(`/admin/organizations/${createdOrganization.slug}`);
                    router.refresh();
                  }
                }}
                className="w-full sm:w-auto"
              >
                {t('success.viewOrganization')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// Main exported component that wraps everything with the provider
export function AdminOrganizationForm({
  organizationSlug,
  initialData,
}: AdminOrganizationFormProps) {
  return (
    <OrganizationFormProvider organizationSlug={organizationSlug} initialData={initialData}>
      <OrganizationFormContent />
    </OrganizationFormProvider>
  );
}
