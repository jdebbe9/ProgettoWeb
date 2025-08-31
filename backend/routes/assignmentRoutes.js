// backend/routes/assignmentRoutes.js
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/assignmentController');

router.use(requireAuth);

router.get('/', ctrl.list);
router.patch('/:id', ctrl.update);

router.post('/', requireRole('therapist'), ctrl.create);
router.delete('/:id', requireRole('therapist'), ctrl.remove);

module.exports = router;

