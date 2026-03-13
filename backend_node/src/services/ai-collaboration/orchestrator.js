/**
 * AI Collaboration Orchestrator
 *
 * Main controller that manages the entire collaboration flow between
 * Qwen (Generator) and Codex (Analyzer) for continuous code improvement.
 */

const config = require('../../config/ai-collaboration.config');
const logger = require('../../utils/logger');
const { QwenGenerator } = require('./qwen-generator');
const { CodexAnalyzer } = require('./codex-analyzer');
const { FeedbackLoopController } = require('./feedback-loop');
const CollaborationLogger = require('./collaboration-logger');

class AICollaborationOrchestrator {
  constructor(options = {}) {
    this.qwenGenerator = new QwenGenerator();
    this.codexAnalyzer = new CodexAnalyzer();
    this.feedbackLoopController = new FeedbackLoopController();
    
    this.qualityThreshold = options.qualityThreshold || config.qualityThreshold;
    this.maxIterations = options.maxIterations || config.maxIterations;
  }

  /**
   * Process a user request through the full collaboration loop
   * @param {Object} params - Processing parameters
   * @param {string} params.userRequest - The user's code generation request
   * @param {Object} [params.context] - Additional context (existing files, requirements, etc.)
   * @param {number} [params.qualityThreshold] - Override default quality threshold
   * @param {number} [params.maxIterations] - Override default max iterations
   * @param {boolean} [params.useFeedbackLoop=true] - Whether to use iterative refinement
   * @returns {Promise<Object>} Complete collaboration result
   */
  async processRequest({
    userRequest,
    context = {},
    qualityThreshold = this.qualityThreshold,
    maxIterations = this.maxIterations,
    useFeedbackLoop = true
  }) {
    logger.info('[Orchestrator] Processing request', {
      userRequest: userRequest.substring(0, 100),
      useFeedbackLoop,
      qualityThreshold,
      maxIterations
    });

    if (useFeedbackLoop) {
      return await this._processWithFeedbackLoop({
        userRequest,
        context,
        qualityThreshold,
        maxIterations
      });
    } else {
      return await this._processSinglePass({
        userRequest,
        context
      });
    }
  }

  /**
   * Process with full feedback loop (iterative refinement)
   * @private
   */
  async _processWithFeedbackLoop({ userRequest, context, qualityThreshold, maxIterations }) {
    try {
      const result = await this.feedbackLoopController.execute({
        userRequest,
        context,
        qualityThreshold,
        maxIterations
      });

      logger.info('[Orchestrator] Feedback loop completed successfully', {
        sessionId: result.sessionId,
        totalIterations: result.iterations.total,
        finalQualityScore: result.qualityScore.total,
        passedThreshold: result.qualityScore.passed
      });

      return result;
    } catch (error) {
      logger.error('[Orchestrator] Feedback loop failed', {
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Process with single pass (no iteration)
   * @private
   */
  async _processSinglePass({ userRequest, context }) {
    const sessionId = `session_${Date.now()}_single`;
    const collabLogger = new CollaborationLogger(sessionId);

    collabLogger.logUserRequest(userRequest, context);

    try {
      // Qwen generates code
      const qwenOutput = await this.qwenGenerator.generate({
        userRequest,
        context,
        collabLogger,
        iteration: 1
      });

      // Codex reviews code
      const codexReview = await this.codexAnalyzer.analyze({
        code: qwenOutput.generated_code,
        userRequest,
        context,
        collabLogger,
        iteration: 1
      });

      collabLogger.logIterationSummary(1, {
        qualityScore: codexReview.quality_score,
        passedThreshold: codexReview.passed_threshold,
        filesModified: qwenOutput.files_modified
      });

      const result = {
        success: true,
        sessionId,
        userRequest,
        finalCode: qwenOutput.generated_code,
        reviewReport: {
          summary: {
            qualityScore: codexReview.quality_score,
            passedThreshold: codexReview.passed_threshold,
            totalIssues: (codexReview.errors?.length || 0) +
                         (codexReview.architecture_issues?.length || 0) +
                         (codexReview.security_issues?.length || 0)
          },
          errors: codexReview.errors || [],
          architectureIssues: codexReview.architecture_issues || [],
          securityIssues: codexReview.security_issues || [],
          performanceIssues: codexReview.performance_issues || [],
          detailedScores: codexReview.detailed_scores || {},
          correctionPrompt: codexReview.correction_prompt || ''
        },
        qualityScore: {
          total: codexReview.quality_score,
          threshold: this.qualityThreshold,
          passed: codexReview.passed_threshold,
          detailed: codexReview.detailed_scores || {}
        },
        iterations: {
          total: 1,
          maxAllowed: 1,
          history: [{
            iteration: 1,
            qualityScore: codexReview.quality_score,
            passedThreshold: codexReview.passed_threshold
          }]
        },
        improvementsApplied: ['Initial code generation'],
        remainingWarnings: this._extractRemainingWarnings(codexReview),
        logDirectory: collabLogger.getLogDir()
      };

      collabLogger.logFinalResult(result);

      logger.info('[Orchestrator] Single pass completed', {
        sessionId,
        qualityScore: codexReview.quality_score
      });

      return result;
    } catch (error) {
      logger.error('[Orchestrator] Single pass failed', {
        error: error.message
      });

      collabLogger.logError(error, { stage: 'single_pass' });
      throw error;
    }
  }

  /**
   * Generate code only (no review)
   * @param {Object} params - Generation parameters
   * @param {string} params.userRequest - The user's request
   * @param {Object} [params.context] - Additional context
   * @returns {Promise<Object>} Generated code
   */
  async generateCode({ userRequest, context = {} }) {
    logger.info('[Orchestrator] Generating code (no review)', {
      userRequest: userRequest.substring(0, 100)
    });

    const collabLogger = new CollaborationLogger();
    
    const output = await this.qwenGenerator.generate({
      userRequest,
      context,
      collabLogger,
      iteration: 1
    });

    return {
      success: true,
      code: output.generated_code,
      assumptions: output.assumptions,
      filesModified: output.files_modified,
      sessionId: collabLogger.getSessionId()
    };
  }

  /**
   * Review code only (no generation)
   * @param {Object} params - Review parameters
   * @param {string} params.code - Code to review
   * @param {string} [params.userRequest] - Original request context
   * @param {Object} [params.context] - Additional context
   * @returns {Promise<Object>} Review results
   */
  async reviewCode({ code, userRequest = 'Code review request', context = {} }) {
    logger.info('[Orchestrator] Reviewing code', {
      codeLength: code.length
    });

    const collabLogger = new CollaborationLogger();
    
    const review = await this.codexAnalyzer.analyze({
      code,
      userRequest,
      context,
      collabLogger,
      iteration: 1
    });

    return {
      success: true,
      review: {
        errors: review.errors || [],
        architectureIssues: review.architecture_issues || [],
        securityIssues: review.security_issues || [],
        performanceIssues: review.performance_issues || [],
        qualityScore: review.quality_score,
        detailedScores: review.detailed_scores || {},
        passedThreshold: review.passed_threshold,
        correctionPrompt: review.correction_prompt
      },
      sessionId: collabLogger.getSessionId()
    };
  }

  /**
   * Refine code based on specific feedback
   * @param {Object} params - Refinement parameters
   * @param {string} params.code - Current code
   * @param {string} params.feedback - Feedback to apply
   * @param {string} [params.userRequest] - Original request context
   * @param {Object} [params.context] - Additional context
   * @returns {Promise<Object>} Refined code
   */
  async refineCode({ code, feedback, userRequest = 'Code refinement request', context = {} }) {
    logger.info('[Orchestrator] Refining code based on feedback', {
      feedbackLength: feedback.length
    });

    const collabLogger = new CollaborationLogger();
    
    const codexFeedback = {
      errors: [],
      architecture_issues: [],
      security_issues: [],
      performance_issues: [],
      correction_prompt: feedback,
      quality_score: 70
    };

    const output = await this.qwenGenerator.refine({
      userRequest,
      previousCode: code,
      codexFeedback,
      context,
      collabLogger,
      iteration: 1
    });

    return {
      success: true,
      code: output.generated_code,
      assumptions: output.assumptions,
      filesModified: output.files_modified,
      changesFromFeedback: output.changes_from_feedback || [],
      sessionId: collabLogger.getSessionId()
    };
  }

  /**
   * Get collaboration session logs
   * @param {string} sessionId - Session ID to retrieve logs for
   * @returns {Object} Session logs
   */
  getSessionLogs(sessionId) {
    const collabLogger = new CollaborationLogger(sessionId);
    return {
      success: true,
      logs: collabLogger.getSessionLogs(),
      logDirectory: collabLogger.getLogDir()
    };
  }

  /**
   * Extract remaining warnings from review
   * @private
   */
  _extractRemainingWarnings(review) {
    const warnings = [];

    if (review?.style_issues?.length > 0) {
      warnings.push(...review.style_issues.map(i => `Style: ${i}`));
    }

    if (review?.performance_recommendations?.length > 0) {
      warnings.push(...review.performance_recommendations.map(r => `Performance: ${r}`));
    }

    if (review?.architecture_improvements?.length > 0) {
      warnings.push(...review.architecture_improvements.map(i => `Architecture: ${i}`));
    }

    return warnings;
  }

  /**
   * Get orchestrator status and configuration
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      status: 'operational',
      configuration: {
        qualityThreshold: this.qualityThreshold,
        maxIterations: this.maxIterations,
        models: {
          qwen: {
            endpoint: config.models.qwen.endpoint,
            model: config.models.qwen.model
          },
          codex: {
            endpoint: config.models.codex.endpoint,
            model: config.models.codex.model
          }
        }
      },
      scoring: {
        weights: config.scoring.weights,
        minimumScores: config.scoring.minimumScores
      }
    };
  }
}

/**
 * Singleton instance for convenience
 */
let orchestratorInstance = null;

/**
 * Get or create orchestrator instance
 * @param {Object} options - Configuration options
 * @returns {AICollaborationOrchestrator} Orchestrator instance
 */
function getOrchestrator(options = {}) {
  if (!orchestratorInstance) {
    orchestratorInstance = new AICollaborationOrchestrator(options);
  }
  return orchestratorInstance;
}

module.exports = {
  AICollaborationOrchestrator,
  getOrchestrator
};
