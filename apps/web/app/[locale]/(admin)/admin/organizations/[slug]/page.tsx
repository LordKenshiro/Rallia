import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types";
import { Building2, Edit, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

// Type aliases for relations - matching the actual query structure
type FacilityImage = Pick<
  Tables<"facility_images">,
  | "id"
  | "url"
  | "thumbnail_url"
  | "description"
  | "display_order"
  | "is_primary"
>;
type FacilityContact = Pick<
  Tables<"facility_contacts">,
  "id" | "phone" | "email" | "website" | "contact_type" | "is_primary"
>;
type Sport = Pick<Tables<"sports">, "id" | "name" | "slug">;
type Court = Pick<
  Tables<"courts">,
  | "id"
  | "surface_type"
  | "lighting"
  | "indoor"
  | "name"
  | "court_number"
  | "availability_status"
> & {
  court_sports: Array<{
    sport_id: string;
    sports: Sport;
  }>;
};
type Facility = Pick<
  Tables<"facilities">,
  | "id"
  | "name"
  | "slug"
  | "address"
  | "city"
  | "country"
  | "postal_code"
  | "latitude"
  | "longitude"
> & {
  facility_images: FacilityImage[];
  facility_contacts: FacilityContact[];
  facility_sports: Array<{
    sport_id: string;
    sports: Sport;
  }>;
  courts: Court[];
};
type Organization = Pick<
  Tables<"organizations">,
  | "id"
  | "name"
  | "nature"
  | "type"
  | "email"
  | "phone"
  | "address"
  | "city"
  | "country"
  | "postal_code"
  | "website"
  | "description"
  | "is_active"
  | "created_at"
  | "updated_at"
> & {
  facilities: Facility[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("admin.organizations.profile");
  const supabase = await createClient();

  try {
    const { data: organization } = await supabase
      .from("organizations")
      .select("name, description")
      .eq("slug", slug)
      .single();

    if (organization) {
      return {
        title: `${organization.name} - ${t("titleMeta")}`,
        description: organization.description || t("descriptionMeta"),
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

export default async function OrganizationProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("admin.organizations.profile");
  const supabase = await createClient();

  let organization: Organization | null = null;

  try {
    // Fetch organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
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

    organization = {
      ...orgData,
      facilities: facilitiesWithCourts || [],
    };
  } catch (error) {
    console.error("Error fetching organization:", error);
    return (
      <div className="flex flex-col w-full gap-8">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{t("error")}</p>
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
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="text-muted-foreground mt-2">
            {t("description", { slug })}
          </p>
        </div>
        <Link href={`/admin/organizations/${slug}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            {t("updateButton")}
          </Button>
        </Link>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.organizationInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {organization.nature && (
              <Badge variant="outline">
                {t(`nature.${organization.nature}`)}
              </Badge>
            )}
            {organization.type && (
              <Badge variant="outline">{organization.type}</Badge>
            )}
            <Badge variant={organization.is_active ? "default" : "secondary"}>
              {organization.is_active
                ? t("status.active")
                : t("status.inactive")}
            </Badge>
          </div>

          {organization.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {t("fields.description")}
              </p>
              <p className="text-base">{organization.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organization.email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("fields.email")}
                  </p>
                  <a
                    href={`mailto:${organization.email}`}
                    className="text-base hover:underline"
                  >
                    {organization.email}
                  </a>
                </div>
              </div>
            )}

            {organization.phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("fields.phone")}
                  </p>
                  <a
                    href={`tel:${organization.phone}`}
                    className="text-base hover:underline"
                  >
                    {organization.phone}
                  </a>
                </div>
              </div>
            )}

            {organization.website && (
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("fields.website")}
                  </p>
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base hover:underline"
                  >
                    {organization.website}
                  </a>
                </div>
              </div>
            )}

            {(organization.address ||
              organization.city ||
              organization.country) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("fields.address")}
                  </p>
                  <p className="text-base">
                    {[
                      organization.address,
                      organization.city,
                      organization.country,
                      organization.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">
                {t("fields.createdAt")}
              </p>
              <p>{formatDate(organization.created_at)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">
                {t("fields.updatedAt")}
              </p>
              <p>{formatDate(organization.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facilities */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("sections.facilities")}</h2>
          <Badge variant="outline">
            {organization.facilities.length}{" "}
            {organization.facilities.length === 1
              ? t("facility")
              : t("facilities")}
          </Badge>
        </div>

        {organization.facilities.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">
                {t("noFacilities")}
              </p>
            </CardContent>
          </Card>
        ) : (
          organization.facilities.map((facility) => (
            <Card key={facility.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {facility.name}
                    </CardTitle>
                    {facility.address && (
                      <CardDescription className="mt-1">
                        {[
                          facility.address,
                          facility.city,
                          facility.country,
                          facility.postal_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Facility Images */}
                {facility.facility_images &&
                  facility.facility_images.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        {t("sections.facilityImages")}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {facility.facility_images
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((image) => (
                            <div
                              key={image.id}
                              className="relative aspect-video rounded-lg overflow-hidden border"
                            >
                              <Image
                                src={image.thumbnail_url || image.url}
                                alt={image.description || facility.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Sports */}
                {facility.facility_sports &&
                  facility.facility_sports.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        {t("sections.sports")}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {facility.facility_sports.map((fs) => (
                          <Badge key={fs.sport_id} variant="outline">
                            {fs.sports.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Contacts */}
                {facility.facility_contacts &&
                  facility.facility_contacts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        {t("sections.contacts")}
                      </h4>
                      <div className="space-y-2">
                        {facility.facility_contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="p-3 border rounded-lg space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {contact.contact_type}
                              </p>
                              {contact.is_primary && (
                                <Badge variant="outline" className="text-xs">
                                  {t("primary")}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {contact.email && (
                                <p>
                                  <Mail className="h-3 w-3 inline mr-1" />
                                  {contact.email}
                                </p>
                              )}
                              {contact.phone && (
                                <p>
                                  <Phone className="h-3 w-3 inline mr-1" />
                                  {contact.phone}
                                </p>
                              )}
                              {contact.website && (
                                <p>
                                  <Globe className="h-3 w-3 inline mr-1" />
                                  <a
                                    href={contact.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {contact.website}
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Courts */}
                {facility.courts && facility.courts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">
                      {t("sections.courts")} ({facility.courts.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {facility.courts.map((court) => (
                        <div
                          key={court.id}
                          className="p-3 border rounded-lg space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium">
                              {court.name ||
                                (court.court_number
                                  ? `${t("court")} ${court.court_number}`
                                  : t("court"))}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {court.availability_status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {court.surface_type && (
                              <p>
                                {t("surfaceType")}: {court.surface_type}
                              </p>
                            )}
                            <div className="flex gap-2">
                              {court.lighting && (
                                <Badge variant="outline" className="text-xs">
                                  {t("lighting")}
                                </Badge>
                              )}
                              {court.indoor && (
                                <Badge variant="outline" className="text-xs">
                                  {t("indoor")}
                                </Badge>
                              )}
                            </div>
                            {court.court_sports &&
                              court.court_sports.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {court.court_sports.map((cs) => (
                                    <Badge
                                      key={cs.sport_id}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {cs.sports.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                          </div>
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
