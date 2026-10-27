/**
 * Input validation helpers and middleware.
 */

const validateDisasterInput = (req, res, next) => {
  const { title, description, location } = req.body;

  if (req.method === 'POST') {
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Title is required and must be a non-empty string.',
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Description is required and must be a non-empty string.',
      });
    }
  }

  // Check coordinates if passed directly
  if (location && typeof location === 'object' && location.coordinates) {
    const coords = location.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Coordinates must be an array of [longitude, latitude].',
      });
    }
    const [lng, lat] = coords.map(Number);
    if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Coordinates must be valid numbers: longitude between -180 and 180, latitude between -90 and 90.',
      });
    }
  }

  next();
};

const validateRadiusQuery = (req, res, next) => {
  if (req.query.radius !== undefined) {
    const radiusNum = Number(req.query.radius);
    if (isNaN(radiusNum) || radiusNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Radius query parameter must be a positive number greater than 0 (in kilometers).',
      });
    }
    req.validatedRadius = radiusNum;
  } else {
    req.validatedRadius = 5; // Default 5 km
  }
  next();
};

const validateResourceInput = (req, res, next) => {
  const { name, type, location } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Resource name is required.',
    });
  }

  const validTypes = ['shelter', 'hospital', 'food', 'water', 'rescue', 'food_water'];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Validation Error: Resource type must be one of: ${validTypes.join(', ')}`,
    });
  }

  if (!location || !location.coordinates) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Resource location with GeoJSON coordinates [longitude, latitude] is required.',
    });
  }

  const coords = location.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Coordinates must be an array of [longitude, latitude].',
    });
  }

  const [lng, lat] = coords.map(Number);
  if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Coordinates must be valid [longitude, latitude] numbers (-180 to 180, -90 to 90).',
    });
  }

  next();
};

module.exports = {
  validateDisasterInput,
  validateRadiusQuery,
  validateResourceInput,
};
