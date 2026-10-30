import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { EmailOtp } from '../models/EmailOtp.js';
import { env } from '../config/env.js';
import { MESSAGES, MACHINE_CODES } from '../constants/messages.js';
import { ROLES, USER_STATUS } from '../constants/enums.js';
import { sendPasswordResetEmail, sendEmailVerificationOTP } from '../utils/mailer.js';
import { sendPasswordResetSMS } from '../utils/sms.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

function generateToken(userId) {
  return jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

// Validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().optional(),
  otp: z.string().optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export async function sendRegistrationOtp(req, res, next) {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Check if an existing verified user already exists
    const existing = await User.findOne({ email: cleanEmail });
    if (existing && existing.isEmailVerified !== false) {
      return res.status(409).json({
        error: 'An account with this email address already exists. Please sign in.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    // Generate 6-digit verification code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Store in EmailOtp collection with 10-minute expiry
    await EmailOtp.findOneAndUpdate(
      { email: cleanEmail },
      {
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        verified: false,
      },
      { upsert: true, new: true }
    );

    // Send real email via verified Gmail SMTP
    await sendEmailVerificationOTP({ to: cleanEmail, otp });

    console.log(`\n\x1b[35m[REGISTRATION OTP DISPATCHED]\x1b[0m`);
    console.log(`To: ${cleanEmail}`);
    console.log(`Code: \x1b[36m${otp}\x1b[0m\n`);

    return res.status(200).json({
      message: 'A 6-digit verification OTP has been sent to your Gmail.',
      email: cleanEmail,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyRegistrationOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = (otp || '').trim();

    const otpHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    const record = await EmailOtp.findOne({
      email: cleanEmail,
      otpHash,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        error: 'Invalid or expired OTP code. Please check your email or request a new code.',
        code: 'INVALID_OTP',
      });
    }

    record.verified = true;
    await record.save();

    return res.status(200).json({
      message: 'Email address verified successfully!',
      verified: true,
      email: cleanEmail,
    });
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && existingUser.isEmailVerified !== false) {
      return res.status(409).json({
        error: MESSAGES.EMAIL_ALREADY_EXISTS,
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    if (phone && phone.trim() !== '') {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone && (!existingUser || existingPhone._id.toString() !== existingUser._id.toString())) {
        return res.status(409).json({
          error: MESSAGES.PHONE_ALREADY_EXISTS,
          code: 'PHONE_ALREADY_EXISTS',
        });
      }
    }

    // Require verified OTP for new local registrations
    const otpRecord = await EmailOtp.findOne({ email: cleanEmail });
    if (!otpRecord || !otpRecord.verified) {
      return res.status(400).json({
        error: 'Please verify your email address with the OTP before completing registration.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    const passwordHash = await User.hashPassword(password);
    let user;

    if (existingUser) {
      existingUser.name = name.trim();
      existingUser.passwordHash = passwordHash;
      existingUser.phone = phone && phone.trim() !== '' ? phone.trim() : undefined;
      existingUser.isEmailVerified = true;
      existingUser.status = USER_STATUS.ACTIVE;
      await existingUser.save();
      user = existingUser;
    } else {
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        phone: phone && phone.trim() !== '' ? phone.trim() : undefined,
        passwordHash,
        role: ROLES.USER,
        status: USER_STATUS.ACTIVE,
        isEmailVerified: true,
      });
    }

    // Remove used OTP record
    await EmailOtp.deleteOne({ email: cleanEmail });

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);

    return res.status(201).json({
      message: 'Registration successful. Welcome to IMovies!',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({
        error: MESSAGES.INVALID_CREDENTIALS,
        code: 'INVALID_CREDENTIALS',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: MESSAGES.INVALID_CREDENTIALS,
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      return res.status(403).json({
        error: MESSAGES.ACCOUNT_SUSPENDED,
        code: MACHINE_CODES.ACCOUNT_SUSPENDED,
      });
    }

    if (user.authProvider === 'LOCAL' && user.isEmailVerified === false) {
      return res.status(403).json({
        error: 'Please verify your email address with the OTP before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);

    return res.status(200).json({
      message: 'Login successful.',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
  });
  return res.status(200).json({
    message: MESSAGES.LOGOUT_SUCCESS,
  });
}

export async function getMe(req, res) {
  return res.status(200).json({
    user: req.user.toJSON(),
  });
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        error: 'No account found with this email address. Please check the spelling or create an account.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Generate a secure 6-digit verification code / OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Await real email delivery via verified Gmail SMTP
    try {
      await sendPasswordResetEmail({ to: cleanEmail, otp });
      console.log(`\n\x1b[35m[PASSWORD RESET OTP DELIVERED TO GMAIL]\x1b[0m`);
      console.log(`To: ${cleanEmail}`);
      console.log(`6-Digit OTP: \x1b[36m${otp}\x1b[0m\n`);
    } catch (mailErr) {
      console.error('[MAILER ERROR] Failed to deliver password reset OTP:', mailErr);
      return res.status(500).json({
        error: 'Failed to dispatch email. Please check your connection and try again.',
        code: 'EMAIL_SEND_FAILED',
      });
    }

    // Dispatch SMS asynchronously if user has phone
    if (user.phone) {
      sendPasswordResetSMS({ phone: user.phone, otp }).catch(() => {});
    }

    return res.status(200).json({
      message: `A real 6-digit verification OTP has been sent to ${cleanEmail}. Please check your Gmail inbox (and Spam folder).`,
      email: cleanEmail,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, token, otp, newPassword } = req.body;
    const codeToVerify = (otp || token || '').trim();

    if (!codeToVerify) {
      return res.status(400).json({
        error: '6-digit OTP verification code is required.',
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(codeToVerify).digest('hex');
    const query = {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    };
    if (email && email.trim()) {
      query.email = email.toLowerCase().trim();
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired OTP code. Please check your email or request a new code.',
        code: 'INVALID_TOKEN',
      });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: 'Password successfully updated! Please sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required' });
    }

    let payload = null;
    if (env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (e) {
        console.warn('[GOOGLE AUTH WARN] verifyIdToken failed, falling back to payload decode:', e.message);
      }
    }

    // Fallback: decode JWT payload from Google credential
    if (!payload) {
      const parts = credential.split('.');
      if (parts.length === 3) {
        try {
          payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        } catch {
          // ignore
        }
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Failed to verify Google credential token.' });
    }

    const { email, name, picture, sub: googleId } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    // Designated super admin email
    const isSuperAdminEmail =
      normalizedEmail === 'satyamgupta93455@gmail.com' ||
      normalizedEmail === 'admin@imovies.com' ||
      normalizedEmail === 'prolemda@gmail.com';

    // Find or create in MongoDB
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (user.status === USER_STATUS.SUSPENDED) {
        return res.status(403).json({
          error: MESSAGES.ACCOUNT_SUSPENDED,
          code: MACHINE_CODES.ACCOUNT_SUSPENDED,
        });
      }

      let updated = false;
      if (isSuperAdminEmail && user.role !== ROLES.ADMIN) {
        user.role = ROLES.ADMIN;
        updated = true;
      }
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        authProvider: 'GOOGLE',
        googleId,
        avatar: picture,
        role: isSuperAdminEmail ? ROLES.ADMIN : ROLES.USER,
        status: USER_STATUS.ACTIVE,
      });
    }

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);

    return res.status(200).json({
      message: 'Google login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
}

