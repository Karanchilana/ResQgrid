const express = require('express');
const router = express.Router();
const {
  createResource,
  getResources,
} = require('../controllers/resourceController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateResourceInput } = require('../middleware/validator');

router
  .route('/')
  .get(getResources)
  .post(
    authenticate,
    authorize('admin', 'contributor'),
    validateResourceInput,
    createResource
  );

module.exports = router;
