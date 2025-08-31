// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/notificationController');

router.get('/', requireAuth, ctrl.list);
router.get('/unread-count', requireAuth, ctrl.unreadCount);
router.patch('/:id/read', requireAuth, ctrl.markRead);
router.patch('/mark-all', requireAuth, ctrl.markAll);
router.delete('/', requireAuth, ctrl.clearAll);

module.exports = router;





