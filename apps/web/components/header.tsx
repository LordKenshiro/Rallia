"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import LocaleToggle from "./locale-toggle";
import ModeToggle from "./mode-toggle";
import ThemeLogo from "./theme-logo";

export default function Header() {
  const t = useTranslations("home");

  return (
    <header className="flex w-full max-w-6xl mx-auto my-8 justify-between items-center gap-3 px-8">
      <ThemeLogo href="/" width={120} height={40} />
      <div className="flex items-center gap-3">
        <Button
          variant="default"
          className="button-scale hidden md:inline-flex bg-[var(--secondary-500)] hover:bg-[var(--secondary-600)] text-white"
          asChild
        >
          <a href="#waitlist">{t("header.ctaButton")}</a>
        </Button>
        <LocaleToggle />
        <ModeToggle />
      </div>
    </header>
  );
}
