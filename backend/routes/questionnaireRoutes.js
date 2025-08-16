// routes/questionnaireRoutes.js
const express = require('express');
const router = express.Router();
const questionnaireController = require('../controllers/questionnaireController');
const { requireAuth, requireRole, wrapAsync } = require('../middleware/authMiddleware');

// Tutte le route del questionario: solo per PAZIENTI autenticati
router.use(requireAuth);
router.use(requireRole('patient'));

// Invia il questionario iniziale
router.post('/', wrapAsync(questionnaireController.submitQuestionnaire));

// Recupera il MIO questionario (path esplicito /me)
router.get('/me', wrapAsync(questionnaireController.getMyQuestionnaire));

module.exports = router;

