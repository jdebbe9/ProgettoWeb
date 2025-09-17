// routes/notificationsRoutes.js
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/notificationController'); // <– il tuo file

router.use(requireAuth);

// LIST + COUNT
router.get('/', ctrl.list);
router.get('/unread-count', ctrl.getUnreadCount);

// READ ONE
router.patch('/:id/read', ctrl.markOneRead);

// MARK ALL READ — alias + metodi compat
['mark-all-read', 'read-all', 'readall'].forEach((p) => {
  router.patch(`/${p}`, ctrl.markAllRead);
  router.post(`/${p}`,  ctrl.markAllRead);
});

// CLEAR ALL (opzionale)
router.delete('/', ctrl.clearAll);

module.exports = router;








