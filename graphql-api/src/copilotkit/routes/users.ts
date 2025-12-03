import express from 'express';
import { chatDb } from '../database';
import { checkJwt, addUserToRequest, isAdmin } from '../auth';
import logger from '../../logger';

const router = express.Router();

// Get current user profile
router.get('/me', checkJwt, addUserToRequest, (req, res) => {
  if (!req.user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(req.user);
});

// Update current user preferences
router.put('/me/preferences', checkJwt, addUserToRequest, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { allowAdminViewing } = req.body;
    if (typeof allowAdminViewing !== 'boolean') {
      return res.status(400).json({ error: 'Invalid value for allowAdminViewing' });
    }
    await chatDb.updateUserPrivacy(req.user.userId, allowAdminViewing);
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ message: 'Failed to update user preferences', error: error.message });
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// Update a user's role (admins only)
router.put('/:userId/role', checkJwt, addUserToRequest, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['user', 'viewer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role provided' });
    }
    await chatDb.updateUserRole(userId, role);
    res.json({ success: true, userId, role });
  } catch (error: any) {
    logger.error({ message: 'Failed to update user role', error: error.message });
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;
