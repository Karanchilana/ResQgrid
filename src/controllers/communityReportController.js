const Disaster = require('../models/Disaster');
const {
  getCommunityReports,
  setSimulateFailure,
} = require('../services/communityReportProvider');
const { CACHE_TTL_SECONDS } = require('../config/env');

/**
 * Fetch cached/live community reports relevant to a specific disaster.
 * GET /disasters/:id/community-reports
 * Public
 */
const getReportsForDisaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const disaster = await Disaster.findById(id);

    if (!disaster) {
      return res.status(404).json({
        success: false,
        error: `Disaster not found with id '${id}'`,
      });
    }

    const cacheKey = `disaster_${id}`;
    const tags = disaster.tags || [];

    const result = await getCommunityReports(cacheKey, tags, CACHE_TTL_SECONDS);

    return res.status(200).json({
      success: true,
      disasterId: id,
      disasterTitle: disaster.title,
      disasterTags: tags,
      source: result.source, // 'live', 'cache', or 'fallback'
      ttlSeconds: CACHE_TTL_SECONDS,
      count: result.count,
      data: result.data,
      warning: result.warning || null,
      error: result.error || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch cached/live community reports filtered by tag.
 * GET /community-reports?tag=flood
 * Public
 */
const getReportsByTag = async (req, res, next) => {
  try {
    const tag = req.query.tag ? req.query.tag.trim() : 'all';
    const cacheKey = `tag_${tag}`;
    const tags = req.query.tag ? [req.query.tag.trim()] : [];

    const result = await getCommunityReports(cacheKey, tags, CACHE_TTL_SECONDS);

    return res.status(200).json({
      success: true,
      tag,
      source: result.source, // 'live', 'cache', or 'fallback'
      ttlSeconds: CACHE_TTL_SECONDS,
      count: result.count,
      data: result.data,
      warning: result.warning || null,
      error: result.error || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Testing utility endpoint to toggle failure simulation.
 * POST /community-reports/simulate-failure
 * Protected: Admin
 */
const toggleFailureSimulation = (req, res) => {
  const { enabled } = req.body;
  setSimulateFailure(Boolean(enabled));

  return res.status(200).json({
    success: true,
    message: `Failure simulation set to ${Boolean(enabled)}`,
    simulateFailure: Boolean(enabled),
  });
};

module.exports = {
  getReportsForDisaster,
  getReportsByTag,
  toggleFailureSimulation,
};
