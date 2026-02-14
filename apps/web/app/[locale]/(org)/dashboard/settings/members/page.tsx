'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/components/organization-context';
import {
  Clock,
  Crown,
  Loader2,
  Mail,
  MoreHorizontal,
  Shield,
  User,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

// Use member_role enum values from the database
// owner, admin, manager, staff, member
type Role = 'owner' | 'admin' | 'manager' | 'staff' | 'member';
type InviteRole = 'admin' | 'manager' | 'staff' | 'member';

interface Member {
  id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  profile: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string;
    profile_picture_url: string | null;
  } | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
  metadata: { org_role?: string } | null;
  inviter: { display_name: string | null } | null;
}

export default function MembersPage() {
  const t = useTranslations('settings');
  const supabase = createClient();
  const { selectedOrganization, isLoading: orgLoading } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [removingMember, setRemovingMember] = useState<Member | null>(null);
  const [changingRole, setChangingRole] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<Role>('staff');
  const [isProcessing, setIsProcessing] = useState(false);

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('staff');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const fetchPendingInvitations = async (orgId: string) => {
    try {
      const response = await fetch(`/api/org/members/invite?organizationId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  };

  useEffect(() => {
    async function fetchMembers() {
      if (orgLoading) return;

      if (!selectedOrganization) {
        setError(t('members.noOrganization'));
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError(t('members.notAuthenticated'));
          setLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        // Get user's role in the selected organization
        const { data: membership, error: membershipError } = await supabase
          .from('organization_member')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', selectedOrganization.id)
          .is('left_at', null)
          .single();

        if (membershipError || !membership) {
          setError(t('members.noOrganization'));
          setLoading(false);
          return;
        }

        setCurrentUserRole(membership.role as Role);

        // Fetch all members
        const { data: membersData, error: membersError } = await supabase
          .from('organization_member')
          .select(
            `
            id,
            user_id,
            role,
            joined_at
          `
          )
          .eq('organization_id', selectedOrganization.id)
          .is('left_at', null)
          .order('joined_at', { ascending: true });

        if (membersError) {
          console.error('Error fetching members:', membersError);
          setError(t('members.fetchError'));
          setLoading(false);
          return;
        }

        // Fetch profile data for each member
        const memberIds = membersData?.map(m => m.user_id) || [];
        const { data: profilesData } = await supabase
          .from('profile')
          .select('id, display_name, first_name, last_name, email, profile_picture_url')
          .in('id', memberIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const membersWithProfiles: Member[] = (membersData || []).map(m => ({
          ...m,
          role: m.role as Role,
          profile: profilesMap.get(m.user_id) || null,
        }));

        setMembers(membersWithProfiles);

        // Fetch pending invitations
        await fetchPendingInvitations(selectedOrganization.id);

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(t('members.fetchError'));
        setLoading(false);
      }
    }

    fetchMembers();
  }, [selectedOrganization, orgLoading, supabase, t]);

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'owner':
        return <Crown className="size-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="size-4 text-blue-500" />;
      case 'manager':
        return <Shield className="size-4 text-purple-500" />;
      default:
        return <User className="size-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const canManageRole = (memberRole: Role): boolean => {
    if (!currentUserRole) return false;
    if (currentUserRole === 'owner') return memberRole !== 'owner';
    if (currentUserRole === 'admin')
      return memberRole === 'manager' || memberRole === 'staff' || memberRole === 'member';
    return false;
  };

  const handleRemoveMember = async () => {
    if (!removingMember || !selectedOrganization) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('organization_member')
        .update({ left_at: new Date().toISOString() })
        .eq('id', removingMember.id);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== removingMember.id));
      setRemovingMember(null);
    } catch (err) {
      console.error('Error removing member:', err);
      setError(t('members.removeError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeRole = async () => {
    if (!changingRole || !selectedOrganization) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('organization_member')
        .update({ role: newRole as 'owner' | 'admin' | 'manager' | 'staff' | 'member' })
        .eq('id', changingRole.id);

      if (error) throw error;

      setMembers(prev => prev.map(m => (m.id === changingRole.id ? { ...m, role: newRole } : m)));
      setChangingRole(null);
    } catch (err) {
      console.error('Error changing role:', err);
      setError(t('members.roleChangeError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization || !inviteEmail || !inviteRole) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/org/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId: selectedOrganization.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('members.invite.error'));
      }

      setInviteSuccess(true);
      await fetchPendingInvitations(selectedOrganization.id);

      setTimeout(() => {
        setShowInviteDialog(false);
        setInviteEmail('');
        setInviteRole('staff');
        setInviteSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Invite error:', err);
      setInviteError(err instanceof Error ? err.message : t('members.invite.error'));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/org/members/invite?invitationId=${invitationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      }
    } catch (err) {
      console.error('Error revoking invitation:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-0">{t('members.title')}</h1>
          <p className="text-muted-foreground mb-0">{t('members.description')}</p>
        </div>
        {canInvite && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="mr-2 size-4" />
            {t('members.invite.button')}
          </Button>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              {t('members.pending.title')}
            </CardTitle>
            <CardDescription>
              {t('members.pending.description', { count: pendingInvitations.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      <Mail className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('members.pending.invitedAs', {
                          role: t(`members.roles.${invitation.metadata?.org_role || 'member'}`),
                        })}
                        {' · '}
                        {t('members.pending.expires', {
                          date: new Date(invitation.expires_at).toLocaleDateString(),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={invitation.status === 'expired' ? 'destructive' : 'secondary'}>
                      {invitation.status === 'expired'
                        ? t('members.pending.expired')
                        : t('members.pending.pending')}
                    </Badge>
                    {canInvite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('members.list.title')}</CardTitle>
          <CardDescription>
            {t('members.list.description', { count: members.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('members.list.member')}</TableHead>
                <TableHead>{t('members.list.role')}</TableHead>
                <TableHead>{t('members.list.joined')}</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                        {member.profile?.profile_picture_url ? (
                          <img
                            src={member.profile.profile_picture_url}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium mb-0">
                          {member.profile?.display_name ||
                            (member.profile?.first_name || member.profile?.last_name
                              ? `${member.profile.first_name || ''} ${member.profile.last_name || ''}`.trim()
                              : member.profile?.email) ||
                            t('members.list.unknownUser')}
                        </p>
                        <p className="text-sm text-muted-foreground mb-0">
                          {member.profile?.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(member.role)}
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {t(`members.roles.${member.role}`)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {canManageRole(member.role) && member.user_id !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setChangingRole(member);
                              setNewRole(member.role);
                            }}
                          >
                            <Shield className="mr-2 size-4" />
                            {t('members.actions.changeRole')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setRemovingMember(member)}
                          >
                            <UserMinus className="mr-2 size-4" />
                            {t('members.actions.remove')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Remove Member Dialog */}
      <Dialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('members.remove.title')}</DialogTitle>
            <DialogDescription>
              {t('members.remove.description', {
                name:
                  removingMember?.profile?.display_name ||
                  (removingMember?.profile?.first_name || removingMember?.profile?.last_name
                    ? `${removingMember.profile.first_name || ''} ${removingMember.profile.last_name || ''}`.trim()
                    : removingMember?.profile?.email) ||
                  t('members.list.unknownUser'),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              {t('members.remove.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('members.remove.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={!!changingRole} onOpenChange={() => setChangingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('members.changeRole.title')}</DialogTitle>
            <DialogDescription>
              {t('members.changeRole.description', {
                name:
                  changingRole?.profile?.display_name ||
                  (changingRole?.profile?.first_name || changingRole?.profile?.last_name
                    ? `${changingRole.profile.first_name || ''} ${changingRole.profile.last_name || ''}`.trim()
                    : changingRole?.profile?.email) ||
                  t('members.list.unknownUser'),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={value => setNewRole(value as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentUserRole === 'owner' && (
                  <SelectItem value="admin">{t('members.roles.admin')}</SelectItem>
                )}
                <SelectItem value="manager">{t('members.roles.manager')}</SelectItem>
                <SelectItem value="staff">{t('members.roles.staff')}</SelectItem>
                <SelectItem value="member">{t('members.roles.member')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangingRole(null)}>
              {t('members.changeRole.cancel')}
            </Button>
            <Button onClick={handleChangeRole} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('members.changeRole.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog
        open={showInviteDialog}
        onOpenChange={open => {
          if (!open) {
            setShowInviteDialog(false);
            setInviteEmail('');
            setInviteRole('staff');
            setInviteError(null);
            setInviteSuccess(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('members.invite.title')}</DialogTitle>
            <DialogDescription>{t('members.invite.description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            {inviteError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-200">
                {t('members.invite.success', { email: inviteEmail })}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="inviteEmail">{t('members.invite.emailLabel')}</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder={t('members.invite.emailPlaceholder')}
                required
                disabled={isInviting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteRole">{t('members.invite.roleLabel')}</Label>
              <Select
                value={inviteRole}
                onValueChange={value => setInviteRole(value as InviteRole)}
                disabled={isInviting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentUserRole === 'owner' && (
                    <SelectItem value="admin">{t('members.roles.admin')}</SelectItem>
                  )}
                  <SelectItem value="manager">{t('members.roles.manager')}</SelectItem>
                  <SelectItem value="staff">{t('members.roles.staff')}</SelectItem>
                  <SelectItem value="member">{t('members.roles.member')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('members.invite.roleHint')}</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                disabled={isInviting}
              >
                {t('members.invite.cancel')}
              </Button>
              <Button type="submit" disabled={isInviting || !inviteEmail}>
                {isInviting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 size-4" />
                )}
                {isInviting ? t('members.invite.sending') : t('members.invite.send')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
