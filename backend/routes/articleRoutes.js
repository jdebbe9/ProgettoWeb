// backend/routes/articleRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/articleController');

// Pazienti (autenticati): elenco + singolo articolo pubblicato
router.get('/public', requireAuth, ctrl.listPublishedArticles);
router.get('/public/:id', requireAuth, ctrl.getPublishedArticle);

// Da qui in poi: solo terapeuta
router.use(requireAuth, requireRole('therapist'));

router.get('/', ctrl.listArticles);
router.post('/', ctrl.createArticle);
router.get('/:id', ctrl.getArticle);
router.patch('/:id', ctrl.updateArticle);
router.delete('/:id', ctrl.deleteArticle);

module.exports = router;

