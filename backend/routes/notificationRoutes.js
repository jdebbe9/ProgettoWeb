// backend/routes/notificationRoutes.js
const router = require('express').Router();
const path = require('path');
const { requireAuth } = require('../middleware/authMiddleware');

const notificationController = require(
  path.resolve(__dirname, '..', 'controllers', 'notificationController.js')
);

// lista + conteggio non lette
router.get('/',              requireAuth, notificationController.list);
router.get('/unread-count',  requireAuth, notificationController.unreadCount);

// letture
router.patch('/read-all',    requireAuth, notificationController.markAllRead);
router.patch('/:id/read',    requireAuth, notificationController.markRead);

module.exports = router;



