import { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { chatDb, User } from './database';
import logger from '../logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}

// Authorization middleware
export const isAuthEnabled = process.env.REACT_APP_AUTH0_ENABLE === 'true';
export const checkJwt = isAuthEnabled ? auth({
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || '',
  audience: process.env.AUTH0_AUDIENCE || '',
}) : (req: any, res: any, next: any) => next(); // No-op if auth is disabled

// Standalone JWT verifier for use in CopilotKit middleware
const JWKS = isAuthEnabled ? createRemoteJWKSet(
  new URL(`${process.env.AUTH0_ISSUER_BASE_URL}.well-known/jwks.json`)
) : null;

export const verifyJwt = async (token: string) => {
  if (!isAuthEnabled || !JWKS) {
    return null;
  }
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: process.env.AUTH0_ISSUER_BASE_URL,
    audience: process.env.AUTH0_AUDIENCE,
  });
  return payload;
};

// Middleware to fetch user from DB and attach to request
export const addUserToRequest = async (req: Request, res: Response, next: NextFunction) => {
  if (!isAuthEnabled) {
    req.user = null;
    return next();
  }
  try {
    const userId = (req as any).auth.payload.sub;
    let userEmail = (req as any).auth.payload.email;
    let userName = (req as any).auth.payload.name;

    logger.info({
      message: 'addUserToRequest - JWT payload',
      userId,
      userEmail,
      userName,
      fullPayload: (req as any).auth.payload,
    });

    // If email/name not in token, try to fetch from Auth0 userinfo endpoint
    if (userId && (!userEmail || !userName)) {
      try {
        const token = req.headers.authorization?.substring(7); // Remove "Bearer "
        if (token) {
          const userInfoResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}userinfo`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            userEmail = userEmail || userInfo.email;
            userName = userName || userInfo.name;

            logger.info({
              message: 'Fetched user info from Auth0 userinfo endpoint',
              userEmail,
              userName,
            });
          }
        }
      } catch (error: any) {
        logger.warn({ message: 'Failed to fetch userinfo from Auth0', error: error.message });
      }
    }

    if (userId) {
      await chatDb.upsertUser({ userId, email: userEmail, name: userName });
      const user = await chatDb.getUser(userId);
      req.user = user;

      logger.info({
        message: 'addUserToRequest - user from DB',
        user,
      });
    }
    next();
  } catch (error: any) {
    logger.error({ message: 'Failed to add user to request', error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Role-based access control middleware
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Admins only' });
};

export const isViewerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === 'admin' || req.user?.role === 'viewer') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Viewers and Admins only' });
};
