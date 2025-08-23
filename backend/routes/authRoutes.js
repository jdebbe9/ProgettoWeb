// routes/authRoutes.js
const express = require('express');
const path = require('path');

const authController = require(path.resolve(__dirname, '..', 'controllers', 'authController.js'));
const passwordController = require(path.resolve(__dirname, '..', 'controllers', 'passwordController.js'));
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Rate limit opzionale (evita crash se il pacchetto manca)
let limiter = null;
let forgotLimiter = null;
try {
  const rateLimit = require('express-rate-limit');

  // Limiter per register/login
  limiter = rateLimit({
    windowMs: 5 * 60 * 1000,       // 5 minuti
    max: 5,                        // max 5 tentativi/IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Troppi tentativi, riprova fra qualche minuto' }
  });

  // Limiter più ampio per forgot password
  forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,      // 15 minuti
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Troppe richieste di reset, riprova più tardi' }
  });
} catch {
  // Se non hai installato express-rate-limit, non usiamo i limiter.
  // Per abilitarli: npm i express-rate-limit
}

// ── ROUTES AUTH ──────────────────────────────────────────────────────────────
if (limiter) {
  router.post('/register', limiter, authController.register);
  router.post('/login',    limiter, authController.login);
} else {
  router.post('/register', authController.register);
  router.post('/login',    authController.login);
}

router.post('/refresh', authController.refresh);
router.post('/logout',  authController.logout);

// Rotte protette
router.get('/me',    requireAuth, authController.me);
router.patch('/me',  requireAuth, authController.updateMe); // <-- FIX: usa authController

// ── PASSWORD RESET ───────────────────────────────────────────────────────────
if (forgotLimiter) {
  router.post('/forgot-password', forgotLimiter, passwordController.forgotPassword);
} else {
  router.post('/forgot-password', passwordController.forgotPassword);
}
router.post('/reset-password',  passwordController.resetPassword);

module.exports = router;






