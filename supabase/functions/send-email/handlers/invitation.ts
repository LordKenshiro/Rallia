import { createClient } from '@supabase/supabase-js';
import { InvitationRecordSchema } from '../schemas.ts';
import { renderInvitationEmail } from '../templates/invitation.ts';
import type { EmailContent, InvitationEmailPayload, InvitationRecord } from '../types.ts';

export class InvitationHandler {
  validate(payload: unknown): InvitationRecord {
    return InvitationRecordSchema.parse(payload);
  }

  async getRecipient(record: InvitationRecord): Promise<string> {
    if (!record.email) {
      throw new Error('Email is required for invitation emails');
    }
    return record.email;
  }

  async getContent(record: InvitationRecord): Promise<EmailContent> {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch inviter profile to get name
    const { data: inviterProfile, error: inviterError } = await supabase
      .from('profile')
      .select('first_name, last_name, display_name')
      .eq('id', record.inviter_id)
      .single();

    if (inviterError) {
      console.error('Error fetching inviter profile:', inviterError);
      throw new Error('Failed to fetch inviter information');
    }

    const inviterName =
      inviterProfile?.display_name ||
      (inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : inviterProfile?.first_name) ||
      'a team member';

    // Construct sign-up URL
    const baseUrl =
      Deno.env.get('NEXT_PUBLIC_BASE_URL') ||
      Deno.env.get('NEXT_PUBLIC_SITE_URL') ||
      'https://www.rallia.ca';
    const rolePath = record.role === 'admin' ? 'admin/sign-in' : 'sign-in';
    const signUpUrl = `${baseUrl}/${rolePath}?token=${record.token}`;

    // Format expiration date
    const expiresAt = new Date(record.expires_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Build processed payload
    const payload: InvitationEmailPayload = {
      type: 'invitation',
      email: record.email!,
      role: record.role,
      adminRole: record.admin_role || undefined,
      signUpUrl,
      inviterName,
      expiresAt,
    };

    return renderInvitationEmail(payload);
  }
}
