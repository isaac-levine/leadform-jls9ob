import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

// Analytics event type constants
export const ANALYTICS_EVENTS = {
  FORM_SUBMISSION: 'form_submission',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  AI_RESPONSE: 'ai_response',
  HUMAN_TAKEOVER: 'human_takeover',
  LEAD_CREATED: 'lead_created',
  CONVERSATION_COMPLETED: 'conversation_completed',
  SYSTEM_ERROR: 'system_error',
  PERFORMANCE_METRIC: 'performance_metric',
  DATA_SYNC: 'data_sync'
} as const;

// Analytics property name constants
export const ANALYTICS_PROPERTIES = {
  FORM_ID: 'form_id',
  LEAD_ID: 'lead_id',
  MESSAGE_ID: 'message_id',
  CONVERSATION_ID: 'conversation_id',
  RESPONSE_TIME: 'response_time',
  AI_CONFIDENCE: 'ai_confidence',
  IS_AI_RESPONSE: 'is_ai_response',
  ERROR_TYPE: 'error_type',
  SYNC_STATUS: 'sync_status',
  PROCESSING_TIME: 'processing_time',
  RETRY_COUNT: 'retry_count',
  BATCH_ID: 'batch_id'
} as const;

// Default configuration
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  debug: false,
  sampleRate: 1.0,
  flushInterval: 30000, // 30 seconds
  maxQueueSize: 1000,
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  privacyMode: 'anonymized',
  storageRetention: '90d',
  batchSize: 50
};

// Type definitions
type AnalyticsEvent = {
  id: string;
  name: string;
  timestamp: number;
  properties: Record<string, any>;
  privacyLevel: PrivacyLevel;
};

type AnalyticsConfig = {
  enabled: boolean;
  debug: boolean;
  sampleRate: number;
  flushInterval: number;
  maxQueueSize: number;
  retryAttempts: number;
  retryDelay: number;
  privacyMode: 'full' | 'anonymized' | 'minimal';
  storageRetention: string;
  batchSize: number;
};

type PrivacyLevel = 'sensitive' | 'internal' | 'public';

type PrivacyOptions = {
  level: PrivacyLevel;
  anonymize?: string[];
  exclude?: string[];
};

type DateRange = {
  start: Date;
  end: Date;
};

type ReportOptions = {
  metrics: string[];
  groupBy?: string[];
  filters?: Record<string, any>;
  format?: 'json' | 'csv';
};

type AnalyticsReport = {
  id: string;
  dateRange: DateRange;
  metrics: Record<string, any>;
  trends: Record<string, any>;
  insights: string[];
  metadata: {
    generatedAt: Date;
    dataPoints: number;
    privacyMode: string;
  };
};

export class AnalyticsManager {
  private _eventQueue: AnalyticsEvent[] = [];
  private _config: AnalyticsConfig;
  private _flushInterval: NodeJS.Timeout | null = null;
  private _reportCache: Map<string, { data: AnalyticsReport; expires: number }> = new Map();
  private _processingBatch: boolean = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._initializeManager();
  }

  private _initializeManager(): void {
    if (this._config.enabled) {
      this._startFlushInterval();
    }
  }

  private _startFlushInterval(): void {
    if (this._flushInterval) {
      clearInterval(this._flushInterval);
    }
    this._flushInterval = setInterval(() => this._flushQueue(), this._config.flushInterval);
  }

  private async _flushQueue(): Promise<void> {
    if (this._processingBatch || this._eventQueue.length === 0) return;

    this._processingBatch = true;
    const batch = this._eventQueue.splice(0, this._config.batchSize);

    try {
      await this._processBatch(batch);
    } catch (error) {
      if (this._config.debug) {
        console.error('Analytics batch processing error:', error);
      }
      // Return events to queue for retry
      this._eventQueue.unshift(...batch);
    } finally {
      this._processingBatch = false;
    }
  }

  private async _processBatch(batch: AnalyticsEvent[]): Promise<void> {
    // Implementation would handle actual data processing/storage
    // This is a placeholder for the actual implementation
    return new Promise((resolve) => {
      setTimeout(resolve, 100); // Simulate processing time
    });
  }

  private _shouldSampleEvent(): boolean {
    return Math.random() < this._config.sampleRate;
  }

  private _anonymizeData(data: Record<string, any>, fieldsToAnonymize: string[]): Record<string, any> {
    const anonymized = { ...data };
    for (const field of fieldsToAnonymize) {
      if (field in anonymized) {
        anonymized[field] = 'REDACTED';
      }
    }
    return anonymized;
  }

  public async trackEvent(
    eventName: string,
    properties: Record<string, any>,
    privacyOptions: PrivacyOptions = { level: 'public' }
  ): Promise<void> {
    if (!this._config.enabled || !this._shouldSampleEvent()) return;

    const event: AnalyticsEvent = {
      id: uuidv4(),
      name: eventName,
      timestamp: Date.now(),
      properties: this._config.privacyMode === 'anonymized' 
        ? this._anonymizeData(properties, privacyOptions.anonymize || [])
        : properties,
      privacyLevel: privacyOptions.level
    };

    this._eventQueue.push(event);

    if (this._eventQueue.length >= this._config.maxQueueSize) {
      await this._flushQueue();
    }
  }

  public async trackFormSubmission(formId: string, data: Record<string, any>): Promise<void> {
    const startTime = Date.now();
    await this.trackEvent(ANALYTICS_EVENTS.FORM_SUBMISSION, {
      [ANALYTICS_PROPERTIES.FORM_ID]: formId,
      [ANALYTICS_PROPERTIES.PROCESSING_TIME]: Date.now() - startTime,
      ...data
    }, { level: 'internal' });
  }

  public async trackMessageMetrics(data: {
    messageId: string,
    conversationId: string,
    isAiResponse: boolean,
    responseTime: number
  }): Promise<void> {
    await this.trackEvent(
      data.isAiResponse ? ANALYTICS_EVENTS.AI_RESPONSE : ANALYTICS_EVENTS.MESSAGE_SENT,
      {
        [ANALYTICS_PROPERTIES.MESSAGE_ID]: data.messageId,
        [ANALYTICS_PROPERTIES.CONVERSATION_ID]: data.conversationId,
        [ANALYTICS_PROPERTIES.IS_AI_RESPONSE]: data.isAiResponse,
        [ANALYTICS_PROPERTIES.RESPONSE_TIME]: data.responseTime
      },
      { level: 'internal' }
    );
  }

  public async trackAIPerformance(data: {
    messageId: string,
    confidence: number,
    processingTime: number
  }): Promise<void> {
    await this.trackEvent(ANALYTICS_EVENTS.AI_RESPONSE, {
      [ANALYTICS_PROPERTIES.MESSAGE_ID]: data.messageId,
      [ANALYTICS_PROPERTIES.AI_CONFIDENCE]: data.confidence,
      [ANALYTICS_PROPERTIES.PROCESSING_TIME]: data.processingTime
    }, { level: 'internal' });
  }

  public async generateReport(range: DateRange, options: ReportOptions): Promise<AnalyticsReport> {
    const cacheKey = JSON.stringify({ range, options });
    const cached = this._reportCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Generate new report
    const report: AnalyticsReport = {
      id: uuidv4(),
      dateRange: range,
      metrics: {}, // Would be populated with actual metrics
      trends: {}, // Would be populated with trend analysis
      insights: [], // Would be populated with AI-generated insights
      metadata: {
        generatedAt: new Date(),
        dataPoints: 0,
        privacyMode: this._config.privacyMode
      }
    };

    // Cache the report for 5 minutes
    this._reportCache.set(cacheKey, {
      data: report,
      expires: Date.now() + 5 * 60 * 1000
    });

    return report;
  }
}