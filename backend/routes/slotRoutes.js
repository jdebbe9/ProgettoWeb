const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/slotController');

router.get('/availability', requireAuth, ctrl.availability);

module.exports = router;
