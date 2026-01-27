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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Check, Clock, DollarSign, Loader2, MoreHorizontal, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Registration {
  id: string;
  status: string;
  payment_plan: string;
  total_amount_cents: number;
  paid_amount_cents: number;
  currency: string;
  registered_at: string;
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

function formatPrice(cents: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  // Append T00:00:00 to parse as local date, not UTC
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'cancelled':
    case 'refunded':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default function RegistrationsPage() {
  const params = useParams();
  const t = useTranslations('programs.registrations');
  const tCommon = useTranslations('common');
  const programId = params.id as string;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<{ name: string; max_participants: number | null } | null>(
    null
  );
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [registrationToActOn, setRegistrationToActOn] = useState<Registration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const programRes = await fetch(`/api/programs/${programId}`);
      if (programRes.ok) {
        const data = await programRes.json();
        setProgram({ name: data.name, max_participants: data.max_participants });
        setRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleApproveClick(reg: Registration) {
    setRegistrationToActOn(reg);
    setApproveDialogOpen(true);
    setError(null);
  }

  function handleCancelClick(reg: Registration) {
    setRegistrationToActOn(reg);
    setCancelDialogOpen(true);
    setError(null);
  }

  async function handleUpdateStatus(status: 'confirmed' | 'cancelled') {
    if (!registrationToActOn) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/programs/${programId}/registrations/${registrationToActOn.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('errors.failedToUpdate'));
      }

      setApproveDialogOpen(false);
      setCancelDialogOpen(false);
      setRegistrationToActOn(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToUpdate'));
    } finally {
      setIsUpdating(false);
    }
  }

  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const totalRevenue = registrations
    .filter(r => r.status === 'confirmed')
    .reduce((sum, r) => sum + r.paid_amount_cents, 0);

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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Check className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">{t('stats.confirmed')}</p>
                <p className="text-2xl font-bold mb-0">
                  {confirmedCount}
                  {program?.max_participants && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{program.max_participants}
                    </span>
                  )}
                </p>
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
                <p className="text-sm text-muted-foreground mb-0">{t('status.pending')}</p>
                <p className="text-2xl font-bold mb-0">{pendingCount}</p>
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
                <p className="text-sm text-muted-foreground mb-0">{t('stats.total')}</p>
                <p className="text-2xl font-bold mb-0">{registrations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-0">{t('stats.revenue')}</p>
                <p className="text-2xl font-bold mb-0">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{tCommon('optional')}</CardDescription>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t('noRegistrations')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.player')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.paymentPlan')}</TableHead>
                  <TableHead>{t('table.amountPaid')}</TableHead>
                  <TableHead>{t('table.registeredAt')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map(reg => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {reg.player?.profile?.display_name ||
                            (reg.player?.profile?.first_name && reg.player?.profile?.last_name
                              ? `${reg.player.profile.first_name} ${reg.player.profile.last_name}`
                              : reg.player?.profile?.first_name) ||
                            reg.player?.username ||
                            t('unknownPlayer')}
                        </p>
                        {reg.player?.profile?.email && (
                          <p className="text-sm text-muted-foreground">
                            {reg.player.profile.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(reg.status)}>
                        {t(`status.${reg.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {t(`paymentPlan.${reg.payment_plan}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {formatPrice(reg.paid_amount_cents, reg.currency)}
                        </p>
                        {reg.paid_amount_cents < reg.total_amount_cents && (
                          <p className="text-xs text-muted-foreground">
                            {t('table.of')} {formatPrice(reg.total_amount_cents, reg.currency)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(reg.registered_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(reg.status === 'pending' || reg.status === 'confirmed') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isUpdating}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {reg.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleApproveClick(reg)}>
                                <Check className="mr-2 size-4" />
                                {t('actions.approve')}
                              </DropdownMenuItem>
                            )}
                            {(reg.status === 'pending' || reg.status === 'confirmed') && (
                              <DropdownMenuItem
                                onClick={() => handleCancelClick(reg)}
                                className="text-destructive focus:text-destructive"
                              >
                                <X className="mr-2 size-4" />
                                {t('actions.cancel')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.confirmApproveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('actions.confirmApproveDescription', {
                name:
                  registrationToActOn?.player?.profile?.display_name ||
                  registrationToActOn?.player?.username ||
                  tCommon('user'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleUpdateStatus('confirmed')}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('actions.approve')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.confirmCancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('actions.confirmCancelDescription', {
                name:
                  registrationToActOn?.player?.profile?.display_name ||
                  registrationToActOn?.player?.username ||
                  tCommon('user'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleUpdateStatus('cancelled')}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('actions.cancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
