import { AdminOrganizationForm } from '@/components/admin-organization-form';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations('admin.organizations.update');
  const supabase = await createClient();

  try {
    const { data: organization } = await supabase
      .from('organization')
      .select('name')
      .eq('slug', slug)
      .single();

    if (organization) {
      return {
        title: `${t('titleMeta')} - ${organization.name}`,
        description: t('descriptionMeta'),
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

export default async function AdminOrganizationEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations('admin.organizations.update');
  const supabase = await createClient();

  type OrganizationWithFacilities = {
    id: string;
    slug: string;
    name: string;
    nature: string;
    type: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    postal_code: string | null;
    website: string | null;
    description: string | null;
    data_provider_id: string | null;
    is_active: boolean;
    facilities?: Array<{
      id: string;
      name: string;
      slug: string;
      address: string | null;
      city: string | null;
      country: string | null;
      postal_code: string | null;
      latitude: number | null;
      longitude: number | null;
      description: string | null;
      timezone: string | null;
      data_provider_id: string | null;
      external_provider_id: string | null;
      facility_type: string | null;
      membership_required: boolean;
      is_active: boolean;
      facility_file: Array<{
        id: string;
        file_id: string;
        display_order: number | null;
        is_primary: boolean | null;
        file: {
          id: string;
          url: string;
          thumbnail_url: string | null;
        } | null;
      }>;
      facility_contact: Array<{
        id: string;
        phone: string | null;
        email: string | null;
        website: string | null;
        is_primary: boolean | null;
        contact_type: string;
        sport_id: string | null;
      }>;
      facility_sport: Array<{
        sport_id: string;
        sport: {
          id: string;
          name: string;
          slug: string;
        };
      }>;
      courts: Array<{
        id: string;
        facility_id: string;
        surface_type: string | null;
        lighting: boolean | null;
        indoor: boolean | null;
        name: string | null;
        court_number: number | null;
        availability_status: string | null;
        court_sport: Array<{
          sport_id: string;
          sport: {
            id: string;
            name: string;
            slug: string;
          };
        }>;
      }>;
    }>;
  };

  let organizationData: OrganizationWithFacilities | null = null;

  try {
    // Fetch organization
    const { data: orgData, error: orgError } = await supabase
      .from('organization')
      .select(
        `
        id,
        slug,
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
        data_provider_id,
        is_active
      `
      )
      .eq('slug', slug)
      .single();

    if (orgError || !orgData) {
      notFound();
    }

    // Fetch facilities with all related data
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facility')
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
        description,
        timezone,
        data_provider_id,
        external_provider_id,
        facility_type,
        membership_required,
        is_active,
        facility_file (
          id,
          file_id,
          display_order,
          is_primary,
          file (
            id,
            url,
            thumbnail_url
          )
        ),
        facility_contact (
          id,
          phone,
          email,
          website,
          is_primary,
          contact_type,
          sport_id
        ),
        facility_sport (
          sport_id,
          sport (
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
    type CourtData = {
      id: string;
      facility_id: string;
      surface_type: string | null;
      lighting: boolean | null;
      indoor: boolean | null;
      name: string | null;
      court_number: number | null;
      availability_status: string | null;
      court_sport: Array<{
        sport_id: string;
        sport: {
          id: string;
          name: string;
          slug: string;
        };
      }>;
    };
    let courts: CourtData[] = [];

    if (facilityIds.length > 0) {
      const { data: courtsData, error: courtsError } = await supabase
        .from('court')
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
          court_sport (
            sport_id,
            sport (
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

    organizationData = {
      ...orgData,
      facilities: facilitiesWithCourts || [],
    };
  } catch (error) {
    console.error('Error fetching organization:', error);
    return (
      <div className="flex flex-col w-full gap-8 h-full">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 mb-0">{t('description')}</p>
        </div>
        <Card className="grow overflow-hidden">
          <CardContent className="pt-6">
            <p className="text-destructive m-0">{t('error.loadFailed')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organizationData) {
    notFound();
  }

  // Map to InitialFacilityData format (preserving DB structure for the hook to transform)
  const facilities =
    organizationData.facilities?.map(facility => ({
      id: facility.id,
      name: facility.name,
      address: facility.address,
      city: facility.city,
      country: facility.country,
      postal_code: facility.postal_code,
      latitude: facility.latitude,
      longitude: facility.longitude,
      description: facility.description,
      timezone: facility.timezone,
      data_provider_id: facility.data_provider_id,
      external_provider_id: facility.external_provider_id,
      facility_type: facility.facility_type,
      membership_required: facility.membership_required || false,
      is_active: facility.is_active ?? true,
      facility_file: facility.facility_file?.map(ff => ({
        id: ff.id,
        file_id: ff.file_id,
        display_order: ff.display_order,
        is_primary: ff.is_primary,
        files: ff.file
          ? {
              id: ff.file.id,
              url: ff.file.url,
              thumbnail_url: ff.file.thumbnail_url,
            }
          : null,
      })),
      facility_contact: facility.facility_contact?.map(fc => ({
        id: fc.id,
        phone: fc.phone,
        email: fc.email,
        website: fc.website,
        contact_type: fc.contact_type,
        is_primary: fc.is_primary,
        sport_id: fc.sport_id,
      })),
      facility_sport: facility.facility_sport?.map(fs => ({
        sport_id: fs.sport_id,
      })),
      courts: facility.courts?.map(court => ({
        id: court.id,
        surface_type: court.surface_type,
        lighting: court.lighting,
        indoor: court.indoor,
        court_sport: court.court_sport?.map(cs => ({
          sport_id: cs.sport_id,
        })),
      })),
    })) || [];

  const initialData = {
    organization: {
      id: organizationData.id,
      slug: organizationData.slug,
      name: organizationData.name,
      nature: organizationData.nature as 'public' | 'private',
      type: (organizationData.type ?? undefined) as
        | 'club'
        | 'municipality'
        | 'city'
        | 'association'
        | ''
        | undefined,
      email: organizationData.email || '',
      phone: organizationData.phone || '',
      address: organizationData.address || '',
      city: organizationData.city || '',
      country: (organizationData.country || '') as 'Canada' | 'United States' | '',
      postalCode: organizationData.postal_code || '',
      postal_code: organizationData.postal_code || '',
      website: organizationData.website || '',
      description: organizationData.description || '',
      data_provider_id: organizationData.data_provider_id || null,
      is_active: organizationData.is_active ?? true,
    },
    facilities,
  };

  return (
    <div className="flex flex-col w-full gap-8 h-full">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 mb-0">{t('description')}</p>
      </div>

      <AdminOrganizationForm organizationSlug={slug} initialData={initialData} />
    </div>
  );
}
