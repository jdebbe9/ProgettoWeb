// backend/routes/therapistRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/therapistController');
const { requireAuth, requireRole, wrapAsync } = require('../middleware/authMiddleware');


router.use(requireAuth);
router.use(requireRole('therapist'));


const listOrSearch = (req, res, next) => {
  const q = (req.query.q || '').trim();
  if (q.length >= 2) return ctrl.searchPatients(req, res, next);
  return ctrl.getAllPatients(req, res, next);
};


router.get('/patients', wrapAsync(listOrSearch));


router.get('/patients/search', wrapAsync(ctrl.searchPatients));

router.get('/patients/:id', wrapAsync(ctrl.getPatientDetails));

module.exports = router;


