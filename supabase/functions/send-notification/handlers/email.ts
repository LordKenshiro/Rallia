/**
 * Email Handler for Notification Delivery
 * Uses Resend API to send email notifications
 */

import type { NotificationRecord, DeliveryResult } from '../types.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@rallia.com';

/**
 * Sport-specific colors for email theming
 */
const SPORT_COLORS: Record<string, { primary: string; accent: string; emoji: string }> = {
  tennis: { primary: '#4DB8A8', accent: '#e6f7f4', emoji: '🎾' },
  pickleball: { primary: '#F59E0B', accent: '#fef3c7', emoji: '' },
  badminton: { primary: '#8B5CF6', accent: '#ede9fe', emoji: '🏸' },
  default: { primary: '#4DB8A8', accent: '#e6f7f4', emoji: '🏃' },
};

/**
 * Get sport theme colors
 */
function getSportTheme(sportName?: string): { primary: string; accent: string; emoji: string } {
  if (!sportName) return SPORT_COLORS.default;
  const normalized = sportName.toLowerCase().trim();
  return SPORT_COLORS[normalized] || SPORT_COLORS.default;
}

/**
 * Generate email subject with sport context
 */
function generateEmailSubject(notification: NotificationRecord): string {
  const { title, type, payload } = notification;
  const sportName = (payload as Record<string, unknown>)?.sportName as string | undefined;
  const theme = getSportTheme(sportName);

  // Add sport context to match-related emails
  // Keep sport name lowercase as per user preference
  if (type.startsWith('match_') || type === 'feedback_request' || type === 'reminder') {
    if (sportName) {
      const normalizedSport = sportName.toLowerCase().trim();
      return `${theme.emoji} [${normalizedSport}] ${title}`;
    }
  }

  return title;
}

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
    const subject = generateEmailSubject(notification);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipientEmail,
        subject,
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
 * Generate match details card for match-related emails
 */
function generateMatchDetailsCard(
  payload: Record<string, unknown>,
  theme: { primary: string; accent: string; emoji: string }
): string {
  const sportName = payload.sportName as string | undefined;
  const matchDate = payload.matchDate as string | undefined;
  const startTime = payload.startTime as string | undefined;
  const locationName = payload.locationName as string | undefined;
  const playerName = payload.playerName as string | undefined;

  // Don't show card if no details available
  if (!matchDate && !locationName && !playerName) {
    return '';
  }

  const detailRows: string[] = [];

  if (sportName) {
    detailRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">Sport</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">${theme.emoji} ${escapeHtml(sportName)}</td>
      </tr>
    `);
  }

  if (matchDate) {
    const dateLabel = startTime ? `${matchDate} at ${startTime}` : matchDate;
    detailRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">When</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">📅 ${escapeHtml(dateLabel)}</td>
      </tr>
    `);
  }

  if (locationName) {
    detailRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">Where</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">📍 ${escapeHtml(locationName)}</td>
      </tr>
    `);
  }

  if (playerName) {
    detailRows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 100px;">With</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">👤 ${escapeHtml(playerName)}</td>
      </tr>
    `);
  }

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${theme.accent}; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${detailRows.join('')}
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate HTML email content from notification
 */
function generateEmailHtml(notification: NotificationRecord): string {
  const { title, body, type, payload } = notification;

  // Get sport-specific theme
  const sportName = (payload as Record<string, unknown>)?.sportName as string | undefined;
  const theme = getSportTheme(sportName);

  const textColor = '#333333';
  const backgroundColor = '#f5f5f5';

  // Determine if we should show the match details card
  const isMatchRelated =
    type.startsWith('match_') || type === 'feedback_request' || type === 'reminder';
  const matchDetailsCard = isMatchRelated
    ? generateMatchDetailsCard(payload as Record<string, unknown>, theme)
    : '';

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
          <!-- Header with sport-specific color -->
          <tr>
            <td style="background-color: ${theme.primary}; padding: 24px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      Rallia
                    </h1>
                  </td>
                  ${
                    sportName
                      ? `
                  <td align="right">
                    <span style="font-size: 32px;">${theme.emoji}</span>
                  </td>
                  `
                      : ''
                  }
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: ${textColor}; font-size: 22px; font-weight: 600;">
                ${escapeHtml(title)}
              </h2>
              ${
                body
                  ? `
              <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 16px; line-height: 1.6;">
                ${escapeHtml(body)}
              </p>
              `
                  : ''
              }
              
              ${matchDetailsCard}
              
              ${generateActionButton(type, payload, theme.primary)}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${backgroundColor}; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                You received this email because of your notification preferences on Rallia.
                <br>
                <a href="rallia://settings/notifications" style="color: ${theme.primary}; text-decoration: none;">Manage preferences</a>
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
function generateActionButton(
  type: string,
  payload: Record<string, unknown>,
  primaryColor: string = '#4DB8A8'
): string {
  // Determine button text and deep link based on notification type
  let buttonText = 'Open Rallia';
  let deepLink = 'rallia://';

  switch (type) {
    case 'match_invitation':
      buttonText = 'View Invitation';
      if (payload.matchId) deepLink = `rallia://match/${payload.matchId}`;
      break;
    case 'match_join_request':
      buttonText = 'Review Request';
      if (payload.matchId) deepLink = `rallia://match/${payload.matchId}/requests`;
      break;
    case 'match_join_accepted':
    case 'match_join_rejected':
    case 'match_player_joined':
    case 'match_cancelled':
    case 'match_updated':
    case 'match_starting_soon':
    case 'match_completed':
    case 'player_kicked':
    case 'player_left':
      buttonText = 'View Game';
      if (payload.matchId) deepLink = `rallia://match/${payload.matchId}`;
      break;
    case 'feedback_request':
      buttonText = 'Rate Your Game';
      if (payload.matchId) deepLink = `rallia://match/${payload.matchId}/feedback`;
      break;
    case 'reminder':
      buttonText = 'View Game Details';
      if (payload.matchId) deepLink = `rallia://match/${payload.matchId}`;
      break;
    case 'new_message':
    case 'chat':
      buttonText = 'View Message';
      if (payload.conversationId) deepLink = `rallia://chat/${payload.conversationId}`;
      break;
    case 'friend_request':
      buttonText = 'View Profile';
      if (payload.playerId) deepLink = `rallia://player/${payload.playerId}`;
      break;
    case 'rating_verified':
      buttonText = 'View Rating';
      deepLink = 'rallia://profile/ratings';
      break;
    default:
      buttonText = 'Open Rallia';
      deepLink = 'rallia://';
  }

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
      <tr>
        <td style="border-radius: 8px; background-color: ${primaryColor};">
          <a href="${deepLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
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
