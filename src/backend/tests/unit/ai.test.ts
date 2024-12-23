import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals';
import { OpenAI } from 'openai'; // ^4.0.0
import { 
    PromptGenerator,
    ResponseProcessor,
    ConversationManager 
} from '../../src/lib/ai';
import {
    AIConversationState,
    AIPromptType,
    AIConversationContext,
    AIResponseMetadata
} from '../../types/ai.types';

// Mock OpenAI
jest.mock('openai');
const mockOpenAI = {
    chat: {
        completions: {
            create: jest.fn()
        }
    }
} as unknown as OpenAI;

// Mock Winston Logger
jest.mock('winston', () => ({
    createLogger: jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })),
    format: {
        json: jest.fn()
    },
    transports: {
        Console: jest.fn(),
        File: jest.fn()
    }
}));

describe('PromptGenerator', () => {
    let promptGenerator: PromptGenerator;
    const mockContext: AIConversationContext = {
        leadId: 'test-lead-123',
        conversationHistory: [
            { role: 'system', content: 'Initial greeting' },
            { role: 'user', content: 'Hello' }
        ],
        state: AIConversationState.ACTIVE
    };

    beforeEach(() => {
        promptGenerator = new PromptGenerator();
    });

    test('should generate initial greeting prompt with correct template', async () => {
        const prompt = await promptGenerator.generatePrompt(
            mockContext,
            AIPromptType.INITIAL_GREETING
        );
        
        expect(prompt).toContain('Initial greeting');
        expect(prompt).toContain(mockContext.leadId);
    });

    test('should generate context-aware follow-up prompt', async () => {
        const prompt = await promptGenerator.generatePrompt(
            mockContext,
            AIPromptType.FOLLOW_UP
        );
        
        expect(prompt).toContain('Hello');
        expect(prompt).toContain('CONVERSATION HISTORY');
    });

    test('should generate handoff prompt with agent context', async () => {
        const handoffContext = {
            ...mockContext,
            state: AIConversationState.HUMAN_TAKEOVER
        };
        
        const handoffPrompt = await promptGenerator.generateHandoffPrompt(handoffContext);
        
        expect(handoffPrompt).toContain('HANDOFF SUMMARY');
        expect(handoffPrompt).toContain(handoffContext.leadId);
    });

    test('should throw error for invalid prompt type', async () => {
        await expect(
            promptGenerator.generatePrompt(
                mockContext,
                'INVALID_TYPE' as AIPromptType
            )
        ).rejects.toThrow('No configuration found for prompt type');
    });
});

describe('ResponseProcessor', () => {
    let responseProcessor: ResponseProcessor;
    const mockContext: AIConversationContext = {
        leadId: 'test-lead-123',
        conversationHistory: [],
        state: AIConversationState.ACTIVE
    };

    beforeEach(() => {
        // Reset OpenAI mock
        jest.clearAllMocks();
        (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        confidence: 0.85,
                        intent: 'inquiry',
                        suggestedActions: ['provide_info']
                    })
                }
            }]
        });

        responseProcessor = new ResponseProcessor(
            mockOpenAI,
            0.7,
            jest.fn() as any
        );
    });

    test('should process valid AI response correctly', async () => {
        const response = 'Hello! How can I help you today?';
        const result = await responseProcessor.processResponse(response, mockContext);
        
        expect(result.response).toBe(response);
        expect(result.metadata.confidence).toBeGreaterThan(0.7);
        expect(result.metadata.requiresHumanIntervention).toBe(false);
    });

    test('should calculate accurate confidence scores', async () => {
        (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        confidence: 0.4,
                        intent: 'unclear',
                        suggestedActions: ['request_clarification']
                    })
                }
            }]
        });

        const result = await responseProcessor.processResponse(
            'I\'m not sure about that.',
            mockContext
        );
        
        expect(result.metadata.confidence).toBeLessThan(0.7);
        expect(result.metadata.requiresHumanIntervention).toBe(true);
    });

    test('should handle malformed API responses', async () => {
        (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(
            new Error('API Error')
        );

        const result = await responseProcessor.processResponse(
            'Test response',
            mockContext
        );
        
        expect(result.metadata.confidence).toBe(0.5);
        expect(result.metadata.requiresHumanIntervention).toBe(true);
    });
});

describe('ConversationManager', () => {
    let conversationManager: ConversationManager;
    const mockContext: AIConversationContext = {
        leadId: 'test-lead-123',
        conversationHistory: [],
        state: AIConversationState.ACTIVE
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
            choices: [{
                message: {
                    content: 'Hello! How can I help you today?'
                }
            }]
        });

        conversationManager = new ConversationManager(mockOpenAI, {
            confidenceThreshold: 0.7,
            maxConsecutiveFailures: 3,
            responseTimeoutMs: 5000,
            recoveryAttempts: 2
        });
    });

    test('should initialize new conversation with correct state', async () => {
        const result = await conversationManager.initiateConversation(
            'new-lead-123',
            {}
        );
        
        expect(result.response).toBeTruthy();
        expect(result.metadata).toBeDefined();
        expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    test('should handle human takeover transition smoothly', async () => {
        const result = await conversationManager.handleHumanTakeover(
            mockContext,
            'user_request'
        );
        
        expect(result.message).toContain('HANDOFF');
        expect(result.metadata.intent).toBe('human_handoff');
        expect(mockContext.state).toBe(AIConversationState.HUMAN_TAKEOVER);
    });

    test('should resume AI control with context preservation', async () => {
        const handoffContext = {
            ...mockContext,
            state: AIConversationState.HUMAN_TAKEOVER
        };
        
        const result = await conversationManager.resumeAIControl(handoffContext);
        
        expect(result.response).toBeTruthy();
        expect(handoffContext.state).toBe(AIConversationState.ACTIVE);
    });

    test('should handle consecutive failures and trigger handoff', async () => {
        (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        confidence: 0.4,
                        intent: 'unclear',
                        suggestedActions: []
                    })
                }
            }]
        });

        // Simulate multiple low-confidence responses
        for (let i = 0; i < 3; i++) {
            await conversationManager.handleMessage(
                mockContext,
                'Test message'
            );
        }

        const finalResult = await conversationManager.handleMessage(
            mockContext,
            'Test message'
        );
        
        expect(finalResult.metadata.requiresHumanIntervention).toBe(true);
        expect(mockContext.state).toBe(AIConversationState.HUMAN_TAKEOVER);
    });
});