'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ArrowUp, Clock, Loader2, Mail, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface WaitlistEntry {
  id: string;
  position: number;
  promoted_at: string | null;
  promotion_expires_at: string | null;
  created_at: string;
  player?: {
    id: string;
    username: string;
    profile?: {
      first_name: string | null;
      last_name: string | null;
      display_name: string | null;
      email: string;
    };
  };
}

function formatDate(dateString: string): string {
  // Append T00:00:00 to parse as local date, not UTC
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WaitlistPage() {
  const params = useParams();
  const t = useTranslations('programs.waitlist');
  const tCommon = useTranslations('common');
  const programId = params.id as string;

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<{ name: string } | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [entryToPromote, setEntryToPromote] = useState<WaitlistEntry | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [waitlistRes, programRes] = await Promise.all([
        fetch(`/api/programs/${programId}/waitlist`),
        fetch(`/api/programs/${programId}`),
      ]);

      if (waitlistRes.ok) {
        const data = await waitlistRes.json();
        setWaitlist(data.data || []);
      }

      if (programRes.ok) {
        const data = await programRes.json();
        setProgram({ name: data.name });
      }
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePromoteClick = (entry: WaitlistEntry) => {
    setEntryToPromote(entry);
    setPromoteDialogOpen(true);
  };

  const handlePromoteConfirm = async () => {
    if (!entryToPromote) return;

    setIsPromoting(true);
    setError(null);

    try {
      const response = await fetch(`/api/programs/${programId}/waitlist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waitlistId: entryToPromote.id,
          action: 'promote',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToPromote'));
      }

      setPromoteDialogOpen(false);
      setEntryToPromote(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToPromote'));
    } finally {
      setIsPromoting(false);
    }
  };

  const promotedCount = waitlist.filter(w => w.promoted_at).length;
  const waitingCount = waitlist.filter(w => !w.promoted_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-8">
      <div>
        <BackButton className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          {tCommon('back')}
        </BackButton>
        <h1 className="text-3xl font-bold mb-0">{t('title')}</h1>
        <p className="text-muted-foreground mb-0">{program?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">{t('stats.total')}</p>
                <p className="text-2xl font-bold mb-0">{waitlist.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="size-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">{t('stats.waiting')}</p>
                <p className="text-2xl font-bold mb-0">{waitingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ArrowUp className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">{t('stats.promoted')}</p>
                <p className="text-2xl font-bold mb-0">{promotedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waitlist Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{tCommon('optional')}</CardDescription>
        </CardHeader>
        <CardContent>
          {waitlist.length === 0 ? (
            <div className="text-center py-8">
              <Users className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t('noWaitlist')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t('table.position')}</TableHead>
                  <TableHead>{t('table.player')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.joinedAt')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist
                  .sort((a, b) => a.position - b.position)
                  .map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold">
                          {entry.position}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {entry.player?.profile?.display_name ||
                              (entry.player?.profile?.first_name && entry.player?.profile?.last_name
                                ? `${entry.player.profile.first_name} ${entry.player.profile.last_name}`
                                : entry.player?.profile?.first_name) ||
                              entry.player?.username ||
                              tCommon('user')}
                          </p>
                          {entry.player?.profile?.email && (
                            <p className="text-sm text-muted-foreground">
                              {entry.player.profile.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.promoted_at ? (
                          <div>
                            <Badge variant="default">{t('stats.promoted')}</Badge>
                            {entry.promotion_expires_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('table.expires')} {formatDateTime(entry.promotion_expires_at)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary">{t('stats.waiting')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!entry.promoted_at && entry.position === 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePromoteClick(entry)}
                            disabled={isPromoting}
                          >
                            {isPromoting ? (
                              <Loader2 className="mr-2 size-3 animate-spin" />
                            ) : (
                              <Mail className="mr-2 size-3" />
                            )}
                            {t('actions.promote')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Promote Confirmation Dialog */}
      <AlertDialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.confirmPromoteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('actions.confirmPromoteDescription', {
                name:
                  entryToPromote?.player?.profile?.display_name ||
                  entryToPromote?.player?.username ||
                  tCommon('user'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPromoting}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromoteConfirm} disabled={isPromoting}>
              {isPromoting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('actions.promote')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
