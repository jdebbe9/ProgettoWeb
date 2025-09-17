const router = require('express').Router();
const path = require('path');
const { requireAuth, requireRole } = require(path.resolve(__dirname, '..', 'middleware', 'authMiddleware.js'));
const ctrl = require(path.resolve(__dirname, '..', 'controllers', 'therapistNotesController.js'));

router.use(requireAuth, requireRole('therapist'));

router.get('/:patientId', ctrl.get);
router.put('/:patientId', ctrl.save);

module.exports = router;
