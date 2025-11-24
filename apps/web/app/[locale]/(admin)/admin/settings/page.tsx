import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.settings");
  return {
    title: t("titleMeta"),
    description: t("descriptionMeta"),
  };
}

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin.settings");

  return (
    <div className="flex flex-col w-full gap-8">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <div className="p-6 border rounded-lg">
        <p className="text-muted-foreground">{t("comingSoon")}</p>
      </div>
    </div>
  );
}

