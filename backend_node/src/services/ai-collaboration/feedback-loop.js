/**
 * Feedback Loop Controller
 *
 * Manages the iterative refinement process between Qwen and Codex
 * until quality threshold is reached or max iterations exceeded.
 */

const config = require('../../config/ai-collaboration.config');
const logger = require('../../utils/logger');
const { QwenGenerator } = require('./qwen-generator');
const { CodexAnalyzer } = require('./codex-analyzer');
const CollaborationLogger = require('./collaboration-logger');

class FeedbackLoopController {
  constructor() {
    this.qwenGenerator = new QwenGenerator();
    this.codexAnalyzer = new CodexAnalyzer();
    this.qualityThreshold = config.qualityThreshold;
    this.maxIterations = config.maxIterations;
  }

  /**
   * Execute the feedback loop
   * @param {Object} params - Loop parameters
   * @param {string} params.userRequest - The user's code generation request
   * @param {Object} params.context - Additional context
   * @param {number} params.qualityThreshold - Override default quality threshold
   * @param {number} params.maxIterations - Override default max iterations
   * @returns {Promise<Object>} Final result with code and review
   */
  async execute({
    userRequest,
    context = {},
    qualityThreshold = this.qualityThreshold,
    maxIterations = this.maxIterations
  }) {
    const sessionId = `session_${Date.now()}`;
    const collabLogger = new CollaborationLogger(sessionId);
    
    collabLogger.logUserRequest(userRequest, context);

    logger.info('[FeedbackLoop] Starting collaboration loop', {
      userRequest: userRequest.substring(0, 100),
      qualityThreshold,
      maxIterations
    });

    let previousCode = null;
    let lastReview = null;
    let iteration = 0;
    let qualityScore = 0;
    let passedThreshold = false;
    const iterationHistory = [];

    while (iteration < maxIterations && !passedThreshold) {
      iteration++;
      logger.info(`[FeedbackLoop] Starting iteration ${iteration}/${maxIterations}`);

      try {
        // Step 1: Qwen generates/refines code
        const qwenOutput = await this._generateCode({
          userRequest,
          context,
          previousCode,
          lastReview,
          collabLogger,
          iteration
        });

        // Step 2: Codex reviews the code
        const codexReview = await this._reviewCode({
          code: qwenOutput.generated_code,
          userRequest,
          context,
          collabLogger,
          iteration
        });

        qualityScore = codexReview.quality_score;
        passedThreshold = codexReview.passed_threshold;

        // Store iteration history
        iterationHistory.push({
          iteration,
          qualityScore,
          passedThreshold,
          errorsCount: codexReview.errors?.length || 0,
          architectureIssuesCount: codexReview.architecture_issues?.length || 0,
          securityIssuesCount: codexReview.security_issues?.length || 0
        });

        // Log iteration summary
        collabLogger.logIterationSummary(iteration, {
          qualityScore,
          passedThreshold,
          errorsCount: codexReview.errors?.length || 0,
          filesModified: qwenOutput.files_modified
        });

        logger.info(`[FeedbackLoop] Iteration ${iteration} completed`, {
          qualityScore,
          passedThreshold,
          threshold: qualityThreshold
        });

        // Prepare for next iteration if needed
        previousCode = qwenOutput.generated_code;
        lastReview = codexReview;

        if (passedThreshold) {
          logger.info('[FeedbackLoop] Quality threshold reached', {
            qualityScore,
            threshold: qualityThreshold,
            iterations: iteration
          });
          break;
        }

        if (iteration >= maxIterations) {
          logger.warn('[FeedbackLoop] Max iterations reached', {
            qualityScore,
            threshold: qualityThreshold,
            iterations: iteration
          });
        }
      } catch (error) {
        logger.error('[FeedbackLoop] Iteration failed', {
          iteration,
          error: error.message
        });

        collabLogger.logError(error, {
          iteration,
          stage: 'feedback_loop_iteration'
        });

        // Continue to next iteration on non-critical errors
        if (iteration >= maxIterations) {
          throw error;
        }
      }
    }

    // Compile final result
    const result = this._compileFinalResult({
      userRequest,
      context,
      finalCode: previousCode,
      finalReview: lastReview,
      totalIterations: iteration,
      qualityScore,
      passedThreshold,
      iterationHistory,
      collabLogger
    });

    collabLogger.logFinalResult(result);

    logger.info('[FeedbackLoop] Collaboration loop completed', {
      totalIterations: iteration,
      finalQualityScore: qualityScore,
      passedThreshold
    });

    return result;
  }

  /**
   * Generate code using Qwen
   * @private
   */
  async _generateCode({
    userRequest,
    context,
    previousCode,
    lastReview,
    collabLogger,
    iteration
  }) {
    if (iteration === 1 || !previousCode) {
      // Initial generation
      return await this.qwenGenerator.generate({
        userRequest,
        context,
        collabLogger,
        iteration
      });
    } else {
      // Refinement based on feedback
      return await this.qwenGenerator.refine({
        userRequest,
        previousCode,
        codexFeedback: lastReview,
        context,
        collabLogger,
        iteration
      });
    }
  }

  /**
   * Review code using Codex
   * @private
   */
  async _reviewCode({ code, userRequest, context, collabLogger, iteration }) {
    return await this.codexAnalyzer.analyze({
      code,
      userRequest,
      context,
      collabLogger,
      iteration
    });
  }

  /**
   * Compile final result
   * @private
   */
  _compileFinalResult({
    userRequest,
    context,
    finalCode,
    finalReview,
    totalIterations,
    qualityScore,
    passedThreshold,
    iterationHistory,
    collabLogger
  }) {
    // Extract improvements applied
    const improvementsApplied = this._extractImprovementsApplied(iterationHistory);

    // Extract remaining warnings
    const remainingWarnings = this._extractRemainingWarnings(finalReview);

    // Generate review report
    const reviewReport = this._generateReviewReport(finalReview);

    return {
      success: true,
      sessionId: collabLogger.getSessionId(),
      userRequest,
      finalCode: finalReview?.generated_code || finalCode,
      reviewReport,
      qualityScore: {
        total: qualityScore,
        threshold: this.qualityThreshold,
        passed: passedThreshold,
        detailed: finalReview?.detailed_scores || {}
      },
      iterations: {
        total: totalIterations,
        maxAllowed: this.maxIterations,
        history: iterationHistory
      },
      improvementsApplied,
      remainingWarnings,
      logDirectory: collabLogger.getLogDir()
    };
  }

  /**
   * Extract improvements applied across iterations
   * @private
   */
  _extractImprovementsApplied(iterationHistory) {
    if (iterationHistory.length <= 1) {
      return ['Initial code generation'];
    }

    const improvements = [];
    
    for (let i = 1; i < iterationHistory.length; i++) {
      const prev = iterationHistory[i - 1];
      const curr = iterationHistory[i];
      
      if (curr.qualityScore > prev.qualityScore) {
        improvements.push(`Iteration ${i + 1}: Improved quality score from ${prev.qualityScore} to ${curr.qualityScore}`);
      }
      
      if (curr.errorsCount < prev.errorsCount) {
        improvements.push(`Iteration ${i + 1}: Fixed ${prev.errorsCount - curr.errorsCount} error(s)`);
      }
    }

    return improvements.length > 0 ? improvements : ['Code refinements applied'];
  }

  /**
   * Extract remaining warnings from final review
   * @private
   */
  _extractRemainingWarnings(finalReview) {
    const warnings = [];

    if (finalReview?.style_issues?.length > 0) {
      warnings.push(...finalReview.style_issues.map(i => `Style: ${i}`));
    }

    if (finalReview?.performance_recommendations?.length > 0) {
      warnings.push(...finalReview.performance_recommendations.map(r => `Performance: ${r}`));
    }

    if (finalReview?.architecture_improvements?.length > 0) {
      warnings.push(...finalReview.architecture_improvements.map(i => `Architecture: ${i}`));
    }

    return warnings;
  }

  /**
   * Generate formatted review report
   * @private
   */
  _generateReviewReport(finalReview) {
    return {
      summary: {
        qualityScore: finalReview?.quality_score || 0,
        passedThreshold: finalReview?.passed_threshold || false,
        totalIssues: (finalReview?.errors?.length || 0) +
                     (finalReview?.architecture_issues?.length || 0) +
                     (finalReview?.security_issues?.length || 0) +
                     (finalReview?.performance_issues?.length || 0)
      },
      errors: finalReview?.errors || [],
      architectureIssues: finalReview?.architecture_issues || [],
      securityIssues: finalReview?.security_issues || [],
      performanceIssues: finalReview?.performance_issues || [],
      detailedScores: finalReview?.detailed_scores || {},
      correctionPrompt: finalReview?.correction_prompt || ''
    };
  }
}

module.exports = {
  FeedbackLoopController
};
