// backend/routes/bookRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/bookController');

router.use(requireAuth, requireRole('therapist'));

router.get('/', ctrl.listBooks);
router.post('/', ctrl.createBook);
router.get('/:id', ctrl.getBook);
router.patch('/:id', ctrl.updateBook);
router.delete('/:id', ctrl.deleteBook);

module.exports = router;
