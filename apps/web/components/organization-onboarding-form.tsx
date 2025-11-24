"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Enums } from "@/types";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OrganizationNature = Enums<"organization_nature_enum">;
type OrganizationType = Enums<"organization_type_enum">;
type Country = Enums<"country_enum">;
type Role = Enums<"role_enum">;

export function OrganizationOnboardingForm() {
  const t = useTranslations("onboarding");
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    nature: "public" as OrganizationNature,
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "" as Country | "",
    postalCode: "",
    type: "club" as OrganizationType,
    description: "",
    website: "",
    role: "owner" as Role,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage(null);
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Generate slug from organization name
      const slug = generateSlug(formData.name);

      const response = await fetch("/api/organizations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slug,
          country: formData.country || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create organization");
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Organization creation error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create organization"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const countries: { value: Country; label: string }[] = [
    { value: "Canada", label: "Canada" },
    { value: "United States", label: "United States" },
  ];

  return (
    <Card className="w-full max-w-2xl border-[var(--secondary-200)] dark:border-[var(--secondary-800)]">
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription className="text-base">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("basicInfo")}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  {t("nameLabel")} <span className="text-destructive">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t("namePlaceholder")}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-medium">
                  {t("typeLabel")} <span className="text-destructive">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="club">{t("typeClub")}</option>
                  <option value="municipality">{t("typeMunicipality")}</option>
                  <option value="city">{t("typeCity")}</option>
                  <option value="association">{t("typeAssociation")}</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="nature" className="text-sm font-medium">
                {t("natureLabel")} <span className="text-destructive">*</span>
              </label>
              <select
                id="nature"
                name="nature"
                value={formData.nature}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="public">{t("naturePublic")}</option>
                <option value="private">{t("naturePrivate")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                {t("descriptionLabel")}
              </label>
              <textarea
                id="description"
                name="description"
                placeholder={t("descriptionPlaceholder")}
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("contactInfo")}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {t("emailLabel")} <span className="text-destructive">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  {t("phoneLabel")}
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder={t("phonePlaceholder")}
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="website" className="text-sm font-medium">
                {t("websiteLabel")}
              </label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder={t("websitePlaceholder")}
                value={formData.website}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("locationInfo")}</h3>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium">
                {t("addressLabel")}
              </label>
              <Input
                id="address"
                name="address"
                type="text"
                placeholder={t("addressPlaceholder")}
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium">
                  {t("cityLabel")}
                </label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  placeholder={t("cityPlaceholder")}
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="country" className="text-sm font-medium">
                  {t("countryLabel")}
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{t("countryPlaceholder")}</option>
                  {countries.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="postalCode" className="text-sm font-medium">
                  {t("postalCodeLabel")}
                </label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  placeholder={t("postalCodePlaceholder")}
                  value={formData.postalCode}
                  onChange={handleChange}
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Your Role */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("yourRole")}</h3>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                {t("roleLabel")} <span className="text-destructive">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="owner">{t("roleOwner")}</option>
                <option value="admin">{t("roleAdmin")}</option>
                <option value="staff">{t("roleStaff")}</option>
              </select>
              <p className="text-xs text-muted-foreground">{t("roleHint")}</p>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full bg-[var(--secondary-500)] hover:bg-[var(--secondary-600)] dark:bg-[var(--secondary-500)] dark:hover:bg-[var(--secondary-600)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("creating")}
              </>
            ) : (
              t("createButton")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
