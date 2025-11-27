import { isAdmin } from '@/lib/supabase/check-admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminPostAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  console.log('[POST-AUTH] ====== AdminPostAuthPage START ======');

  const supabase = await createClient();
  console.log('[POST-AUTH] Supabase client created');

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log('[POST-AUTH] Auth check result:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    authError: authError?.message || null,
  });

  // If not authenticated, redirect to admin sign-in
  if (authError || !user) {
    console.log('[POST-AUTH] REDIRECT: /admin/sign-in (not authenticated)');
    redirect('/admin/sign-in');
  }

  // Get token query parameter
  const params = await searchParams;
  const token = params.token;
  console.log(
    '[POST-AUTH] Token from searchParams:',
    token ? `${token.substring(0, 8)}...` : 'NO TOKEN'
  );

  if (token) {
    console.log('[POST-AUTH] Processing invitation token flow');

    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    console.log('[POST-AUTH] Invitation fetch result:', {
      hasInvitation: !!invitation,
      invitationId: invitation?.id,
      invitationEmail: invitation?.email,
      invitationRole: invitation?.role,
      invitationAdminRole: invitation?.admin_role,
      invitationStatus: invitation?.status,
      invitationExpiresAt: invitation?.expires_at,
      invitationRevokedAt: invitation?.revoked_at,
      invitationError: invitationError?.message || null,
    });

    if (invitationError) {
      console.error('[POST-AUTH] Error fetching invitation:', invitationError);
      console.log('[POST-AUTH] REDIRECT: /admin/sign-in?error=invitation_not_found');
      redirect('/admin/sign-in?error=invitation_not_found');
    }

    if (!invitation) {
      console.log(
        '[POST-AUTH] REDIRECT: /admin/sign-in?error=invitation_not_found (no invitation data)'
      );
      redirect('/admin/sign-in?error=invitation_not_found');
    }

    // Validate invitation email matches user email
    console.log('[POST-AUTH] Email comparison:', {
      invitationEmail: invitation.email,
      userEmail: user.email,
      match: invitation.email === user.email,
    });

    if (invitation.email !== user.email) {
      console.error('[POST-AUTH] Invitation email does not match user email');
      console.log('[POST-AUTH] REDIRECT: /admin/sign-in?error=email_mismatch');
      redirect('/admin/sign-in?error=email_mismatch');
    }

    // Check if invitation has been revoked
    if (invitation.revoked_at) {
      console.error('[POST-AUTH] Invitation has been revoked at:', invitation.revoked_at);
      console.log('[POST-AUTH] REDIRECT: /admin/sign-in?error=invitation_revoked');
      redirect('/admin/sign-in?error=invitation_revoked');
    }

    // Check if invitation has expired
    const now = new Date().toISOString();
    console.log('[POST-AUTH] Expiry check:', {
      expiresAt: invitation.expires_at,
      now: now,
      isExpired: invitation.expires_at < now,
    });

    if (invitation.expires_at < now) {
      console.error('[POST-AUTH] Invitation has expired');
      console.log('[POST-AUTH] REDIRECT: /admin/sign-in?error=invitation_expired');
      redirect('/admin/sign-in?error=invitation_expired');
    }

    // Check if invitation has already been accepted
    if (invitation.status === 'accepted') {
      console.log('[POST-AUTH] Invitation already accepted, checking if user is admin');
      const userIsAdmin = await isAdmin(user.id);
      console.log('[POST-AUTH] isAdmin check result:', userIsAdmin);
      const redirectPath = userIsAdmin
        ? '/admin/dashboard'
        : '/admin/sign-in?error=already_accepted';
      console.log('[POST-AUTH] REDIRECT:', redirectPath);
      redirect(redirectPath);
    }

    // Only accept pending or sent invitations
    console.log('[POST-AUTH] Invitation status check:', {
      status: invitation.status,
      isValidStatus: invitation.status === 'pending' || invitation.status === 'sent',
    });

    if (invitation.status !== 'pending' && invitation.status !== 'sent') {
      console.error('[POST-AUTH] Invitation is not in a valid state:', invitation.status);
      console.log('[POST-AUTH] REDIRECT: /admin/sign-in?error=invalid_invitation_status');
      redirect('/admin/sign-in?error=invalid_invitation_status');
    }

    // Process admin invitation
    console.log('[POST-AUTH] Role check:', {
      role: invitation.role,
      adminRole: invitation.admin_role,
      isAdminInvitation: invitation.role === 'admin' && invitation.admin_role,
    });

    if (invitation.role === 'admin' && invitation.admin_role) {
      console.log('[POST-AUTH] Processing admin invitation');

      // First check if admin already exists
      const { data: existingAdmin, error: existingAdminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('[POST-AUTH] Existing admin check:', {
        hasExistingAdmin: !!existingAdmin,
        existingAdminRole: existingAdmin?.role,
        error: existingAdminError?.message || null,
      });

      if (existingAdmin) {
        console.log('[POST-AUTH] Admin already exists, updating invitation status');

        const { error: updateError } = await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            invited_user_id: user.id,
          })
          .eq('id', invitation.id);

        if (updateError) {
          console.error('[POST-AUTH] Error updating invitation status:', updateError);
        } else {
          console.log('[POST-AUTH] Invitation status updated successfully');
        }

        console.log('[POST-AUTH] REDIRECT: /admin/dashboard (existing admin)');
        redirect('/admin/dashboard');
      }

      // Create new admin record
      console.log('[POST-AUTH] Creating new admin record with role:', invitation.admin_role);

      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .insert({
          id: user.id,
          role: invitation.admin_role,
        })
        .select()
        .single();

      console.log('[POST-AUTH] Admin creation result:', {
        success: !!admin,
        adminId: admin?.id,
        adminRole: admin?.role,
        error: adminError?.message || null,
        errorDetails: adminError?.details || null,
        errorCode: adminError?.code || null,
      });

      if (adminError) {
        console.error('[POST-AUTH] Error creating admin:', adminError);
        console.log('[POST-AUTH] REDIRECT: /admin/sign-in?error=admin_creation_failed');
        redirect('/admin/sign-in?error=admin_creation_failed');
      }

      if (admin) {
        console.log('[POST-AUTH] Admin created successfully, updating invitation status');

        const { error: updateError } = await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            invited_user_id: user.id,
          })
          .eq('id', invitation.id);

        if (updateError) {
          console.error('[POST-AUTH] Error updating invitation status:', updateError);
        } else {
          console.log('[POST-AUTH] Invitation status updated successfully');
        }

        console.log('[POST-AUTH] REDIRECT: /admin/dashboard (new admin created)');
        redirect('/admin/dashboard');
      }
    }

    // If we reach here, the invitation exists but doesn't match expected criteria
    console.log('[POST-AUTH] Fell through all conditions - invalid invitation');
    console.log('[POST-AUTH] REDIRECT: /admin/sign-in?error=invalid_invitation');
    redirect('/admin/sign-in?error=invalid_invitation');
  }

  // No token provided, check if user is already an admin
  console.log('[POST-AUTH] No token provided, checking if user is already an admin');
  const userIsAdmin = await isAdmin(user.id);
  console.log('[POST-AUTH] isAdmin check result:', userIsAdmin);

  // If not an admin, redirect to regular sign-in
  if (!userIsAdmin) {
    console.log('[POST-AUTH] User is not an admin, signing out');
    await supabase.auth.signOut();
    console.log('[POST-AUTH] REDIRECT: /admin/sign-in?error=not_admin');
    redirect('/admin/sign-in?error=not_admin');
  }

  // User is authenticated and is an admin, redirect to dashboard
  console.log('[POST-AUTH] User is authenticated admin');
  console.log('[POST-AUTH] REDIRECT: /admin/dashboard');
  console.log('[POST-AUTH] ====== AdminPostAuthPage END ======');
  redirect('/admin/dashboard');
}
