// backend/routes/safetyPlanRoutes.js
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/safetyPlanController');

router.use(requireAuth, requireRole('patient'));
router.get('/', ctrl.getMine);
router.put('/', ctrl.upsertMine);

module.exports = router;
