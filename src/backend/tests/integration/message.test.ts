import { describe, it, beforeEach, afterEach, expect, jest } from 'jest';
import { ObjectId } from 'mongodb';
import { container } from 'tsyringe';
import { MessageService } from '../../src/services/message.service';
import { Message } from '../../src/db/models/Message';
import { 
    MessageDirection, 
    MessageStatus, 
    MessageType 
} from '../../src/types/message.types';
import { SMSService } from '../../lib/sms/sms.service';
import { ConversationManager } from '../../lib/ai/conversation.manager';
import { Logger } from '../../utils/logger.utils';

/**
 * Integration test suite for message processing and SMS conversation management
 * Tests performance SLAs, error handling, and data integrity
 */
describe('MessageService Integration Tests', () => {
    let messageService: MessageService;
    let smsService: SMSService;
    let conversationManager: ConversationManager;
    let testLeadId: ObjectId;
    let testPhoneNumber: string;

    beforeEach(async () => {
        // Setup test dependencies
        await setupTestDatabase();
        
        // Initialize services with test configuration
        smsService = container.resolve(SMSService);
        conversationManager = container.resolve(ConversationManager);
        messageService = container.resolve(MessageService);
        
        // Create test data
        testLeadId = new ObjectId();
        testPhoneNumber = '+12065550123';
        
        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await cleanupTestDatabase();
    });

    describe('Message Processing Performance', () => {
        it('should process messages within 5 second SLA', async () => {
            // Arrange
            const content = 'Test message content';
            const startTime = Date.now();

            // Act
            const result = await messageService.sendMessage(
                testLeadId,
                content,
                MessageType.HUMAN
            );

            // Assert
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(5000);
            expect(result.metadata.processingTime).toBeLessThan(5000);
        });

        it('should handle concurrent message processing efficiently', async () => {
            // Arrange
            const messageCount = 10;
            const messages = Array(messageCount).fill(null).map((_, index) => ({
                content: `Test message ${index}`,
                type: MessageType.HUMAN
            }));

            // Act
            const startTime = Date.now();
            const results = await Promise.all(
                messages.map(msg => 
                    messageService.sendMessage(testLeadId, msg.content, msg.type)
                )
            );

            // Assert
            const totalTime = Date.now() - startTime;
            expect(totalTime).toBeLessThan(5000 * 2); // Allow some overhead for concurrent processing
            results.forEach(result => {
                expect(result.status).toBe(MessageStatus.SENT);
            });
        });
    });

    describe('SMS Conversation Management', () => {
        it('should handle AI-powered conversation flow correctly', async () => {
            // Arrange
            const inboundMessage = 'Hello, I have a question';

            // Act
            const response = await messageService.receiveMessage(
                testLeadId,
                inboundMessage
            );

            // Assert
            expect(response).toBeDefined();
            expect(response.type).toBe(MessageType.AI);
            expect(response.direction).toBe(MessageDirection.OUTBOUND);
            expect(response.metadata.aiProcessed).toBe(true);
        });

        it('should transition to human takeover when confidence is low', async () => {
            // Arrange
            const complexQuery = 'I need detailed information about multiple properties and financing options';

            // Act
            const response = await messageService.receiveMessage(
                testLeadId,
                complexQuery
            );

            // Assert
            expect(response.metadata.requiresHumanIntervention).toBe(true);
            const thread = await messageService.getThreadMessages(testLeadId);
            expect(thread.some(msg => msg.type === MessageType.SYSTEM)).toBe(true);
        });

        it('should maintain conversation context across messages', async () => {
            // Arrange
            const messages = [
                'Hi, I saw your listing',
                'Which property?',
                'The one on Main Street'
            ];

            // Act
            const responses = [];
            for (const msg of messages) {
                const response = await messageService.receiveMessage(testLeadId, msg);
                responses.push(response);
            }

            // Assert
            const thread = await messageService.getThreadMessages(testLeadId);
            expect(thread.length).toBe(messages.length * 2); // Including AI responses
            expect(thread[0].metadata.conversationId).toBe(
                thread[thread.length - 1].metadata.conversationId
            );
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should retry failed message delivery attempts', async () => {
            // Arrange
            jest.spyOn(smsService, 'sendMessage').mockImplementationOnce(() => {
                throw new Error('SMS provider error');
            });

            // Act
            const message = await messageService.sendMessage(
                testLeadId,
                'Test retry message',
                MessageType.HUMAN
            );

            // Assert
            expect(message.status).toBe(MessageStatus.QUEUED);
            expect(message.metadata.retryCount).toBe(0);

            // Wait for retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updatedMessage = await Message.findById(message._id);
            expect(updatedMessage?.status).toBe(MessageStatus.SENT);
        });

        it('should handle circuit breaker activation', async () => {
            // Arrange
            const errorCount = 5;
            jest.spyOn(smsService, 'sendMessage').mockImplementation(() => {
                throw new Error('Provider unavailable');
            });

            // Act & Assert
            for (let i = 0; i < errorCount; i++) {
                const message = await messageService.sendMessage(
                    testLeadId,
                    `Test message ${i}`,
                    MessageType.HUMAN
                );
                expect(message.status).toBe(MessageStatus.QUEUED);
            }

            // Verify circuit breaker opened
            const lastMessage = await messageService.sendMessage(
                testLeadId,
                'Circuit breaker test',
                MessageType.HUMAN
            );
            expect(lastMessage.metadata.circuitBreakerOpen).toBe(true);
        });
    });

    describe('Data Model Verification', () => {
        it('should maintain message relationships and integrity', async () => {
            // Arrange
            const initialMessage = await messageService.sendMessage(
                testLeadId,
                'Initial message',
                MessageType.HUMAN
            );

            // Act
            const thread = await messageService.getThreadMessages(testLeadId);
            const message = await Message.findById(initialMessage._id);

            // Assert
            expect(message).toBeDefined();
            expect(message?.leadId).toEqual(testLeadId);
            expect(thread.length).toBeGreaterThan(0);
            expect(message?.metadata).toHaveProperty('processingTime');
        });

        it('should enforce data validation rules', async () => {
            // Arrange & Act & Assert
            await expect(
                messageService.sendMessage(
                    testLeadId,
                    '', // Empty content
                    MessageType.HUMAN
                )
            ).rejects.toThrow();

            await expect(
                messageService.sendMessage(
                    testLeadId,
                    'A'.repeat(1601), // Exceeds max length
                    MessageType.HUMAN
                )
            ).rejects.toThrow();
        });
    });
});

/**
 * Sets up test database and required test data
 */
async function setupTestDatabase(): Promise<void> {
    // Implementation would:
    // 1. Connect to test MongoDB instance
    // 2. Clear relevant collections
    // 3. Initialize test data
    // 4. Setup test environment variables
}

/**
 * Cleans up test database and resources
 */
async function cleanupTestDatabase(): Promise<void> {
    // Implementation would:
    // 1. Clear test data
    // 2. Close database connection
    // 3. Reset environment variables
}