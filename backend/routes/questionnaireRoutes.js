// routes/questionnaireRoutes.js
const express = require('express');
const router = express.Router();
const questionnaireController = require('../controllers/questionnaireController');
const { requireAuth, requireRole, wrapAsync } = require('../middleware/authMiddleware');


router.use(requireAuth);
router.use(requireRole('patient'));


router.post('/', wrapAsync(questionnaireController.submitQuestionnaire));


router.get('/me', wrapAsync(questionnaireController.getMyQuestionnaire));

module.exports = router;

