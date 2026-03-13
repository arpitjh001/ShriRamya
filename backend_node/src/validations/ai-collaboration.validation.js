/**
 * AI Collaboration Validation Schemas
 *
 * Joi validation schemas for AI collaboration API endpoints
 */

const Joi = require('joi');

const collaborationValidation = {
  /**
   * POST /api/v1/ai-collaborate/generate
   * Generate code with full collaboration loop
   */
  generate: {
    body: Joi.object({
      request: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .description('The code generation request from the user'),
      
      context: Joi.object({
        existingFiles: Joi.array().items(Joi.string()).optional(),
        requirements: Joi.array().items(Joi.string()).optional(),
        framework: Joi.string().optional(),
        database: Joi.string().optional(),
        techStack: Joi.array().items(Joi.string()).optional(),
        projectStructure: Joi.string().optional(),
        additionalNotes: Joi.string().optional()
      }).optional().description('Additional context for code generation'),
      
      qualityThreshold: Joi.number()
        .min(50)
        .max(100)
        .default(90)
        .optional()
        .description('Quality threshold for accepting code (50-100)'),
      
      maxIterations: Joi.number()
        .min(1)
        .max(10)
        .default(5)
        .optional()
        .description('Maximum iterations for refinement (1-10)'),
      
      useFeedbackLoop: Joi.boolean()
        .default(true)
        .optional()
        .description('Whether to use iterative refinement loop')
    }).required()
  },

  /**
   * POST /api/v1/ai-collaborate/generate-only
   * Generate code without review
   */
  generateOnly: {
    body: Joi.object({
      request: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .description('The code generation request'),
      
      context: Joi.object({
        existingFiles: Joi.array().items(Joi.string()).optional(),
        requirements: Joi.array().items(Joi.string()).optional(),
        framework: Joi.string().optional(),
        database: Joi.string().optional(),
        techStack: Joi.array().items(Joi.string()).optional()
      }).optional()
    }).required()
  },

  /**
   * POST /api/v1/ai-collaborate/review
   * Review existing code
   */
  review: {
    body: Joi.object({
      code: Joi.string()
        .min(1)
        .max(100000)
        .required()
        .description('The code to review'),
      
      request: Joi.string()
        .min(0)
        .max(5000)
        .optional()
        .description('Original request context'),
      
      context: Joi.object({
        existingFiles: Joi.array().items(Joi.string()).optional(),
        requirements: Joi.array().items(Joi.string()).optional(),
        framework: Joi.string().optional(),
        database: Joi.string().optional()
      }).optional(),
      
      focusAreas: Joi.array()
        .items(Joi.string())
        .optional()
        .description('Specific areas to focus on during review')
    }).required()
  },

  /**
   * POST /api/v1/ai-collaborate/refine
   * Refine code based on feedback
   */
  refine: {
    body: Joi.object({
      code: Joi.string()
        .min(1)
        .max(100000)
        .required()
        .description('Current code to refine'),
      
      feedback: Joi.string()
        .min(10)
        .max(10000)
        .required()
        .description('Feedback to apply'),
      
      request: Joi.string()
        .min(0)
        .max(5000)
        .optional()
        .description('Original request context'),
      
      context: Joi.object({
        existingFiles: Joi.array().items(Joi.string()).optional(),
        requirements: Joi.array().items(Joi.string()).optional()
      }).optional()
    }).required()
  },

  /**
   * POST /api/v1/ai-collaborate/validate
   * Validate code against specific criteria
   */
  validate: {
    body: Joi.object({
      code: Joi.string()
        .min(1)
        .max(100000)
        .required()
        .description('The code to validate'),
      
      criteria: Joi.array()
        .items(Joi.string().min(5).max(500))
        .min(1)
        .required()
        .description('Validation criteria to check against'),
      
      context: Joi.object().optional()
    }).required()
  },

  /**
   * GET /api/v1/ai-collaborate/logs/:sessionId
   * Get collaboration session logs
   */
  getLogs: {
    params: Joi.object({
      sessionId: Joi.string()
        .pattern(/^session_\d+_[a-zA-Z0-9]+$/)
        .required()
        .description('Session ID to retrieve logs for')
    }).required()
  },

  /**
   * GET /api/v1/ai-collaborate/status
   * Get orchestrator status
   */
  status: {
    query: Joi.object().optional()
  }
};

module.exports = {
  collaborationValidation
};
