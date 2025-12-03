import express from 'express';
import { chatDb } from '../database';
import { checkJwt, addUserToRequest, isAuthEnabled, isViewerOrAdmin, verifyJwt } from '../auth';
import logger from '../../logger';

const router = express.Router();

// Get a specific tool result
router.get('/tool_results/:resultId', checkJwt, async (req, res) => {
  try {
    const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
    const resultId = req.params.resultId;
    const resultData = await chatDb.getToolResult(resultId, userId);
    if (resultData) {
      res.json(resultData);
    } else {
      res.status(404).json({ error: 'Tool result not found or access denied' });
    }
  } catch (error: any) {
    logger.error({ message: 'Failed to get tool result', error: error.message });
    res.status(500).json({ error: 'Failed to get tool result' });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  const dbHealthy = await chatDb.healthCheck();
  res.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// Submit feedback
router.post('/feedback', async (req, res) => {
  try {
    let userId = 'anonymous';
    if (isAuthEnabled && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.substring(7);
        const payload = await verifyJwt(token);
        userId = payload?.sub || 'anonymous';
        if (userId !== 'anonymous') {
          await chatDb.upsertUser({ userId, email: payload?.email as string, name: payload?.name as string });
        }
      } catch (error) {
        logger.warn({ message: 'Failed to verify JWT for feedback, using anonymous', error });
      }
    }
    await chatDb.saveFeedback({ ...req.body, userId });
    res.status(201).json({ success: true });
  } catch (error: any) {
    logger.error({ message: 'Failed to save feedback', error: error.message });
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Get feedback
router.get('/feedback', checkJwt, addUserToRequest, isViewerOrAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const feedback = await chatDb.getFeedback(limit, offset);
    res.json(feedback);
  } catch (error: any) {
    logger.error({ message: 'Failed to get feedback', error: error.message });
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Save an analytics event
router.post('/analytics/event', async (req, res) => {
  try {
    let userId: string | undefined;
    if (isAuthEnabled) {
      try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          const token = authHeader.substring(7);
          userId = (await verifyJwt(token))?.sub as string;
        }
      } catch (error) {
        logger.warn({ message: 'Failed to verify JWT for analytics event', error });
      }
    }
    const { threadId, eventType, payload, sessionId } = req.body;
    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }
    await chatDb.saveAnalyticsEvent({ userId, threadId, eventType, payload, sessionId });
    res.status(201).json({ success: true });
  } catch (error: any) {
    logger.error({ message: 'Failed to save analytics event', error: error.message });
    res.status(500).json({ error: 'Failed to save analytics event' });
  }
});

// Get users
router.get('/users', checkJwt, addUserToRequest, isViewerOrAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await chatDb.getUsers(limit, offset);
    res.json(users);
  } catch (error: any) {
    logger.error({ message: 'Failed to get users', error: error.message });
    res.status(500).json({ error: 'Failed to get users' });
  }
});

export default router;
