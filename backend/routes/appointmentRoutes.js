// routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Tutte le rotte richiedono autenticazione
router.use(requireAuth);

// Crea appuntamento (solo paziente)
router.post('/', requireRole('patient'), appointmentController.bookAppointment);

// Lista appuntamenti dell’utente loggato (paziente o terapeuta)
router.get('/', appointmentController.getMyAppointments);

// Aggiorna stato/note (terapeuta owner può confermare/cancellare; paziente owner può cancellare)
// Usiamo PATCH perché è un update parziale
router.patch('/:id', appointmentController.updateAppointment);

module.exports = router;

