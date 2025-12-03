import express from 'express';
import { chatDb } from '../database';
import { checkJwt, addUserToRequest, isAdmin } from '../auth';
import logger from '../../logger';

const router = express.Router();

router.use(checkJwt, addUserToRequest, isAdmin);

// Get usage statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await chatDb.getUsageStats();
    res.json(stats);
  } catch (error: any) {
    logger.error({ message: 'Failed to get usage stats', error: error.message });
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

// Get suggestion click statistics
router.get('/stats/suggestions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const stats = await chatDb.getSuggestionStats(limit);
    res.json(stats);
  } catch (error: any) {
    logger.error({ message: 'Failed to get suggestion stats', error: error.message });
    res.status(500).json({ error: 'Failed to get suggestion stats' });
  }
});

// List all viewable threads for admins
router.get('/threads', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const threads = await chatDb.getAllThreadsForAdmin(limit, offset);
    res.json(threads);
  } catch (error: any) {
    logger.error({ message: 'Failed to get all threads for admin', error: error.message });
    res.status(500).json({ error: 'Failed to get threads' });
  }
});

// Get messages for a specific thread for admins
router.get('/threads/:threadId/messages', async (req, res) => {
  try {
    const { threadId } = req.params;
    const messages = await chatDb.getMessagesForAdmin(threadId);
    if (messages === null) {
      return res.status(403).json({ error: 'Access to this thread is denied by user privacy settings.' });
    }
    res.json(messages);
  } catch (error: any) {
    logger.error({ message: 'Failed to get messages for admin', error: error.message });
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Delete a thread (admin only)
router.delete('/threads/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    await chatDb.deleteThreadAsAdmin(threadId);
    logger.info({ message: 'Admin deleted thread', threadId, adminUserId: req.user?.userId });
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ message: 'Failed to delete thread as admin', error: error.message });
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

export default router;
