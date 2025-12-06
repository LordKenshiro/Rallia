import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { Building2, Calendar, Globe, Mail, MapPin, Phone, User } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// Helper to capitalize strings
function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Dashboard - Rallia',
    description: 'Your organization dashboard on Rallia.',
  };
}

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const supabase = await createClient();

  // Get authenticated user (auth check is done in layout)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  // Fetch user's organization memberships with organization details
  const { data: memberships, error: membershipsError } = await supabase
    .from('organization_members')
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
    .eq('user_id', user!.id)
    .is('left_at', null);

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError);
  }

  // Get the first active organization (for now, showing one)
  const membership = memberships?.[0];
  const organization = membership?.organizations as any;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="flex flex-col w-full gap-8">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 mb-0">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('profileTitle')}</CardTitle>
                <CardDescription className="m-0">{t('profileDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="p-2 bg-primary/10 rounded-md">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                  {t('email')}
                </p>
                <p className="text-sm font-medium m-0">{user!.email}</p>
              </div>
            </div>

            {profile?.full_name && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="p-2 bg-primary/10 rounded-md">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                    {t('fullName')}
                  </p>
                  <p className="text-sm font-medium m-0">{profile.full_name}</p>
                </div>
              </div>
            )}

            {profile?.display_name && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="p-2 bg-primary/10 rounded-md">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                    {t('displayName')}
                  </p>
                  <p className="text-sm font-medium m-0">{profile.display_name}</p>
                </div>
              </div>
            )}

            {profile?.locale && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                    {t('locale')}
                  </p>
                  <p className="text-sm font-medium m-0">{profile.locale}</p>
                </div>
              </div>
            )}

            {profile?.timezone && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                    {t('timezone')}
                  </p>
                  <p className="text-sm font-medium m-0">{profile.timezone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Card */}
        {organization && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('organizationTitle')}</CardTitle>
                    <CardDescription className="m-0">
                      {t('organizationDescription')}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold m-0">{organization.name}</p>
                <div className="flex flex-wrap gap-2">
                  {organization.type && (
                    <Badge variant="outline" className="font-medium">
                      {capitalize(organization.type)}
                    </Badge>
                  )}
                  {organization.nature && (
                    <Badge variant="outline" className="font-medium">
                      {capitalize(organization.nature)}
                    </Badge>
                  )}
                  {membership && (
                    <Badge variant="default" className="font-medium">
                      {capitalize(membership.role)}
                    </Badge>
                  )}
                </div>
              </div>

              {organization.email && (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                      {t('email')}
                    </p>
                    <a
                      href={`mailto:${organization.email}`}
                      className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                    >
                      {organization.email}
                    </a>
                  </div>
                </div>
              )}

              {organization.phone && (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                      {t('phone')}
                    </p>
                    <a
                      href={`tel:${organization.phone}`}
                      className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                    >
                      {organization.phone}
                    </a>
                  </div>
                </div>
              )}

              {(organization.city || organization.country) && (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                      {t('location')}
                    </p>
                    <p className="text-sm font-medium m-0">
                      {[organization.city, capitalize(organization.country)]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {organization.website && (
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide m-0">
                      {t('website')}
                    </p>
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                    >
                      {organization.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              )}

              {organization.description && (
                <div className="bg-muted/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2 mt-0">
                    {t('description')}
                  </p>
                  <p className="text-sm leading-relaxed m-0">{organization.description}</p>
                </div>
              )}

              {membership?.joined_at && (
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 mt-0">
                    {t('joinedAt')}
                  </p>
                  <p className="text-sm font-semibold m-0">{formatDate(membership.joined_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
