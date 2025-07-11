import crypto from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { 
  LineWebhookRequest, 
  LineWebhookEvent, 
  LineMessageEvent,
  LineFollowEvent,
  LineUnfollowEvent,
  LineJoinEvent,
  LineLeaveEvent,
  LineMemberJoinedEvent,
  LineMemberLeftEvent,
  LinePostbackEvent,
  LineBeaconEvent,
  LineAccountLinkEvent,
  LineThingsEvent
} from '../types/line.types';
import { 
  WebhookEventRecord, 
  WebhookProcessingResult, 
  WebhookStatistics 
} from '../types/api.types';

interface WebhookStats {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  eventTypes: { [key: string]: number };
  processingTimes: number[];
  errors: Array<{ timestamp: Date; error: string; eventType?: string }>;
}

export class WebhookService {
  private eventHistory: WebhookEventRecord[] = [];
  private stats: WebhookStats = {
    totalEvents: 0,
    processedEvents: 0,
    failedEvents: 0,
    eventTypes: {},
    processingTimes: [],
    errors: [],
  };

  constructor() {
    logger.info('Webhook service initialized');
  }

  // Verify LINE webhook signature
  async verifySignature(body: Buffer | string, signature: string, channelSecret: string): Promise<boolean> {
    try {
      if (!signature || !channelSecret) {
        logger.warn('Missing signature or channel secret for webhook verification');
        return false;
      }

      // Remove 'sha256=' prefix if present
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      // Create HMAC-SHA256 hash
      const expectedSignature = crypto
        .createHmac('sha256', channelSecret)
        .update(body)
        .digest('hex');

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        logger.warn('Webhook signature verification failed', {
          received: cleanSignature.substring(0, 10) + '...',
          expected: expectedSignature.substring(0, 10) + '...',
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying webhook signature', {
        error: error instanceof Error ? error.message : error,
        hasSignature: !!signature,
        hasChannelSecret: !!channelSecret,
      });
      return false;
    }
  }

  // Process webhook request
  async processWebhook(webhookData: LineWebhookRequest): Promise<{
    processedEvents: number;
    totalEvents: number;
    processingTime: string;
    results: WebhookProcessingResult[];
  }> {
    const startTime = Date.now();
    const results: WebhookProcessingResult[] = [];

    logger.info('Processing LINE webhook', {
      destination: webhookData.destination,
      eventsCount: webhookData.events?.length || 0,
    });

    try {
      this.stats.totalEvents += webhookData.events?.length || 0;

      if (!webhookData.events || webhookData.events.length === 0) {
        logger.warn('Webhook received with no events');
        return {
          processedEvents: 0,
          totalEvents: 0,
          processingTime: `${Date.now() - startTime}ms`,
          results: [],
        };
      }

      // Process each event
      for (const event of webhookData.events) {
        const eventStartTime = Date.now();
        
        try {
          const result = await this.processEvent(event, webhookData.destination);
          const eventProcessingTime = Date.now() - eventStartTime;

          results.push({
            eventId: event.webhookEventId,
            processed: true,
            processingTime: eventProcessingTime,
            timestamp: new Date(),
          });

          this.recordEventProcessing(event, eventProcessingTime, true);
          this.stats.processedEvents++;

        } catch (error) {
          const eventProcessingTime = Date.now() - eventStartTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          logger.error('Failed to process webhook event', {
            eventId: event.webhookEventId,
            eventType: event.type,
            error: errorMessage,
            processingTime: eventProcessingTime,
          });

          results.push({
            eventId: event.webhookEventId,
            processed: false,
            processingTime: eventProcessingTime,
            error: errorMessage,
            timestamp: new Date(),
          });

          this.recordEventProcessing(event, eventProcessingTime, false, errorMessage);
          this.stats.failedEvents++;
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      this.stats.processingTimes.push(totalProcessingTime);

      // Keep only the last 1000 processing times
      if (this.stats.processingTimes.length > 1000) {
        this.stats.processingTimes = this.stats.processingTimes.slice(-1000);
      }

      logger.info('Webhook processing completed', {
        destination: webhookData.destination,
        totalEvents: webhookData.events.length,
        processedEvents: results.filter(r => r.processed).length,
        failedEvents: results.filter(r => !r.processed).length,
        processingTime: `${totalProcessingTime}ms`,
      });

      return {
        processedEvents: results.filter(r => r.processed).length,
        totalEvents: webhookData.events.length,
        processingTime: `${totalProcessingTime}ms`,
        results,
      };

    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      
      logger.error('Webhook processing failed', {
        destination: webhookData.destination,
        error: error instanceof Error ? error.message : error,
        processingTime: `${totalProcessingTime}ms`,
      });

      throw error;
    }
  }

  // Process individual event
  private async processEvent(event: LineWebhookEvent, destination: string): Promise<void> {
    logger.debug('Processing webhook event', {
      eventId: event.webhookEventId,
      eventType: event.type,
      source: event.source,
      destination,
    });

    // Update event type statistics
    this.stats.eventTypes[event.type] = (this.stats.eventTypes[event.type] || 0) + 1;

    // Process based on event type
    switch (event.type) {
      case 'message':
        await this.processMessageEvent(event as LineMessageEvent);
        break;
      case 'follow':
        await this.processFollowEvent(event as LineFollowEvent);
        break;
      case 'unfollow':
        await this.processUnfollowEvent(event as LineUnfollowEvent);
        break;
      case 'join':
        await this.processJoinEvent(event as LineJoinEvent);
        break;
      case 'leave':
        await this.processLeaveEvent(event as LineLeaveEvent);
        break;
      case 'memberJoined':
        await this.processMemberJoinedEvent(event as LineMemberJoinedEvent);
        break;
      case 'memberLeft':
        await this.processMemberLeftEvent(event as LineMemberLeftEvent);
        break;
      case 'postback':
        await this.processPostbackEvent(event as LinePostbackEvent);
        break;
      case 'beacon':
        await this.processBeaconEvent(event as LineBeaconEvent);
        break;
      case 'accountLink':
        await this.processAccountLinkEvent(event as LineAccountLinkEvent);
        break;
      case 'things':
        await this.processThingsEvent(event as LineThingsEvent);
        break;
      default:
        logger.warn('Unknown webhook event type', {
          eventType: event.type,
          eventId: event.webhookEventId,
        });
    }
  }

  // Event type processors
  private async processMessageEvent(event: LineMessageEvent): Promise<void> {
    logger.info('Processing message event', {
      eventId: event.webhookEventId,
      messageType: event.message.type,
      userId: event.source.userId,
      messageId: event.message.id,
    });

    // Custom message processing logic would go here
    // For now, we just log the event
  }

  private async processFollowEvent(event: LineFollowEvent): Promise<void> {
    logger.info('Processing follow event', {
      eventId: event.webhookEventId,
      userId: event.source.userId,
    });

    // Custom follow processing logic would go here
  }

  private async processUnfollowEvent(event: LineUnfollowEvent): Promise<void> {
    logger.info('Processing unfollow event', {
      eventId: event.webhookEventId,
      userId: event.source.userId,
    });

    // Custom unfollow processing logic would go here
  }

  private async processJoinEvent(event: LineJoinEvent): Promise<void> {
    logger.info('Processing join event', {
      eventId: event.webhookEventId,
      source: event.source,
    });

    // Custom join processing logic would go here
  }

  private async processLeaveEvent(event: LineLeaveEvent): Promise<void> {
    logger.info('Processing leave event', {
      eventId: event.webhookEventId,
      source: event.source,
    });

    // Custom leave processing logic would go here
  }

  private async processMemberJoinedEvent(event: LineMemberJoinedEvent): Promise<void> {
    logger.info('Processing member joined event', {
      eventId: event.webhookEventId,
      joinedMembers: event.joined.members.length,
      source: event.source,
    });

    // Custom member joined processing logic would go here
  }

  private async processMemberLeftEvent(event: LineMemberLeftEvent): Promise<void> {
    logger.info('Processing member left event', {
      eventId: event.webhookEventId,
      leftMembers: event.left.members.length,
      source: event.source,
    });

    // Custom member left processing logic would go here
  }

  private async processPostbackEvent(event: LinePostbackEvent): Promise<void> {
    logger.info('Processing postback event', {
      eventId: event.webhookEventId,
      data: event.postback.data,
      userId: event.source.userId,
    });

    // Custom postback processing logic would go here
  }

  private async processBeaconEvent(event: LineBeaconEvent): Promise<void> {
    logger.info('Processing beacon event', {
      eventId: event.webhookEventId,
      beaconType: event.beacon.type,
      hwid: event.beacon.hwid,
      userId: event.source.userId,
    });

    // Custom beacon processing logic would go here
  }

  private async processAccountLinkEvent(event: LineAccountLinkEvent): Promise<void> {
    logger.info('Processing account link event', {
      eventId: event.webhookEventId,
      result: event.link.result,
      userId: event.source.userId,
    });

    // Custom account link processing logic would go here
  }

  private async processThingsEvent(event: LineThingsEvent): Promise<void> {
    logger.info('Processing things event', {
      eventId: event.webhookEventId,
      thingsType: event.things.type,
      deviceId: event.things.deviceId,
      userId: event.source.userId,
    });

    // Custom things processing logic would go here
  }

  // Record event processing
  private recordEventProcessing(
    event: LineWebhookEvent,
    processingTime: number,
    processed: boolean,
    error?: string
  ): void {
    const record: WebhookEventRecord = {
      id: event.webhookEventId,
      eventType: event.type,
      source: event.source.type,
      destination: '', // Would be set from the webhook request
      payload: event,
      signature: '', // Would be set from the request headers
      processed,
      processingTime,
      error,
      timestamp: new Date(event.timestamp),
      retryCount: 0,
    };

    this.eventHistory.push(record);

    // Keep only the last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }

    if (error) {
      this.stats.errors.push({
        timestamp: new Date(),
        error,
        eventType: event.type,
      });

      // Keep only the last 100 errors
      if (this.stats.errors.length > 100) {
        this.stats.errors = this.stats.errors.slice(-100);
      }
    }
  }

  // Get webhook status
  async getWebhookStatus(): Promise<{
    enabled: boolean;
    totalEvents: number;
    processedEvents: number;
    failedEvents: number;
    successRate: number;
    averageProcessingTime: number;
    recentErrors: number;
  }> {
    const recentErrors = this.stats.errors.filter(
      error => Date.now() - error.timestamp.getTime() < 3600000 // Last hour
    ).length;

    const averageProcessingTime = this.stats.processingTimes.length > 0 
      ? this.stats.processingTimes.reduce((sum, time) => sum + time, 0) / this.stats.processingTimes.length 
      : 0;

    const successRate = this.stats.totalEvents > 0 
      ? (this.stats.processedEvents / this.stats.totalEvents) * 100 
      : 100;

    return {
      enabled: config.FEATURE_WEBHOOK_SUPPORT,
      totalEvents: this.stats.totalEvents,
      processedEvents: this.stats.processedEvents,
      failedEvents: this.stats.failedEvents,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      recentErrors,
    };
  }

  // Get webhook events
  async getWebhookEvents(options: {
    limit: number;
    offset: number;
    eventType?: string;
  }): Promise<{
    events: WebhookEventRecord[];
    total: number;
  }> {
    let filteredEvents = this.eventHistory;

    if (options.eventType) {
      filteredEvents = filteredEvents.filter(event => event.eventType === options.eventType);
    }

    const total = filteredEvents.length;
    const events = filteredEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(options.offset, options.offset + options.limit);

    return { events, total };
  }

  // Get webhook statistics
  async getWebhookStatistics(period: string): Promise<WebhookStatistics> {
    const now = Date.now();
    let periodMs: number;

    switch (period) {
      case '1h':
        periodMs = 3600000; // 1 hour
        break;
      case '24h':
        periodMs = 86400000; // 24 hours
        break;
      case '7d':
        periodMs = 604800000; // 7 days
        break;
      default:
        periodMs = 86400000; // Default to 24 hours
    }

    const periodStart = now - periodMs;

    const periodEvents = this.eventHistory.filter(
      event => event.timestamp.getTime() >= periodStart
    );

    const periodErrors = this.stats.errors.filter(
      error => error.timestamp.getTime() >= periodStart
    );

    const totalEvents = periodEvents.length;
    const processedEvents = periodEvents.filter(event => event.processed).length;
    const failedEvents = periodEvents.filter(event => !event.processed).length;

    const averageProcessingTime = periodEvents.length > 0
      ? periodEvents.reduce((sum, event) => sum + (event.processingTime || 0), 0) / periodEvents.length
      : 0;

    // Count events by type
    const eventTypes: { [key: string]: number } = {};
    periodEvents.forEach(event => {
      eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
    });

    // Calculate hourly error rates
    const errorRates: { [hour: string]: number } = {};
    for (let i = 0; i < 24; i++) {
      const hourStart = now - (i * 3600000);
      const hourEnd = hourStart + 3600000;
      const hourErrors = periodErrors.filter(
        error => error.timestamp.getTime() >= hourStart && error.timestamp.getTime() < hourEnd
      ).length;
      
      const hour = new Date(hourStart).getHours().toString().padStart(2, '0');
      errorRates[hour] = hourErrors;
    }

    return {
      period,
      totalEvents,
      processedEvents,
      failedEvents,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      eventTypes,
      errorRates,
    };
  }

  // Replay webhook event (for debugging)
  async replayWebhookEvent(eventId: string): Promise<WebhookProcessingResult> {
    const event = this.eventHistory.find(e => e.id === eventId);
    
    if (!event) {
      throw new Error(`Webhook event ${eventId} not found`);
    }

    logger.info('Replaying webhook event', {
      eventId,
      eventType: event.eventType,
      originalTimestamp: event.timestamp,
    });

    const startTime = Date.now();

    try {
      await this.processEvent(event.payload as LineWebhookEvent, event.destination);
      const processingTime = Date.now() - startTime;

      return {
        eventId,
        processed: true,
        processingTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        eventId,
        processed: false,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  // Get webhook configuration
  async getWebhookConfiguration(): Promise<{
    enabled: boolean;
    path: string;
    signatureVerification: boolean;
    supportedEvents: string[];
    features: string[];
  }> {
    return {
      enabled: config.FEATURE_WEBHOOK_SUPPORT,
      path: config.LINE_WEBHOOK_PATH,
      signatureVerification: config.WEBHOOK_SIGNATURE_VALIDATION,
      supportedEvents: [
        'message',
        'follow',
        'unfollow',
        'join',
        'leave',
        'memberJoined',
        'memberLeft',
        'postback',
        'beacon',
        'accountLink',
        'things',
      ],
      features: [
        'Event Processing',
        'Signature Verification',
        'Event History',
        'Statistics Tracking',
        'Error Handling',
        'Event Replay',
      ],
    };
  }
}