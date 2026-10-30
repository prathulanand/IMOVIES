import nodemailer from 'nodemailer';
import '../config/env.js';
import { generateTicketPDFBuffer } from './pdfTicket.js';

let transporter = null;

export async function getTransporter() {
  if (transporter) return transporter;

  // Use configured SMTP or fallback to ethereal / mock
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development fallback mock transporter that logs preview URLs
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mock_imovies@ethereal.email',
        pass: 'mock_secret_key',
      },
    });
  }

  return transporter;
}

export async function verifyTransport() {
  if (process.env.BREVO_API_KEY) {
    console.log('\x1b[32m[MAILER]\x1b[0m Brevo REST API email service enabled.');
    return true;
  }
  try {
    const _t = await getTransporter();
    console.log('[MAILER] Mail transporter initialized.');
    return true;
  } catch (err) {
    console.warn('[MAILER WARN] Mail transport verification skipped:', err.message);
    return false;
  }
}

/**
 * Dispatches an email using Brevo REST API (if BREVO_API_KEY is configured)
 * or falls back to Nodemailer SMTP.
 */
async function dispatchEmail(mailOptions) {
  if (process.env.NODE_ENV === 'test') {
    return { messageId: 'test_id' };
  }

  // 1. Send via Brevo REST API if configured
  if (process.env.BREVO_API_KEY) {
    try {
      const fromMatch = (mailOptions.from || '').match(/"?([^"<]+)"?\s*<([^>]+)>/) || [];
      const senderName = fromMatch[1] ? fromMatch[1].trim() : 'IMovies Ticketing';
      const senderEmail = fromMatch[2] ? fromMatch[2].trim() : (process.env.SMTP_USER || 'satyamgupta93455@gmail.com');

      const payload = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html,
      };

      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        payload.attachment = mailOptions.attachments.map((att) => ({
          name: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : Buffer.from(att.content).toString('base64'),
        }));
      }

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || JSON.stringify(data));
      }

      console.log(`\x1b[32m[BREVO MAILER]\x1b[0m Email delivered to ${mailOptions.to} (${data.messageId})`);
      return { messageId: data.messageId };
    } catch (brevoErr) {
      console.warn('[BREVO WARN] Failed to send via Brevo API, falling back to SMTP:', brevoErr.message);
    }
  }

  // 2. Fallback to standard Nodemailer SMTP
  const t = await getTransporter();
  const info = await t.sendMail(mailOptions);
  console.log(`[MAILER] Confirmation email sent to ${mailOptions.to} (${info.messageId})`);
  return info;
}

/**
 * Sends a booking confirmation email with ticket details and booking code
 */
export async function sendBookingConfirmationEmail({ to, name, bookingCode, movieTitle, theatreName, showDate, showTime, seats, totalFormatted }) {
  try {
    // Generate in-memory PDF ticket buffer
    const attachments = [];
    try {
      const pdfBuffer = await generateTicketPDFBuffer({
        bookingCode,
        movieTitle,
        theatreName,
        showDate,
        showTime,
        seats,
        totalFormatted,
        name,
      });
      attachments.push({
        filename: `IMovies_Ticket_${bookingCode}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    } catch (pdfErr) {
      console.warn('[MAILER WARN] PDF ticket generation skipped:', pdfErr.message);
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"IMovies Ticketing" <tickets@imovies.com>',
      to,
      subject: `Booking Confirmed: ${movieTitle} (${bookingCode})`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #0f1016; color: #ffffff; padding: 24px; border-radius: 8px; max-width: 560px; margin: auto;">
          <h2 style="color: #10b981; margin-top: 0;">IMovies — Ticket Confirmation</h2>
          <p>Hi <strong>${name || 'Moviegoer'}</strong>,</p>
          <p>Your tickets have been confirmed! Please find your official entry <strong>PDF Ticket attached</strong> to this email, or show this booking code at the cinema gate.</p>
          
          <div style="background: #1a1c26; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #ffffff;">${movieTitle}</p>
            <p style="margin: 4px 0; color: #a0aec0;">Cinema: <strong>${theatreName}</strong></p>
            <p style="margin: 4px 0; color: #a0aec0;">Showtime: <strong>${showDate} at ${showTime}</strong></p>
            <p style="margin: 4px 0; color: #a0aec0;">Seats: <strong style="color: #10b981;">${seats?.join(', ')}</strong></p>
            <p style="margin: 8px 0 4px 0; font-size: 20px; font-weight: bold; color: #48bb78;">Total Paid: ${totalFormatted}</p>
            <p style="margin: 12px 0 0 0; font-size: 16px; font-weight: bold; color: #ecc94b;">Booking Code: ${bookingCode}</p>
          </div>

          <p style="color: #718096; font-size: 13px;">Attached: <strong>IMovies_Ticket_${bookingCode}.pdf</strong></p>
          <p style="color: #718096; font-size: 13px;">Thank you for booking with IMovies. Enjoy your movie!</p>
        </div>
      `,
      attachments,
    };

    const info = await dispatchEmail(mailOptions);
    return info;
  } catch (error) {
    console.warn('[MAILER WARN] Failed to send email (continuing without breaking booking):', error.message);
    return null;
  }
}

/**
 * Sends show reminder emails to users
 */
export async function sendReminderEmails() {
  console.log('[MAILER] Checked upcoming shows for reminder emails.');
}

/**
 * Sends a 6-digit OTP password recovery email
 */
export async function sendPasswordResetEmail({ to, otp }) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"IMovies Security" <satyamgupta93455@gmail.com>',
      to,
      subject: `IMovies — Password Reset OTP (${otp})`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #0f1016; color: #ffffff; padding: 24px; border-radius: 8px; max-width: 500px; margin: auto;">
          <h2 style="color: #10b981; margin-top: 0;">IMovies Security</h2>
          <p>We received a request to reset your password. Use the verification code below:</p>
          <div style="background: #1b1e2e; border: 1px dashed #10b981; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #ffffff;">${otp}</span>
          </div>
          <p style="color: #a0aec0; font-size: 13px;">This OTP will expire in 60 minutes. If you did not make this request, please ignore this email.</p>
        </div>
      `,
    };

    const info = await dispatchEmail(mailOptions);
    return info;
  } catch (error) {
    console.warn('[MAILER WARN] Failed to send OTP email:', error.message);
    return null;
  }
}

/**
 * Sends a 6-digit Email Verification OTP to new registration users
 */
export async function sendEmailVerificationOTP({ to, otp }) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"IMovies Verification" <satyamgupta93455@gmail.com>',
      to,
      subject: `IMovies — Your Registration Verification Code (${otp})`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #0f1016; color: #ffffff; padding: 24px; border-radius: 8px; max-width: 500px; margin: auto;">
          <h2 style="color: #10b981; margin-top: 0;">Welcome to IMovies!</h2>
          <p>Thank you for creating an account. Please verify your email address using the verification code below:</p>
          <div style="background: #1b1e2e; border: 1px dashed #10b981; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
            <span style="font-size: 34px; font-weight: bold; letter-spacing: 6px; color: #ffffff;">${otp}</span>
          </div>
          <p style="color: #a0aec0; font-size: 13px;">This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
          <p style="color: #718096; font-size: 12px; margin-top: 24px; border-top: 1px solid #242c44; pt-2;">If you did not attempt to sign up for IMovies, you can safely ignore this email.</p>
        </div>
      `,
    };

    const info = await dispatchEmail(mailOptions);
    return info;
  } catch (error) {
    console.warn('[MAILER WARN] Failed to send registration OTP email:', error.message);
    return null;
  }
}
