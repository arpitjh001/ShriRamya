/**
 * Prompt Builder Utility
 *
 * Constructs standardized prompts for Qwen and Codex interactions
 * with support for context, examples, and project-specific patterns.
 */

const config = require('../../config/ai-collaboration.config');

class PromptBuilder {
  constructor() {
    this.projectPatterns = this._loadProjectPatterns();
  }

  /**
   * Build a code generation prompt for Qwen
   * @param {Object} options - Prompt options
   * @returns {string} Formatted prompt
   */
  buildGenerationPrompt(options) {
    const {
      userRequest,
      context = {},
      examples = [],
      constraints = [],
      outputFormat = 'json'
    } = options;

    const sections = [
      this._buildRoleDefinition('generator'),
      this._buildRequestSection(userRequest),
      this._buildContextSection(context),
      this._buildPatternsSection(this.projectPatterns),
      this._buildExamplesSection(examples),
      this._buildConstraintsSection(constraints),
      this._buildOutputFormatSection(outputFormat)
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Build a code refinement prompt for Qwen
   * @param {Object} options - Prompt options
   * @returns {string} Formatted prompt
   */
  buildRefinementPrompt(options) {
    const {
      userRequest,
      previousCode,
      codexFeedback,
      context = {},
      constraints = []
    } = options;

    const sections = [
      this._buildRoleDefinition('refiner'),
      this._buildRequestSection(userRequest),
      this._buildPreviousCodeSection(previousCode),
      this._buildFeedbackSection(codexFeedback),
      this._buildContextSection(context),
      this._buildConstraintsSection(constraints),
      this._buildOutputFormatSection('json')
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Build a code analysis prompt for Codex
   * @param {Object} options - Prompt options
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(options) {
    const {
      code,
      userRequest,
      context = {},
      focusAreas = [],
      checklist = this._getDefaultChecklist()
    } = options;

    const sections = [
      this._buildRoleDefinition('analyzer'),
      this._buildRequestSection(userRequest),
      this._buildContextSection(context),
      this._buildCodeSection(code),
      this._buildFocusAreasSection(focusAreas),
      this._buildChecklistSection(checklist),
      this._buildOutputFormatSection('json', true)
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Build a validation prompt for Codex
   * @param {Object} options - Prompt options
   * @returns {string} Formatted prompt
   */
  buildValidationPrompt(options) {
    const {
      code,
      criteria = [],
      context = {}
    } = options;

    const sections = [
      this._buildRoleDefinition('validator'),
      this._buildCriteriaSection(criteria),
      this._buildContextSection(context),
      this._buildCodeSection(code),
      this._buildOutputFormatSection('json', false)
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Build role definition section
   * @private
   */
  _buildRoleDefinition(role) {
    const roles = {
      generator: `You are Qwen, an expert AI software developer. Your task is to generate high-quality, production-ready code following best practices and project conventions.`,
      refiner: `You are Qwen, an expert AI software developer. You need to refine and improve code based on mandatory feedback from Codex (senior reviewer).`,
      analyzer: `You are Codex, a senior software architect and code reviewer. Your task is to thoroughly analyze code for errors, security vulnerabilities, architecture issues, and performance problems.`,
      validator: `You are Codex, a code validation expert. Your task is to validate code against specific criteria and provide clear pass/fail results.`
    };

    return `## Role\n${roles[role] || roles.generator}`;
  }

  /**
   * Build request section
   * @private
   */
  _buildRequestSection(userRequest) {
    if (!userRequest) return '';
    return `## Request\n${userRequest}`;
  }

  /**
   * Build context section
   * @private
   */
  _buildContextSection(context) {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }

    let formatted = '## Context\n';

    if (context.existingFiles) {
      formatted += `**Existing Files:** ${context.existingFiles.join(', ')}\n`;
    }

    if (context.requirements) {
      formatted += `**Requirements:** ${context.requirements.join(', ')}\n`;
    }

    if (context.framework) {
      formatted += `**Framework:** ${context.framework}\n`;
    }

    if (context.database) {
      formatted += `**Database:** ${context.database}\n`;
    }

    if (context.techStack) {
      formatted += `**Tech Stack:** ${context.techStack.join(', ')}\n`;
    }

    if (context.projectStructure) {
      formatted += `**Project Structure:**\n${context.projectStructure}\n`;
    }

    if (context.additionalNotes) {
      formatted += `**Additional Notes:** ${context.additionalNotes}\n`;
    }

    return formatted.trim();
  }

  /**
   * Build previous code section
   * @private
   */
  _buildPreviousCodeSection(code) {
    if (!code) return '';
    return `## Previous Code\n\`\`\`\n${code}\n\`\`\``;
  }

  /**
   * Build feedback section
   * @private
   */
  _buildFeedbackSection(codexFeedback) {
    if (!codexFeedback) return '';

    let formatted = '## Codex Review Feedback (MANDATORY CORRECTIONS)\n\n';

    if (codexFeedback.quality_score) {
      formatted += `**Quality Score:** ${codexFeedback.quality_score}/100\n\n`;
    }

    if (codexFeedback.errors?.length > 0) {
      formatted += `### Errors to Fix\n${codexFeedback.errors.map(e => `- ${e}`).join('\n')}\n\n`;
    }

    if (codexFeedback.architecture_issues?.length > 0) {
      formatted += `### Architecture Issues to Address\n${codexFeedback.architecture_issues.map(a => `- ${a}`).join('\n')}\n\n`;
    }

    if (codexFeedback.security_issues?.length > 0) {
      formatted += `### Security Issues to Fix\n${codexFeedback.security_issues.map(s => `- ${s.description || s}`).join('\n')}\n\n`;
    }

    if (codexFeedback.performance_issues?.length > 0) {
      formatted += `### Performance Issues to Address\n${codexFeedback.performance_issues.map(p => `- ${p}`).join('\n')}\n\n`;
    }

    if (codexFeedback.correction_prompt) {
      formatted += `### Correction Instructions\n${codexFeedback.correction_prompt}\n`;
    }

    formatted += '\n**Important:** All feedback above is MANDATORY and must be addressed.';

    return formatted.trim();
  }

  /**
   * Build code section
   * @private
   */
  _buildCodeSection(code) {
    if (!code) return '';
    return `## Code to Analyze\n\`\`\`\n${code}\n\`\`\``;
  }

  /**
   * Build patterns section
   * @private
   */
  _buildPatternsSection(patterns) {
    if (!patterns || patterns.length === 0) return '';

    return `## Project Patterns\nFollow these project-specific patterns:\n${patterns.map(p => `- ${p}`).join('\n')}`;
  }

  /**
   * Build examples section
   * @private
   */
  _buildExamplesSection(examples) {
    if (!examples || examples.length === 0) return '';

    return `## Examples\n${examples.map((e, i) => `### Example ${i + 1}\n${e}`).join('\n\n')}`;
  }

  /**
   * Build constraints section
   * @private
   */
  _buildConstraintsSection(constraints) {
    if (!constraints || constraints.length === 0) return '';

    return `## Constraints\n${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
  }

  /**
   * Build focus areas section
   * @private
   */
  _buildFocusAreasSection(focusAreas) {
    if (!focusAreas || focusAreas.length === 0) return '';

    return `## Focus Areas\nPay special attention to:\n${focusAreas.map(a => `- ${a}`).join('\n')}`;
  }

  /**
   * Build checklist section
   * @private
   */
  _buildChecklistSection(checklist) {
    if (!checklist || checklist.length === 0) return '';

    return `## Analysis Checklist\n${checklist.map((item, i) => `### ${i + 1}. ${item}`).join('\n\n')}`;
  }

  /**
   * Build criteria section
   * @private
   */
  _buildCriteriaSection(criteria) {
    if (!criteria || criteria.length === 0) {
      return '## Criteria\nNo specific criteria provided.';
    }

    return `## Validation Criteria\n${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
  }

  /**
   * Build output format section
   * @private
   */
  _buildOutputFormatSection(format, includeAnalysisSchema = false) {
    if (format === 'json') {
      if (includeAnalysisSchema) {
        return `## Output Format\nYou MUST respond with a JSON object. Respond ONLY with the JSON object, no additional text.

\`\`\`json
{
  "syntax_errors": [],
  "parsing_errors": [],
  "type_errors": [],
  "missing_imports": [],
  "runtime_errors": [],
  "api_contract_issues": [],
  "architecture_issues": [],
  "soc_violations": [],
  "tight_coupling": [],
  "missing_abstractions": [],
  "security_issues": [{"severity": "critical|high|medium|low", "description": ""}],
  "has_unvalidated_input": false,
  "has_sql_injection_risk": false,
  "has_xss_risk": false,
  "has_hardcoded_secrets": false,
  "missing_auth_check": false,
  "performance_issues": [],
  "n_plus_one_queries": [],
  "missing_caching_opportunities": false,
  "inefficient_loops": [],
  "memory_leak_risks": [],
  "unoptimized_queries": [],
  "style_issues": [],
  "good_patterns": [],
  "errors": [],
  "architecture_improvements": [],
  "security_recommendations": [],
  "performance_recommendations": []
}
\`\`\``;
      }

      return `## Output Format\nYou MUST respond with a JSON object in this exact format:

\`\`\`json
{
  "code": "<complete code here>",
  "assumptions": "<any assumptions you made>",
  "files_modified": ["<file1.js>", "<file2.js>"]
}
\`\`\`

Respond ONLY with the JSON object, no additional text.`;
    }

    return '';
  }

  /**
   * Get default analysis checklist
   * @private
   */
  _getDefaultChecklist() {
    return [
      'Syntax Errors - Check for syntax errors, parsing errors, type errors, missing imports',
      'Runtime Errors - Check for null/undefined access, unhandled exceptions, async issues',
      'API Contract Mismatch - Check endpoint patterns, request/response formats',
      'Architecture Issues - Check separation of concerns, coupling, abstraction layers',
      'Security Vulnerabilities - Check for injection risks, XSS, hardcoded secrets, auth checks',
      'Performance Issues - Check for N+1 queries, missing caching, inefficient loops',
      'Code Style - Check naming conventions, formatting, documentation'
    ];
  }

  /**
   * Load project-specific patterns
   * @private
   */
  _loadProjectPatterns() {
    return [
      'Controller-Service-Repository pattern for data flow',
      'Joi validation for input validation',
      'Express middleware for cross-cutting concerns',
      'MongoDB for user/session data, MySQL for product/order data',
      'JWT authentication with Redis blacklist',
      'Error handling with custom ApiError class',
      'Standardized response format with successResponse utility'
    ];
  }

  /**
   * Create a system prompt for conversation context
   * @param {Object} options - Options
   * @returns {string} System prompt
   */
  buildSystemPrompt(options = {}) {
    const {
      role = 'assistant',
      projectContext = {},
      capabilities = []
    } = options;

    const capabilitiesList = capabilities.length > 0
      ? capabilities.join(', ')
      : 'code generation, code review, refactoring, debugging';

    return `You are an AI ${role} specialized in ${capabilitiesList}.
    
Project Context:
- Framework: ${projectContext.framework || 'Node.js/Express'}
- Database: ${projectContext.database || 'MongoDB/MySQL'}
- Architecture: ${projectContext.architecture || 'MVC with Repository Pattern'}

Always follow project conventions and best practices.
Provide clear, well-documented, production-ready code.`;
  }
}

module.exports = {
  PromptBuilder
};
