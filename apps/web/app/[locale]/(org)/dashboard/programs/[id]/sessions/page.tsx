'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link } from '@/i18n/navigation';
import { BackButton } from '@/components/back-button';
import { Calendar, Clock, Loader2, MapPin, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface SessionCourt {
  id: string;
  court_id: string;
  booking_id: string | null;
  court: {
    id: string;
    name: string | null;
    court_number: number | null;
  };
}

interface Session {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location_override: string | null;
  notes: string | null;
  is_cancelled: boolean;
  courts?: SessionCourt[];
  facility?: {
    id: string;
    name: string;
  } | null;
}

interface Court {
  id: string;
  name: string | null;
  court_number: number | null;
}

interface Program {
  name: string;
  status: string;
  facility_id: string | null;
  facility?: {
    id: string;
    name: string;
  } | null;
}

function formatDate(dateString: string): string {
  // Append T00:00:00 to parse as local date, not UTC
  // This prevents the date from shifting by one day in timezones behind UTC
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getCourtLabel(court: { name: string | null; court_number: number | null }): string {
  return court.name || (court.court_number ? `Court ${court.court_number}` : 'Unknown Court');
}

export default function SessionsPage() {
  const params = useParams();
  const t = useTranslations('programs.sessions');
  const tCommon = useTranslations('common');
  const programId = params.id as string;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [facilityCourts, setFacilityCourts] = useState<Court[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToActOn, setSessionToActOn] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [newSession, setNewSession] = useState({
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    courtIds: [] as string[],
    notes: '',
  });

  const fetchSessions = useCallback(async () => {
    try {
      const [sessionsRes, programRes] = await Promise.all([
        fetch(`/api/programs/${programId}/sessions`),
        fetch(`/api/programs/${programId}`),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }

      if (programRes.ok) {
        const data = await programRes.json();
        setProgram({
          name: data.name,
          status: data.status,
          facility_id: data.facility_id,
          facility: data.facility,
        });

        // Fetch courts for the facility if one is set
        if (data.facility_id) {
          const courtsRes = await fetch(`/api/facilities/${data.facility_id}/courts`);
          if (courtsRes.ok) {
            const courtsData = await courtsRes.json();
            setFacilityCourts(courtsData.courts || []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  function toggleCourtSelection(
    courtId: string,
    currentIds: string[],
    setter: (ids: string[]) => void
  ) {
    if (currentIds.includes(courtId)) {
      setter(currentIds.filter(id => id !== courtId));
    } else {
      setter([...currentIds, courtId]);
    }
  }

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate end time is after start time
    if (newSession.endTime <= newSession.startTime) {
      setError(t('errors.endTimeBeforeStart'));
      setIsSubmitting(false);
      return;
    }

    // Check for overlapping sessions on the same date
    const overlapping = sessions.find(session => {
      if (session.date !== newSession.date || session.is_cancelled) return false;
      const existingStart = session.start_time.slice(0, 5);
      const existingEnd = session.end_time.slice(0, 5);
      return newSession.startTime < existingEnd && newSession.endTime > existingStart;
    });

    if (overlapping) {
      setError(
        t('errors.overlappingSession', {
          date: formatDate(overlapping.date),
          start: formatTime(overlapping.start_time),
          end: formatTime(overlapping.end_time),
        })
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/programs/${programId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newSession.date,
          startTime: newSession.startTime,
          endTime: newSession.endTime,
          courtIds: newSession.courtIds.length > 0 ? newSession.courtIds : undefined,
          notes: newSession.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToAdd') || 'Failed to add session');
      }

      setIsAddDialogOpen(false);
      setNewSession({
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        courtIds: [],
        notes: '',
      });
      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelClick(session: Session) {
    setSessionToActOn(session);
    setCancelDialogOpen(true);
    setError(null);
  }

  function handleDeleteClick(session: Session) {
    setSessionToActOn(session);
    setDeleteDialogOpen(true);
    setError(null);
  }

  async function handleCancelConfirm() {
    if (!sessionToActOn) return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/programs/${programId}/sessions/${sessionToActOn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToCancel'));
      }

      setCancelDialogOpen(false);
      setSessionToActOn(null);
      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToCancel'));
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!sessionToActOn) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/programs/${programId}/sessions/${sessionToActOn.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToDelete'));
      }

      setDeleteDialogOpen(false);
      setSessionToActOn(null);
      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToDelete'));
    } finally {
      setIsDeleting(false);
    }
  }

  const activeSessions = sessions.filter(s => !s.is_cancelled);
  const cancelledSessions = sessions.filter(s => s.is_cancelled);
  const isDraft = program?.status === 'draft';
  const hasFacility = !!program?.facility_id;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-8">
      <div className="flex items-start justify-between">
        <div>
          <BackButton className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            {tCommon('back')}
          </BackButton>
          <h1 className="text-3xl font-bold mb-0">{t('title')}</h1>
          <p className="text-muted-foreground mb-0">
            {program?.name} - {activeSessions.length} {t('table.session').toLowerCase()}
            {program?.facility && <span className="ml-2">@ {program.facility.name}</span>}
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              {t('addSession')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleAddSession}>
              <DialogHeader>
                <DialogTitle className="mb-0">{t('addSession')}</DialogTitle>
                <DialogDescription className="mb-0">{tCommon('optional')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="date">{t('form.date')} *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newSession.date}
                    onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">{t('form.startTime')} *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newSession.startTime}
                      onChange={e => setNewSession({ ...newSession, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">{t('form.endTime')} *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newSession.endTime}
                      onChange={e => setNewSession({ ...newSession, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Courts Selection */}
                <div className="space-y-2">
                  <Label>
                    {t('form.courts')} ({tCommon('optional')})
                  </Label>
                  {!hasFacility ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{t('form.noFacilityWarning')}</span>
                    </div>
                  ) : facilityCourts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('form.noCourts')}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                      {facilityCourts.map(court => (
                        <label
                          key={court.id}
                          className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-accent"
                        >
                          <Checkbox
                            checked={newSession.courtIds.includes(court.id)}
                            onCheckedChange={() =>
                              toggleCourtSelection(court.id, newSession.courtIds, ids =>
                                setNewSession({ ...newSession, courtIds: ids })
                              )
                            }
                          />
                          <span className="text-sm">{getCourtLabel(court)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    {t('form.notes')} ({tCommon('optional')})
                  </Label>
                  <Input
                    id="notes"
                    value={newSession.notes}
                    onChange={e => setNewSession({ ...newSession, notes: e.target.value })}
                    placeholder={tCommon('optional')}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t('addSession')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {activeSessions.length} {t('stats.active')}, {cancelledSessions.length} {t('cancelled')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">{t('noSessions')}</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                {t('addSession')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions
                .sort((a, b) => {
                  // Sort chronologically: first by date, then by start_time
                  const dateCompare = a.date.localeCompare(b.date);
                  if (dateCompare !== 0) return dateCompare;
                  return a.start_time.localeCompare(b.start_time);
                })
                .map((session, index) => (
                  <div
                    key={session.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      session.is_cancelled ? 'opacity-50 bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center bg-muted rounded-lg px-4 py-2 min-w-[80px]">
                      <span className="text-xs text-muted-foreground">{t('table.session')}</span>
                      <span className="text-2xl font-bold">{index + 1}</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(session.date)}</span>
                        {session.is_cancelled && (
                          <Badge variant="destructive">{t('cancelled')}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        {session.location_override && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {session.location_override}
                          </span>
                        )}
                      </div>
                      {session.courts && session.courts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {session.courts.map(c => (
                            <Badge key={c.id} variant="secondary" className="text-xs">
                              {getCourtLabel(c.court)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {session.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{session.notes}</p>
                      )}
                    </div>

                    {!session.is_cancelled && (
                      <div className="flex items-center gap-2">
                        {isDraft ? (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteClick(session)}
                            title={t('actions.delete')}
                            disabled={isDeleting}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCancelClick(session)}
                            title={t('actions.cancel')}
                            disabled={isCancelling}
                          >
                            <X className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error display */}
      {error && !isAddDialogOpen && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Cancel Session Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.confirmCancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('actions.confirmCancelDescription', {
                number: sessionToActOn
                  ? sessions
                      .sort((a, b) => {
                        const dateCompare = a.date.localeCompare(b.date);
                        if (dateCompare !== 0) return dateCompare;
                        return a.start_time.localeCompare(b.start_time);
                      })
                      .findIndex(s => s.id === sessionToActOn.id) + 1
                  : 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('actions.cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Session Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('actions.confirmDeleteDescription', {
                number: sessionToActOn
                  ? sessions
                      .sort((a, b) => {
                        const dateCompare = a.date.localeCompare(b.date);
                        if (dateCompare !== 0) return dateCompare;
                        return a.start_time.localeCompare(b.start_time);
                      })
                      .findIndex(s => s.id === sessionToActOn.id) + 1
                  : 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
