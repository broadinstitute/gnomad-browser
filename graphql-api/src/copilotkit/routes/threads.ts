import express from 'express';
import { chatDb } from '../database';
import { checkJwt, isAuthEnabled } from '../auth';
import logger from '../../logger';

const router = express.Router();

// List all threads for the current user
router.get('/', checkJwt, async (req, res) => {
  try {
    const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
    logger.info({
      message: 'Listing threads',
      userId,
      isAuthEnabled,
      hasAuth: !!(req as any).auth,
      authPayload: (req as any).auth?.payload
    });
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const threads = await chatDb.listThreads(userId, limit, offset);
    res.json(threads);
  } catch (error: any) {
    logger.error({ message: 'Failed to list threads', error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

// Create or ensure a thread exists
router.post('/', checkJwt, async (req, res) => {
  try {
    const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
    const { threadId, model } = req.body;
    if (!threadId) {
      return res.status(400).json({ error: 'threadId is required' });
    }
    await chatDb.ensureThread(threadId, userId, model);
    res.json({ success: true, threadId });
  } catch (error: any) {
    logger.error({ message: 'Failed to create thread', error: error.message });
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Add context to a thread
router.post('/:threadId/context', checkJwt, async (req, res) => {
  try {
    const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
    const { threadId } = req.params;
    const { context } = req.body;
    if (!context || !context.type || !context.id) {
      return res.status(400).json({ error: 'Invalid context object provided.' });
    }
    await chatDb.addContextToThread(threadId, userId, context);
    res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error({ message: 'Failed to add context to thread', error: error.message });
    res.status(500).json({ error: 'Failed to update thread context' });
  }
});

// Get messages for a specific thread
router.get('/:threadId/messages', checkJwt, async (req, res) => {
  try {
    const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
    logger.info({
      message: 'Getting messages',
      threadId: req.params.threadId,
      userId,
      isAuthEnabled,
      hasAuth: !!(req as any).auth,
      authHeader: req.headers.authorization ? 'present' : 'missing'
    });
    const messages = await chatDb.getMessages(req.params.threadId, userId);
    res.json(messages);
  } catch (error: any) {
    logger.error({
      message: 'Failed to get messages',
      threadId: req.params.threadId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Delete a thread
router.delete('/:threadId', checkJwt, async (req, res) => {
  try {
    const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
    await chatDb.deleteThread(req.params.threadId, userId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ message: 'Failed to delete thread', error: error.message });
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

export default router;
