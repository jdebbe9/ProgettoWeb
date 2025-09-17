// routes/notificationsRoutes.js
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/notificationController'); 

router.use(requireAuth);


router.get('/', ctrl.list);
router.get('/unread-count', ctrl.getUnreadCount);


router.patch('/:id/read', ctrl.markOneRead);


['mark-all-read', 'read-all', 'readall'].forEach((p) => {
  router.patch(`/${p}`, ctrl.markAllRead);
  router.post(`/${p}`,  ctrl.markAllRead);
});


router.delete('/', ctrl.clearAll);

module.exports = router;








