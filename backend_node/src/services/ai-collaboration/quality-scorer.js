/**
 * Quality Scorer
 * 
 * Generates quality scores for code across multiple dimensions:
 * - Syntax: Code correctness and validity
 * - Architecture: Design patterns and structure
 * - Security: Vulnerability assessment
 * - Performance: Efficiency and optimization
 */

const config = require('../../config/ai-collaboration.config');

class QualityScorer {
  constructor() {
    this.weights = config.scoring.weights;
    this.minimumScores = config.scoring.minimumScores;
  }

  /**
   * Calculate overall quality score
   * @param {Object} codeAnalysis - Analysis results from Codex
   * @returns {Object} Quality scores
   */
  calculate(codeAnalysis) {
    const detailedScores = {
      syntax: this._scoreSyntax(codeAnalysis),
      architecture: this._scoreArchitecture(codeAnalysis),
      security: this._scoreSecurity(codeAnalysis),
      performance: this._scorePerformance(codeAnalysis)
    };

    const totalScore = this._calculateWeightedScore(detailedScores);

    return {
      totalScore: Math.round(totalScore),
      detailedScores: {
        syntax: Math.round(detailedScores.syntax),
        architecture: Math.round(detailedScores.architecture),
        security: Math.round(detailedScores.security),
        performance: Math.round(detailedScores.performance)
      },
      passedThreshold: totalScore >= config.qualityThreshold,
      threshold: config.qualityThreshold,
      minimumScoresMet: this._checkMinimumScores(detailedScores)
    };
  }

  /**
   * Score syntax quality
   */
  _scoreSyntax(analysis) {
    let score = 100;

    // Deduct for syntax errors
    const syntaxErrors = (analysis.syntax_errors || []).length;
    score -= syntaxErrors * 15;

    // Deduct for parsing errors
    const parsingErrors = (analysis.parsing_errors || []).length;
    score -= parsingErrors * 10;

    // Deduct for type errors
    const typeErrors = (analysis.type_errors || []).length;
    score -= typeErrors * 8;

    // Deduct for missing imports/dependencies
    const missingImports = (analysis.missing_imports || []).length;
    score -= missingImports * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score architecture quality
   */
  _scoreArchitecture(analysis) {
    let score = 100;

    // Deduct for architecture issues
    const architectureIssues = (analysis.architecture_issues || []).length;
    score -= architectureIssues * 12;

    // Deduct for separation of concerns violations
    const socViolations = (analysis.soc_violations || []).length;
    score -= socViolations * 10;

    // Deduct for tight coupling
    const tightCoupling = (analysis.tight_coupling || []).length;
    score -= tightCoupling * 8;

    // Deduct for missing abstraction layers
    const missingAbstractions = (analysis.missing_abstractions || []).length;
    score -= missingAbstractions * 7;

    // Bonus for good patterns detected
    const goodPatterns = (analysis.good_patterns || []).length;
    score += goodPatterns * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score security quality
   */
  _scoreSecurity(analysis) {
    let score = 100;

    // Critical security issues
    const criticalIssues = (analysis.security_issues || []).filter(i => i.severity === 'critical').length;
    score -= criticalIssues * 25;

    // High severity security issues
    const highIssues = (analysis.security_issues || []).filter(i => i.severity === 'high').length;
    score -= highIssues * 15;

    // Medium severity security issues
    const mediumIssues = (analysis.security_issues || []).filter(i => i.severity === 'medium').length;
    score -= mediumIssues * 8;

    // Low severity security issues
    const lowIssues = (analysis.security_issues || []).filter(i => i.severity === 'low').length;
    score -= lowIssues * 3;

    // Specific security checks
    if (analysis.has_unvalidated_input) score -= 15;
    if (analysis.has_sql_injection_risk) score -= 20;
    if (analysis.has_xss_risk) score -= 15;
    if (analysis.has_hardcoded_secrets) score -= 25;
    if (analysis.missing_auth_check) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score performance quality
   */
  _scorePerformance(analysis) {
    let score = 100;

    // Performance issues
    const performanceIssues = (analysis.performance_issues || []).length;
    score -= performanceIssues * 10;

    // N+1 query problems
    const nPlusOneQueries = (analysis.n_plus_one_queries || []).length;
    score -= nPlusOneQueries * 12;

    // Missing caching
    if (analysis.missing_caching_opportunities) score -= 8;

    // Inefficient loops
    const inefficientLoops = (analysis.inefficient_loops || []).length;
    score -= inefficientLoops * 5;

    // Memory leaks potential
    const memoryLeakRisks = (analysis.memory_leak_risks || []).length;
    score -= memoryLeakRisks * 10;

    // Unoptimized database queries
    const unoptimizedQueries = (analysis.unoptimized_queries || []).length;
    score -= unoptimizedQueries * 8;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate weighted total score
   */
  _calculateWeightedScore(scores) {
    return (
      scores.syntax * this.weights.syntax +
      scores.architecture * this.weights.architecture +
      scores.security * this.weights.security +
      scores.performance * this.weights.performance
    );
  }

  /**
   * Check if all minimum scores are met
   */
  _checkMinimumScores(scores) {
    return (
      scores.syntax >= this.minimumScores.syntax &&
      scores.architecture >= this.minimumScores.architecture &&
      scores.security >= this.minimumScores.security &&
      scores.performance >= this.minimumScores.performance
    );
  }

  /**
   * Generate score report
   */
  generateReport(scores, analysis) {
    const status = scores.passedThreshold ? 'PASSED' : 'NEEDS_IMPROVEMENT';
    
    return {
      status,
      totalScore: scores.totalScore,
      threshold: scores.threshold,
      detailedScores: scores.detailedScores,
      breakdown: {
        syntax: {
          score: scores.detailedScores.syntax,
          issues: (analysis.syntax_errors || []).length + (analysis.parsing_errors || []).length,
          status: scores.detailedScores.syntax >= this.minimumScores.syntax ? 'OK' : 'NEEDS_WORK'
        },
        architecture: {
          score: scores.detailedScores.architecture,
          issues: (analysis.architecture_issues || []).length,
          status: scores.detailedScores.architecture >= this.minimumScores.architecture ? 'OK' : 'NEEDS_WORK'
        },
        security: {
          score: scores.detailedScores.security,
          issues: (analysis.security_issues || []).length,
          status: scores.detailedScores.security >= this.minimumScores.security ? 'OK' : 'CRITICAL'
        },
        performance: {
          score: scores.detailedScores.performance,
          issues: (analysis.performance_issues || []).length,
          status: scores.detailedScores.performance >= this.minimumScores.performance ? 'OK' : 'NEEDS_WORK'
        }
      }
    };
  }
}

module.exports = QualityScorer;
