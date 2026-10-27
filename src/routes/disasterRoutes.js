const express = require('express');
const router = express.Router();
const {
  createDisaster,
  getDisasters,
  getDisasterById,
  updateDisaster,
  deleteDisaster,
} = require('../controllers/disasterController');
const { getNearbyResourcesForDisaster } = require('../controllers/resourceController');
const { getReportsForDisaster } = require('../controllers/communityReportController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateDisasterInput, validateRadiusQuery } = require('../middleware/validator');

// Disaster CRUD
router
  .route('/')
  .get(getDisasters)
  .post(
    authenticate,
    authorize('admin', 'contributor'),
    validateDisasterInput,
    createDisaster
  );

router
  .route('/:id')
  .get(getDisasterById)
  .put(
    authenticate,
    authorize('admin', 'contributor'),
    validateDisasterInput,
    updateDisaster
  )
  .patch(
    authenticate,
    authorize('admin', 'contributor'),
    validateDisasterInput,
    updateDisaster
  )
  .delete(authenticate, authorize('admin', 'contributor'), deleteDisaster);

// Nearby Resources for a Disaster (Requirement 3: GET /disasters/:id/resources?lat=<lat>&lng=<lng>&radius=<km>)
router.get('/:id/resources', validateRadiusQuery, getNearbyResourcesForDisaster);

// Community Reports for a Disaster (Requirement 4: GET /disasters/:id/reports)
router.get('/:id/reports', getReportsForDisaster);
router.get('/:id/community-reports', getReportsForDisaster);

module.exports = router;
