import { OpenAI } from 'openai';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { AIResponseMetadata, AIConversationContext } from '../../types/ai.types';

/**
 * Processes and analyzes AI-generated responses for SMS conversations
 * @version 1.0.0
 */
export class ResponseProcessor {
    private readonly openai: OpenAI;
    private readonly confidenceThreshold: number;
    private readonly logger: winston.Logger;
    private readonly rateLimiter: rateLimit.RateLimit;

    /**
     * Creates a new instance of ResponseProcessor
     * @param openai - Configured OpenAI client instance
     * @param confidenceThreshold - Threshold for determining human intervention (0.0-1.0)
     * @param logger - Winston logger instance for monitoring and debugging
     */
    constructor(
        openai: OpenAI,
        confidenceThreshold: number = 0.7,
        logger: winston.Logger
    ) {
        this.openai = openai;
        this.confidenceThreshold = confidenceThreshold;
        this.logger = logger;

        // Configure rate limiter for OpenAI API calls
        this.rateLimiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute window
            max: 50, // 50 requests per minute
            message: 'Too many API requests, please try again later'
        });
    }

    /**
     * Processes an AI-generated response with comprehensive analysis
     * @param response - Raw AI-generated response text
     * @param context - Current conversation context
     * @returns Processed response with metadata
     */
    async processResponse(
        response: string,
        context: AIConversationContext
    ): Promise<{ response: string; metadata: AIResponseMetadata }> {
        try {
            this.logger.info('Processing AI response', {
                contextId: context.leadId,
                responseLength: response.length
            });

            // Clean and validate response
            const cleanedResponse = this.cleanResponse(response);

            // Analyze response content
            const metadata = await this.analyzeResponse(cleanedResponse, context);

            this.logger.debug('Response processing complete', {
                contextId: context.leadId,
                metadata
            });

            return {
                response: cleanedResponse,
                metadata
            };
        } catch (error) {
            this.logger.error('Error processing response', {
                error,
                contextId: context.leadId
            });
            throw new Error('Failed to process AI response');
        }
    }

    /**
     * Performs detailed analysis of response content using OpenAI
     * @param response - Cleaned response text
     * @param context - Current conversation context
     * @returns Analysis metadata including confidence and intent
     */
    async analyzeResponse(
        response: string,
        context: AIConversationContext
    ): Promise<AIResponseMetadata> {
        try {
            // Analyze response using OpenAI
            const analysis = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Analyze the following SMS response for intent, confidence, and suggested actions.'
                    },
                    {
                        role: 'user',
                        content: `Response: "${response}"\nContext: ${JSON.stringify(context.conversationHistory)}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            });

            // Extract analysis results
            const result = analysis.choices[0]?.message?.content;
            if (!result) {
                throw new Error('Failed to get analysis results');
            }

            // Parse analysis results
            const analysisData = JSON.parse(result);
            const confidence = analysisData.confidence || 0;

            const metadata: AIResponseMetadata = {
                confidence,
                intent: analysisData.intent || 'unknown',
                suggestedActions: analysisData.suggestedActions || [],
                requiresHumanIntervention: confidence < this.confidenceThreshold
            };

            this.logger.debug('Response analysis complete', { metadata });
            return metadata;

        } catch (error) {
            this.logger.error('Error analyzing response', { error });
            // Fallback metadata with conservative values
            return {
                confidence: 0.5,
                intent: 'unknown',
                suggestedActions: [],
                requiresHumanIntervention: true
            };
        }
    }

    /**
     * Cleans and validates response text
     * @param response - Raw response text
     * @returns Cleaned and formatted response
     */
    private cleanResponse(response: string): string {
        if (!response || typeof response !== 'string') {
            throw new Error('Invalid response format');
        }

        let cleaned = response
            .trim()
            // Remove multiple spaces
            .replace(/\s+/g, ' ')
            // Ensure proper sentence spacing
            .replace(/\.\s*([A-Z])/g, '. $1')
            // Remove any special characters that might cause SMS issues
            .replace(/[^\x20-\x7E]/g, '')
            // Ensure proper punctuation
            .replace(/\s+([.,!?])/g, '$1');

        // Validate message length for SMS (160 characters per segment)
        if (cleaned.length > 1600) { // Allow up to 10 segments
            this.logger.warn('Response exceeds recommended SMS length', {
                length: cleaned.length
            });
            cleaned = cleaned.substring(0, 1600);
        }

        return cleaned;
    }
}