import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DbUser, getOrCreateUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: DbUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing bearer token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty token' });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;

    const dbUser = await getOrCreateUser({
      uid: decoded.uid,
      email: decoded.email || `${decoded.uid}@niswaro.local`,
      displayName: decoded.name || '',
      avatarUrl: decoded.picture || null,
      emailVerified: Boolean(decoded.email_verified),
    });

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }
};

// Lightweight per-user sliding window rate limiter for AI routes
const aiBuckets = new Map<number, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 25;

export const aiRateLimit = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.dbUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const now = Date.now();
  const timestamps = (aiBuckets.get(userId) ?? []).filter(
    (ts) => now - ts < WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: 'Rate limit reached. Please wait a few seconds before sending another AI request.',
    });
    return;
  }

  timestamps.push(now);
  aiBuckets.set(userId, timestamps);
  next();
};
