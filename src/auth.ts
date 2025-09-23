import jwt from 'jsonwebtoken';

const AUTH_SECRET = process.env.AUTH_SECRET!;

if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required');
}

export interface SessionUser {
  userId: string;
  email: string;
}

export interface MagicLinkPayload {
  email: string;
  iat?: number;
  exp?: number;
}

export interface SessionPayload {
  sub: string; // userId (emailHash)
  email: string;
  iat?: number;
  exp?: number;
}

// Generate magic link token (short-lived, 15 minutes)
export function generateMagicToken(email: string): string {
  const payload: MagicLinkPayload = {
    email: email.toLowerCase().trim()
  };
  
  return jwt.sign(payload, AUTH_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256'
  });
}

// Verify magic link token
export function verifyMagicToken(token: string): MagicLinkPayload {
  try {
    return jwt.verify(token, AUTH_SECRET, {
      algorithms: ['HS256']
    }) as MagicLinkPayload;
  } catch (error) {
    throw new Error('Invalid or expired magic link token');
  }
}

// Generate session token (long-lived, 7 days)
export function generateSessionToken(userId: string, email: string): string {
  const payload: SessionPayload = {
    sub: userId,
    email: email.toLowerCase().trim()
  };
  
  return jwt.sign(payload, AUTH_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
}

// Verify session token
export function verifySessionToken(token: string): SessionPayload {
  try {
    return jwt.verify(token, AUTH_SECRET, {
      algorithms: ['HS256']
    }) as SessionPayload;
  } catch (error) {
    throw new Error('Invalid or expired session token');
  }
}

// Extract session user from request
export function getSessionUser(req: Request): SessionUser {
  const cookieHeader = req.headers.get('cookie');
  
  if (!cookieHeader) {
    throw new Error('No session cookie found');
  }

  // Parse cookies manually
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...value] = c.trim().split('=');
      return [key, value.join('=')];
    })
  );

  const sessionToken = cookies.ali_session;
  
  if (!sessionToken) {
    throw new Error('No session token found');
  }

  try {
    const payload = verifySessionToken(sessionToken);
    return {
      userId: payload.sub,
      email: payload.email
    };
  } catch (error) {
    throw new Error('Invalid session token');
  }
}

// Require authentication middleware
export function requireAuth(req: Request): SessionUser {
  try {
    return getSessionUser(req);
  } catch (error) {
    const authError = new Error('Authentication required');
    (authError as any).status = 401;
    throw authError;
  }
}

// Create secure session cookie
export function createSessionCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  
  return `ali_session=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

// Create logout cookie (clears session)
export function createLogoutCookie(): string {
  return 'ali_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
}

// Email validation (basic)
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function checkRateLimit(identifier: string, maxRequests = 3, windowMs = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitMap.get(key);
  
  if (!current || now - current.lastReset > windowMs) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.lastReset > windowMs * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute