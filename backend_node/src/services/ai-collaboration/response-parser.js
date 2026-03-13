/**
 * Response Parser Utility
 *
 * Parses and validates AI model responses, extracting structured data
 * from various response formats and handling edge cases.
 */

const logger = require('../../utils/logger');

class ResponseParser {
  constructor() {
    this.jsonPatterns = [
      /\{[\s\S]*\}/, // Match JSON object
      /\[[\s\S]*\]/  // Match JSON array
    ];
  }

  /**
   * Parse Qwen generation response
   * @param {Object|string} responseData - Raw API response
   * @returns {Object} Parsed output
   */
  parseQwenResponse(responseData) {
    const generatedText = this._extractText(responseData);
    const parsed = this._parseJsonFromText(generatedText);

    if (parsed && typeof parsed === 'object') {
      return {
        code: parsed.code || parsed.generated_code || generatedText,
        assumptions: parsed.assumptions || '',
        files_modified: Array.isArray(parsed.files_modified) ? parsed.files_modified : [],
        changes_from_feedback: Array.isArray(parsed.changes_from_feedback) ? parsed.changes_from_feedback : [],
        raw_response: generatedText,
        parsed: true
      };
    }

    // Fallback: treat entire response as code
    return {
      code: generatedText,
      assumptions: '',
      files_modified: ['generated_file.js'],
      changes_from_feedback: [],
      raw_response: generatedText,
      parsed: false
    };
  }

  /**
   * Parse Codex review response
   * @param {Object|string} responseData - Raw API response
   * @returns {Object} Parsed review
   */
  parseCodexResponse(responseData) {
    const generatedText = this._extractText(responseData);
    const parsed = this._parseJsonFromText(generatedText);

    if (parsed && typeof parsed === 'object') {
      return {
        syntax_errors: Array.isArray(parsed.syntax_errors) ? parsed.syntax_errors : [],
        parsing_errors: Array.isArray(parsed.parsing_errors) ? parsed.parsing_errors : [],
        type_errors: Array.isArray(parsed.type_errors) ? parsed.type_errors : [],
        missing_imports: Array.isArray(parsed.missing_imports) ? parsed.missing_imports : [],
        runtime_errors: Array.isArray(parsed.runtime_errors) ? parsed.runtime_errors : [],
        api_contract_issues: Array.isArray(parsed.api_contract_issues) ? parsed.api_contract_issues : [],
        architecture_issues: Array.isArray(parsed.architecture_issues) ? parsed.architecture_issues : [],
        soc_violations: Array.isArray(parsed.soc_violations) ? parsed.soc_violations : [],
        tight_coupling: Array.isArray(parsed.tight_coupling) ? parsed.tight_coupling : [],
        missing_abstractions: Array.isArray(parsed.missing_abstractions) ? parsed.missing_abstractions : [],
        security_issues: Array.isArray(parsed.security_issues) ? parsed.security_issues : [],
        has_unvalidated_input: parsed.has_unvalidated_input || false,
        has_sql_injection_risk: parsed.has_sql_injection_risk || false,
        has_xss_risk: parsed.has_xss_risk || false,
        has_hardcoded_secrets: parsed.has_hardcoded_secrets || false,
        missing_auth_check: parsed.missing_auth_check || false,
        performance_issues: Array.isArray(parsed.performance_issues) ? parsed.performance_issues : [],
        n_plus_one_queries: Array.isArray(parsed.n_plus_one_queries) ? parsed.n_plus_one_queries : [],
        missing_caching_opportunities: parsed.missing_caching_opportunities || false,
        inefficient_loops: Array.isArray(parsed.inefficient_loops) ? parsed.inefficient_loops : [],
        memory_leak_risks: Array.isArray(parsed.memory_leak_risks) ? parsed.memory_leak_risks : [],
        unoptimized_queries: Array.isArray(parsed.unoptimized_queries) ? parsed.unoptimized_queries : [],
        style_issues: Array.isArray(parsed.style_issues) ? parsed.style_issues : [],
        good_patterns: Array.isArray(parsed.good_patterns) ? parsed.good_patterns : [],
        errors: Array.isArray(parsed.errors) ? parsed.errors : this._summarizeErrors(parsed),
        architecture_improvements: Array.isArray(parsed.architecture_improvements) ? parsed.architecture_improvements : [],
        security_recommendations: Array.isArray(parsed.security_recommendations) ? parsed.security_recommendations : [],
        performance_recommendations: Array.isArray(parsed.performance_recommendations) ? parsed.performance_recommendations : [],
        raw_response: generatedText,
        parsed: true
      };
    }

    // Fallback: return empty review
    return this._createEmptyReview(generatedText);
  }

  /**
   * Parse validation response
   * @param {Object|string} responseData - Raw API response
   * @returns {Object} Parsed validation result
   */
  parseValidationResponse(responseData) {
    const generatedText = this._extractText(responseData);
    const parsed = this._parseJsonFromText(generatedText);

    if (parsed && typeof parsed === 'object') {
      return {
        valid: parsed.valid || false,
        errors: Array.isArray(parsed.errors) ? parsed.errors : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        passed_criteria: Array.isArray(parsed.passed_criteria) ? parsed.passed_criteria : [],
        failed_criteria: Array.isArray(parsed.failed_criteria) ? parsed.failed_criteria : [],
        details: parsed.details || {},
        raw_response: generatedText
      };
    }

    return {
      valid: false,
      errors: ['Failed to parse validation response'],
      warnings: [],
      passed_criteria: [],
      failed_criteria: [],
      details: {},
      raw_response: generatedText
    };
  }

  /**
   * Extract text from various API response formats
   * @private
   */
  _extractText(responseData) {
    if (typeof responseData === 'string') {
      return responseData;
    }

    if (!responseData || typeof responseData !== 'object') {
      return '';
    }

    // Common response field patterns
    const textFields = [
      'text',
      'content',
      'output',
      'generated',
      'response',
      'message',
      'result'
    ];

    for (const field of textFields) {
      if (responseData[field]) {
        if (typeof responseData[field] === 'string') {
          return responseData[field];
        }
        if (typeof responseData[field] === 'object') {
          // Handle nested content (e.g., message.content)
          if (responseData[field].content) {
            return responseData[field].content;
          }
          return JSON.stringify(responseData[field]);
        }
      }
    }

    // Handle OpenAI-style responses
    if (responseData.choices?.[0]?.text) {
      return responseData.choices[0].text;
    }
    if (responseData.choices?.[0]?.message?.content) {
      return responseData.choices[0].message.content;
    }

    // Handle Anthropic-style responses
    if (responseData.content?.[0]?.text) {
      return responseData.content[0].text;
    }

    // Fallback: stringify the entire response
    return JSON.stringify(responseData);
  }

  /**
   * Parse JSON from text response
   * @private
   */
  _parseJsonFromText(text) {
    if (!text) return null;

    // Try direct JSON parse first
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      // Continue to pattern matching
    }

    // Try to find JSON object in text
    for (const pattern of this.jsonPatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e) {
          // Try to fix common JSON issues
          const fixed = this._fixJson(match[0]);
          try {
            return JSON.parse(fixed);
          } catch (e2) {
            logger.debug('[ResponseParser] Failed to parse JSON match', {
              error: e2.message,
              match: match[0].substring(0, 100)
            });
          }
        }
      }
    }

    return null;
  }

  /**
   * Attempt to fix common JSON issues
   * @private
   */
  _fixJson(jsonString) {
    let fixed = jsonString;

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Replace single quotes with double quotes (carefully)
    // Only replace quotes that appear to be string delimiters
    fixed = fixed.replace(/'/g, '"');

    // Fix unquoted keys (simple cases)
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // Fix missing quotes around string values after colons
    // This is a simplified fix and may not handle all cases
    fixed = fixed.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}])/g, ': "$1"$2');

    return fixed;
  }

  /**
   * Summarize errors from detailed analysis
   * @private
   */
  _summarizeErrors(parsed) {
    const errors = [];

    if (Array.isArray(parsed.syntax_errors) && parsed.syntax_errors.length > 0) {
      errors.push(`Syntax errors: ${parsed.syntax_errors.length} issue(s) found`);
    }
    if (Array.isArray(parsed.security_issues) && parsed.security_issues.length > 0) {
      errors.push(`Security issues: ${parsed.security_issues.length} vulnerability(ies) found`);
    }
    if (Array.isArray(parsed.architecture_issues) && parsed.architecture_issues.length > 0) {
      errors.push(`Architecture issues: ${parsed.architecture_issues.length} issue(s) found`);
    }
    if (Array.isArray(parsed.runtime_errors) && parsed.runtime_errors.length > 0) {
      errors.push(`Runtime errors: ${parsed.runtime_errors.length} potential issue(s) found`);
    }

    return errors;
  }

  /**
   * Create empty review structure
   * @private
   */
  _createEmptyReview(rawResponse) {
    return {
      syntax_errors: [],
      parsing_errors: [],
      type_errors: [],
      missing_imports: [],
      runtime_errors: [],
      api_contract_issues: [],
      architecture_issues: [],
      soc_violations: [],
      tight_coupling: [],
      missing_abstractions: [],
      security_issues: [],
      has_unvalidated_input: false,
      has_sql_injection_risk: false,
      has_xss_risk: false,
      has_hardcoded_secrets: false,
      missing_auth_check: false,
      performance_issues: [],
      n_plus_one_queries: [],
      missing_caching_opportunities: false,
      inefficient_loops: [],
      memory_leak_risks: [],
      unoptimized_queries: [],
      style_issues: [],
      good_patterns: ['Code structure appears organized'],
      errors: [],
      architecture_improvements: [],
      security_recommendations: [],
      performance_recommendations: [],
      raw_response: rawResponse,
      parsed: false
    };
  }

  /**
   * Validate parsed Qwen output structure
   * @param {Object} output - Parsed output to validate
   * @returns {Object} Validation result
   */
  validateQwenOutput(output) {
    const issues = [];

    if (!output.code) {
      issues.push('Missing code field');
    }

    if (!Array.isArray(output.files_modified)) {
      issues.push('files_modified should be an array');
    }

    if (output.code && output.code.length < 10) {
      issues.push('Code appears too short, may be incomplete');
    }

    return {
      valid: issues.length === 0,
      issues,
      output
    };
  }

  /**
   * Validate parsed Codex review structure
   * @param {Object} review - Parsed review to validate
   * @returns {Object} Validation result
   */
  validateCodexReview(review) {
    const issues = [];

    const requiredArrays = [
      'syntax_errors',
      'architecture_issues',
      'security_issues',
      'performance_issues',
      'errors'
    ];

    for (const field of requiredArrays) {
      if (!Array.isArray(review[field])) {
        issues.push(`${field} should be an array`);
      }
    }

    if (typeof review.quality_score !== 'number') {
      issues.push('quality_score should be a number');
    } else if (review.quality_score < 0 || review.quality_score > 100) {
      issues.push('quality_score should be between 0 and 100');
    }

    return {
      valid: issues.length === 0,
      issues,
      review
    };
  }

  /**
   * Extract code blocks from markdown-formatted response
   * @param {string} text - Text containing code blocks
   * @param {string} [language] - Optional language filter
   * @returns {Array<string>} Extracted code blocks
   */
  extractCodeBlocks(text, language = null) {
    const blocks = [];
    const pattern = language
      ? new RegExp(`\`\`\`${language}\\s*([\\s\\S]*?)\`\`\``, 'g')
      : /\`\`\`[\s\S]*?\`\`\`/g;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      let code = match[0];
      // Remove the markdown fence markers
      code = code.replace(/^```[a-z]*\s*|\s*```$/g, '');
      blocks.push(code.trim());
    }

    return blocks;
  }

  /**
   * Parse file paths from generated output
   * @param {string} text - Text containing file references
   * @returns {Array<string>} Extracted file paths
   */
  extractFilePaths(text) {
    const patterns = [
      /(?:^|\s)[./]?(?:[\w-]+\/)*[\w-]+\.(js|ts|jsx|tsx|py|java|go|rb|php|cs)/g,
      /File:?\s*([./]?[\w-]+\/)*[\w-]+\.(js|ts|jsx|tsx|py|java|go|rb|php|cs)/gi,
      /import.*from\s+['"]([^'"]+)['"]/g
    ];

    const files = new Set();

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const file = match[1] || match[0];
        // Clean up the file path
        const cleaned = file.replace(/^(File:\s*|import.*from\s+['"]|['"])/g, '').trim();
        if (cleaned && !cleaned.startsWith('http')) {
          files.add(cleaned);
        }
      }
    }

    return Array.from(files);
  }
}

module.exports = {
  ResponseParser
};
