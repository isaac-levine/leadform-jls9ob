/**
 * Type definitions for AI-powered conversation management system
 * @version 1.0.0
 */

/**
 * Represents the possible states of an AI-managed conversation
 */
export enum AIConversationState {
    /** AI is actively managing the conversation */
    ACTIVE = 'ACTIVE',
    /** Conversation is temporarily paused */
    PAUSED = 'PAUSED',
    /** Human agent has taken control of the conversation */
    HUMAN_TAKEOVER = 'HUMAN_TAKEOVER'
}

/**
 * Defines different types of prompts used in various conversation stages
 */
export enum AIPromptType {
    /** Initial greeting when conversation starts */
    INITIAL_GREETING = 'INITIAL_GREETING',
    /** Follow-up messages during conversation */
    FOLLOW_UP = 'FOLLOW_UP',
    /** Requests for clarification when needed */
    CLARIFICATION = 'CLARIFICATION',
    /** Prompts used during transition to human agent */
    HANDOFF = 'HANDOFF'
}

/**
 * Configuration interface for AI prompts
 * Defines parameters that control AI response generation
 */
export interface AIPromptConfig {
    /** Type of prompt being configured */
    type: AIPromptType;
    /** Maximum number of tokens to generate */
    maxTokens: number;
    /** Controls randomness in response generation (0.0-1.0) */
    temperature: number;
    /** Base system prompt that guides AI behavior */
    systemPrompt: string;
}

/**
 * Represents a message in the conversation history
 */
interface ConversationMessage {
    /** Role of the message sender (e.g., 'system', 'user', 'assistant') */
    role: string;
    /** Content of the message */
    content: string;
}

/**
 * Context information for AI conversation management
 */
export interface AIConversationContext {
    /** Unique identifier for the lead */
    leadId: string;
    /** Array of previous messages in the conversation */
    conversationHistory: Array<ConversationMessage>;
    /** Current state of the AI conversation */
    state: AIConversationState;
}

/**
 * Metadata associated with AI-generated responses
 */
export interface AIResponseMetadata {
    /** Confidence score of the AI response (0.0-1.0) */
    confidence: number;
    /** Detected intent of the user's message */
    intent: string;
    /** Array of suggested next actions */
    suggestedActions: string[];
    /** Indicates if human intervention is recommended */
    requiresHumanIntervention: boolean;
}