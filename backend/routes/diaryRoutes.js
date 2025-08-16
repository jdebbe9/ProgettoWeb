// routes/diaryRoutes.js
const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const { requireAuth, requireRole, wrapAsync } = require('../middleware/authMiddleware');

// Tutto il diario è riservato ai pazienti autenticati
router.use(requireAuth);
router.use(requireRole('patient'));

// Crea una nuova entry
router.post('/', wrapAsync(diaryController.createDiaryEntry));

// Lista le mie entry (supporta ?page=&limit=)
router.get('/', wrapAsync(diaryController.getMyDiaryEntries));

// Aggiorna parzialmente una entry (contenuto)
router.patch('/:entryId', wrapAsync(diaryController.updateDiaryEntry));

// (Opzionale) Cancella una entry
// router.delete('/:entryId', wrapAsync(diaryController.deleteDiaryEntry));

module.exports = router;

