/**
 * Qwen Generator Service
 *
 * Primary developer agent that generates code based on user requests
 * and Codex feedback. Treats Codex feedback as mandatory correction instructions.
 */

const axios = require('axios');
const config = require('../../config/ai-collaboration.config');
const logger = require('../../utils/logger');
const CollaborationLogger = require('./collaboration-logger');

class QwenGenerator {
  constructor() {
    this.endpoint = config.models.qwen.endpoint;
    this.model = config.models.qwen.model;
    this.timeout = config.models.qwen.timeout;
    this.temperature = config.models.qwen.temperature;
    this.maxTokens = config.models.qwen.maxTokens;
  }

  /**
   * Generate code based on user request
   * @param {Object} params - Generation parameters
   * @param {string} params.userRequest - The user's code generation request
   * @param {Object} params.context - Additional context (existing files, requirements, etc.)
   * @param {CollaborationLogger} params.collabLogger - Logger instance
   * @param {number} params.iteration - Current iteration number
   * @returns {Promise<Object>} Generated code output
   */
  async generate({ userRequest, context = {}, collabLogger = null, iteration = 1 }) {
    const prompt = this._buildGenerationPrompt(userRequest, context);

    if (collabLogger) {
      collabLogger.logQwenPrompt(iteration, prompt);
    }

    try {
      const response = await axios.post(
        this.endpoint,
        {
          model: this.model,
          prompt: prompt,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: false
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const generatedText = this._extractGeneratedCode(response.data);
      const parsedOutput = this._parseGeneratedOutput(generatedText);

      const output = {
        generated_code: parsedOutput.code,
        assumptions: parsedOutput.assumptions || '',
        files_modified: parsedOutput.files_modified || [],
        raw_response: generatedText
      };

      if (collabLogger) {
        collabLogger.logQwenOutput(iteration, output);
      }

      logger.info(`[Qwen] Generation completed - Iteration ${iteration}`, {
        filesModified: output.files_modified.length,
        codeLength: output.generated_code.length
      });

      return output;
    } catch (error) {
      logger.error('[Qwen] Generation failed', {
        iteration,
        error: error.message,
        endpoint: this.endpoint
      });

      if (collabLogger) {
        collabLogger.logError(error, { iteration, stage: 'qwen_generation' });
      }

      throw new QwenGenerationError(
        `Qwen generation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Refine code based on Codex feedback
   * @param {Object} params - Refinement parameters
   * @param {string} params.userRequest - Original user request
   * @param {string} params.previousCode - Previously generated code
   * @param {Object} params.codexFeedback - Codex review results
   * @param {Object} params.context - Additional context
   * @param {CollaborationLogger} params.collabLogger - Logger instance
   * @param {number} params.iteration - Current iteration number
   * @returns {Promise<Object>} Refined code output
   */
  async refine({
    userRequest,
    previousCode,
    codexFeedback,
    context = {},
    collabLogger = null,
    iteration = 1
  }) {
    const prompt = this._buildRefinementPrompt(userRequest, previousCode, codexFeedback, context);

    if (collabLogger) {
      collabLogger.logQwenPrompt(iteration, prompt, {
        correction_prompt: codexFeedback.correction_prompt,
        quality_score: codexFeedback.quality_score
      });
    }

    try {
      const response = await axios.post(
        this.endpoint,
        {
          model: this.model,
          prompt: prompt,
          temperature: this.temperature, // Slightly lower for refinements
          max_tokens: this.maxTokens,
          stream: false
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const generatedText = this._extractGeneratedCode(response.data);
      const parsedOutput = this._parseGeneratedOutput(generatedText);

      const output = {
        generated_code: parsedOutput.code,
        assumptions: parsedOutput.assumptions || '',
        files_modified: parsedOutput.files_modified || [],
        changes_from_feedback: parsedOutput.changes_from_feedback || [],
        raw_response: generatedText
      };

      if (collabLogger) {
        collabLogger.logQwenOutput(iteration, output);
      }

      logger.info(`[Qwen] Refinement completed - Iteration ${iteration}`, {
        filesModified: output.files_modified.length,
        codeLength: output.generated_code.length,
        changesFromFeedback: output.changes_from_feedback?.length || 0
      });

      return output;
    } catch (error) {
      logger.error('[Qwen] Refinement failed', {
        iteration,
        error: error.message,
        endpoint: this.endpoint
      });

      if (collabLogger) {
        collabLogger.logError(error, { iteration, stage: 'qwen_refinement' });
      }

      throw new QwenGenerationError(
        `Qwen refinement failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Build the initial code generation prompt
   * @private
   */
  _buildGenerationPrompt(userRequest, context) {
    const contextInfo = this._formatContext(context);

    return `You are Qwen, an expert AI software developer. Your task is to generate high-quality, production-ready code.

## User Request
${userRequest}

## Context
${contextInfo}

## Your Responsibilities
1. Generate clean, well-structured, production-ready code
2. Follow best practices for the specified technology stack
3. Include proper error handling and validation
4. Add appropriate comments and documentation
5. Follow security best practices
6. Consider performance implications

## Output Format
You MUST respond with a JSON object in this exact format:

{
  "code": "<complete code here>",
  "assumptions": "<any assumptions you made>",
  "files_modified": ["<file1.js>", "<file2.js>"]
}

## Important Guidelines
- Include ALL necessary imports
- Use proper error handling (try-catch, validation)
- Follow the project's existing patterns (controller-service-repository)
- Include input validation
- Add security checks where needed
- Write self-documenting code with clear naming

Respond ONLY with the JSON object, no additional text.`;
  }

  /**
   * Build the refinement prompt with Codex feedback
   * @private
   */
  _buildRefinementPrompt(userRequest, previousCode, codexFeedback, context) {
    const contextInfo = this._formatContext(context);

    return `You are Qwen, an expert AI software developer. You need to refine code based on mandatory feedback from Codex (senior reviewer).

## Original User Request
${userRequest}

## Context
${contextInfo}

## Previously Generated Code
\`\`\`
${previousCode}
\`\`\`

## Codex Review Feedback (MANDATORY CORRECTIONS)

### Quality Score: ${codexFeedback.quality_score}/100

### Errors to Fix
${codexFeedback.errors?.length > 0 ? codexFeedback.errors.map(e => `- ${e}`).join('\n') : 'None'}

### Architecture Issues to Address
${codexFeedback.architecture_issues?.length > 0 ? codexFeedback.architecture_issues.map(a => `- ${a}`).join('\n') : 'None'}

### Security Issues to Fix
${codexFeedback.security_issues?.length > 0 ? codexFeedback.security_issues.map(s => `- ${s}`).join('\n') : 'None'}

### Performance Issues to Address
${codexFeedback.performance_issues?.length > 0 ? codexFeedback.performance_issues.map(p => `- ${p}`).join('\n') : 'None'}

### Correction Instructions
${codexFeedback.correction_prompt || 'Apply all the above corrections.'}

## Your Task
Refactor the code to address ALL the issues mentioned above. The feedback is MANDATORY and must be applied.

## Output Format
You MUST respond with a JSON object in this exact format:

{
  "code": "<refactored code here>",
  "assumptions": "<any assumptions>",
  "files_modified": ["<file1.js>", "<file2.js>"],
  "changes_from_feedback": ["<change1>", "<change2>"]
}

Respond ONLY with the JSON object, no additional text.`;
  }

  /**
   * Format context for prompts
   * @private
   */
  _formatContext(context) {
    if (!context || Object.keys(context).length === 0) {
      return 'No additional context provided.';
    }

    let formatted = '';

    if (context.existingFiles) {
      formatted += `Existing Files: ${context.existingFiles.join(', ')}\n`;
    }

    if (context.requirements) {
      formatted += `Requirements: ${context.requirements.join(', ')}\n`;
    }

    if (context.framework) {
      formatted += `Framework: ${context.framework}\n`;
    }

    if (context.database) {
      formatted += `Database: ${context.database}\n`;
    }

    if (context.techStack) {
      formatted += `Tech Stack: ${context.techStack.join(', ')}\n`;
    }

    if (context.additionalNotes) {
      formatted += `Additional Notes: ${context.additionalNotes}\n`;
    }

    return formatted || 'No additional context provided.';
  }

  /**
   * Extract generated code from API response
   * @private
   */
  _extractGeneratedCode(responseData) {
    // Handle different API response formats
    if (responseData.text) {
      return responseData.text;
    }
    if (responseData.choices?.[0]?.text) {
      return responseData.choices[0].text;
    }
    if (responseData.choices?.[0]?.message?.content) {
      return responseData.choices[0].message.content;
    }
    if (responseData.response) {
      return responseData.response;
    }
    if (responseData.output) {
      return responseData.output;
    }
    if (responseData.generated) {
      return responseData.generated;
    }
    if (typeof responseData === 'string') {
      return responseData;
    }

    logger.warn('[Qwen] Unknown response format', { responseData });
    return JSON.stringify(responseData);
  }

  /**
   * Parse generated output to extract JSON structure
   * @private
   */
  _parseGeneratedOutput(generatedText) {
    try {
      // Try to find JSON object in the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          code: parsed.code || parsed.generated_code || generatedText,
          assumptions: parsed.assumptions || '',
          files_modified: parsed.files_modified || [],
          changes_from_feedback: parsed.changes_from_feedback || []
        };
      }

      // If no JSON found, treat entire response as code
      return {
        code: generatedText,
        assumptions: '',
        files_modified: ['generated_file.js'],
        changes_from_feedback: []
      };
    } catch (error) {
      logger.warn('[Qwen] Failed to parse JSON output', {
        error: error.message,
        generatedText: generatedText.substring(0, 200)
      });

      return {
        code: generatedText,
        assumptions: '',
        files_modified: ['generated_file.js'],
        changes_from_feedback: []
      };
    }
  }
}

/**
 * Custom error class for Qwen generation errors
 */
class QwenGenerationError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'QwenGenerationError';
    this.originalError = originalError;
  }
}

module.exports = {
  QwenGenerator,
  QwenGenerationError
};
