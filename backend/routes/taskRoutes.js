// backend/routes/taskRoutes.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/taskController');

router.use(requireAuth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
