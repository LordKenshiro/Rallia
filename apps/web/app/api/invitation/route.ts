import { getAdminRole } from '@/lib/supabase/check-admin';
import { createClient } from '@/lib/supabase/server';
import { generateUrlSafeToken } from '@/utils/invitation';
import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';

const RequestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['player', 'admin', 'organization_member']),
  adminRole: z.enum(['super_admin', 'moderator', 'support']).optional(),
  source: z
    .enum(['manual', 'auto_match', 'invite_list', 'mailing_list', 'growth_prompt'])
    .optional(),
  expiresAt: z.string().optional(),
});

export async function POST(Request: NextRequest) {
  console.log('[INVITATION-API] ====== POST /api/invitation START ======');

  try {
    const supabase = await createClient();
    console.log('[INVITATION-API] Supabase client created');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[INVITATION-API] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message || null,
    });

    if (authError || !user) {
      console.log('[INVITATION-API] RESPONSE: 401 Unauthorized (not authenticated)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminRole = await getAdminRole(user?.id);
    console.log('[INVITATION-API] Admin role check:', {
      userId: user.id,
      adminRole: adminRole,
      isSuperAdmin: adminRole === 'super_admin',
    });

    if (!adminRole || adminRole !== 'super_admin') {
      console.log('[INVITATION-API] RESPONSE: 401 Unauthorized (not super_admin)');
      return NextResponse.json(
        { error: 'You are not authorized to create invitations' },
        { status: 401 }
      );
    }

    const json = await Request.json();
    console.log('[INVITATION-API] Request body:', {
      email: json.email,
      phone: json.phone,
      role: json.role,
      adminRole: json.adminRole,
      source: json.source,
      expiresAt: json.expiresAt,
    });

    const data = RequestSchema.parse(json);
    console.log('[INVITATION-API] Request validated successfully');

    if (!data.email && !data.phone) {
      console.log('[INVITATION-API] RESPONSE: 400 Bad Request (no email or phone)');
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
    }

    // Generate invitation token
    const token = generateUrlSafeToken();
    console.log('[INVITATION-API] Token generated:', token.substring(0, 8) + '...');

    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    console.log('[INVITATION-API] Creating invitation with:', {
      email: data.email,
      phone: data.phone,
      role: data.role,
      admin_role: data.adminRole,
      inviter_id: user.id,
      expires_at: expiresAt,
    });

    // Create invitation in database
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        email: data.email,
        phone: data.phone,
        role: data.role,
        admin_role: data.adminRole,
        token,
        inviter_id: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (invitationError) {
      console.error('[INVITATION-API] Database error creating invitation:', {
        message: invitationError.message,
        details: invitationError.details,
        code: invitationError.code,
        hint: invitationError.hint,
      });
      console.log('[INVITATION-API] RESPONSE: 500 Internal Server Error');
      return NextResponse.json(
        { error: invitationError.message || 'Failed to create invitation' },
        { status: 500 }
      );
    }

    console.log('[INVITATION-API] Invitation created successfully:', {
      id: invitation?.id,
      email: invitation?.email,
      role: invitation?.role,
      admin_role: invitation?.admin_role,
      status: invitation?.status,
      expires_at: invitation?.expires_at,
    });

    console.log('[INVITATION-API] RESPONSE: 200 OK');
    console.log('[INVITATION-API] ====== POST /api/invitation END ======');

    return NextResponse.json(
      {
        success: true,
        invitation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[INVITATION-API] Unexpected error:', error);
    console.log('[INVITATION-API] RESPONSE: 500 Internal Server Error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
