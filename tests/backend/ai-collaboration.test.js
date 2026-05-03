/**
 * AI Collaboration Service Tests
 *
 * Tests for Qwen Generator, Codex Analyzer, and Feedback Loop Controller
 */

const { QwenGenerator, QwenGenerationError } = require('../src/services/ai-collaboration/qwen-generator');
const { CodexAnalyzer } = require('../src/services/ai-collaboration/codex-analyzer');
const { FeedbackLoopController } = require('../src/services/ai-collaboration/feedback-loop');
const { AICollaborationOrchestrator, getOrchestrator } = require('../src/services/ai-collaboration/orchestrator');
const { PromptBuilder } = require('../src/services/ai-collaboration/prompt-builder');
const { ResponseParser } = require('../src/services/ai-collaboration/response-parser');
const CollaborationLogger = require('../src/services/ai-collaboration/collaboration-logger');
const QualityScorer = require('../src/services/ai-collaboration/quality-scorer');

// Mock axios for API calls
jest.mock('axios');
const axios = require('axios');

describe('AI Collaboration System', () => {
  describe('QwenGenerator', () => {
    let generator;

    beforeEach(() => {
      generator = new QwenGenerator();
      jest.clearAllMocks();
    });

    describe('generate()', () => {
      it('should generate code from user request', async () => {
        const mockResponse = {
          data: {
            text: JSON.stringify({
              code: 'const hello = "world";',
              assumptions: 'None',
              files_modified: ['test.js']
            })
          }
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await generator.generate({
          userRequest: 'Create a hello world function',
          context: { framework: 'Node.js' }
        });

        expect(result.generated_code).toBe('const hello = "world";');
        expect(result.files_modified).toEqual(['test.js']);
        expect(axios.post).toHaveBeenCalled();
      });

      it('should handle API errors gracefully', async () => {
        axios.post.mockRejectedValue(new Error('API Error'));

        await expect(
          generator.generate({
            userRequest: 'Create something',
            context: {}
          })
        ).rejects.toThrow(QwenGenerationError);
      });

      it('should log generation when logger provided', async () => {
        const mockResponse = {
          data: {
            text: JSON.stringify({
              code: 'const x = 1;',
              assumptions: '',
              files_modified: ['file.js']
            })
          }
        };

        axios.post.mockResolvedValue(mockResponse);
        const collabLogger = new CollaborationLogger();

        const result = await generator.generate({
          userRequest: 'Test',
          context: {},
          collabLogger,
          iteration: 1
        });

        expect(result.generated_code).toBe('const x = 1;');
        expect(result.files_modified).toEqual(['file.js']);
      });
    });

    describe('refine()', () => {
      it('should refine code based on Codex feedback', async () => {
        const mockResponse = {
          data: {
            text: JSON.stringify({
              code: 'const improved = "code";',
              assumptions: 'Applied feedback',
              files_modified: ['improved.js'],
              changes_from_feedback: ['Fixed null check']
            })
          }
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await generator.refine({
          userRequest: 'Improve code',
          previousCode: 'const x = 1;',
          codexFeedback: {
            errors: ['Missing null check'],
            correction_prompt: 'Add null check',
            quality_score: 70
          },
          context: {}
        });

        expect(result.generated_code).toBe('const improved = "code";');
        expect(result.changes_from_feedback).toContain('Fixed null check');
      });
    });
  });

  describe('CodexAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
      analyzer = new CodexAnalyzer();
      jest.clearAllMocks();
    });

    describe('analyze()', () => {
      it('should analyze code and return review', async () => {
        const mockResponse = {
          data: {
            text: JSON.stringify({
              syntax_errors: [],
              architecture_issues: ['Move logic to service layer'],
              security_issues: [],
              performance_issues: [],
              errors: [],
              quality_score: 85
            })
          }
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await analyzer.analyze({
          code: 'const x = 1;',
          userRequest: 'Test request',
          context: {}
        });

        // Quality score may be calculated locally, but should include the architecture issue
        expect(result.architecture_issues).toContain('Move logic to service layer');
        expect(result.correction_prompt).toBeDefined();
      });

      it('should calculate quality scores', async () => {
        const mockResponse = {
          data: {
            text: JSON.stringify({
              syntax_errors: ['Missing semicolon'],
              architecture_issues: [],
              security_issues: [{ severity: 'high', description: 'XSS risk' }],
              performance_issues: []
            })
          }
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await analyzer.analyze({
          code: 'const x = 1',
          userRequest: 'Test',
          context: {}
        });

        expect(result.detailed_scores).toBeDefined();
        expect(result.quality_score).toBeLessThan(100);
      });

      it('should return fallback review on error', async () => {
        axios.post.mockRejectedValue(new Error('Analysis failed'));

        const result = await analyzer.analyze({
          code: 'const x = 1;',
          userRequest: 'Test',
          context: {}
        });

        expect(result.quality_score).toBe(50);
        expect(result.passed_threshold).toBe(false);
      });
    });

    describe('validate()', () => {
      it('should validate code against criteria', async () => {
        const mockResponse = {
          data: {
            text: JSON.stringify({
              valid: true,
              errors: [],
              warnings: []
            })
          }
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await analyzer.validate({
          code: 'const x = 1;',
          criteria: ['Check syntax', 'Check style']
        });

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('QualityScorer', () => {
    let scorer;

    beforeEach(() => {
      scorer = new QualityScorer();
    });

    describe('calculate()', () => {
      it('should calculate quality scores from analysis', () => {
        const analysis = {
          syntax_errors: [],
          architecture_issues: [],
          security_issues: [],
          performance_issues: []
        };

        const result = scorer.calculate(analysis);

        expect(result.totalScore).toBe(100);
        expect(result.passedThreshold).toBe(true);
      });

      it('should deduct points for errors', () => {
        const analysis = {
          syntax_errors: ['Error 1', 'Error 2'],
          architecture_issues: ['Issue 1'],
          security_issues: [{ severity: 'high', description: 'Risk' }],
          performance_issues: ['Slow query']
        };

        const result = scorer.calculate(analysis);

        expect(result.totalScore).toBeLessThan(100);
        expect(result.detailed_scores.syntax).toBeLessThan(100);
      });

      it('should check minimum scores', () => {
        const analysis = {
          syntax_errors: [],
          architecture_issues: [],
          security_issues: [],
          performance_issues: []
        };

        const result = scorer.calculate(analysis);

        expect(result.minimumScoresMet).toBe(true);
      });
    });

    describe('generateReport()', () => {
      it('should generate score report', () => {
        const scores = {
          totalScore: 85,
          detailedScores: {
            syntax: 90,
            architecture: 80,
            security: 85,
            performance: 85
          },
          passedThreshold: true,
          threshold: 90,
          minimumScoresMet: true
        };

        const analysis = {
          syntax_errors: [],
          architecture_issues: [],
          security_issues: [],
          performance_issues: []
        };

        const report = scorer.generateReport(scores, analysis);

        expect(report.status).toBe('PASSED');
        expect(report.breakdown).toBeDefined();
      });
    });
  });

  describe('PromptBuilder', () => {
    let builder;

    beforeEach(() => {
      builder = new PromptBuilder();
    });

    describe('buildGenerationPrompt()', () => {
      it('should build complete generation prompt', () => {
        const prompt = builder.buildGenerationPrompt({
          userRequest: 'Create a service',
          context: {
            framework: 'Express',
            database: 'MongoDB'
          }
        });

        expect(prompt).toContain('## Role');
        expect(prompt).toContain('## Request');
        expect(prompt).toContain('Create a service');
        expect(prompt).toContain('Express');
      });

      it('should include constraints when provided', () => {
        const prompt = builder.buildGenerationPrompt({
          userRequest: 'Create API',
          constraints: ['Use JWT auth', 'Add rate limiting']
        });

        expect(prompt).toContain('## Constraints');
        expect(prompt).toContain('Use JWT auth');
      });
    });

    describe('buildRefinementPrompt()', () => {
      it('should build refinement prompt with feedback', () => {
        const prompt = builder.buildRefinementPrompt({
          userRequest: 'Improve service',
          previousCode: 'const x = 1;',
          codexFeedback: {
            errors: ['Missing validation'],
            architecture_issues: ['Poor structure'],
            correction_prompt: 'Add validation',
            quality_score: 60
          }
        });

        expect(prompt).toContain('## Codex Review Feedback');
        expect(prompt).toContain('Missing validation');
        expect(prompt).toContain('MANDATORY');
      });
    });

    describe('buildAnalysisPrompt()', () => {
      it('should build analysis prompt for Codex', () => {
        const prompt = builder.buildAnalysisPrompt({
          code: 'const x = 1;',
          userRequest: 'Review this',
          context: { framework: 'Node.js' }
        });

        expect(prompt).toContain('## Code to Analyze');
        expect(prompt).toContain('const x = 1;');
        expect(prompt).toContain('## Analysis Checklist');
      });
    });
  });

  describe('ResponseParser', () => {
    let parser;

    beforeEach(() => {
      parser = new ResponseParser();
    });

    describe('parseQwenResponse()', () => {
      it('should parse JSON response', () => {
        const response = {
          text: JSON.stringify({
            code: 'const x = 1;',
            assumptions: 'None',
            files_modified: ['test.js']
          })
        };

        const result = parser.parseQwenResponse(response);

        expect(result.code).toBe('const x = 1;');
        expect(result.files_modified).toEqual(['test.js']);
        expect(result.parsed).toBe(true);
      });

      it('should handle non-JSON response', () => {
        const response = { text: 'const x = 1;' };

        const result = parser.parseQwenResponse(response);

        expect(result.code).toBe('const x = 1;');
        expect(result.parsed).toBe(false);
      });

      it('should extract text from various response formats', () => {
        const formats = [
          { choices: [{ text: 'code1' }] },
          { choices: [{ message: { content: 'code2' } }] },
          { content: [{ text: 'code3' }] },
          { output: 'code4' }
        ];

        formats.forEach((format, index) => {
          const result = parser.parseQwenResponse(format);
          expect(result.code).toBeTruthy();
        });
      });
    });

    describe('parseCodexResponse()', () => {
      it('should parse review response', () => {
        const response = {
          text: JSON.stringify({
            syntax_errors: ['Error'],
            architecture_issues: ['Issue'],
            security_issues: [],
            quality_score: 75
          })
        };

        const result = parser.parseCodexResponse(response);

        expect(result.syntax_errors).toContain('Error');
        expect(result.architecture_issues).toContain('Issue');
      });

      it('should create empty review on parse failure', () => {
        const response = { text: 'Invalid JSON {{{' };

        const result = parser.parseCodexResponse(response);

        expect(result.syntax_errors).toEqual([]);
        expect(result.parsed).toBe(false);
      });
    });

    describe('extractCodeBlocks()', () => {
      it('should extract code blocks from markdown', () => {
        const text = `
Here's the code:
\`\`\`javascript
const x = 1;
\`\`\`

And another:
\`\`\`python
print("hello")
\`\`\`
`;

        const blocks = parser.extractCodeBlocks(text);

        expect(blocks.length).toBe(2);
        expect(blocks[0]).toBe('const x = 1;');
        expect(blocks[1]).toBe('print("hello")');
      });

      it('should filter by language', () => {
        const text = `
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`python
print("hello")
\`\`\`
`;

        const jsBlocks = parser.extractCodeBlocks(text, 'javascript');

        expect(jsBlocks.length).toBe(1);
        expect(jsBlocks[0]).toBe('const x = 1;');
      });
    });
  });

  describe('CollaborationLogger', () => {
    let logger;

    beforeEach(() => {
      logger = new CollaborationLogger();
    });

    it('should create session directory', () => {
      expect(logger.getLogDir()).toBeDefined();
    });

    it('should log user request', () => {
      expect(() => {
        logger.logUserRequest('Test request', { framework: 'Node.js' });
      }).not.toThrow();
    });

    it('should log Qwen prompt and output', () => {
      expect(() => {
        logger.logQwenPrompt(1, 'Test prompt');
        logger.logQwenOutput(1, {
          generated_code: 'const x = 1;',
          assumptions: '',
          files_modified: ['test.js']
        });
      }).not.toThrow();
    });

    it('should log Codex review', () => {
      expect(() => {
        logger.logCodexReview(1, {
          errors: [],
          architecture_issues: [],
          security_issues: [],
          quality_score: 85,
          detailed_scores: {}
        });
      }).not.toThrow();
    });

    it('should log iteration summary', () => {
      expect(() => {
        logger.logIterationSummary(1, {
          qualityScore: 85,
          passedThreshold: false
        });
      }).not.toThrow();
    });

    it('should log final result', () => {
      expect(() => {
        logger.logFinalResult({
          totalIterations: 3,
          finalQualityScore: 92,
          filesGenerated: ['file.js'],
          reviewReport: {},
          improvementsApplied: [],
          remainingWarnings: []
        });
      }).not.toThrow();
    });

    it('should retrieve session logs', () => {
      const logs = logger.getSessionLogs();
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('AICollaborationOrchestrator', () => {
    let orchestrator;

    beforeEach(() => {
      // Create new instance to avoid singleton issues in tests
      orchestrator = new AICollaborationOrchestrator({
        qualityThreshold: 90,
        maxIterations: 3
      });
      jest.clearAllMocks();
    });

    describe('processRequest()', () => {
      it('should process with feedback loop', async () => {
        // Mock Qwen response
        axios.post.mockImplementation((url) => {
          if (url.includes('qwen') || url.includes('generate')) {
            return Promise.resolve({
              data: {
                text: JSON.stringify({
                  code: 'const x = 1;',
                  assumptions: '',
                  files_modified: ['test.js']
                })
              }
            });
          }
          // Mock Codex response
          return Promise.resolve({
            data: {
              text: JSON.stringify({
                syntax_errors: [],
                architecture_issues: [],
                security_issues: [],
                performance_issues: [],
                errors: [],
                quality_score: 95
              })
            }
          });
        });

        const result = await orchestrator.processRequest({
          userRequest: 'Create a function',
          context: {},
          useFeedbackLoop: true
        });

        expect(result.success).toBe(true);
        expect(result.qualityScore.passed).toBe(true);
        expect(result.sessionId).toBeDefined();
      });

      it('should process single pass when disabled', async () => {
        axios.post.mockImplementation((url) => {
          if (url.includes('qwen') || url.includes('generate')) {
            return Promise.resolve({
              data: {
                text: JSON.stringify({
                  code: 'const x = 1;',
                  assumptions: '',
                  files_modified: ['test.js']
                })
              }
            });
          }
          return Promise.resolve({
            data: {
              text: JSON.stringify({
                syntax_errors: [],
                architecture_issues: [],
                security_issues: [],
                quality_score: 80
              })
            }
          });
        });

        const result = await orchestrator.processRequest({
          userRequest: 'Create something',
          useFeedbackLoop: false
        });

        expect(result.success).toBe(true);
        expect(result.iterations.total).toBe(1);
      });
    });

    describe('generateCode()', () => {
      it('should generate code without review', async () => {
        axios.post.mockResolvedValue({
          data: {
            text: JSON.stringify({
              code: 'const x = 1;',
              assumptions: 'None',
              files_modified: ['test.js']
            })
          }
        });

        const result = await orchestrator.generateCode({
          userRequest: 'Generate code',
          context: {}
        });

        expect(result.success).toBe(true);
        expect(result.code).toBe('const x = 1;');
      });
    });

    describe('reviewCode()', () => {
      it('should review code without generation', async () => {
        axios.post.mockResolvedValue({
          data: {
            text: JSON.stringify({
              syntax_errors: [],
              architecture_issues: ['Refactor needed'],
              security_issues: [],
              quality_score: 75
            })
          }
        });

        const result = await orchestrator.reviewCode({
          code: 'const x = 1;',
          userRequest: 'Review',
          context: {}
        });

        expect(result.success).toBe(true);
        expect(result.review.qualityScore).toBe(75);
      });
    });

    describe('getStatus()', () => {
      it('should return orchestrator status', () => {
        const status = orchestrator.getStatus();

        expect(status.status).toBe('operational');
        expect(status.configuration).toBeDefined();
        expect(status.scoring).toBeDefined();
      });
    });
  });

  describe('getOrchestrator()', () => {
    it('should return singleton instance', () => {
      const instance1 = getOrchestrator();
      const instance2 = getOrchestrator();

      expect(instance1).toBe(instance2);
    });

    it('should accept configuration options', () => {
      const instance = getOrchestrator({
        qualityThreshold: 95,
        maxIterations: 10
      });

      expect(instance.qualityThreshold).toBe(95);
      expect(instance.maxIterations).toBe(10);
    });
  });
});
