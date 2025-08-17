const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/appointmentController');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', requireRole('patient'), ctrl.create);
router.put('/:id', requireRole('therapist'), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;



