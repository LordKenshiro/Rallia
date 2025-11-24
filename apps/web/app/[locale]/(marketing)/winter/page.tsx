import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2,
  Users,
  Network,
  DollarSign,
  Clock,
  TrendingUp,
  Snowflake,
} from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { WaitlistForm } from "@/components/waitlist-form";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Winter Indoor Court Crisis - Rallia",
    description:
      "Over 6 million Canadian tennis and pickleball players face a severe indoor court shortage this winter. Join Rallia to share court time, find partners, and maximize facility usage.",
    keywords: [
      "indoor tennis courts",
      "pickleball courts",
      "winter tennis Canada",
      "court sharing",
      "tennis partners",
      "pickleball partners",
      "indoor court shortage",
    ],
    openGraph: {
      title: "Winter Indoor Court Crisis - Rallia",
      description:
        "Join the movement to solve Canada's indoor court shortage. Connect with players, share costs, and get on the court this winter.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Winter Indoor Court Crisis - Rallia",
      description:
        "6M+ Canadian players face an indoor court shortage. Join Rallia to share court time and find partners.",
    },
  };
}

export default async function WinterPage() {
  const t = await getTranslations("winter");

  return (
    <div className="flex flex-col items-center w-full gap-24 pb-16">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center gap-6 animate-fade-in">
        <Badge className="text-sm px-4 py-1.5 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] dark:bg-[var(--primary-500)] dark:hover:bg-[var(--primary-600)]">
          {t("hero.badge")}
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold mt-8">
          {t("hero.headline")}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mt-4">
          {t("hero.subheadline")}
        </p>

        {/* Hero Image */}
        <div className="relative w-full max-w-4xl mt-8 rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src="/snowy-tennis-court.jpeg"
            alt="Snow-covered outdoor tennis court highlighting the end of outdoor season"
            width={1200}
            height={675}
            priority
            className="w-full h-auto"
          />
        </div>

        <Button
          size="lg"
          className="cta-button mt-8 text-lg px-8 py-6 bg-[var(--secondary-500)] hover:bg-[var(--secondary-600)] dark:bg-[var(--secondary-500)] dark:hover:bg-[var(--secondary-600)]"
          asChild
        >
          <a href="#waitlist">{t("hero.ctaButton")}</a>
        </Button>
        <p className="text-sm text-muted-foreground">{t("hero.ctaSubtext")}</p>
      </section>

      <Separator className="max-w-md" />

      {/* Problem Section */}
      <section className="flex flex-col items-center w-full gap-12 animate-fade-in animate-delay-200">
        <div className="flex flex-col items-center gap-4">
          <Badge className="badge-interactive text-base px-4 py-1 bg-[var(--secondary-500)] hover:bg-[var(--secondary-600)] dark:bg-[var(--secondary-500)] dark:hover:bg-[var(--secondary-600)]">
            {t("problem.sectionBadge")}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-center">
            {t("problem.sectionTitle")}
          </h2>
          <p className="text-xl text-center text-muted-foreground max-w-3xl mt-2">
            {t("problem.coreMessage")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <ScrollReveal>
            <Card className="border-[var(--secondary-200)] dark:border-[var(--secondary-800)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--secondary-300)] dark:hover:border-[var(--secondary-700)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--secondary-100)] dark:bg-[var(--secondary-800)]">
                    <Building2 className="size-6 text-[var(--secondary-700)] dark:text-[var(--secondary-300)]" />
                  </div>
                  <CardTitle className="text-xl">
                    {t("problem.noCourtNoGame.title")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t("problem.noCourtNoGame.description")}
                </CardDescription>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal>
            <Card className="border-[var(--secondary-200)] dark:border-[var(--secondary-800)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--secondary-300)] dark:hover:border-[var(--secondary-700)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--secondary-100)] dark:bg-[var(--secondary-800)]">
                    <Users className="size-6 text-[var(--secondary-700)] dark:text-[var(--secondary-300)]" />
                  </div>
                  <CardTitle className="text-xl">
                    {t("problem.bookingCompetition.title")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t("problem.bookingCompetition.description")}
                </CardDescription>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal>
            <Card className="border-[var(--secondary-200)] dark:border-[var(--secondary-800)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--secondary-300)] dark:hover:border-[var(--secondary-700)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--secondary-100)] dark:bg-[var(--secondary-800)]">
                    <Snowflake className="size-6 text-[var(--secondary-700)] dark:text-[var(--secondary-300)]" />
                  </div>
                  <CardTitle className="text-xl">
                    {t("problem.temperatureDrop.title")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t("problem.temperatureDrop.description")}
                </CardDescription>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      <Separator className="max-w-md" />

      {/* Stats Section */}
      <section className="flex flex-col items-center w-full gap-12 animate-fade-in animate-delay-300">
        <div className="flex flex-col items-center gap-4">
          <Badge className="badge-interactive text-base px-4 py-1 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] dark:bg-[var(--primary-500)] dark:hover:bg-[var(--primary-600)]">
            {t("stats.sectionBadge")}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-center">
            {t("stats.sectionTitle")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          <ScrollReveal>
            <Card className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="stat-emphasis text-4xl font-bold text-[var(--secondary-600)] dark:text-[var(--secondary-500)]">
                  {t("stats.affectedPlayers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-medium">
                  {t("stats.affectedPlayersLabel")}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal>
            <Card className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="stat-emphasis text-4xl font-bold text-[var(--secondary-600)] dark:text-[var(--secondary-500)]">
                  {t("stats.courtDensity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-medium">
                  {t("stats.courtDensityLabel")}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal>
            <Card className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="stat-emphasis text-4xl font-bold text-[var(--secondary-600)] dark:text-[var(--secondary-500)]">
                  {t("stats.demandGrowth")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-medium">
                  {t("stats.demandGrowthLabel")}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal>
            <Card className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="stat-emphasis text-4xl font-bold text-[var(--secondary-600)] dark:text-[var(--secondary-500)]">
                  {t("stats.courtGrowth")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-medium">
                  {t("stats.courtGrowthLabel")}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      <Separator className="max-w-md" />

      {/* Solution Section */}
      <section className="flex flex-col items-center w-full gap-12 animate-fade-in animate-delay-400">
        <div className="flex flex-col items-center gap-4">
          <Badge className="badge-interactive text-base px-4 py-1 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] dark:bg-[var(--primary-500)] dark:hover:bg-[var(--primary-600)]">
            {t("solution.sectionBadge")}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-center">
            {t("solution.sectionTitle")}
          </h2>
          <p className="text-xl text-center text-muted-foreground max-w-3xl mt-2">
            {t("solution.pitch")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Card className="border-[var(--primary-200)] dark:border-[var(--primary-800)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary-300)] dark:hover:border-[var(--primary-700)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--primary-100)] dark:bg-[var(--primary-800)]">
                  <Network className="size-6 text-[var(--primary-700)] dark:text-[var(--primary-300)]" />
                </div>
                <CardTitle className="text-xl">
                  {t("solution.findPartners.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {t("solution.findPartners.description")}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-[var(--primary-200)] dark:border-[var(--primary-800)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary-300)] dark:hover:border-[var(--primary-700)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--primary-100)] dark:bg-[var(--primary-800)]">
                  <DollarSign className="size-6 text-[var(--primary-700)] dark:text-[var(--primary-300)]" />
                </div>
                <CardTitle className="text-xl">
                  {t("solution.shareCosts.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {t("solution.shareCosts.description")}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-[var(--primary-200)] dark:border-[var(--primary-800)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary-300)] dark:hover:border-[var(--primary-700)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--primary-100)] dark:bg-[var(--primary-800)]">
                  <Clock className="size-6 text-[var(--primary-700)] dark:text-[var(--primary-300)]" />
                </div>
                <CardTitle className="text-xl">
                  {t("solution.fillCancellations.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {t("solution.fillCancellations.description")}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-[var(--primary-200)] dark:border-[var(--primary-800)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary-300)] dark:hover:border-[var(--primary-700)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--primary-100)] dark:bg-[var(--primary-800)]">
                  <TrendingUp className="size-6 text-[var(--primary-700)] dark:text-[var(--primary-300)]" />
                </div>
                <CardTitle className="text-xl">
                  {t("solution.unlockPotential.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {t("solution.unlockPotential.description")}
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-lg text-muted-foreground max-w-2xl italic">
            {t("solution.vision")}
          </p>
        </div>
      </section>

      <Separator className="max-w-md" />

      {/* Founding Member CTA Section */}
      <section className="flex flex-col items-center text-center gap-8 animate-fade-in animate-delay-500 bg-gradient-to-br from-[var(--accent-100)] via-[var(--secondary-100)] to-[var(--primary-300)] dark:from-[var(--secondary-100)] dark:via-[var(--accent-100)] dark:to-[var(--secondary-300)] py-16 px-8 rounded-2xl w-full shadow-luma">
        <div className="flex flex-col items-center gap-4">
          <Badge className="badge-interactive text-base px-4 py-1 bg-[var(--secondary-500)] hover:bg-[var(--secondary-600)] dark:bg-[var(--secondary-500)] dark:hover:bg-[var(--secondary-600)]">
            {t("foundingMember.sectionBadge")}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold">
            {t("foundingMember.sectionTitle")}
          </h2>
        </div>
        <div className="flex flex-col gap-4 max-w-2xl">
          <p className="text-lg md:text-xl text-muted-foreground">
            {t("foundingMember.offer")}
          </p>
          <p className="text-base text-muted-foreground">
            {t("foundingMember.survey")}
          </p>
        </div>
        <Button
          size="lg"
          className="button-scale text-lg px-8 py-6 bg-[var(--secondary-500)] hover:bg-[var(--secondary-600)] dark:bg-[var(--secondary-500)] dark:hover:bg-[var(--secondary-600)]"
          asChild
        >
          <a href="#waitlist">{t("foundingMember.ctaButton")}</a>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("foundingMember.benefits")}
        </p>
      </section>

      <Separator className="max-w-md" />

      {/* Waitlist Section */}
      <section
        id="waitlist"
        className="flex flex-col items-center w-full gap-12 animate-fade-in animate-delay-600 scroll-mt-24"
      >
        <div className="flex flex-col items-center gap-4">
          <Badge className="badge-interactive text-base px-4 py-1 bg-[var(--secondary-500)] hover:bg-[var(--secondary-600)] dark:bg-[var(--secondary-500)] dark:hover:bg-[var(--secondary-600)]">
            {t("waitlist.sectionBadge")}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-center">
            {t("waitlist.sectionTitle")}
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-2xl">
            {t("waitlist.description")}
          </p>
        </div>

        <WaitlistForm />
      </section>

      <Separator className="max-w-md" />

      {/* FAQ Section */}
      <section className="flex flex-col items-center w-full gap-12 animate-fade-in animate-delay-700">
        <div className="flex flex-col items-center gap-4">
          <Badge className="badge-interactive text-base px-4 py-1 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] dark:bg-[var(--primary-500)] dark:hover:bg-[var(--primary-600)]">
            {t("faq.sectionBadge")}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-center">
            {t("faq.sectionTitle")}
          </h2>
        </div>

        <Card className="w-full">
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {[
                "whatIsThis",
                "foundingMember",
                "whenLaunch",
                "bothSports",
                "howHelp",
              ].map((key) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="text-left">
                    {t(`faq.questions.${key}.question`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {t(`faq.questions.${key}.answer`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
