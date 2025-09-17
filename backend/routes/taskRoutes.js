// backend/routes/taskRoutes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/taskController');
const { requireAuth, wrapAsync } = require('../middleware/authMiddleware');


router.use(requireAuth);


router.get('/', wrapAsync(ctrl.list));


router.post('/', wrapAsync(ctrl.create));


router.patch('/:id', wrapAsync(ctrl.update));

router.delete('/:id', wrapAsync(ctrl.remove));

module.exports = router;
