import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.dashboard");
  return {
    title: t("titleMeta"),
    description: t("descriptionMeta"),
  };
}

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin.dashboard");

  return (
    <div className="flex flex-col w-full gap-8">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder cards for future features */}
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">{t("organizationsCard.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("organizationsCard.description")}
          </p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">{t("usersCard.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("usersCard.description")}
          </p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">{t("analyticsCard.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("analyticsCard.description")}
          </p>
        </div>
      </div>
    </div>
  );
}

