/**
 * AI Collaboration Routes
 *
 * API routes for AI collaboration endpoints
 */

const express = require('express');
const aiCollaborationController = require('../../controllers/ai-collaboration.controller');
const validate = require('../../middlewares/validate');
const { collaborationValidation } = require('../../validations/ai-collaboration.validation');
const auth = require('../../middlewares/auth');

const router = express.Router();

/**
 * @route   POST /api/v1/ai-collaborate/generate
 * @desc    Generate code with full Qwen-Codex collaboration loop
 * @access  Private (Admin)
 */
router.post(
  '/generate',
  auth(['admin']),
  validate(collaborationValidation.generate),
  aiCollaborationController.generate
);

/**
 * @route   POST /api/v1/ai-collaborate/generate-only
 * @desc    Generate code without review (Qwen only)
 * @access  Private
 */
router.post(
  '/generate-only',
  auth(),
  validate(collaborationValidation.generateOnly),
  aiCollaborationController.generateOnly
);

/**
 * @route   POST /api/v1/ai-collaborate/review
 * @desc    Review existing code (Codex only)
 * @access  Private
 */
router.post(
  '/review',
  auth(),
  validate(collaborationValidation.review),
  aiCollaborationController.review
);

/**
 * @route   POST /api/v1/ai-collaborate/refine
 * @desc    Refine code based on feedback
 * @access  Private
 */
router.post(
  '/refine',
  auth(),
  validate(collaborationValidation.refine),
  aiCollaborationController.refine
);

/**
 * @route   POST /api/v1/ai-collaborate/validate
 * @desc    Validate code against specific criteria
 * @access  Private
 */
router.post(
  '/validate',
  auth(),
  validate(collaborationValidation.validate),
  aiCollaborationController.validate
);

/**
 * @route   GET /api/v1/ai-collaborate/logs/:sessionId
 * @desc    Get collaboration session logs
 * @access  Private (Admin)
 */
router.get(
  '/logs/:sessionId',
  auth(['admin']),
  validate(collaborationValidation.getLogs),
  aiCollaborationController.getLogs
);

/**
 * @route   GET /api/v1/ai-collaborate/status
 * @desc    Get orchestrator status and configuration
 * @access  Private (Admin)
 */
router.get(
  '/status',
  auth(['admin']),
  validate(collaborationValidation.status),
  aiCollaborationController.getStatus
);

module.exports = router;
