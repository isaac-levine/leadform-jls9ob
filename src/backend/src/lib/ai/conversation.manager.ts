/**
 * AI Conversation Manager Service
 * Manages AI-powered SMS conversations with comprehensive state management and human takeover capabilities
 * @version 1.0.0
 */

import { OpenAI } from 'openai'; // ^4.0.0
import winston from 'winston'; // ^3.8.0
import { 
    AIConversationState, 
    AIPromptType, 
    AIConversationContext, 
    AIResponseMetadata, 
} from '../../types/ai.types';
import { PromptGenerator } from './prompt.generator';
import { ResponseProcessor } from './response.processor';
import { aiConfig, aiStateConfig } from '../../config/ai.config';

/**
 * Configuration interface for ConversationManager
 */
interface ConversationManagerConfig {
    confidenceThreshold: number;
    maxConsecutiveFailures: number;
    responseTimeoutMs: number;
    recoveryAttempts: number;
}

/**
 * Manages AI-powered SMS conversations with comprehensive state management
 */
export class ConversationManager {
    private readonly promptGenerator: PromptGenerator;
    private readonly responseProcessor: ResponseProcessor;
    private readonly openai: OpenAI;
    private readonly config: ConversationManagerConfig;
    private readonly logger: winston.Logger;
    private readonly failureCounters: Map<string, number>;

    /**
     * Creates a new instance of ConversationManager
     * @param openai - Configured OpenAI client
     * @param config - Configuration options
     */
    constructor(
        openai: OpenAI,
        config: ConversationManagerConfig = aiStateConfig
    ) {
        this.openai = openai;
        this.config = config;
        this.promptGenerator = new PromptGenerator();
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'ai-conversation.log' })
            ]
        });
        this.responseProcessor = new ResponseProcessor(openai, config.confidenceThreshold, this.logger);
        this.failureCounters = new Map<string, number>();
    }

    /**
     * Initiates a new AI conversation with a lead
     * @param leadId - Unique identifier for the lead
     * @param initialContext - Initial conversation context
     * @returns Initial response with metadata
     */
    public async initiateConversation(
        leadId: string,
        initialContext: Partial<AIConversationContext>
    ): Promise<{ response: string; metadata: AIResponseMetadata }> {
        try {
            this.logger.info('Initiating conversation', { leadId });

            const context: AIConversationContext = {
                leadId,
                conversationHistory: [],
                state: AIConversationState.ACTIVE,
                ...initialContext
            };

            const prompt = await this.promptGenerator.generatePrompt(
                context,
                AIPromptType.INITIAL_GREETING
            );

            const completion = await this.getAICompletion(prompt, context);
            const processed = await this.responseProcessor.processResponse(
                completion,
                context
            );

            this.logger.info('Conversation initiated', {
                leadId,
                metadata: processed.metadata
            });

            return processed;
        } catch (error) {
            this.logger.error('Failed to initiate conversation', {
                leadId,
                error
            });
            throw error;
        }
    }

    /**
     * Handles incoming message and generates appropriate AI response
     * @param context - Current conversation context
     * @param message - Incoming message content
     * @returns Generated response with metadata
     */
    public async handleMessage(
        context: AIConversationContext,
        message: string
    ): Promise<{ response: string; metadata: AIResponseMetadata }> {
        try {
            this.logger.debug('Processing message', {
                leadId: context.leadId,
                messageLength: message.length
            });

            // Check for human takeover triggers
            if (this.shouldTriggerHumanTakeover(message, context)) {
                await this.handleHumanTakeover(context, 'trigger_detected');
                return this.generateHandoffResponse(context);
            }

            // Update conversation history
            context.conversationHistory.push({
                role: 'user',
                content: message
            });

            const promptType = this.determinePromptType(context);
            const prompt = await this.promptGenerator.generatePrompt(
                context,
                promptType
            );

            const completion = await this.getAICompletion(prompt, context);
            const processed = await this.responseProcessor.processResponse(
                completion,
                context
            );

            // Handle low confidence responses
            if (processed.metadata.requiresHumanIntervention) {
                const failureCount = this.incrementFailureCounter(context.leadId);
                if (failureCount >= this.config.maxConsecutiveFailures) {
                    await this.handleHumanTakeover(context, 'low_confidence');
                    return this.generateHandoffResponse(context);
                }
            } else {
                this.resetFailureCounter(context.leadId);
            }

            // Update conversation history with AI response
            context.conversationHistory.push({
                role: 'assistant',
                content: processed.response
            });

            return processed;
        } catch (error) {
            this.logger.error('Error handling message', {
                leadId: context.leadId,
                error
            });
            throw error;
        }
    }

    /**
     * Handles transition to human agent control
     * @param context - Current conversation context
     * @param reason - Reason for human takeover
     * @returns Handoff message with metadata
     */
    public async handleHumanTakeover(
        context: AIConversationContext,
        reason: string
    ): Promise<{ message: string; metadata: AIResponseMetadata }> {
        try {
            this.logger.info('Initiating human takeover', {
                leadId: context.leadId,
                reason
            });

            context.state = AIConversationState.HUMAN_TAKEOVER;
            const handoffPrompt = await this.promptGenerator.generateHandoffPrompt(context);
            
            return {
                message: handoffPrompt,
                metadata: {
                    confidence: 1.0,
                    intent: 'human_handoff',
                    suggestedActions: ['assign_agent', 'review_history'],
                    requiresHumanIntervention: true
                }
            };
        } catch (error) {
            this.logger.error('Error during human takeover', {
                leadId: context.leadId,
                error
            });
            throw error;
        }
    }

    /**
     * Resumes AI control of conversation after human handoff
     * @param context - Current conversation context
     * @returns Resume confirmation with metadata
     */
    public async resumeAIControl(
        context: AIConversationContext
    ): Promise<{ response: string; metadata: AIResponseMetadata }> {
        try {
            this.logger.info('Resuming AI control', {
                leadId: context.leadId
            });

            context.state = AIConversationState.ACTIVE;
            this.resetFailureCounter(context.leadId);

            const prompt = await this.promptGenerator.generatePrompt(
                context,
                AIPromptType.FOLLOW_UP
            );

            const completion = await this.getAICompletion(prompt, context);
            return await this.responseProcessor.processResponse(
                completion,
                context
            );
        } catch (error) {
            this.logger.error('Error resuming AI control', {
                leadId: context.leadId,
                error
            });
            throw error;
        }
    }

    /**
     * Gets AI completion with retry mechanism
     * @param prompt - Generated prompt
     * @param context - Current conversation context
     * @returns AI completion text
     */
    private async getAICompletion(
        prompt: string,
        context: AIConversationContext
    ): Promise<string> {
        let attempts = 0;
        while (attempts < this.config.recoveryAttempts) {
            try {
                const completion = await this.openai.chat.completions.create({
                    model: aiConfig.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: aiConfig.temperature,
                    max_tokens: aiConfig.maxTokens,
                    timeout: this.config.responseTimeoutMs
                });

                return completion.choices[0]?.message?.content || '';
            } catch (error) {
                attempts++;
                this.logger.warn('AI completion attempt failed', {
                    leadId: context.leadId,
                    attempt: attempts,
                    error
                });

                if (attempts >= this.config.recoveryAttempts) {
                    throw new Error('Max retry attempts reached for AI completion');
                }

                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
            }
        }
        throw new Error('Failed to get AI completion');
    }

    /**
     * Determines appropriate prompt type based on context
     * @param context - Current conversation context
     * @returns Appropriate prompt type
     */
    private determinePromptType(context: AIConversationContext): AIPromptType {
        const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
        if (!lastMessage) {
            return AIPromptType.INITIAL_GREETING;
        }

        // Add logic for determining prompt type based on context
        return AIPromptType.FOLLOW_UP;
    }

    /**
     * Checks if human takeover should be triggered
     * @param message - Incoming message
     * @param context - Current conversation context
     * @returns Boolean indicating if human takeover should be triggered
     */
    private shouldTriggerHumanTakeover(
        message: string,
        context: AIConversationContext
    ): boolean {
        return aiStateConfig.handoffTriggers.some(trigger => 
            message.toLowerCase().includes(trigger.toLowerCase())
        );
    }

    /**
     * Generates handoff response when transitioning to human agent
     * @param context - Current conversation context
     * @returns Handoff response with metadata
     */
    private async generateHandoffResponse(
        context: AIConversationContext
    ): Promise<{ response: string; metadata: AIResponseMetadata }> {
        const handoffPrompt = await this.promptGenerator.generatePrompt(
            context,
            AIPromptType.HANDOFF
        );

        return {
            response: handoffPrompt,
            metadata: {
                confidence: 1.0,
                intent: 'human_handoff',
                suggestedActions: ['assign_agent', 'review_history'],
                requiresHumanIntervention: true
            }
        };
    }

    private incrementFailureCounter(leadId: string): number {
        const current = this.failureCounters.get(leadId) || 0;
        this.failureCounters.set(leadId, current + 1);
        return current + 1;
    }

    private resetFailureCounter(leadId: string): void {
        this.failureCounters.delete(leadId);
    }
}