const Resource = require('../models/Resource');
const Disaster = require('../models/Disaster');

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula.
 */
const calculateDistanceKm = (coords1, coords2) => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

/**
 * Retrieve resources within radius of a disaster or custom lat/lng.
 * GET /disasters/:id/resources?lat=<lat>&lng=<lng>&radius=<km>
 * Public
 */
const getNearbyResourcesForDisaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const radiusKm = req.validatedRadius || 5;

    let targetCoords = null;

    // Check if query provides custom lat & lng
    if (req.query.lat !== undefined && req.query.lng !== undefined) {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: lat and lng query parameters must be valid numbers (-90 to 90 for lat, -180 to 180 for lng).',
        });
      }
      targetCoords = [lng, lat]; // GeoJSON expects [longitude, latitude]
    } else {
      // Use disaster's resolved coordinates
      const disaster = await Disaster.findById(id);
      if (!disaster) {
        return res.status(404).json({
          success: false,
          error: `Disaster not found with id '${id}'`,
        });
      }

      if (
        !disaster.location ||
        !disaster.location.resolved ||
        !disaster.location.coordinates ||
        !Array.isArray(disaster.location.coordinates.coordinates)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Geospatial search failed: Disaster location is unresolved and has no coordinates. Please provide ?lat=<lat>&lng=<lng> in query params or resolve disaster location.',
          disaster: {
            id: disaster._id,
            title: disaster.title,
            locationName: disaster.location ? disaster.location.name : 'Unknown',
            resolved: false,
          },
        });
      }

      targetCoords = disaster.location.coordinates.coordinates;
    }

    const maxDistanceMeters = radiusKm * 1000;

    const filter = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: targetCoords,
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    };

    if (req.query.type) {
      filter.type = req.query.type.toLowerCase().trim();
    }

    const resources = await Resource.find(filter);

    const annotatedResources = resources.map((r) => {
      const obj = r.toJSON();
      obj.distanceKm = calculateDistanceKm(targetCoords, r.location.coordinates);
      return obj;
    });

    return res.status(200).json({
      success: true,
      disasterId: id,
      searchCoordinates: {
        longitude: targetCoords[0],
        latitude: targetCoords[1],
      },
      radiusKm,
      count: annotatedResources.length,
      data: annotatedResources,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new emergency resource (hospital, shelter, food, water, rescue).
 * POST /resources
 * Protected: Admin or Contributor
 */
const createResource = async (req, res, next) => {
  try {
    const { name, type, capacity, contact, status, location } = req.body;

    const resource = await Resource.create({
      name: name.trim(),
      type,
      capacity: capacity || 0,
      contact: contact || '',
      status: status || 'available',
      location: {
        type: 'Point',
        coordinates: location.coordinates, // [longitude, latitude]
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Resource registered successfully',
      data: resource,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List all resources with optional type filter.
 * GET /resources
 * Public
 */
const getResources = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type.toLowerCase().trim();
    }
    if (req.query.status) {
      filter.status = req.query.status.toLowerCase().trim();
    }

    const resources = await Resource.find(filter);
    return res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNearbyResourcesForDisaster,
  createResource,
  getResources,
};
