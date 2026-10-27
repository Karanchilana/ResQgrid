/**
 * Seeded mock location dictionary for offline, deterministic geocoding.
 * Coordinates are formatted strictly in GeoJSON [longitude, latitude].
 */
const KNOWN_LOCATIONS = {
  'manhattan, nyc': {
    canonicalName: 'Manhattan, NYC',
    coordinates: [-73.9712, 40.7831], // [longitude, latitude]
  },
  'manhattan': {
    canonicalName: 'Manhattan, NYC',
    coordinates: [-73.9712, 40.7831],
  },
  'brooklyn, nyc': {
    canonicalName: 'Brooklyn, NYC',
    coordinates: [-73.9442, 40.6782],
  },
  'brooklyn': {
    canonicalName: 'Brooklyn, NYC',
    coordinates: [-73.9442, 40.6782],
  },
  'queens, nyc': {
    canonicalName: 'Queens, NYC',
    coordinates: [-73.7949, 40.7282],
  },
  'downtown sector 4': {
    canonicalName: 'Downtown Sector 4',
    coordinates: [-73.985131, 40.748817],
  },
  'north harbor': {
    canonicalName: 'North Harbor',
    coordinates: [-74.0121, 40.7061],
  },
  'river valley': {
    canonicalName: 'River Valley',
    coordinates: [-73.9712, 40.7648],
  },
  'metro central': {
    canonicalName: 'Metro Central',
    coordinates: [-73.9876, 40.7505],
  },
  'westside suburb': {
    canonicalName: 'Westside Suburb',
    coordinates: [-74.0015, 40.7325],
  },
  'east industrial park': {
    canonicalName: 'East Industrial Park',
    coordinates: [-73.9554, 40.7282],
  },
};

/**
 * Extract known location keywords from free-form text (e.g. description).
 * Example: "Heavy flooding has affected Manhattan, NYC." -> "Manhattan, NYC"
 */
const extractLocationFromText = (text) => {
  if (!text || typeof text !== 'string') return null;
  const lowerText = text.toLowerCase();

  // Sort keys by length descending to match more specific names first
  const keys = Object.keys(KNOWN_LOCATIONS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lowerText.includes(key)) {
      return KNOWN_LOCATIONS[key];
    }
  }
  return null;
};

/**
 * Resolves location from location field or automatically extracts from description.
 *
 * @param {Object|string} input - Explicit location object or location name string
 * @param {string} fallbackText - Description or context to extract location if not explicitly provided
 * @returns {Object} { name: string, resolved: boolean, coordinates: { type: 'Point', coordinates: [lng, lat] } | null }
 */
const resolveLocation = (input, fallbackText = '') => {
  let locationName = '';
  let directCoords = null;

  if (typeof input === 'string') {
    locationName = input.trim();
  } else if (typeof input === 'object' && input !== null) {
    locationName = (input.name || '').trim();
    if (Array.isArray(input.coordinates) && input.coordinates.length === 2) {
      const [lng, lat] = input.coordinates.map(Number);
      if (
        !isNaN(lng) &&
        !isNaN(lat) &&
        lng >= -180 &&
        lng <= 180 &&
        lat >= -90 &&
        lat <= 90
      ) {
        directCoords = [lng, lat];
      }
    }
  }

  // If explicit valid coordinates were provided
  if (directCoords) {
    return {
      name: locationName || 'Custom Coordinates',
      resolved: true,
      coordinates: {
        type: 'Point',
        coordinates: directCoords,
      },
    };
  }

  // If locationName was provided, look it up
  if (locationName) {
    const normalizedKey = locationName.toLowerCase().replace(/[^a-z0-9,\s]/g, '').trim();
    let matched = KNOWN_LOCATIONS[normalizedKey];

    if (!matched) {
      const foundKey = Object.keys(KNOWN_LOCATIONS).find((key) =>
        normalizedKey.includes(key) || key.includes(normalizedKey)
      );
      if (foundKey) {
        matched = KNOWN_LOCATIONS[foundKey];
      }
    }

    if (matched) {
      return {
        name: matched.canonicalName,
        resolved: true,
        coordinates: {
          type: 'Point',
          coordinates: [...matched.coordinates],
        },
      };
    }
  }

  // Attempt extraction from description text (Assignment Requirement 2)
  if (fallbackText) {
    const extracted = extractLocationFromText(fallbackText);
    if (extracted) {
      return {
        name: extracted.canonicalName,
        resolved: true,
        coordinates: {
          type: 'Point',
          coordinates: [...extracted.coordinates],
        },
      };
    }
  }

  // Unresolved location: do NOT invent coordinates
  return {
    name: locationName || 'Unresolved Location',
    resolved: false,
    coordinates: null,
  };
};

module.exports = {
  resolveLocation,
  extractLocationFromText,
  KNOWN_LOCATIONS,
};
