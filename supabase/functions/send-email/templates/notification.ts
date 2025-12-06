import type { EmailContent, NotificationEmailPayload } from '../types.ts';

export function renderNotificationEmail(payload: NotificationEmailPayload): EmailContent {
  const currentYear = new Date().getFullYear();

  // Map notification types to more user-friendly subject prefixes
  const subjectPrefixes: Record<NotificationEmailPayload['notificationType'], string> = {
    match_invitation: 'Match Invitation',
    reminder: 'Reminder',
    payment: 'Payment',
    support: 'Support',
    chat: 'New Message',
    system: 'System Notification',
  };

  const subjectPrefix = subjectPrefixes[payload.notificationType];
  const subject = `${subjectPrefix}: ${payload.title}`;

  // Map notification types to accent colors
  const typeColors: Record<NotificationEmailPayload['notificationType'], string> = {
    match_invitation: '#0d9488', // Primary teal
    reminder: '#f59e0b', // Accent gold
    payment: '#ed6a6d', // Secondary coral
    support: '#0d9488', // Primary teal
    chat: '#0d9488', // Primary teal
    system: '#6b7280', // Muted gray
  };

  const accentColor = typeColors[payload.notificationType];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;500;600&display=swap');
  </style>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="background: linear-gradient(120deg, #f0fdfa 0%, #fef3c7 40%, #fdf0f0 75%, #ccfbf1 100%); border-radius: 10px; padding: 40px 30px; margin-bottom: 30px;">
    <h1 style="font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 28px; line-height: 1.2; letter-spacing: -0.05em; color: ${accentColor}; margin: 0 0 20px 0; padding: 0;">${
      payload.title
    }</h1>
    ${
      payload.body
        ? `<div style="color: #1a1a1a; margin: 0; font-size: 16px; line-height: 1.6;">${payload.body}</div>`
        : ''
    }
  </div>
  <p style="color: #6b7280; font-size: 12px; margin: 40px 0 0 0; text-align: center;">© ${currentYear} Rallia. All rights reserved.</p>
</body>
</html>
  `.trim();

  return {
    subject,
    html,
  };
}
