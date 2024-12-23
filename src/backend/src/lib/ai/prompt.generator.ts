/**
 * Advanced Prompt Generator Service
 * Handles contextual AI prompt generation for SMS conversations with enhanced validation
 * @version 1.0.0
 */

import {
    AIPromptType,
    AIPromptConfig,
    AIConversationContext,
    AIConversationState
} from '../../types/ai.types';

import {
    promptConfigs,
    aiConfig
} from '../../config/ai.config';

/**
 * Enhanced prompt generator for AI-powered SMS conversations
 * Provides dynamic prompt adaptation and comprehensive handoff support
 */
export class PromptGenerator {
    private readonly configs: Record<AIPromptType, AIPromptConfig>;
    private readonly cache: Map<string, string>;
    private readonly maxHistoryTokens: number;
    private readonly maxTotalLength: number;

    constructor() {
        this.configs = promptConfigs;
        this.cache = new Map<string, string>();
        this.maxHistoryTokens = 2000; // Conservative token limit for history
        this.maxTotalLength = 4000; // Maximum total prompt length
        this.validateConfigurations();
    }

    /**
     * Validates prompt configurations on initialization
     * @throws Error if configurations are invalid or incomplete
     */
    private validateConfigurations(): void {
        const requiredTypes = Object.values(AIPromptType);
        const configuredTypes = Object.keys(this.configs);

        const missingTypes = requiredTypes.filter(
            type => !configuredTypes.includes(type)
        );

        if (missingTypes.length > 0) {
            throw new Error(`Missing prompt configurations for types: ${missingTypes.join(', ')}`);
        }
    }

    /**
     * Generates a contextual prompt with enhanced validation and dynamic adaptation
     * @param context Conversation context including history and state
     * @param type Type of prompt to generate
     * @returns Promise resolving to the generated prompt
     */
    public async generatePrompt(
        context: AIConversationContext,
        type: AIPromptType
    ): Promise<string> {
        // Validate context and configuration
        if (!this.validateContext(context)) {
            throw new Error('Invalid or incomplete conversation context');
        }

        const config = this.configs[type];
        if (!config) {
            throw new Error(`No configuration found for prompt type: ${type}`);
        }

        // Generate cache key for prompt reuse
        const cacheKey = this.generateCacheKey(context, type);
        const cachedPrompt = this.cache.get(cacheKey);
        if (cachedPrompt) {
            return cachedPrompt;
        }

        // Build prompt components
        const systemPrompt = this.formatSystemPrompt(config.systemPrompt, {
            leadId: context.leadId,
            state: context.state,
            messageCount: context.conversationHistory.length.toString()
        });

        const formattedHistory = this.formatConversationHistory(
            context.conversationHistory,
            this.maxHistoryTokens
        );

        // Combine and optimize prompt
        const finalPrompt = this.combinePromptComponents(
            systemPrompt,
            formattedHistory,
            config
        );

        // Cache the generated prompt
        this.cache.set(cacheKey, finalPrompt);

        return finalPrompt;
    }

    /**
     * Generates comprehensive handoff prompt with enhanced context and guidance
     * @param context Complete conversation context
     * @returns Promise resolving to detailed handoff message
     */
    public async generateHandoffPrompt(
        context: AIConversationContext
    ): Promise<string> {
        if (context.state !== AIConversationState.HUMAN_TAKEOVER) {
            throw new Error('Handoff prompt can only be generated for HUMAN_TAKEOVER state');
        }

        const metrics = this.analyzeConversation(context.conversationHistory);
        const summary = this.generateConversationSummary(context.conversationHistory);
        const urgency = this.calculateUrgencyLevel(context.conversationHistory);
        const suggestions = this.generateNextActionSuggestions(context);

        return `
HANDOFF SUMMARY
--------------
Lead ID: ${context.leadId}
Conversation Length: ${context.conversationHistory.length} messages
Duration: ${metrics.duration}
Urgency Level: ${urgency}

CONVERSATION SUMMARY
-------------------
${summary}

KEY POINTS
----------
${metrics.keyPoints.join('\n')}

SUGGESTED NEXT ACTIONS
---------------------
${suggestions.join('\n')}

CONTEXT PRESERVATION
-------------------
Last AI Confidence: ${metrics.lastConfidence}
Unresolved Queries: ${metrics.unresolvedQueries.join(', ')}
`;
    }

    /**
     * Validates conversation context completeness and validity
     * @param context Conversation context to validate
     * @returns boolean indicating validation result
     */
    private validateContext(context: AIConversationContext): boolean {
        if (!context.leadId || !context.conversationHistory || !context.state) {
            return false;
        }

        // Validate conversation history format
        return context.conversationHistory.every(message => 
            message.role && 
            typeof message.content === 'string' &&
            ['system', 'user', 'assistant'].includes(message.role)
        );
    }

    /**
     * Formats system prompt with dynamic variable replacement
     * @param template System prompt template
     * @param variables Variables for template replacement
     * @returns Formatted system prompt
     */
    private formatSystemPrompt(
        template: string,
        variables: Record<string, string>
    ): string {
        let prompt = template;
        for (const [key, value] of Object.entries(variables)) {
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return prompt;
    }

    /**
     * Formats conversation history with role preservation and length optimization
     * @param history Array of conversation messages
     * @param maxTokens Maximum allowed tokens
     * @returns Formatted conversation history
     */
    private formatConversationHistory(
        history: Array<{ role: string; content: string }>,
        maxTokens: number
    ): string {
        // Estimate token count (rough approximation)
        const estimatedTokensPerChar = 0.25;
        const maxChars = Math.floor(maxTokens / estimatedTokensPerChar);

        let formattedHistory = '';
        let currentLength = 0;

        // Process messages from most recent to oldest
        for (const message of history.reverse()) {
            const formattedMessage = `${message.role}: ${message.content}\n`;
            if (currentLength + formattedMessage.length > maxChars) {
                break;
            }
            formattedHistory = formattedMessage + formattedHistory;
            currentLength += formattedMessage.length;
        }

        return formattedHistory;
    }

    /**
     * Analyzes conversation for metrics and patterns
     * @param history Conversation history
     * @returns Conversation metrics and analysis
     */
    private analyzeConversation(
        history: Array<{ role: string; content: string }>
    ): any {
        // Implementation of conversation analysis
        return {
            duration: this.calculateConversationDuration(history),
            keyPoints: this.extractKeyPoints(history),
            lastConfidence: this.estimateLastConfidence(history),
            unresolvedQueries: this.findUnresolvedQueries(history)
        };
    }

    /**
     * Generates cache key for prompt reuse
     * @param context Conversation context
     * @param type Prompt type
     * @returns Cache key string
     */
    private generateCacheKey(
        context: AIConversationContext,
        type: AIPromptType
    ): string {
        return `${context.leadId}-${type}-${context.conversationHistory.length}`;
    }

    /**
     * Combines prompt components with optimization
     * @param systemPrompt System prompt
     * @param history Formatted history
     * @param config Prompt configuration
     * @returns Combined and optimized prompt
     */
    private combinePromptComponents(
        systemPrompt: string,
        history: string,
        config: AIPromptConfig
    ): string {
        const combined = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${history}`;
        return combined.slice(0, this.maxTotalLength);
    }

    // Additional helper methods (implementations omitted for brevity)
    private calculateConversationDuration(history: any[]): string { return ''; }
    private extractKeyPoints(history: any[]): string[] { return []; }
    private estimateLastConfidence(history: any[]): number { return 0; }
    private findUnresolvedQueries(history: any[]): string[] { return []; }
    private generateConversationSummary(history: any[]): string { return ''; }
    private calculateUrgencyLevel(history: any[]): string { return ''; }
    private generateNextActionSuggestions(context: AIConversationContext): string[] { return []; }
}