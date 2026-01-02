/**
 * Email Handler for Notification Delivery
 * Uses Resend API to send email notifications
 */

import type { NotificationRecord, DeliveryResult } from '../types.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@rallia.com';

/**
 * Send an email notification via Resend
 */
export async function sendEmail(
  notification: NotificationRecord,
  recipientEmail: string
): Promise<DeliveryResult> {
  if (!RESEND_API_KEY) {
    return {
      channel: 'email',
      status: 'failed',
      errorMessage: 'RESEND_API_KEY not configured',
    };
  }

  try {
    const htmlContent = generateEmailHtml(notification);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipientEmail,
        subject: notification.title,
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        channel: 'email',
        status: 'failed',
        errorMessage: data?.message || data?.error || 'Failed to send email',
        providerResponse: data,
      };
    }

    return {
      channel: 'email',
      status: 'success',
      providerResponse: { id: data?.id },
    };
  } catch (error) {
    return {
      channel: 'email',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate HTML email content from notification
 */
function generateEmailHtml(notification: NotificationRecord): string {
  const { title, body, type, payload } = notification;

  // Get brand colors
  const primaryColor = '#4DB8A8';
  const textColor = '#333333';
  const backgroundColor = '#f5f5f5';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 24px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Rallia
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: ${textColor}; font-size: 20px; font-weight: 600;">
                ${escapeHtml(title)}
              </h2>
              ${
                body
                  ? `
              <p style="margin: 0 0 24px 0; color: ${textColor}; font-size: 16px; line-height: 1.6;">
                ${escapeHtml(body)}
              </p>
              `
                  : ''
              }
              
              ${generateActionButton(type, payload)}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${backgroundColor}; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                You received this email because of your notification preferences on Rallia.
                <br>
                <a href="#" style="color: ${primaryColor}; text-decoration: none;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate action button based on notification type
 */
function generateActionButton(type: string, payload: Record<string, unknown>): string {
  const primaryColor = '#4DB8A8';

  // Determine button text and deep link based on notification type
  let buttonText = 'Open Rallia';
  let deepLink = 'rallia://';

  if (type.startsWith('match_')) {
    buttonText = 'View Match';
    if (payload.matchId) {
      deepLink = `rallia://match/${payload.matchId}`;
    }
  } else if (type === 'new_message' || type === 'chat') {
    buttonText = 'View Message';
    if (payload.conversationId) {
      deepLink = `rallia://chat/${payload.conversationId}`;
    }
  } else if (type === 'friend_request') {
    buttonText = 'View Request';
  }

  return `
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>
        <td style="border-radius: 8px; background-color: ${primaryColor};">
          <a href="${deepLink}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">
            ${buttonText}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
}
