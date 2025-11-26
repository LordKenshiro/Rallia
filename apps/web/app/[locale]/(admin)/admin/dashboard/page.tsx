import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, BarChart3, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.dashboard');
  return {
    title: t('titleMeta'),
    description: t('descriptionMeta'),
  };
}

export default async function AdminDashboardPage() {
  const t = await getTranslations('admin.dashboard');

  return (
    <div className="flex flex-col w-full gap-8">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 mb-0">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('organizationsCard.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <CardDescription className="text-sm m-0">
              {t('organizationsCard.description')}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('usersCard.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <CardDescription className="text-sm m-0">{t('usersCard.description')}</CardDescription>
          </CardContent>
        </Card>

        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('analyticsCard.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <CardDescription className="text-sm m-0">
              {t('analyticsCard.description')}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
