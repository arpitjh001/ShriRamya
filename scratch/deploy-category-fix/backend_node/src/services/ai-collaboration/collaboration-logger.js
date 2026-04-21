/**
 * Collaboration Logger
 * 
 * Comprehensive logging system for the AI collaboration loop.
 * Logs all interactions between Qwen and Codex for debugging and audit purposes.
 */

const fs = require('fs');
const path = require('path');
const config = require('../../config/ai-collaboration.config');

class CollaborationLogger {
  constructor(sessionId = null) {
    this.sessionId = sessionId || this._generateSessionId();
    this.logDir = path.join(process.cwd(), config.logging.directory, this.sessionId);
    this.iterationCount = 0;
    
    this._ensureLogDirectory();
  }

  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  _ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  _timestamp() {
    return new Date().toISOString();
  }

  _writeLog(filename, data) {
    if (!config.logging.enabled) return;
    
    const filePath = path.join(this.logDir, filename);
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    
    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Log the initial user request
   */
  logUserRequest(request, context) {
    this._writeLog('00_user_request.json', {
      timestamp: this._timestamp(),
      request,
      context
    });
  }

  /**
   * Log Qwen prompt
   */
  logQwenPrompt(iteration, prompt, correctionFeedback = null) {
    this._writeLog(`qwen_prompt_${String(iteration).padStart(3, '0')}.json`, {
      timestamp: this._timestamp(),
      iteration,
      prompt,
      correctionFeedback
    });
  }

  /**
   * Log Qwen output
   */
  logQwenOutput(iteration, output) {
    this._writeLog(`qwen_output_${String(iteration).padStart(3, '0')}.json`, {
      timestamp: this._timestamp(),
      iteration,
      generated_code: output.generated_code,
      assumptions: output.assumptions,
      files_modified: output.files_modified
    });
  }

  /**
   * Log Codex review
   */
  logCodexReview(iteration, review) {
    this._writeLog(`codex_review_${String(iteration).padStart(3, '0')}.json`, {
      timestamp: this._timestamp(),
      iteration,
      errors: review.errors,
      architecture_issues: review.architecture_issues,
      security_issues: review.security_issues,
      performance_issues: review.performance_issues,
      correction_prompt: review.correction_prompt,
      quality_score: review.quality_score,
      detailed_scores: review.detailed_scores
    });
  }

  /**
   * Log iteration summary
   */
  logIterationSummary(iteration, summary) {
    this._writeLog(`iteration_${String(iteration).padStart(3, '0')}_summary.json`, {
      timestamp: this._timestamp(),
      iteration,
      ...summary
    });
  }

  /**
   * Log final result
   */
  logFinalResult(result) {
    this._writeLog('final_result.json', {
      timestamp: this._timestamp(),
      totalIterations: result.totalIterations,
      finalQualityScore: result.finalQualityScore,
      filesGenerated: result.filesGenerated,
      reviewReport: result.reviewReport,
      improvementsApplied: result.improvementsApplied,
      remainingWarnings: result.remainingWarnings
    });
  }

  /**
   * Log error
   */
  logError(error, context = {}) {
    this._writeLog(`error_${Date.now()}.json`, {
      timestamp: this._timestamp(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    });
  }

  /**
   * Get session log directory path
   */
  getLogDir() {
    return this.logDir;
  }

  /**
   * Get session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Get all logs for a session
   */
  getSessionLogs() {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }
    
    return fs.readdirSync(this.logDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        filename: f,
        content: JSON.parse(fs.readFileSync(path.join(this.logDir, f), 'utf8'))
      }));
  }
}

module.exports = CollaborationLogger;
