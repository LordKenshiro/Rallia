import type { EmailContent, InvitationEmailPayload } from '../types.ts';

export function renderInvitationEmail(payload: InvitationEmailPayload): EmailContent {
  const currentYear = new Date().getFullYear();
  const roleDisplay = payload.adminRole ? `${payload.role} (${payload.adminRole})` : payload.role;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join Rallia</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;500;600&display=swap');
  </style>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="background: linear-gradient(120deg, #f0fdfa 0%, #fef3c7 40%, #fdf0f0 75%, #ccfbf1 100%); border-radius: 10px; padding: 40px 30px; margin-bottom: 30px;">
    <h1 style="font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 28px; line-height: 1.2; letter-spacing: -0.05em; color: #0d9488; margin: 0 0 20px 0; padding: 0;">You're Invited to Join Rallia</h1>
    <p style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 16px;">You've been invited to join Rallia as a <strong style="color: #0d9488;">${roleDisplay}</strong> by <strong style="color: #0d9488;">${payload.inviterName}</strong>!</p>
    <p style="color: #6b7280; margin: 0 0 30px 0; font-size: 16px;">Click the button below to accept your invitation and create your account or copy and paste the link below into your browser:</p>
    <div style="margin: 30px 0; text-align: center;">
      <a href="${payload.signUpUrl}" style="display: inline-block; background: linear-gradient(135deg, #ed6a6d 0%, #be5557 50%, #ed6a6d 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.1);">Accept Invitation</a>
    </div>
  </div>
  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
    <p style="word-break: break-all; color: #6b7280; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">${payload.signUpUrl}</p>
    <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.6;">This invitation will expire on <strong style="color: #1a1a1a;">${payload.expiresAt}</strong>.</p>
  </div>
  <p style="color: #6b7280; font-size: 12px; margin: 40px 0 16px 0; text-align: center;">If you didn't request this invitation, you can safely ignore this email.</p>
  <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">© ${currentYear} Rallia. All rights reserved.</p>
</body>
</html>
  `.trim();

  return {
    subject: "You're Invited to Join Rallia",
    html,
  };
}
