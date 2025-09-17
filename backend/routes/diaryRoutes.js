// routes/diaryRoutes.js
const express = require('express');
const router = express.Router();
const diaryController = require('../controllers/diaryController');
const { requireAuth, requireRole, wrapAsync } = require('../middleware/authMiddleware');


router.use(requireAuth);
router.use(requireRole('patient'));


router.post('/', wrapAsync(diaryController.createDiaryEntry));


router.get('/', wrapAsync(diaryController.getMyDiaryEntries));

router.delete('/:entryId', wrapAsync(diaryController.deleteDiaryEntry));


router.patch('/:entryId', wrapAsync(diaryController.updateDiaryEntry));



module.exports = router;
