import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { getRedis } from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { RateLimitConfig } from './config.js';
import { getClientIp, normalizeEmail } from './keyGenerator.js';
import { logger } from '../../utils/logger.js';

// Cache instances
const limiters: Record<string, RateLimiterRedis | RateLimiterMemory> = {};

function getLimiter(name: string, config: { POINTS: number; DURATION: number; BLOCK_DURATION: number }) {
  if (!limiters[name]) {
    const redisClient = getRedis();
    const opts = {
      keyPrefix: `rl:${name}`,
      points: config.POINTS,
      duration: config.DURATION,
      blockDuration: config.BLOCK_DURATION,
    };

    if ((redisClient as any).isMock) {
      limiters[name] = new RateLimiterMemory(opts);
    } else {
      limiters[name] = new RateLimiterRedis({ ...opts, storeClient: redisClient });
    }
  }
  return limiters[name];
}

// Helper to format the TooManyRequests error
function handleRateLimitExceeded(req: Request, next: NextFunction, rlRes: RateLimiterRes, message: string) {
  const retryAfter = Math.round(rlRes.msBeforeNext / 1000) || 1;
  logger.warn({
    ip: getClientIp(req),
    path: req.originalUrl,
    retryAfter,
  }, 'Rate limit exceeded');
  next(ApiError.tooManyRequests(message, 'RATE_LIMIT_EXCEEDED', retryAfter));
}

// ---------------------------------------------------------------------------
// Middlewares
// ---------------------------------------------------------------------------

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function rateLimitGeneral(req: Request, _res: Response, next: NextFunction) {
  try {
    // Bypass general rate limit for requests with an admin token
    if (req.cookies?.adminAccessToken || req.cookies?.adminRefreshToken) {
      return next();
    }

    // Safe read methods get a much higher ceiling so normal browsing (which
    // fires many requests per page load) doesn't get blocked.
    const isRead = SAFE_METHODS.has(req.method);
    const name = isRead ? 'general:read' : 'general';
    const config = isRead ? RateLimitConfig.GENERAL_READ : RateLimitConfig.GENERAL;

    const key = getClientIp(req);
    await getLimiter(name, config).consume(key);
    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) return next(rejRes);
    handleRateLimitExceeded(req, next, rejRes as RateLimiterRes, 'Too many requests. Please try again later.');
  }
}

export async function otpSendLimiter(req: Request, _res: Response, next: NextFunction) {
  try {
    const ip = getClientIp(req);
    const email = normalizeEmail(req.body?.email);
    
    // We limit by IP and by Email independently
    const ipLimiter = getLimiter('otp_send:ip', RateLimitConfig.OTP_SEND);
    const emailLimiter = getLimiter('otp_send:email', RateLimitConfig.OTP_SEND);

    await Promise.all([
      ipLimiter.consume(ip),
      email !== 'unknown' ? emailLimiter.consume(email) : Promise.resolve()
    ]);
    
    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) return next(rejRes);
    handleRateLimitExceeded(req, next, rejRes as RateLimiterRes, 'Too many OTP requests. Please try again later.');
  }
}

export async function otpVerifyLimiter(req: Request, _res: Response, next: NextFunction) {
  try {
    const ip = getClientIp(req);
    const email = normalizeEmail(req.body?.email);
    
    const ipLimiter = getLimiter('otp_verify:ip', RateLimitConfig.OTP_VERIFY);
    const emailLimiter = getLimiter('otp_verify:email', RateLimitConfig.OTP_VERIFY);

    await Promise.all([
      ipLimiter.consume(ip),
      email !== 'unknown' ? emailLimiter.consume(email) : Promise.resolve()
    ]);
    
    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) return next(rejRes);
    handleRateLimitExceeded(req, next, rejRes as RateLimiterRes, 'Too many verification attempts. Please try again later.');
  }
}

export async function passwordResetLimiter(req: Request, _res: Response, next: NextFunction) {
  try {
    const ip = getClientIp(req);
    const email = normalizeEmail(req.body?.email);
    
    const ipLimiter = getLimiter('pwd_reset:ip', RateLimitConfig.PASSWORD_RESET);
    const emailLimiter = getLimiter('pwd_reset:email', RateLimitConfig.PASSWORD_RESET);

    await Promise.all([
      ipLimiter.consume(ip),
      email !== 'unknown' ? emailLimiter.consume(email) : Promise.resolve()
    ]);
    
    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) return next(rejRes);
    handleRateLimitExceeded(req, next, rejRes as RateLimiterRes, 'Too many password reset requests. Please try again later.');
  }
}

export async function adminLoginLimiter(req: Request, _res: Response, next: NextFunction) {
  try {
    const ip = getClientIp(req);
    const email = normalizeEmail(req.body?.email);
    
    const ipLimiter = getLimiter('admin_login:ip', RateLimitConfig.ADMIN_LOGIN_IP);
    const accountLimiter = getLimiter('admin_login:email', RateLimitConfig.ADMIN_LOGIN_ACCOUNT);

    await Promise.all([
      ipLimiter.consume(ip),
      email !== 'unknown' ? accountLimiter.consume(email) : Promise.resolve()
    ]);
    
    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) return next(rejRes);
    handleRateLimitExceeded(req, next, rejRes as RateLimiterRes, 'Too many admin login attempts. Please try again later.');
  }
}

export async function refreshCustomerLimiter(req: Request, _res: Response, next: NextFunction) {
  try {
    const ip = getClientIp(req);
    await getLimiter('refresh:cust:ip', RateLimitConfig.CUSTOMER_REFRESH).consume(ip);
    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) return next(rejRes);
    handleRateLimitExceeded(req, next, rejRes as RateLimiterRes, 'Too many refresh requests. Please try again later.');
  }
}

export async function refreshAdminLimiter(req: Request, _res: Response, next: NextFunction) {
  try {
    const ip = getClientIp(req);
    await getLimiter('refresh:admin:ip', RateLimitConfig.ADMIN_REFRESH).consume(ip);
    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) return next(rejRes);
    handleRateLimitExceeded(req, next, rejRes as RateLimiterRes, 'Too many admin refresh requests. Please try again later.');
  }
}
