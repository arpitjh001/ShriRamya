# AI Collaboration System - Complete Documentation

## Overview

This system implements a **continuous improvement loop** where two AI models collaborate to produce high-quality, production-ready code:

- **Model 1 → Qwen (Generator)**: Primary developer agent that generates code
- **Model 2 → Codex (Analyzer & Corrector)**: Senior reviewer that analyzes and corrects code

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI COLLABORATION LOOP                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Request                                                            │
│       ↓                                                                    │
│  ┌─────────────────┐                                                      │
│  │   Qwen          │  ← Generates code based on request                  │
│  │   (Generator)   │                                                      │
│  └────────┬────────┘                                                      │
│           ↓                                                                │
│  ┌─────────────────┐                                                      │
│  │   Codex         │  ← Reviews code for:                                │
│  │   (Analyzer)    │    • Syntax errors                                  │
│  └────────┬────────┘    • Runtime errors                                 │
│           ↓              • Security vulnerabilities                       │
│  Quality Score < 90?   • Architecture issues                              │
│           ↓              • Performance problems                           │
│       Yes ↓                                                                │
│  ┌─────────────────┐                                                      │
│  │   Correction    │  ← Structured feedback prompt                       │
│  │   Prompt        │                                                      │
│  └────────┬────────┘                                                      │
│           ↓                                                                │
│  ┌─────────────────┐                                                      │
│  │   Qwen          │  ← Refines code based on feedback                   │
│  │   (Refinement)  │    (Treats feedback as MANDATORY)                   │
│  └────────┬────────┘                                                      │
│           ↓                                                                │
│       Loop back to Codex                                                  │
│                                                                          │
│  Until Quality Score ≥ 90 or Max Iterations                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. AI Orchestrator (`orchestrator.js`)

Main controller that manages the entire collaboration flow.

```javascript
const { getOrchestrator } = require('./services/ai-collaboration/orchestrator');

const orchestrator = getOrchestrator({
  qualityThreshold: 90,
  maxIterations: 5
});

const result = await orchestrator.processRequest({
  userRequest: 'Create a product service with validation',
  context: {
    framework: 'Express',
    database: 'MongoDB'
  }
});
```

### 2. Qwen Generator (`qwen-generator.js`)

Handles code generation and refinement with structured prompts.

**Responsibilities:**
- Generate clean, production-ready code
- Apply Codex feedback as mandatory corrections
- Follow project conventions (Controller-Service-Repository pattern)
- Include proper error handling and validation

### 3. Codex Analyzer (`codex-analyzer.js`)

Reviews code comprehensively across multiple dimensions.

**Analysis Categories:**
| Category | Checks |
|----------|--------|
| **Syntax** | Syntax errors, parsing errors, type errors, missing imports |
| **Runtime** | Null/undefined access, unhandled exceptions, async issues |
| **Security** | SQL injection, XSS, hardcoded secrets, missing auth |
| **Architecture** | Separation of concerns, coupling, abstraction layers |
| **Performance** | N+1 queries, missing caching, inefficient loops |

### 4. Quality Scorer (`quality-scorer.js`)

Generates multi-dimensional quality scores.

**Scoring Dimensions:**
- **Syntax** (25% weight): Code correctness
- **Architecture** (25% weight): Design patterns
- **Security** (30% weight): Vulnerability assessment
- **Performance** (20% weight): Efficiency

**Minimum Scores Required:**
- Syntax: 80/100
- Architecture: 75/100
- Security: 80/100
- Performance: 70/100

### 5. Feedback Loop Controller (`feedback-loop.js`)

Manages iterative refinement until quality threshold is reached.

### 6. Logger (`collaboration-logger.js`)

Comprehensive logging for debugging and audit.

## API Endpoints

### Generate Code with Full Collaboration

```http
POST /api/v1/ai-collaborate/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "request": "Create a user authentication service with JWT",
  "context": {
    "framework": "Express",
    "database": "MongoDB",
    "requirements": ["bcryptjs", "jsonwebtoken", "Joi validation"]
  },
  "qualityThreshold": 90,
  "maxIterations": 5,
  "useFeedbackLoop": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code generation completed successfully",
  "data": {
    "sessionId": "session_1234567890_abc123",
    "finalCode": "const authService = {...}",
    "reviewReport": {
      "summary": {
        "qualityScore": 92,
        "passedThreshold": true,
        "totalIssues": 0
      },
      "errors": [],
      "architectureIssues": [],
      "securityIssues": [],
      "detailedScores": {
        "syntax": 100,
        "architecture": 90,
        "security": 95,
        "performance": 85
      }
    },
    "qualityScore": {
      "total": 92,
      "threshold": 90,
      "passed": true,
      "detailed": {...}
    },
    "iterations": {
      "total": 3,
      "history": [...]
    },
    "improvementsApplied": [
      "Iteration 2: Improved quality score from 75 to 85",
      "Iteration 3: Fixed 2 error(s)"
    ],
    "remainingWarnings": [],
    "logDirectory": "logs/ai-collaboration/session_..."
  }
}
```

### Generate Code Only (No Review)

```http
POST /api/v1/ai-collaborate/generate-only
Authorization: Bearer <token>
Content-Type: application/json

{
  "request": "Create a simple utility function",
  "context": {}
}
```

### Review Existing Code

```http
POST /api/v1/ai-collaborate/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "const user = await User.findById(id);",
  "request": "Review this database query",
  "focusAreas": ["Security", "Performance"]
}
```

### Refine Code Based on Feedback

```http
POST /api/v1/ai-collaborate/refine
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "const user = await User.findById(id);",
  "feedback": "Add null check and error handling",
  "request": "Get user by ID"
}
```

### Validate Code Against Criteria

```http
POST /api/v1/ai-collaborate/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "const x = 1;",
  "criteria": [
    "Code must use strict mode",
    "Variables must be properly declared",
    "No console.log statements"
  ]
}
```

### Get Session Logs

```http
GET /api/v1/ai-collaborate/logs/:sessionId
Authorization: Bearer <admin_token>
```

### Get Orchestrator Status

```http
GET /api/v1/ai-collaborate/status
Authorization: Bearer <admin_token>
```

## Configuration

Edit `src/config/ai-collaboration.config.js`:

```javascript
module.exports = {
  // Quality threshold for accepting code (0-100)
  qualityThreshold: 90,

  // Maximum iterations before forcing stop
  maxIterations: 5,

  // Model endpoints
  models: {
    qwen: {
      endpoint: process.env.QWEN_API_ENDPOINT || 'http://localhost:11434/api/generate',
      model: process.env.QWEN_MODEL || 'qwen:72b',
      timeout: 120000,
      temperature: 0.7,
      maxTokens: 4096
    },
    codex: {
      endpoint: process.env.CODEX_API_ENDPOINT || 'http://localhost:11434/api/generate',
      model: process.env.CODEX_MODEL || 'codex:latest',
      timeout: 120000,
      temperature: 0.3,
      maxTokens: 4096
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
  }
};
```

## Environment Variables

```bash
# Qwen Configuration
QWEN_API_ENDPOINT=http://localhost:11434/api/generate
QWEN_MODEL=qwen:72b
QWEN_TIMEOUT=120000
QWEN_TEMPERATURE=0.7
QWEN_MAX_TOKENS=4096

# Codex Configuration
CODEX_API_ENDPOINT=http://localhost:11434/api/generate
CODEX_MODEL=codex:latest
CODEX_TIMEOUT=120000
CODEX_TEMPERATURE=0.3
CODEX_MAX_TOKENS=4096
```

## Usage Examples

### Example 1: Generate a Complete Service

```javascript
const { getOrchestrator } = require('./src/services/ai-collaboration/orchestrator');

async function createProductService() {
  const orchestrator = getOrchestrator();

  const result = await orchestrator.processRequest({
    userRequest: `
      Create a complete ProductService with:
      - CRUD operations for products
      - Joi validation for input
      - MongoDB integration
      - Error handling
      - Pagination support
    `,
    context: {
      existingFiles: ['Product.js', 'product.repository.js'],
      requirements: ['joi', 'mongodb', 'express'],
      framework: 'Express',
      database: 'MongoDB'
    },
    qualityThreshold: 90,
    maxIterations: 5
  });

  console.log('Generated Code:', result.finalCode);
  console.log('Quality Score:', result.qualityScore.total);
  console.log('Iterations:', result.iterations.total);
  console.log('Log Directory:', result.logDirectory);
}

createProductService();
```

### Example 2: Review and Improve Existing Code

```javascript
async function reviewAndImprove() {
  const orchestrator = getOrchestrator();

  // First, review the code
  const review = await orchestrator.reviewCode({
    code: `
      const getUser = async (id) => {
        const user = await User.findById(id);
        return user;
      }
    `,
    userRequest: 'Get user by ID',
    context: { framework: 'Express', database: 'MongoDB' }
  });

  console.log('Review Results:', review.review);

  // Then refine based on feedback
  const refined = await orchestrator.refineCode({
    code: review.code,
    feedback: review.review.correctionPrompt,
    userRequest: 'Get user by ID with proper error handling'
  });

  console.log('Refined Code:', refined.code);
}
```

### Example 3: Programmatic Usage with Custom Loop

```javascript
const { QwenGenerator } = require('./src/services/ai-collaboration/qwen-generator');
const { CodexAnalyzer } = require('./src/services/ai-collaboration/codex-analyzer');
const CollaborationLogger = require('./src/services/ai-collaboration/collaboration-logger');

async function customCollaborationLoop() {
  const qwen = new QwenGenerator();
  const codex = new CodexAnalyzer();
  const logger = new CollaborationLogger();

  let code = null;
  let review = null;
  let iteration = 0;
  const maxIterations = 5;
  const qualityThreshold = 90;

  while (iteration < maxIterations) {
    iteration++;

    if (iteration === 1) {
      // Initial generation
      code = await qwen.generate({
        userRequest: 'Create a rate limiter middleware',
        context: { framework: 'Express' },
        collabLogger: logger,
        iteration
      });
    } else {
      // Refinement
      code = await qwen.refine({
        userRequest: 'Create a rate limiter middleware',
        previousCode: code.generated_code,
        codexFeedback: review,
        context: { framework: 'Express' },
        collabLogger: logger,
        iteration
      });
    }

    // Review
    review = await codex.analyze({
      code: code.generated_code,
      userRequest: 'Create a rate limiter middleware',
      context: { framework: 'Express' },
      collabLogger: logger,
      iteration
    });

    console.log(`Iteration ${iteration}: Quality Score = ${review.quality_score}`);

    if (review.quality_score >= qualityThreshold) {
      console.log('Quality threshold reached!');
      break;
    }
  }

  return { code: code.generated_code, review, iterations: iteration };
}
```

## Log Structure

Each collaboration session creates a log directory:

```
logs/ai-collaboration/session_1234567890_abc123/
├── 00_user_request.json
├── qwen_prompt_001.json
├── qwen_output_001.json
├── codex_review_001.json
├── iteration_001_summary.json
├── qwen_prompt_002.json
├── qwen_output_002.json
├── codex_review_002.json
├── iteration_002_summary.json
└── final_result.json
```

### Log File Examples

**User Request Log:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "request": "Create a product service",
  "context": {
    "framework": "Express",
    "database": "MongoDB"
  }
}
```

**Codex Review Log:**
```json
{
  "timestamp": "2024-01-15T10:30:15.000Z",
  "iteration": 1,
  "errors": ["Missing null check in findById"],
  "architecture_issues": ["Move validation to separate layer"],
  "security_issues": [],
  "performance_issues": ["Add indexing recommendation"],
  "correction_prompt": "Add null check and move validation...",
  "quality_score": 75,
  "detailed_scores": {
    "syntax": 95,
    "architecture": 70,
    "security": 80,
    "performance": 65
  }
}
```

## Testing

Run the test suite:

```bash
cd backend_node
npm test -- tests/ai-collaboration.test.js
```

Or with coverage:

```bash
npm run test:coverage -- --testPathPattern=ai-collaboration
```

## Best Practices

### For Qwen (Generator)
1. Always include proper error handling
2. Follow the project's Controller-Service-Repository pattern
3. Add input validation using Joi
4. Include security checks (authentication, authorization)
5. Write self-documenting code with clear naming

### For Codex (Analyzer)
1. Prioritize critical issues (security, syntax errors)
2. Provide actionable, specific feedback
3. Acknowledge good patterns when present
4. Consider the project context in recommendations

### For Orchestrator Configuration
1. Set quality threshold based on use case (90+ for production)
2. Limit max iterations to prevent infinite loops
3. Enable comprehensive logging for debugging
4. Monitor API timeouts for large code generations

## Troubleshooting

### Issue: Quality score never reaches threshold

**Solutions:**
- Increase maxIterations
- Lower qualityThreshold temporarily
- Check if Codex is being too strict
- Review the correction prompts for clarity

### Issue: API timeouts

**Solutions:**
- Increase timeout in config
- Reduce maxTokens for smaller responses
- Check model endpoint availability
- Implement retry logic

### Issue: JSON parsing failures

**Solutions:**
- Check model temperature (lower for more consistent output)
- Verify prompt format is clear about JSON output
- Use ResponseParser fallback mechanisms

## Integration with Existing Systems

The AI Collaboration system integrates seamlessly with the existing ShriRamya platform:

- Uses existing logger utility
- Follows Controller-Service-Repository pattern
- Compatible with existing RBAC system
- Logs to standard log directory structure
- Uses existing response format utilities

## Future Enhancements

1. **Streaming Support**: Real-time code generation streaming
2. **Multi-file Generation**: Generate multiple related files in one request
3. **Code Diff Output**: Show exact changes between iterations
4. **Custom Rules**: Allow custom validation rules per project
5. **Model Fallback**: Automatic fallback to alternative models
6. **Caching**: Cache common code patterns for faster generation
