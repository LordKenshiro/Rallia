"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "./ui/button";

const locales = [
  { code: "fr-CA", name: "FR", flag: "🇨🇦" },
  { code: "en-US", name: "EN", flag: "🇨🇦" },
] as const;

export default function LocaleToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return; // Avoid unnecessary changes

    startTransition(() => {
      // Get the current pathname without locale prefix
      const pathWithoutLocale = pathname.startsWith("/")
        ? pathname
        : `/${pathname}`;

      // Preserve query parameters
      const queryString = searchParams.toString();
      const queryPart = queryString ? `?${queryString}` : "";

      // Construct the new URL with the correct locale and preserved query params
      const newUrl = `/${newLocale}${pathWithoutLocale}${queryPart}`;

      // Force a full page reload to ensure server-generated content is refetched
      window.location.href = newUrl;
    });
  };

  return (
    <div className="flex gap-3">
      {locales.map((loc) => (
        <Button
          key={loc.code}
          onClick={() => handleLocaleChange(loc.code)}
          disabled={isPending}
          variant="outline"
          className={`${
            locale === loc.code
              ? "bg-accent text-accent-foreground"
              : "cursor-pointer"
          }`}
        >
          {loc.flag} {loc.name}
          {locale === loc.code && <span className="ml-auto text-xs">✓</span>}
        </Button>
      ))}
    </div>
  );
}
