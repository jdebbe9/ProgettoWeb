// backend/routes/authRoutes.js
const express = require('express');
const path = require('path');

const authController = require(path.resolve(__dirname, '..', 'controllers', 'authController.js'));
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Rate limit opzionale
let limiter = null;
try {
  const rateLimit = require('express-rate-limit');
  limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Troppi tentativi, riprova fra qualche minuto' }
  });
} catch (e) {}

// ── AUTH BASE (JWT access nel header + refresh cookie httpOnly)
if (limiter) {
  router.post('/register', limiter, authController.register);
  router.post('/login',    limiter, authController.login);
} else {
  router.post('/register', authController.register);
  router.post('/login',    authController.login);
}

router.post('/refresh', authController.refresh);
router.get('/refresh',  authController.refresh); 


router.post('/logout', requireAuth, authController.logout);
router.get('/me',      requireAuth, authController.me);
router.patch('/me',    requireAuth, authController.updateMe);


module.exports = router;



