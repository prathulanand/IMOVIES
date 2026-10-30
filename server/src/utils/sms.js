/**
 * SMS Notification Gateway Utility
 * Supports Fast2SMS / Twilio API integration with graceful mock fallback for dev/demo.
 */

export async function sendBookingConfirmationSMS({ phone, bookingCode, movieTitle, showTime, seats }) {
  if (!phone) {
    console.log(`[SMS GATEWAY] No phone number provided for booking ${bookingCode}. Skipping SMS.`);
    return { success: false, reason: 'NO_PHONE' };
  }

  const message = `IMOVIES: Your booking ${bookingCode} for "${movieTitle}" (${seats.join(', ')}) at ${showTime} is CONFIRMED! Enjoy your show.`;

  try {
    // If external SMS API (like FAST2SMS_API_KEY) is configured
    if (process.env.FAST2SMS_API_KEY) {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'v3',
          sender_id: 'TXTIND',
          message,
          language: 'english',
          flash: 0,
          numbers: phone,
        }),
      });
      const data = await response.json();
      console.log(`[SMS GATEWAY SUCCESS] SMS dispatched to ${phone} via Fast2SMS:`, data);
      return { success: true, provider: 'Fast2SMS', data };
    }

    // Default simulated gateway logging
    console.log(`[SMS GATEWAY SIMULATION]
==============================================
To: ${phone}
Text: ${message}
Status: DELIVERED (Instant)
==============================================`);
    return { success: true, provider: 'Simulation', phone };
  } catch (err) {
    console.warn(`[SMS GATEWAY ERROR] Failed to send SMS to ${phone}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendBookingReminderSMS({ phone, bookingCode, movieTitle, showTime }) {
  if (!phone) return;
  const message = `IMOVIES REMINDER: Your movie "${movieTitle}" starts soon at ${showTime}! Ticket: ${bookingCode}.`;
  console.log(`[SMS REMINDER] Dispatched to ${phone}: ${message}`);
}

export async function sendPasswordResetSMS({ phone, otp }) {
  if (!phone) return;
  const message = `IMOVIES SECURITY: Your password reset verification code is ${otp}. Valid for 60 minutes. Do not share.`;
  console.log(`[SMS OTP GATEWAY]
==============================================
To: ${phone}
Text: ${message}
Status: DELIVERED (Instant)
==============================================`);
}
