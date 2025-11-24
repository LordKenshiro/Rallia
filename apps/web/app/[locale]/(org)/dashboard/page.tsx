import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Dashboard - Rallia",
    description: "Your organization dashboard on Rallia.",
  };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();

  // Get authenticated user (auth check is done in layout)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  // Fetch user's organization memberships with organization details
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select(
      `
      role,
      joined_at,
      organizations (
        id,
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
        created_at
      )
    `
    )
    .eq("user_id", user!.id)
    .is("left_at", null);

  if (membershipsError) {
    console.error("Error fetching memberships:", membershipsError);
  }

  // Get the first active organization (for now, showing one)
  const membership = memberships?.[0];
  const organization = membership?.organizations as any;

  return (
    <div className="flex flex-col w-full gap-8">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-[var(--secondary-200)] dark:border-[var(--secondary-800)]">
          <CardHeader>
            <CardTitle>{t("profileTitle")}</CardTitle>
            <CardDescription>{t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("email")}
              </p>
              <p className="text-base">{user!.email}</p>
            </div>
            {profile?.full_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("fullName")}
                </p>
                <p className="text-base">{profile.full_name}</p>
              </div>
            )}
            {profile?.display_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("displayName")}
                </p>
                <p className="text-base">{profile.display_name}</p>
              </div>
            )}
            {profile?.locale && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("locale")}
                </p>
                <p className="text-base">{profile.locale}</p>
              </div>
            )}
            {profile?.timezone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("timezone")}
                </p>
                <p className="text-base">{profile.timezone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Card */}
        {organization && (
          <Card className="border-[var(--secondary-200)] dark:border-[var(--secondary-800)]">
            <CardHeader>
              <CardTitle>{t("organizationTitle")}</CardTitle>
              <CardDescription>{t("organizationDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("name")}
                </p>
                <p className="text-base font-semibold">{organization.name}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{organization.type}</Badge>
                <Badge variant="outline">{organization.nature}</Badge>
                {membership && (
                  <Badge className="bg-[var(--primary-600)] dark:bg-[var(--primary-500)]">
                    {t("role")}: {membership.role}
                  </Badge>
                )}
              </div>
              {organization.email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("email")}
                  </p>
                  <p className="text-base">{organization.email}</p>
                </div>
              )}
              {organization.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("phone")}
                  </p>
                  <p className="text-base">{organization.phone}</p>
                </div>
              )}
              {(organization.city || organization.country) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("location")}
                  </p>
                  <p className="text-base">
                    {[organization.city, organization.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
              {organization.website && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("website")}
                  </p>
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-[var(--primary-600)] dark:text-[var(--primary-400)] hover:underline"
                  >
                    {organization.website}
                  </a>
                </div>
              )}
              {organization.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("description")}
                  </p>
                  <p className="text-base">{organization.description}</p>
                </div>
              )}
              {membership?.joined_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("joinedAt")}
                  </p>
                  <p className="text-base">
                    {new Date(membership.joined_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
