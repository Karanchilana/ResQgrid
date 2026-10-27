const Disaster = require('../models/Disaster');
const { resolveLocation } = require('../services/locationResolver');
const {
  emitDisasterCreated,
  emitDisasterUpdated,
  emitDisasterDeleted,
} = require('../services/socketService');

/**
 * Create a new disaster record.
 * POST /disasters
 * Protected: Admin or Contributor
 */
const createDisaster = async (req, res, next) => {
  try {
    const { title, description, location, tags, status } = req.body;

    // Resolve location using explicit input or by extracting from description text
    const resolvedLoc = resolveLocation(location, description);

    // Derived strictly from authenticated JWT token
    const disaster = await Disaster.create({
      title: title.trim(),
      description: description.trim(),
      location: resolvedLoc,
      tags: Array.isArray(tags) ? tags.map((t) => t.trim().toLowerCase()) : [],
      status: status || 'active',
      created_by: req.user._id,
    });

    await disaster.populate('created_by', 'name email role');

    // Emit Socket.IO event ONLY after successful DB persistence
    emitDisasterCreated(disaster);

    return res.status(201).json({
      success: true,
      message: 'Disaster reported successfully',
      data: disaster,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List all disasters with optional tag and status filtering.
 * GET /disasters?tag=flood
 * Public
 */
const getDisasters = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.tag) {
      filter.tags = req.query.tag.trim().toLowerCase();
    }

    if (req.query.status) {
      filter.status = req.query.status.trim().toLowerCase();
    }

    const disasters = await Disaster.find(filter)
      .populate('created_by', 'name email role')
      .sort({ created_at: -1 });

    return res.status(200).json({
      success: true,
      count: disasters.length,
      data: disasters,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve a single disaster by ID.
 * GET /disasters/:id
 * Public
 */
const getDisasterById = async (req, res, next) => {
  try {
    const disaster = await Disaster.findById(req.params.id).populate(
      'created_by',
      'name email role'
    );

    if (!disaster) {
      return res.status(404).json({
        success: false,
        error: `Disaster not found with id '${req.params.id}'`,
      });
    }

    return res.status(200).json({
      success: true,
      data: disaster,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update / Patch an existing disaster record.
 * PUT /disasters/:id or PATCH /disasters/:id
 * Protected: Admin can edit any record; Contributor can only edit own record.
 */
const updateDisaster = async (req, res, next) => {
  try {
    const disaster = await Disaster.findById(req.params.id);

    if (!disaster) {
      return res.status(404).json({
        success: false,
        error: `Disaster not found with id '${req.params.id}'`,
      });
    }

    // Authorization rule
    const isOwner = disaster.created_by.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to modify another contributor\'s disaster record.',
      });
    }

    const { title, description, location, tags, status } = req.body;

    if (title !== undefined) disaster.title = title.trim();
    if (description !== undefined) disaster.description = description.trim();
    if (status !== undefined) disaster.status = status;
    if (tags !== undefined) {
      disaster.tags = Array.isArray(tags) ? tags.map((t) => t.trim().toLowerCase()) : [];
    }

    if (location !== undefined || description !== undefined) {
      disaster.location = resolveLocation(location || disaster.location.name, disaster.description);
    }

    await disaster.save();
    await disaster.populate('created_by', 'name email role');

    // Real-time update emitted strictly after successful DB write
    emitDisasterUpdated(disaster);

    return res.status(200).json({
      success: true,
      message: 'Disaster updated successfully',
      data: disaster,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a disaster record.
 * DELETE /disasters/:id
 * Protected: Admin can delete any; Contributor can only delete own record.
 */
const deleteDisaster = async (req, res, next) => {
  try {
    const disaster = await Disaster.findById(req.params.id);

    if (!disaster) {
      return res.status(404).json({
        success: false,
        error: `Disaster not found with id '${req.params.id}'`,
      });
    }

    const isOwner = disaster.created_by.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to delete another contributor\'s disaster record.',
      });
    }

    await disaster.deleteOne();

    emitDisasterDeleted(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Disaster deleted successfully',
      data: { id: req.params.id },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDisaster,
  getDisasters,
  getDisasterById,
  updateDisaster,
  deleteDisaster,
};
