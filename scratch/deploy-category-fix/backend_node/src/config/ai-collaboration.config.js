/**
 * AI Collaboration System Configuration
 * 
 * Configures the Qwen (Generator) and Codex (Analyzer) collaboration loop
 */

module.exports = {
  // Quality threshold for accepting code (0-100)
  qualityThreshold: 90,
  
  // Maximum iterations before forcing stop
  maxIterations: 5,
  
  // Model endpoints
  models: {
    qwen: {
      // Qwen acts as the primary developer/generator
      endpoint: process.env.QWEN_API_ENDPOINT || 'http://localhost:11434/api/generate',
      model: process.env.QWEN_MODEL || 'qwen:72b',
      timeout: parseInt(process.env.QWEN_TIMEOUT || '120000', 10),
      temperature: parseFloat(process.env.QWEN_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.QWEN_MAX_TOKENS || '4096', 10)
    },
    codex: {
      // Codex acts as the senior reviewer/debugger
      endpoint: process.env.CODEX_API_ENDPOINT || 'http://localhost:11434/api/generate',
      model: process.env.CODEX_MODEL || 'codex:latest',
      timeout: parseInt(process.env.CODEX_TIMEOUT || '120000', 10),
      temperature: parseFloat(process.env.CODEX_TEMPERATURE || '0.3'), // Lower for more consistent reviews
      maxTokens: parseInt(process.env.CODEX_MAX_TOKENS || '4096', 10)
    }
  },
  
  // Scoring weights
  scoring: {
    weights: {
      syntax: 0.25,
      architecture: 0.25,
      security: 0.30,
      performance: 0.20
    },
    minimumScores: {
      syntax: 80,
      architecture: 75,
      security: 80,
      performance: 70
    }
  },
  
  // Logging configuration
  logging: {
    enabled: true,
    directory: 'logs/ai-collaboration',
    savePrompts: true,
    saveOutputs: true,
    saveReviews: true,
    format: 'json'
  },
  
  // Code analysis settings
  analysis: {
    checkSyntax: true,
    checkArchitecture: true,
    checkSecurity: true,
    checkPerformance: true,
    checkStyle: true,
    checkDocumentation: true
  },
  
  // Retry configuration
  retry: {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2
  }
};
