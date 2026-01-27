import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSelectedOrganization } from '@/lib/supabase/get-selected-organization';
import { PublishButton } from '@/components/programs/PublishButton';
import { BackButton } from '@/components/back-button';
import { Calendar, Clock, DollarSign, Edit, GraduationCap, MapPin, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params: _params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return {
    title: 'Program Details - Rallia',
    description: 'View and manage program details.',
  };
}

function formatPrice(cents: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  // Append T00:00:00 to parse as local date, not UTC
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

interface SessionCourt {
  id: string;
  court: { name: string | null; court_number: number | null } | null;
}

function getCourtLabel(
  court: { name: string | null; court_number: number | null } | null | undefined
): string {
  if (!court) return '';
  return court.name || (court.court_number ? `Court ${court.court_number}` : 'Unknown Court');
}

function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'published':
      return 'default';
    case 'draft':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    case 'completed':
      return 'outline';
    default:
      return 'secondary';
  }
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations('programs');
  const tSessions = await getTranslations('programs.sessions');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const organization = await getSelectedOrganization(user.id);

  if (!organization) {
    notFound();
  }

  // Fetch program with details (includes organization check in query)
  const { data: program, error } = await supabase
    .from('program')
    .select(
      `
      *,
      facility:facility_id (
        id,
        name
      ),
      sport:sport_id (
        id,
        name
      ),
      sessions:program_session (
        *,
        courts:program_session_court (
          id,
          court_id,
          booking_id,
          court:court_id (
            id,
            name,
            court_number
          )
        )
      ),
      registrations:program_registration (
        id,
        status,
        player_id
      )
    `
    )
    .eq('id', id)
    .eq('organization_id', organization.id)
    .single();

  if (error || !program) {
    notFound();
  }

  // Fetch profile data for registrations separately
  const playerIds =
    program.registrations?.map((r: { player_id: string }) => r.player_id).filter(Boolean) || [];
  const profilesMap = new Map<string, { display_name: string | null; full_name: string | null }>();

  if (playerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profile')
      .select('id, display_name, first_name, last_name')
      .in('id', playerIds);

    if (profiles) {
      profiles.forEach(profile => {
        const fullName =
          profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile.first_name || profile.last_name || null;
        profilesMap.set(profile.id, {
          display_name: profile.display_name,
          full_name: fullName,
        });
      });
    }
  }

  // Enrich registrations with profile data
  const enrichedRegistrations =
    program.registrations?.map((reg: { player_id: string; id: string; status: string }) => ({
      ...reg,
      player: reg.player_id
        ? {
            id: reg.player_id,
            profile: profilesMap.get(reg.player_id) || null,
          }
        : null,
    })) || [];

  // Get instructors
  const { data: programInstructors } = await supabase
    .from('program_instructor')
    .select(
      `
      is_primary,
      instructor:instructor_id (
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq('program_id', id);

  // Get waitlist count
  const { count: waitlistCount } = await supabase
    .from('program_waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('program_id', id);

  const confirmedRegistrations =
    enrichedRegistrations.filter((r: { status: string }) => r.status === 'confirmed').length || 0;

  const sessions = program.sessions || [];
  const upcomingSessions = sessions.filter(
    (s: { date: string; is_cancelled: boolean }) =>
      !s.is_cancelled && new Date(s.date) >= new Date()
  );

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <BackButton>{t('detail.backToPrograms')}</BackButton>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold mb-0">{program.name}</h1>
            <Badge variant={getStatusBadgeVariant(program.status)}>
              {t(`status.${program.status}`)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {t(`type.${program.type}`)}
            </Badge>
          </div>
          {program.description && (
            <p className="text-muted-foreground max-w-2xl">{program.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {program.status === 'draft' && <PublishButton programId={id} />}
          <Button variant="outline" asChild>
            <Link href={`/dashboard/programs/${id}/edit`}>
              <Edit className="mr-2 size-4" />
              {t('detail.edit')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">{t('detail.stats.startDate')}</p>
                <p className="font-semibold mb-0">{formatDate(program.start_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">
                  {t('detail.stats.participants')}
                </p>
                <p className="font-semibold mb-0">
                  {confirmedRegistrations}
                  {program.max_participants && ` / ${program.max_participants}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">{t('detail.stats.price')}</p>
                <p className="font-semibold mb-0">
                  {formatPrice(program.price_cents, program.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Clock className="size-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">{t('detail.stats.sessions')}</p>
                <p className="font-semibold mb-0">
                  {sessions.length} {t('detail.stats.totalSessions')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList>
          <TabsTrigger value="sessions">
            {t('detail.tabs.sessions')} ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="registrations">
            {t('detail.tabs.registrations')} ({confirmedRegistrations})
          </TabsTrigger>
          <TabsTrigger value="waitlist">
            {t('detail.tabs.waitlist')} ({waitlistCount || 0})
          </TabsTrigger>
          <TabsTrigger value="instructors">{t('detail.tabs.instructors')}</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('detail.tabs.sessions')}</CardTitle>
                  <CardDescription>
                    {upcomingSessions.length} {t('detail.upcomingSessions')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/programs/${id}/sessions`}>
                    {t('detail.manageSessions')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('detail.noSessions')}</p>
              ) : (
                <div className="space-y-3">
                  {sessions
                    .sort(
                      (
                        a: { date: string; start_time: string },
                        b: { date: string; start_time: string }
                      ) => {
                        // Sort chronologically: first by date, then by start_time
                        const dateCompare = a.date.localeCompare(b.date);
                        if (dateCompare !== 0) return dateCompare;
                        return a.start_time.localeCompare(b.start_time);
                      }
                    )
                    .slice(0, 5)
                    .map(
                      (
                        session: {
                          id: string;
                          date: string;
                          start_time: string;
                          end_time: string;
                          is_cancelled: boolean;
                          court?: { name: string | null; court_number: number | null } | null;
                          location_override?: string | null;
                        },
                        index: number
                      ) => {
                        // Calculate chronological number for display
                        const chronologicalNumber =
                          sessions
                            .sort(
                              (
                                a: { date: string; start_time: string },
                                b: { date: string; start_time: string }
                              ) => {
                                const dateCompare = a.date.localeCompare(b.date);
                                if (dateCompare !== 0) return dateCompare;
                                return a.start_time.localeCompare(b.start_time);
                              }
                            )
                            .findIndex(s => s.id === session.id) + 1;

                        return (
                          <div
                            key={session.id}
                            className={`flex items-center gap-4 p-3 rounded-lg border ${
                              session.is_cancelled ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center bg-muted rounded-lg px-3 py-2 min-w-[70px]">
                              <span className="text-xs text-muted-foreground">
                                {t('sessions.table.session')}
                              </span>
                              <span className="text-lg font-bold">{chronologicalNumber}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium mb-0">
                                {formatDate(session.date)}
                                {session.is_cancelled && (
                                  <Badge variant="destructive" className="ml-2">
                                    {t('sessions.cancelled')}
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground mb-0">
                                {formatTime(session.start_time)} - {formatTime(session.end_time)}
                                {session.location_override && (
                                  <span className="ml-2">
                                    <MapPin className="inline size-3 mr-1" />
                                    {session.location_override}
                                  </span>
                                )}
                              </p>
                              {(session as unknown as { courts?: SessionCourt[] }).courts &&
                                (session as unknown as { courts?: SessionCourt[] }).courts!.length >
                                  0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {(session as unknown as { courts: SessionCourt[] }).courts.map(
                                      sc => (
                                        <Badge key={sc.id} variant="secondary" className="text-xs">
                                          {getCourtLabel(sc.court)}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  {sessions.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link href={`/dashboard/programs/${id}/sessions`}>
                        {t('detail.viewAllSessions', { count: sessions.length })}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registrations" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('detail.tabs.registrations')}</CardTitle>
                  <CardDescription>
                    {confirmedRegistrations} {t('detail.confirmedParticipants')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/programs/${id}/registrations`}>
                    {t('detail.manageRegistrations')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrichedRegistrations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('detail.noRegistrations')}
                </p>
              ) : (
                <div className="space-y-2">
                  {enrichedRegistrations
                    .filter((r: { status: string }) => r.status === 'confirmed')
                    .slice(0, 5)
                    .map(
                      (reg: {
                        id: string;
                        status: string;
                        player?: {
                          id: string;
                          profile?: {
                            display_name: string | null;
                            full_name: string | null;
                          } | null;
                        } | null;
                      }) => (
                        <div
                          key={reg.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="size-4 text-primary" />
                            </div>
                            <span className="font-medium">
                              {reg.player?.profile?.display_name ||
                                reg.player?.profile?.full_name ||
                                t('registrations.unknownPlayer')}
                            </span>
                          </div>
                          <Badge variant="default">{t(`registrations.status.${reg.status}`)}</Badge>
                        </div>
                      )
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waitlist" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('detail.tabs.waitlist')}</CardTitle>
                  <CardDescription>
                    {waitlistCount || 0} {t('detail.peopleWaiting')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/programs/${id}/waitlist`}>
                    {t('detail.manageWaitlist')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                {waitlistCount
                  ? t('waitlist.peopleOnWaitlist', { count: waitlistCount })
                  : t('detail.noWaitlist')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructors" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('detail.tabs.instructors')}</CardTitle>
                  <CardDescription>{t('detail.coachesAssigned')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/programs/${id}/instructors`}>
                    {t('detail.manageInstructors')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!programInstructors || programInstructors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('detail.noInstructors')}
                </p>
              ) : (
                <div className="space-y-3">
                  {programInstructors.map(
                    (pi: {
                      is_primary: boolean;
                      instructor: {
                        id: string;
                        display_name: string;
                        avatar_url: string | null;
                      } | null;
                    }) => (
                      <div
                        key={pi.instructor?.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="size-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium mb-0">{pi.instructor?.display_name}</p>
                            {pi.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                {t('detail.leadInstructor')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
