/**
 * AI Collaboration Controller
 *
 * HTTP controller for AI collaboration API endpoints
 */

const httpStatus = require('http-status');
const { getOrchestrator } = require('../services/ai-collaboration/orchestrator');
const { successResponse } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Get singleton orchestrator instance
const orchestrator = getOrchestrator();

/**
 * Generate code with full collaboration loop
 * POST /api/v1/ai-collaborate/generate
 */
const generate = async (req, res, next) => {
  try {
    const { request, context, qualityThreshold, maxIterations, useFeedbackLoop } = req.body;

    logger.info('[AI Collaborate] Generate request received', {
      requestLength: request.length,
      qualityThreshold,
      maxIterations,
      useFeedbackLoop
    });

    const result = await orchestrator.processRequest({
      userRequest: request,
      context: context || {},
      qualityThreshold,
      maxIterations,
      useFeedbackLoop
    });

    logger.info('[AI Collaborate] Generation completed', {
      sessionId: result.sessionId,
      qualityScore: result.qualityScore.total,
      iterations: result.iterations.total
    });

    return successResponse(res, result, 'Code generation completed successfully');
  } catch (error) {
    logger.error('[AI Collaborate] Generation failed', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Generate code only (no review)
 * POST /api/v1/ai-collaborate/generate-only
 */
const generateOnly = async (req, res, next) => {
  try {
    const { request, context } = req.body;

    logger.info('[AI Collaborate] Generate-only request received', {
      requestLength: request.length
    });

    const result = await orchestrator.generateCode({
      userRequest: request,
      context: context || {}
    });

    logger.info('[AI Collaborate] Generate-only completed', {
      sessionId: result.sessionId
    });

    return successResponse(res, result, 'Code generated successfully');
  } catch (error) {
    logger.error('[AI Collaborate] Generate-only failed', {
      error: error.message
    });
    next(error);
  }
};

/**
 * Review existing code
 * POST /api/v1/ai-collaborate/review
 */
const review = async (req, res, next) => {
  try {
    const { code, request, context, focusAreas } = req.body;

    logger.info('[AI Collaborate] Review request received', {
      codeLength: code.length,
      focusAreasCount: focusAreas?.length || 0
    });

    const result = await orchestrator.reviewCode({
      code,
      userRequest: request || 'Code review request',
      context: context || {}
    });

    logger.info('[AI Collaborate] Review completed', {
      sessionId: result.sessionId,
      qualityScore: result.review.qualityScore
    });

    return successResponse(res, result, 'Code review completed successfully');
  } catch (error) {
    logger.error('[AI Collaborate] Review failed', {
      error: error.message
    });
    next(error);
  }
};

/**
 * Refine code based on feedback
 * POST /api/v1/ai-collaborate/refine
 */
const refine = async (req, res, next) => {
  try {
    const { code, feedback, request, context } = req.body;

    logger.info('[AI Collaborate] Refine request received', {
      codeLength: code.length,
      feedbackLength: feedback.length
    });

    const result = await orchestrator.refineCode({
      code,
      feedback,
      userRequest: request || 'Code refinement request',
      context: context || {}
    });

    logger.info('[AI Collaborate] Refinement completed', {
      sessionId: result.sessionId,
      changesCount: result.changesFromFeedback?.length || 0
    });

    return successResponse(res, result, 'Code refinement completed successfully');
  } catch (error) {
    logger.error('[AI Collaborate] Refinement failed', {
      error: error.message
    });
    next(error);
  }
};

/**
 * Validate code against specific criteria
 * POST /api/v1/ai-collaborate/validate
 */
const validate = async (req, res, next) => {
  try {
    const { code, criteria, context } = req.body;

    logger.info('[AI Collaborate] Validate request received', {
      codeLength: code.length,
      criteriaCount: criteria.length
    });

    // Use Codex analyzer directly for validation
    const { CodexAnalyzer } = require('../services/ai-collaboration/codex-analyzer');
    const codexAnalyzer = new CodexAnalyzer();

    const result = await codexAnalyzer.validate({
      code,
      criteria
    });

    logger.info('[AI Collaborate] Validation completed', {
      valid: result.valid,
      errorsCount: result.errors?.length || 0
    });

    return successResponse(res, result, 'Code validation completed successfully');
  } catch (error) {
    logger.error('[AI Collaborate] Validation failed', {
      error: error.message
    });
    next(error);
  }
};

/**
 * Get collaboration session logs
 * GET /api/v1/ai-collaborate/logs/:sessionId
 */
const getLogs = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    logger.info('[AI Collaborate] Logs request received', {
      sessionId
    });

    const result = orchestrator.getSessionLogs(sessionId);

    if (!result.logs || result.logs.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'No logs found for this session');
    }

    logger.info('[AI Collaborate] Logs retrieved', {
      sessionId,
      logsCount: result.logs.length
    });

    return successResponse(res, result, 'Logs retrieved successfully');
  } catch (error) {
    logger.error('[AI Collaborate] Logs retrieval failed', {
      error: error.message
    });
    next(error);
  }
};

/**
 * Get orchestrator status
 * GET /api/v1/ai-collaborate/status
 */
const getStatus = async (req, res, next) => {
  try {
    const status = orchestrator.getStatus();

    return successResponse(res, status, 'Orchestrator status retrieved successfully');
  } catch (error) {
    logger.error('[AI Collaborate] Status check failed', {
      error: error.message
    });
    next(error);
  }
};

module.exports = {
  generate,
  generateOnly,
  review,
  refine,
  validate,
  getLogs,
  getStatus
};
