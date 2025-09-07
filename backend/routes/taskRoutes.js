// backend/routes/taskRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/taskController');
const { requireAuth, wrapAsync } = require('../middleware/authMiddleware');

// Tutte le route richiedono autenticazione
router.use(requireAuth);

// LIST: paziente -> i propri; terapeuta -> i propri o ?patient=<id>
router.get('/', wrapAsync(ctrl.list));

// CREATE: sia paziente che terapeuta (il controller imposta patient/me e createdBy)
router.post('/', wrapAsync(ctrl.create));

// UPDATE: sia paziente che terapeuta (NB: il controller non verifica ownership)
router.patch('/:id', wrapAsync(ctrl.update));

// DELETE: sia paziente che terapeuta (il controller verifica ownership)
router.delete('/:id', wrapAsync(ctrl.remove));

module.exports = router;
