// backend/routes/articleRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/articleController');


router.get('/public', requireAuth, ctrl.listPublishedArticles);
router.get('/public/:id', requireAuth, ctrl.getPublishedArticle);


router.use(requireAuth, requireRole('therapist'));

router.get('/', ctrl.listArticles);
router.post('/', ctrl.createArticle);
router.get('/:id', ctrl.getArticle);
router.patch('/:id', ctrl.updateArticle);
router.delete('/:id', ctrl.deleteArticle);

module.exports = router;

