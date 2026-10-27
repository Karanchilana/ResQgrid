const { cache } = require('./cacheService');

/**
 * Seeded mock community reports matching founder's schema:
 * { content, user, created_at, tags, urgency }
 */
const MOCK_REPORTS = [
  {
    id: 'rep-001',
    content: 'Need drinking water near Manhattan, water mains have ruptured.',
    user: 'citizen123',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    tags: ['flood', 'water', 'manhattan'],
    urgency: 'critical',
  },
  {
    id: 'rep-002',
    content: 'Temporary evacuation shelter set up at 8th St community center.',
    user: 'volunteer_ny',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    tags: ['shelter', 'food', 'manhattan'],
    urgency: 'medium',
  },
  {
    id: 'rep-003',
    content: 'Elderly residents stranded on second floor near Sector 4.',
    user: 'paramedic_dave',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    tags: ['rescue', 'flood'],
    urgency: 'high',
  },
  {
    id: 'rep-004',
    content: 'Heavy black smoke observed near industrial park warehouse.',
    user: 'local_driver',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    tags: ['fire', 'smoke'],
    urgency: 'high',
  },
];

let simulateFailure = false;

const setSimulateFailure = (value) => {
  simulateFailure = Boolean(value);
};

const fetchRawReportsFromExternalService = async (keyword = null) => {
  if (simulateFailure) {
    throw new Error('External Social Media / Community Report Provider is unreachable (503 Service Unavailable)');
  }

  // Simulate network latency (50ms)
  await new Promise((resolve) => setTimeout(resolve, 50));

  let results = [...MOCK_REPORTS];
  if (keyword) {
    const term = keyword.toLowerCase().trim();
    results = results.filter(
      (r) =>
        r.content.toLowerCase().includes(term) ||
        r.tags.some((t) => t.toLowerCase() === term)
    );
  }

  return results;
};

const getCommunityReports = async (cacheKey, tags = [], ttlSeconds = 60) => {
  const normalizedKey = `community_reports:${cacheKey}`;
  const cachedData = cache.get(normalizedKey);

  if (cachedData) {
    return {
      source: 'cache',
      data: cachedData,
      count: cachedData.length,
    };
  }

  try {
    const primaryTerm = tags.length > 0 ? tags[0] : null;
    const liveData = await fetchRawReportsFromExternalService(primaryTerm);

    cache.set(normalizedKey, liveData, ttlSeconds);

    return {
      source: 'live',
      data: liveData,
      count: liveData.length,
    };
  } catch (err) {
    return {
      source: 'fallback',
      data: [],
      count: 0,
      warning: 'External community report provider failed. Showing graceful fallback.',
      error: err.message,
    };
  }
};

module.exports = {
  getCommunityReports,
  fetchRawReportsFromExternalService,
  setSimulateFailure,
  MOCK_REPORTS,
};
