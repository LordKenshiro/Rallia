/**
 * Organization-branded Email Templates
 * Renders emails with organization branding for booking, member, and payment notifications.
 */

import type { NotificationRecord, OrganizationInfo, OrgNotificationType } from '../types.ts';

export interface EmailContent {
  subject: string;
  html: string;
}

/**
 * Format currency amount from cents
 */
function formatCurrency(cents: number | undefined, currency: string = 'CAD'): string {
  if (cents === undefined) return '';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Get notification category for styling
 */
function getNotificationCategory(
  type: OrgNotificationType
): 'booking' | 'member' | 'payment' | 'system' {
  if (type.startsWith('booking_')) return 'booking';
  if (type.includes('member') || type === 'membership_approved') return 'member';
  if (type.includes('payment') || type === 'refund_processed') return 'payment';
  return 'system';
}

/**
 * Get accent color based on notification category
 */
function getCategoryColor(category: 'booking' | 'member' | 'payment' | 'system'): string {
  switch (category) {
    case 'booking':
      return '#4DB8A8'; // Teal
    case 'member':
      return '#2196F3'; // Blue
    case 'payment':
      return '#4CAF50'; // Green
    case 'system':
    default:
      return '#607D8B'; // Blue Grey
  }
}

/**
 * Generate booking details card
 */
function generateBookingCard(payload: Record<string, unknown>, accentColor: string): string {
  const courtName = payload.courtName as string | undefined;
  const facilityName = payload.facilityName as string | undefined;
  const bookingDate = payload.bookingDate as string | undefined;
  const startTime = payload.startTime as string | undefined;
  const endTime = payload.endTime as string | undefined;
  const playerName = payload.playerName as string | undefined;
  const priceCents = payload.priceCents as number | undefined;
  const currency = (payload.currency as string) || 'CAD';

  if (!courtName && !bookingDate) return '';

  const rows: string[] = [];

  if (courtName) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">Court</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">${escapeHtml(courtName)}</td>
      </tr>
    `);
  }

  if (facilityName) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">Location</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">📍 ${escapeHtml(facilityName)}</td>
      </tr>
    `);
  }

  if (bookingDate) {
    const timeStr = startTime && endTime ? `${startTime} - ${endTime}` : startTime || '';
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">When</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">📅 ${escapeHtml(bookingDate)}${timeStr ? ` at ${timeStr}` : ''}</td>
      </tr>
    `);
  }

  if (playerName) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">Player</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">👤 ${escapeHtml(playerName)}</td>
      </tr>
    `);
  }

  if (priceCents !== undefined) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">Amount</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">💵 ${formatCurrency(priceCents, currency)}</td>
      </tr>
    `);
  }

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${accentColor}15; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${accentColor};">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${rows.join('')}
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate payment details card
 */
function generatePaymentCard(payload: Record<string, unknown>, accentColor: string): string {
  const amountCents = payload.amountCents as number | undefined;
  const currency = (payload.currency as string) || 'CAD';
  const playerName = payload.playerName as string | undefined;
  const failureReason = payload.failureReason as string | undefined;

  if (amountCents === undefined) return '';

  const rows: string[] = [];

  rows.push(`
    <tr>
      <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">Amount</td>
      <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">💵 ${formatCurrency(amountCents, currency)}</td>
    </tr>
  `);

  if (playerName) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">From</td>
        <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 500;">👤 ${escapeHtml(playerName)}</td>
      </tr>
    `);
  }

  if (failureReason) {
    rows.push(`
      <tr>
        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;">Reason</td>
        <td style="padding: 8px 0; color: #F44336; font-size: 14px; font-weight: 500;">⚠️ ${escapeHtml(failureReason)}</td>
      </tr>
    `);
  }

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${accentColor}15; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${accentColor};">
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${rows.join('')}
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate action button
 */
function generateActionButton(type: OrgNotificationType, accentColor: string): string {
  let buttonText = 'View Details';
  let deepLink = 'rallia://dashboard';

  switch (type) {
    case 'booking_created':
    case 'booking_cancelled_by_player':
    case 'booking_modified':
    case 'booking_confirmed':
    case 'booking_reminder':
    case 'booking_cancelled_by_org':
      buttonText = 'View Booking';
      deepLink = 'rallia://dashboard/bookings';
      break;
    case 'new_member_joined':
    case 'member_left':
    case 'member_role_changed':
    case 'membership_approved':
      buttonText = 'View Members';
      deepLink = 'rallia://dashboard/members';
      break;
    case 'payment_received':
    case 'payment_failed':
    case 'refund_processed':
      buttonText = 'View Payments';
      deepLink = 'rallia://dashboard/payments';
      break;
    case 'daily_summary':
    case 'weekly_report':
      buttonText = 'View Report';
      deepLink = 'rallia://dashboard/reports';
      break;
    case 'org_announcement':
      buttonText = 'View Announcement';
      break;
  }

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
      <tr>
        <td style="border-radius: 8px; background-color: ${accentColor};">
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

/**
 * Render organization-branded email
 */
export function renderOrgEmail(
  notification: NotificationRecord,
  organization: OrganizationInfo
): EmailContent {
  const { title, body, type, payload } = notification;
  const category = getNotificationCategory(type as OrgNotificationType);
  const accentColor = getCategoryColor(category);

  // Generate subject with organization name
  const subject = `[${organization.name}] ${title}`;

  // Determine which details card to show
  let detailsCard = '';
  if (category === 'booking') {
    detailsCard = generateBookingCard(payload, accentColor);
  } else if (category === 'payment') {
    detailsCard = generatePaymentCard(payload, accentColor);
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header with organization branding -->
          <tr>
            <td style="background-color: ${accentColor}; padding: 24px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      ${escapeHtml(organization.name)}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #333333; font-size: 22px; font-weight: 600;">
                ${escapeHtml(title)}
              </h2>
              ${
                body
                  ? `
              <p style="margin: 0 0 16px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                ${escapeHtml(body)}
              </p>
              `
                  : ''
              }
              
              ${detailsCard}
              
              ${generateActionButton(type as OrgNotificationType, accentColor)}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f5f5f5; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                You received this email because you are a member of ${escapeHtml(organization.name)}.
                <br>
                <a href="rallia://dashboard/settings/notifications" style="color: ${accentColor}; text-decoration: none;">Manage notification preferences</a>
                ${organization.website ? `<br><a href="${organization.website}" style="color: ${accentColor}; text-decoration: none;">${organization.website}</a>` : ''}
              </p>
              <p style="margin: 16px 0 0 0; color: #999999; font-size: 11px; text-align: center;">
                Powered by Rallia
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

  return { subject, html };
}

export default renderOrgEmail;
