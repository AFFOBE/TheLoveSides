import { env } from '../../config/env.js';

export const RateLimitConfig = {
  OTP_SEND: {
    POINTS: 3, // 3 requests
    DURATION: 60 * 15, // per 15 minutes
    BLOCK_DURATION: 60 * 15, // block for 15 minutes if exceeded
  },
  OTP_VERIFY: {
    POINTS: 5, // 5 attempts to verify
    DURATION: 60 * 5, // per 5 minutes
    BLOCK_DURATION: 60 * 15, // block for 15 minutes
  },
  PASSWORD_RESET: {
    POINTS: 3, // 3 requests
    DURATION: 60 * 60, // per 1 hour
    BLOCK_DURATION: 60 * 60, // block for 1 hour
  },
  ADMIN_LOGIN_IP: {
    POINTS: 10,
    DURATION: 60 * 15, // 15 mins
    BLOCK_DURATION: 60 * 30, // 30 mins block
  },
  ADMIN_LOGIN_ACCOUNT: {
    POINTS: 5, // max 5 attempts per account
    DURATION: 60 * 15,
    BLOCK_DURATION: 60 * 15,
  },
  CUSTOMER_REFRESH: {
    POINTS: 20,
    DURATION: 60 * 15,
    BLOCK_DURATION: 0,
  },
  ADMIN_REFRESH: {
    POINTS: 20,
    DURATION: 60 * 15,
    BLOCK_DURATION: 0,
  },
  GENERAL: {
    POINTS: env.RATE_LIMIT_MAX_REQUESTS,
    DURATION: Math.floor(env.RATE_LIMIT_WINDOW_MS / 1000),
    BLOCK_DURATION: 0,
  },
  // Reads (GET/HEAD/OPTIONS) happen many times per page load, so they get a
  // much higher ceiling than writes. This prevents normal browsing from
  // exhausting the general bucket.
  GENERAL_READ: {
    POINTS: Math.max(env.RATE_LIMIT_MAX_REQUESTS, 100) * 10,
    DURATION: Math.floor(env.RATE_LIMIT_WINDOW_MS / 1000),
    BLOCK_DURATION: 0,
  },
};
