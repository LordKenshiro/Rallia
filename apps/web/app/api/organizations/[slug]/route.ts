import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Fetch organization with all related data
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(
        `
        id,
        owner_id,
        name,
        nature,
        email,
        phone,
        slug,
        address,
        city,
        country,
        postal_code,
        type,
        description,
        website,
        is_active,
        created_at,
        updated_at,
        profiles:owner_id (
          id,
          full_name,
          display_name,
          email
        )
      `
      )
      .eq('slug', slug)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch facilities with all related data
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select(
        `
        id,
        name,
        slug,
        facility_type,
        description,
        address,
        city,
        country,
        postal_code,
        latitude,
        longitude,
        attributes,
        is_active,
        created_at,
        updated_at,
        facility_images (
          id,
          storage_key,
          url,
          thumbnail_url,
          description,
          display_order,
          is_primary,
          file_size,
          mime_type,
          uploaded_at
        ),
        facility_contacts (
          id,
          phone,
          email,
          website,
          is_primary,
          contact_type,
          notes,
          attributes,
          sport_id
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
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (facilitiesError) {
      console.error('Error fetching facilities:', facilitiesError);
      return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
    }

    // Fetch courts for each facility
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
          lines_marked_for_multiple_sports,
          availability_status,
          attributes,
          notes,
          is_active,
          created_at,
          updated_at,
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

      if (courtsError) {
        console.error('Error fetching courts:', courtsError);
      } else {
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

    return NextResponse.json({
      organization: {
        ...organization,
        facilities: facilitiesWithCourts || [],
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the organization' },
      { status: 500 }
    );
  }
}
