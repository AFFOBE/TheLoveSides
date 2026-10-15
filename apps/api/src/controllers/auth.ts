import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { AdminUser } from '../models/AdminUser.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { mergeGuestCartIntoUserCart } from '../services/cart.service.js';
import { sendWelcomeEmail } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';
import { emailService } from '../services/email.service.js';

// Helper to convert JWT expiry string to milliseconds (assuming '15m' and '7d')
const getMs = (val: string) => {
  if (val.endsWith('m')) return parseInt(val) * 60 * 1000;
  if (val.endsWith('d')) return parseInt(val) * 24 * 60 * 60 * 1000;
  return 15 * 60 * 1000;
};

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/',
};

export async function requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTP for this email
    await Otp.deleteMany({ email });

    // Save new OTP, valid for 5 minutes
    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send this via email
    logger.info({ email, otp }, `OTP generated for ${email}`);
    await emailService.sendEmail({
      to: email,
      subject: 'Your Login OTP - TheLoveSides',
      text: `Your One-Time Password (OTP) for login is: ${otp}. It is valid for 5 minutes.`,
      html: `<p>Your One-Time Password (OTP) for login is: <strong>${otp}</strong></p><p>It is valid for 5 minutes.</p>`,
    });

    sendSuccess({
      res,
      message: 'OTP sent successfully to your email',
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp } = req.body;

    const otpDoc = await Otp.findOne({ email, otp });
    if (!otpDoc) {
      throw ApiError.unauthorized('Invalid or expired OTP');
    }

    // Delete OTP after successful verification
    await Otp.deleteOne({ _id: otpDoc._id });

    // Find or create user
    let user = await User.findOne({ email });
    let isNewUser = false;
    if (!user) {
      user = await User.create({
        email,
        isEmailVerified: true,
      });
      isNewUser = true;
    } else {
      if (!user.isActive) {
        throw ApiError.forbidden('Your account has been deactivated');
      }
      user.isEmailVerified = true;
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Set cookies
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: getMs(env.JWT_ACCESS_EXPIRY),
    });
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: getMs(env.JWT_REFRESH_EXPIRY),
    });

    // Merge cart if guestId exists
    const guestId = req.cookies?.guestId;
    if (guestId) {
      await mergeGuestCartIntoUserCart(guestId, user.id);
      res.clearCookie('guestId'); // Clear the guest cookie
    }

    // Send a one-time welcome email for brand new accounts
    if (isNewUser) {
      await sendWelcomeEmail(user.email, user.firstName);
    }

    sendSuccess({
      res,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      message: 'Authentication successful',
    });
  } catch (error) {
    next(error);
  }
}

export async function loginAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const admin = await AdminUser.findOne({ email }).select('+passwordHash').populate('role');
    if (!admin) {
      throw ApiError.unauthorized('Invalid admin credentials');
    }

    if (!admin.isActive) {
      throw ApiError.forbidden('Admin account deactivated');
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      throw ApiError.unauthorized('Invalid admin credentials');
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const accessToken = generateAccessToken(admin.id, true);
    const refreshToken = generateRefreshToken(admin.id, true);

    res.cookie('adminAccessToken', accessToken, {
      ...cookieOptions,
      maxAge: getMs(env.JWT_ACCESS_EXPIRY),
    });
    res.cookie('adminRefreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: getMs(env.JWT_REFRESH_EXPIRY),
    });

    sendSuccess({
      res,
      data: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        role: admin.role,
      },
      message: 'Admin login successful',
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutCustomer(_req: Request, res: Response): Promise<void> {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  sendSuccess({ res, message: 'Logged out successfully' });
}

export async function logoutAdmin(_req: Request, res: Response): Promise<void> {
  res.clearCookie('adminAccessToken', cookieOptions);
  res.clearCookie('adminRefreshToken', cookieOptions);
  sendSuccess({ res, message: 'Admin logged out successfully' });
}

export async function changeAdminPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      throw ApiError.unauthorized('Not authenticated');
    }

    const admin = await AdminUser.findById(adminId).select('+passwordHash');
    if (!admin) {
      throw ApiError.notFound('Admin User');
    }

    const isValid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!isValid) {
      throw ApiError.badRequest('Incorrect current password');
    }

    admin.passwordHash = await hashPassword(newPassword);
    await admin.save();

    sendSuccess({ res, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user?.id).select('-__v');
    if (!user) {
      throw ApiError.notFound('User');
    }
    sendSuccess({ res, data: user });
  } catch (error) {
    next(error);
  }
}

export async function getAdminMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = await AdminUser.findById(req.user?.id).populate('role').select('-__v');
    if (!admin) {
      throw ApiError.notFound('Admin User');
    }
    sendSuccess({ res, data: admin });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh customer access token using the refresh token cookie.
 */
export async function refreshCustomerToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw ApiError.unauthorized('Refresh token not found');
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, env.JWT_REFRESH_SECRET) as import('../middleware/auth.js').JwtPayload;

    if (decoded.type !== 'refresh' || decoded.isAdmin) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const user = await User.findById(decoded.sub).select('email isActive').lean();
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('Account deactivated');
    }

    // Issue new token pair
    const newAccessToken = generateAccessToken(decoded.sub);
    const newRefreshToken = generateRefreshToken(decoded.sub);

    res.cookie('accessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: getMs(env.JWT_ACCESS_EXPIRY),
    });
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: getMs(env.JWT_REFRESH_EXPIRY),
    });

    sendSuccess({ res, message: 'Token refreshed' });
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid refresh token'));
      return;
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Refresh token expired, please log in again'));
      return;
    }
    next(error);
  }
}

/**
 * Refresh admin access token using the admin refresh token cookie.
 */
export async function refreshAdminToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.adminRefreshToken;
    if (!token) {
      throw ApiError.unauthorized('Admin refresh token not found');
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, env.JWT_REFRESH_SECRET) as import('../middleware/auth.js').JwtPayload;

    if (decoded.type !== 'refresh' || !decoded.isAdmin) {
      throw ApiError.unauthorized('Invalid admin refresh token');
    }

    const admin = await AdminUser.findById(decoded.sub).select('email isActive').lean();
    if (!admin) {
      throw ApiError.unauthorized('Admin no longer exists');
    }
    if (!admin.isActive) {
      throw ApiError.forbidden('Admin account deactivated');
    }

    // Issue new token pair
    const newAccessToken = generateAccessToken(decoded.sub, true);
    const newRefreshToken = generateRefreshToken(decoded.sub, true);

    res.cookie('adminAccessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: getMs(env.JWT_ACCESS_EXPIRY),
    });
    res.cookie('adminRefreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: getMs(env.JWT_REFRESH_EXPIRY),
    });

    sendSuccess({ res, message: 'Admin token refreshed' });
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid admin refresh token'));
      return;
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Admin refresh token expired, please log in again'));
      return;
    }
    next(error);
  }
}

/**
 * Initiates a forgot password flow for customers.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      // Don't leak existence of user, just return success
      sendSuccess({ res, message: 'If that email is registered, a password reset link has been sent.' });
      return;
    }

    const jwt = await import('jsonwebtoken');
    // Token expires in 15 minutes, payload contains user id and current password hash as secret
    // This ensures that if the password is changed, the token immediately becomes invalid.
    const secret = env.JWT_ACCESS_SECRET + user.passwordHash;
    const token = jwt.default.sign({ sub: user.id }, secret, { expiresIn: '15m' });
    
    const resetLink = `${env.STOREFRONT_URL}/reset-password?token=${token}&id=${user.id}`;
    
    logger.info({ resetLink }, `Password reset link generated for ${email}`);
    
    // Send this via email
    await emailService.sendEmail({
      to: email,
      subject: 'Password Reset - TheLoveSides',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
      html: `<p>You requested a password reset.</p><p><a href="${resetLink}">Click here to reset your password</a></p>`,
    });

    sendSuccess({ res, message: 'If that email is registered, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Resets a customer's password using the token.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, token, newPassword } = req.body;

    const user = await User.findById(id).select('+passwordHash');
    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    const jwt = await import('jsonwebtoken');
    const secret = env.JWT_ACCESS_SECRET + user.passwordHash;

    try {
      jwt.default.verify(token, secret);
    } catch (err) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    user.passwordHash = await hashPassword(newPassword);
    // Un-lock the account in case it was locked due to brute force
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    sendSuccess({ res, message: 'Password has been reset successfully' });
  } catch (error) {
    next(error);
  }
}

