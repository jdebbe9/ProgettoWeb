// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/userController');

router.use(requireAuth);

router.get('/me', ctrl.getMe);
router.patch('/me', ctrl.updateMe);

module.exports = router;
