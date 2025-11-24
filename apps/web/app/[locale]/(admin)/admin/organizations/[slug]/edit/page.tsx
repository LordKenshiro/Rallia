import { AdminOrganizationForm } from "@/components/admin-organization-form";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("admin.organizations.update");
  const supabase = await createClient();

  try {
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("slug", slug)
      .single();

    if (organization) {
      return {
        title: `${t("titleMeta")} - ${organization.name}`,
        description: t("descriptionMeta"),
      };
    }
  } catch (error) {
    // Fallback metadata
  }

  return {
    title: t("titleMeta"),
    description: t("descriptionMeta"),
  };
}

export default async function AdminOrganizationEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("admin.organizations.update");
  const supabase = await createClient();

  let organizationData: any = null;

  try {
    // Fetch organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
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
        description
      `
      )
      .eq("slug", slug)
      .single();

    if (orgError || !orgData) {
      notFound();
    }

    // Fetch facilities with all related data
    const { data: facilities, error: facilitiesError } = await supabase
      .from("facilities")
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
        facility_images (
          id,
          url,
          thumbnail_url,
          description,
          display_order,
          is_primary
        ),
        facility_contacts (
          id,
          phone,
          email,
          website,
          is_primary,
          contact_type,
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
      .eq("organization_id", orgData.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (facilitiesError) {
      throw new Error("Failed to fetch facilities");
    }

    // Fetch courts
    const facilityIds = facilities?.map((f) => f.id) || [];
    let courts: any[] = [];

    if (facilityIds.length > 0) {
      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
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
        .in("facility_id", facilityIds)
        .eq("is_active", true)
        .order("court_number", { ascending: true });

      if (!courtsError) {
        courts = courtsData || [];
      }
    }

    // Organize courts by facility
    const facilitiesWithCourts = facilities?.map((facility) => {
      const facilityCourts = courts.filter(
        (court) => court.facility_id === facility.id
      );
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
    console.error("Error fetching organization:", error);
    return (
      <div className="flex flex-col w-full gap-8 h-full">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <div className="border rounded-lg grow overflow-hidden">
          <div className="p-6">
            <p className="text-destructive">{t("error.loadFailed")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organizationData) {
    notFound();
  }

  // Transform the data to match the form component's expected structure
  const facilities =
    organizationData.facilities?.map((facility: any) => ({
      id: facility.id,
      name: facility.name,
      slug: facility.slug,
      address: facility.address || "",
      city: facility.city || "",
      country: facility.country || "",
      postal_code: facility.postal_code || "",
      latitude: facility.latitude?.toString() || "",
      longitude: facility.longitude?.toString() || "",
      facility_images: facility.facility_images || [],
      facility_contacts: facility.facility_contacts || [],
      facility_sports: facility.facility_sports || [],
      courts: facility.courts || [],
    })) || [];

  const initialData = {
    organization: {
      id: organizationData.id,
      slug: organizationData.slug,
      name: organizationData.name,
      nature: organizationData.nature,
      type: organizationData.type,
      email: organizationData.email,
      phone: organizationData.phone || "",
      address: organizationData.address || "",
      city: organizationData.city || "",
      country: organizationData.country || "",
      postalCode: organizationData.postal_code || "",
      postal_code: organizationData.postal_code || "",
      website: organizationData.website || "",
      description: organizationData.description || "",
    },
    facilities,
  };

  return (
    <div className="flex flex-col w-full gap-8 h-full">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <AdminOrganizationForm
        organizationSlug={slug}
        initialData={initialData}
      />
    </div>
  );
}
