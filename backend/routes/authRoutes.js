// routes/authRoutes.js
const express = require('express');
const path = require('path');
const authController = require(path.resolve(__dirname, '..', 'controllers', 'authController.js'));
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Rate limit opzionale (evita crash se il pacchetto manca)
let limiter = null;
try {
  const rateLimit = require('express-rate-limit');
  limiter = rateLimit({
    windowMs: 5 * 60 * 1000,       // 5 minuti
    max: 5,                        // max 5 tentativi/IP
    message: { message: 'Troppi tentativi, riprova fra qualche minuto' }
  });
} catch {
  // Se non hai installato express-rate-limit, semplicemente non usiamo il limiter.
  // Per abilitarlo: npm i express-rate-limit
}

// ── ROUTES AUTH ──────────────────────────────────────────────────────────────
// NB: manteniamo '/register' (se preferisci '/signup', cambia qui e nei test)
if (limiter) {
  router.post('/register', limiter, authController.register);
  router.post('/login',    limiter, authController.login);
} else {
  router.post('/register', authController.register);
  router.post('/login',    authController.login);
}

router.post('/refresh', authController.refresh);
router.post('/logout',  authController.logout);

// Rotta protetta: richiede Authorization: Bearer <accessToken>
router.get('/me', requireAuth, authController.me);

module.exports = router;




