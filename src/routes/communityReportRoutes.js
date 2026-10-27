const express = require('express');
const router = express.Router();
const {
  getReportsByTag,
  toggleFailureSimulation,
} = require('../controllers/communityReportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', getReportsByTag);
router.post(
  '/simulate-failure',
  authenticate,
  authorize('admin'),
  toggleFailureSimulation
);

module.exports = router;
