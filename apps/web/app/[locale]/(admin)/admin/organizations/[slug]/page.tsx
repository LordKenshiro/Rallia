import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Tables } from '@/types';
import { Building2, Edit, Globe, Mail, MapPin, Phone, Sun, Home, Layers } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

// Helper to capitalize strings
function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Type aliases for relations - matching the actual query structure
// FacilityFile now represents facility_files joined with files
type FacilityFile = {
  id: string;
  display_order: number | null;
  is_primary: boolean | null;
  files: {
    id: string;
    url: string;
    thumbnail_url: string | null;
  } | null;
};
type FacilityContact = Pick<
  Tables<'facility_contacts'>,
  'id' | 'phone' | 'email' | 'website' | 'contact_type' | 'is_primary'
>;
type Sport = Pick<Tables<'sports'>, 'id' | 'name' | 'slug'>;
type Court = Pick<
  Tables<'courts'>,
  'id' | 'surface_type' | 'lighting' | 'indoor' | 'name' | 'court_number' | 'availability_status'
> & {
  court_sports: Array<{
    sport_id: string;
    sports: Sport;
  }>;
};
type Facility = Pick<
  Tables<'facilities'>,
  'id' | 'name' | 'slug' | 'address' | 'city' | 'country' | 'postal_code' | 'latitude' | 'longitude'
> & {
  facility_files: FacilityFile[];
  facility_contacts: FacilityContact[];
  facility_sports: Array<{
    sport_id: string;
    sports: Sport;
  }>;
  courts: Court[];
};
type Organization = Pick<
  Tables<'organizations'>,
  | 'id'
  | 'name'
  | 'nature'
  | 'type'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'country'
  | 'postal_code'
  | 'website'
  | 'description'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
> & {
  facilities: Facility[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations('admin.organizations.profile');
  const supabase = await createClient();

  try {
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, description')
      .eq('slug', slug)
      .single();

    if (organization) {
      return {
        title: `${organization.name} - ${t('titleMeta')}`,
        description: organization.description || t('descriptionMeta'),
      };
    }
  } catch (error) {
    // Fallback metadata
  }

  return {
    title: t('titleMeta'),
    description: t('descriptionMeta'),
  };
}

export default async function OrganizationProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations('admin.organizations.profile');
  const supabase = await createClient();

  let organization: Organization | null = null;

  try {
    // Fetch organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select(
        `
        id,
        name,
        nature,
        type,
        email,
        phone,
        address,
        city,
        country,
        postal_code,
        website,
        description,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq('slug', slug)
      .single();

    if (orgError || !orgData) {
      notFound();
    }

    // Fetch facilities with all related data
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select(
        `
        id,
        name,
        slug,
        address,
        city,
        country,
        postal_code,
        latitude,
        longitude,
        facility_files (
          id,
          display_order,
          is_primary,
          files (
            id,
            url,
            thumbnail_url
          )
        ),
        facility_contacts (
          id,
          phone,
          email,
          website,
          is_primary,
          contact_type
        ),
        facility_sports (
          sport_id,
          sports (
            id,
            name,
            slug
          )
        )
      `
      )
      .eq('organization_id', orgData.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (facilitiesError) {
      throw new Error('Failed to fetch facilities');
    }

    // Fetch courts
    const facilityIds = facilities?.map(f => f.id) || [];
    let courts: any[] = [];

    if (facilityIds.length > 0) {
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select(
          `
          id,
          facility_id,
          surface_type,
          lighting,
          indoor,
          name,
          court_number,
          availability_status,
          court_sports (
            sport_id,
            sports (
              id,
              name,
              slug
            )
          )
        `
        )
        .in('facility_id', facilityIds)
        .eq('is_active', true)
        .order('court_number', { ascending: true });

      if (!courtsError) {
        courts = courtsData || [];
      }
    }

    // Organize courts by facility
    const facilitiesWithCourts = facilities?.map(facility => {
      const facilityCourts = courts.filter(court => court.facility_id === facility.id);
      return {
        ...facility,
        courts: facilityCourts,
      };
    });

    organization = {
      ...orgData,
      facilities: facilitiesWithCourts || [],
    };
  } catch (error) {
    console.error('Error fetching organization:', error);
    return (
      <div className="flex flex-col w-full gap-8">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive m-0">{t('error')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="text-muted-foreground mt-2 mb-0">{t('description', { slug })}</p>
        </div>
        <Link href={`/admin/organizations/${slug}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            {t('updateButton')}
          </Button>
        </Link>
      </div>

      {/* Organization Info */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('sections.organizationInfo')}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {organization.nature && (
                <Badge variant="outline" className="font-medium">
                  {t(`nature.${organization.nature}`)}
                </Badge>
              )}
              {organization.type && (
                <Badge variant="outline" className="font-medium">
                  {capitalize(organization.type)}
                </Badge>
              )}
              <Badge
                variant={organization.is_active ? 'default' : 'secondary'}
                className="font-medium"
              >
                {organization.is_active ? t('status.active') : t('status.inactive')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {organization.description && (
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="text-sm font-medium text-muted-foreground mb-2 mt-0">
                {t('fields.description')}
              </p>
              <p className="text-base leading-relaxed m-0">{organization.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {organization.email && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                    {t('fields.email')}
                  </p>
                  <a
                    href={`mailto:${organization.email}`}
                    className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                  >
                    {organization.email}
                  </a>
                </div>
              </div>
            )}

            {organization.phone && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                    {t('fields.phone')}
                  </p>
                  <a
                    href={`tel:${organization.phone}`}
                    className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                  >
                    {organization.phone}
                  </a>
                </div>
              </div>
            )}

            {organization.website && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                    {t('fields.website')}
                  </p>
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                  >
                    {organization.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            )}

            {(organization.address || organization.city || organization.country) && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="p-2 bg-primary/10 rounded-md">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                    {t('fields.address')}
                  </p>
                  <p className="text-sm font-medium m-0">
                    {[
                      organization.address,
                      organization.city,
                      capitalize(organization.country),
                      organization.postal_code,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 mt-0">
                {t('fields.createdAt')}
              </p>
              <p className="text-sm font-semibold m-0">{formatDate(organization.created_at)}</p>
            </div>
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 mt-0">
                {t('fields.updatedAt')}
              </p>
              <p className="text-sm font-semibold m-0">{formatDate(organization.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facilities */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('sections.facilities')}</h2>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {organization.facilities.length}{' '}
            {organization.facilities.length === 1 ? t('facility') : t('facilities')}
          </Badge>
        </div>

        {organization.facilities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground m-0">{t('noFacilities')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          organization.facilities.map(facility => (
            <Card key={facility.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{facility.name}</CardTitle>
                      {(facility.address || facility.city || facility.country) && (
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[
                            facility.address,
                            facility.city,
                            capitalize(facility.country),
                            facility.postal_code,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {facility.facility_sports && facility.facility_sports.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
                      {facility.facility_sports.map(fs => (
                        <Badge key={fs.sport_id} variant="default" className="text-xs">
                          {capitalize(fs.sports.name)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Facility Images */}
                {facility.facility_files && facility.facility_files.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('sections.facilityImages')}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {facility.facility_files
                        .filter(ff => ff.files) // Filter out entries without files
                        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                        .map(facilityFile => (
                          <div
                            key={facilityFile.id}
                            className={`relative aspect-video rounded-lg overflow-hidden border-2 ${
                              facilityFile.is_primary ? 'border-primary' : 'border-transparent'
                            } shadow-sm hover:shadow-md transition-shadow`}
                          >
                            <Image
                              src={facilityFile.files!.thumbnail_url || facilityFile.files!.url}
                              alt={facility.name}
                              fill
                              className="object-cover"
                            />
                            {facilityFile.is_primary && (
                              <div className="absolute top-2 left-2">
                                <Badge variant="default" className="text-xs shadow">
                                  Primary
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Contacts */}
                {facility.facility_contacts && facility.facility_contacts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('sections.contacts')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {facility.facility_contacts.map(contact => (
                        <div
                          key={contact.id}
                          className={`p-4 rounded-lg border-2 space-y-3 ${
                            contact.is_primary
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-muted bg-muted/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="font-medium">
                              {capitalize(contact.contact_type)}
                            </Badge>
                            {contact.is_primary && (
                              <Badge variant="default" className="text-xs">
                                {t('primary')}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            {contact.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="hover:underline hover:text-primary transition-colors"
                                >
                                  {contact.email}
                                </a>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="hover:underline hover:text-primary transition-colors"
                                >
                                  {contact.phone}
                                </a>
                              </div>
                            )}
                            {contact.website && (
                              <div className="flex items-center gap-2 text-sm">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <a
                                  href={contact.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline hover:text-primary transition-colors truncate"
                                >
                                  {contact.website.replace(/^https?:\/\//, '')}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Courts */}
                {facility.courts && facility.courts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('sections.courts')}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {facility.courts.length}{' '}
                        {facility.courts.length === 1 ? t('court') : t('courts')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {facility.courts.map(court => (
                        <div
                          key={court.id}
                          className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold m-0">
                              {court.name ||
                                (court.court_number
                                  ? `${t('court')} ${court.court_number}`
                                  : t('court'))}
                            </p>
                            <Badge
                              variant={
                                court.availability_status === 'available' ? 'default' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {capitalize(court.availability_status)}
                            </Badge>
                          </div>

                          {court.surface_type && (
                            <div className="flex items-center gap-2 text-sm">
                              <Layers className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{t('surfaceType')}:</span>
                              <span className="font-medium">{capitalize(court.surface_type)}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {court.lighting && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Sun className="h-3 w-3" />
                                {t('lighting')}
                              </Badge>
                            )}
                            {court.indoor && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Home className="h-3 w-3" />
                                {t('indoor')}
                              </Badge>
                            )}
                          </div>

                          {court.court_sports && court.court_sports.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                              {court.court_sports.map(cs => (
                                <Badge key={cs.sport_id} variant="secondary" className="text-xs">
                                  {capitalize(cs.sports.name)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
