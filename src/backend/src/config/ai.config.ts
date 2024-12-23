/**
 * AI Configuration Module
 * Manages settings for AI-powered conversation system with human takeover capabilities
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.0.0
import {
    AIPromptType,
    AIPromptConfig,
    AIConversationState,
    AIStateTransitionRule
} from '../types/ai.types';

// Load environment variables
config();

/**
 * Validates AI configuration settings and environment variables
 * @throws Error if validation fails
 */
const validateAIConfig = (): void => {
    const requiredEnvVars = ['AI_API_KEY', 'AI_PROVIDER', 'AI_MODEL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const supportedProviders = ['openai', 'anthropic', 'cohere'];
    if (!supportedProviders.includes(process.env.AI_PROVIDER?.toLowerCase() || '')) {
        throw new Error(`Unsupported AI provider. Must be one of: ${supportedProviders.join(', ')}`);
    }

    if (process.env.AI_API_KEY?.length < 32) {
        throw new Error('Invalid API key format');
    }
};

// Validate configuration on module load
validateAIConfig();

/**
 * Core AI service configuration
 */
export const aiConfig = {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '150', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    timeout: parseInt(process.env.AI_TIMEOUT_MS || '15000', 10),
    retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3', 10)
};

/**
 * Retrieves and formats system prompt based on type and context
 */
const getSystemPrompt = (promptType: AIPromptType, context: Record<string, any> = {}): string => {
    const basePrompt = promptConfigs[promptType].systemPrompt;
    return Object.entries(context).reduce(
        (prompt, [key, value]) => prompt.replace(`{{${key}}}`, String(value)),
        basePrompt
    );
};

/**
 * Predefined prompt configurations for different conversation stages
 */
export const promptConfigs: Record<AIPromptType, AIPromptConfig> = {
    [AIPromptType.INITIAL_GREETING]: {
        type: AIPromptType.INITIAL_GREETING,
        maxTokens: 100,
        temperature: 0.7,
        systemPrompt: "You are a helpful sales assistant. Greet {{leadName}} warmly and ask how you can help with their {{inquiryType}}."
    },
    [AIPromptType.FOLLOW_UP]: {
        type: AIPromptType.FOLLOW_UP,
        maxTokens: 150,
        temperature: 0.8,
        systemPrompt: "Continue the conversation naturally, addressing {{lastQuery}} while maintaining context of {{conversationHistory}}."
    },
    [AIPromptType.CLARIFICATION]: {
        type: AIPromptType.CLARIFICATION,
        maxTokens: 75,
        temperature: 0.6,
        systemPrompt: "Politely ask for clarification about {{unclearTopic}}, offering specific options if possible."
    },
    [AIPromptType.HANDOFF]: {
        type: AIPromptType.HANDOFF,
        maxTokens: 100,
        temperature: 0.5,
        systemPrompt: "Inform the user that you're connecting them with a human agent regarding {{handoffReason}}. Assure them of continued support."
    }
};

/**
 * AI state management configuration
 */
export const aiStateConfig = {
    // Confidence threshold for AI responses (0-1)
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.7'),
    
    // Maximum consecutive low-confidence responses before human takeover
    maxConsecutiveFailures: parseInt(process.env.AI_MAX_FAILURES || '3', 10),
    
    // Keywords or phrases that trigger immediate human handoff
    handoffTriggers: [
        'speak to human',
        'talk to agent',
        'human agent',
        'supervisor',
        'manager',
        'complaint',
        'urgent'
    ],
    
    // Rules for transitioning between AI states
    stateTransitionRules: [
        {
            fromState: AIConversationState.ACTIVE,
            toState: AIConversationState.HUMAN_TAKEOVER,
            conditions: ['lowConfidence', 'userRequest', 'complexQuery']
        },
        {
            fromState: AIConversationState.PAUSED,
            toState: AIConversationState.ACTIVE,
            conditions: ['highConfidence', 'simpleQuery']
        }
    ],
    
    // Timeout for AI response generation (ms)
    responseTimeoutMs: parseInt(process.env.AI_RESPONSE_TIMEOUT || '5000', 10),
    
    // Number of retry attempts for failed AI operations
    recoveryAttempts: parseInt(process.env.AI_RECOVERY_ATTEMPTS || '2', 10)
};

/**
 * Default export of complete AI configuration
 */
export default {
    aiConfig,
    promptConfigs,
    aiStateConfig,
    getSystemPrompt
};