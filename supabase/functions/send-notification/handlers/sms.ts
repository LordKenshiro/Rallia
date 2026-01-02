/**
 * SMS Handler for Notification Delivery
 * Uses Twilio API to send SMS notifications
 */

import type { NotificationRecord, DeliveryResult } from '../types.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

/**
 * Send an SMS notification via Twilio
 */
export async function sendSms(
  notification: NotificationRecord,
  recipientPhone: string
): Promise<DeliveryResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return {
      channel: 'sms',
      status: 'failed',
      errorMessage: 'Twilio credentials not configured',
    };
  }

  try {
    const messageBody = formatSmsMessage(notification);

    // Twilio API URL
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    // Build form data
    const formData = new URLSearchParams();
    formData.append('To', recipientPhone);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Body', messageBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        channel: 'sms',
        status: 'failed',
        errorMessage: data?.message || 'Failed to send SMS',
        providerResponse: data,
      };
    }

    return {
      channel: 'sms',
      status: 'success',
      providerResponse: {
        sid: data?.sid,
        status: data?.status,
      },
    };
  } catch (error) {
    return {
      channel: 'sms',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format the SMS message from notification
 * SMS has a 160 character limit for single segment
 */
function formatSmsMessage(notification: NotificationRecord): string {
  const { title, body } = notification;

  // Build message with title and body
  let message = `Rallia: ${title}`;

  if (body) {
    message += ` - ${body}`;
  }

  // Truncate if too long (leave room for ellipsis)
  const maxLength = 160;
  if (message.length > maxLength) {
    message = message.substring(0, maxLength - 3) + '...';
  }

  return message;
}

/**
 * Validate phone number format
 * Returns true if phone appears to be a valid format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Basic validation - should start with + and contain only digits after
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}
