const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/therapistController');
const { requireAuth, requireRole, wrapAsync } = require('../middleware/authMiddleware');

// Tutte le route qui sotto: solo TERAPEUTI autenticati
router.use(requireAuth);
router.use(requireRole('therapist'));

// Elenco pazienti (con ?page=&limit=)
router.get('/patients', wrapAsync(ctrl.getAllPatients));

// Dettaglio paziente (profilo, diario, questionario, appuntamenti)
router.get('/patients/:id', wrapAsync(ctrl.getPatientDetails));

module.exports = router;

