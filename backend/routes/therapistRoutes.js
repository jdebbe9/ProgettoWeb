// backend/routes/therapistRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/therapistController');
const { requireAuth, requireRole, wrapAsync } = require('../middleware/authMiddleware');

// Tutte le route qui sotto: solo TERAPEUTI autenticati
router.use(requireAuth);
router.use(requireRole('therapist'));

// Wrapper: se c'è ?q= usiamo la ricerca, altrimenti lista paginata
const listOrSearch = (req, res, next) => {
  const q = (req.query.q || '').trim();
  if (q.length >= 2) return ctrl.searchPatients(req, res, next);
  return ctrl.getAllPatients(req, res, next);
};

// Elenco/ricerca pazienti (con ?page=&limit= oppure ?q=&limit=)
router.get('/patients', wrapAsync(listOrSearch));

// Endpoint esplicito di ricerca (equivalente a /patients?q=...)
router.get('/patients/search', wrapAsync(ctrl.searchPatients));

// Dettaglio paziente (profilo, diario, questionario, appuntamenti)
router.get('/patients/:id', wrapAsync(ctrl.getPatientDetails));

module.exports = router;


