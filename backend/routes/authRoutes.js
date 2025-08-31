const express = require('express');
const path = require('path');

const authController = require(path.resolve(__dirname, '..', 'controllers', 'authController.js'));
const passwordController = require(path.resolve(__dirname, '..', 'controllers', 'passwordController.js'));
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Rate limit opzionale
let limiter = null;
let forgotLimiter = null;
try {
  const rateLimit = require('express-rate-limit');
  limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Troppi tentativi, riprova fra qualche minuto' }
  });
  forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Troppe richieste di reset, riprova più tardi' }
  });
} catch (e) {}

// ── AUTH
if (limiter) {
  router.post('/register', limiter, authController.register);
  router.post('/login',    limiter, authController.login);
} else {
  router.post('/register', authController.register);
  router.post('/login',    authController.login);
}

router.post('/refresh', authController.refresh);
router.get('/refresh',  authController.refresh); // utile in dev
router.post('/logout',  authController.logout);

// Protette
router.get('/me',   requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateMe);

// ── PASSWORD RESET
if (forgotLimiter) {
  router.post('/forgot-password', forgotLimiter, passwordController.forgotPassword);
} else {
  router.post('/forgot-password', passwordController.forgotPassword);
}
router.post('/reset-password',  passwordController.resetPassword);

module.exports = router;







