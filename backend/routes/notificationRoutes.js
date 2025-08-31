// backend/routes/notificationRoutes.js
const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/notificationController');

const router = express.Router();

router.get('/unread-count', requireAuth, ctrl.getUnreadCount);
router.get('/', requireAuth, ctrl.list);
router.patch('/:id/read', requireAuth, ctrl.markOneRead);
router.post(['/mark-all-read', '/markAllRead'], requireAuth, ctrl.markAllRead); // 👈 entrambe
router.delete('/', requireAuth, ctrl.clearAll);

module.exports = router;







