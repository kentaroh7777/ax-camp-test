import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import { 
  LineApiResponse, 
  LineMessageRequest, 
  LineMulticastRequest, 
  LineBroadcastRequest, 
  LineReplyRequest,
  LineProfile,
  LineBotInfo,
  LineGroupMemberProfile,
  LineGroupMemberIds,
  LineQuota,
  LineQuotaConsumption
} from '../types/line.types.js';
import { ApiError } from '../types/api.types.js';

export class LineApiService {
  private httpClient: AxiosInstance;
  private circuitBreaker: CircuitBreakerService;

  constructor() {
    this.httpClient = axios.create({
      baseURL: 'https://api.line.me/v2/bot',
      timeout: config.LINE_API_TIMEOUT || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LINE-Proxy-Server/1.0.0',
      },
    });
    
    this.circuitBreaker = new CircuitBreakerService({
      timeout: config.LINE_API_TIMEOUT, // Use 'timeout'
      resetTimeout: 30000,
      volumeThreshold: 5, // Use 'volumeThreshold'
    });

    // Add request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug('LINE API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('LINE API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('LINE API Response', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        const errorInfo = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        };
        
        logger.error('LINE API Response Error', errorInfo);
        
        // Transform LINE API errors to standardized format
        if (error.response?.data) {
          const lineError = error.response.data;
          throw new ApiError(
            lineError.message || 'LINE API Error',
            error.response.status || 500,
            'LINE_API_ERROR',
            lineError
          );
        }
        
        throw error;
      }
    );
  }

  async sendMessage(messageData: LineMessageRequest, authorization: string): Promise<LineApiResponse> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Sending LINE push message', { 
        to: messageData.to,
        messagesCount: messageData.messages?.length || 0 
      });
      
      const response = await this.httpClient.post('/message/push', messageData, {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE push message sent successfully', {
        to: messageData.to,
        status: response.status,
      });
      
      return response.data;
    });
  }

  async sendMulticastMessage(messageData: LineMulticastRequest, authorization: string): Promise<LineApiResponse> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Sending LINE multicast message', { 
        toCount: messageData.to?.length || 0,
        messagesCount: messageData.messages?.length || 0 
      });
      
      const response = await this.httpClient.post('/message/multicast', messageData, {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE multicast message sent successfully', {
        toCount: messageData.to?.length || 0,
        status: response.status,
      });
      
      return response.data;
    });
  }

  async sendBroadcastMessage(messageData: LineBroadcastRequest, authorization: string): Promise<LineApiResponse> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Sending LINE broadcast message', { 
        messagesCount: messageData.messages?.length || 0 
      });
      
      const response = await this.httpClient.post('/message/broadcast', messageData, {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE broadcast message sent successfully', {
        status: response.status,
      });
      
      return response.data;
    });
  }

  async replyMessage(messageData: LineReplyRequest, authorization: string): Promise<LineApiResponse> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Sending LINE reply message', { 
        replyToken: messageData.replyToken?.substring(0, 10) + '...',
        messagesCount: messageData.messages?.length || 0 
      });
      
      const response = await this.httpClient.post('/message/reply', messageData, {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE reply message sent successfully', {
        status: response.status,
      });
      
      return response.data;
    });
  }

  async getBotInfo(authorization: string): Promise<LineBotInfo> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Getting LINE bot info');
      
      const response = await this.httpClient.get('/info', {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE bot info retrieved successfully', {
        botId: response.data.userId,
        displayName: response.data.displayName,
      });
      
      return response.data;
    });
  }

  async getProfile(userId: string, authorization: string): Promise<LineProfile> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Getting LINE user profile', { userId });
      
      const response = await this.httpClient.get(`/profile/${userId}`, {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE user profile retrieved successfully', {
        userId,
        displayName: response.data.displayName,
      });
      
      return response.data;
    });
  }

  async getGroupMemberProfile(groupId: string, userId: string, authorization: string): Promise<LineGroupMemberProfile> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Getting LINE group member profile', { groupId, userId });
      
      const response = await this.httpClient.get(`/group/${groupId}/member/${userId}`, {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE group member profile retrieved successfully', {
        groupId,
        userId,
        displayName: response.data.displayName,
      });
      
      return response.data;
    });
  }

  async getGroupMemberIds(groupId: string, start?: string, authorization?: string): Promise<LineGroupMemberIds> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Getting LINE group member IDs', { groupId, start });
      
      const params = start ? { start } : {};
      const response = await this.httpClient.get(`/group/${groupId}/members/ids`, {
        params,
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE group member IDs retrieved successfully', {
        groupId,
        memberCount: response.data.memberIds?.length || 0,
        hasNext: !!response.data.next,
      });
      
      return response.data;
    });
  }

  async leaveGroup(groupId: string, authorization: string): Promise<LineApiResponse> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Leaving LINE group', { groupId });
      
      const response = await this.httpClient.post(`/group/${groupId}/leave`, {}, {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LEFT LINE group successfully', {
        groupId,
        status: response.status,
      });
      
      return response.data;
    });
  }

  async getContent(messageId: string, authorization: string): Promise<{ data: Buffer; contentType: string; contentLength: string }> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Getting LINE content', { messageId });
      
      const response = await this.httpClient.get(`/message/${messageId}/content`, {
        headers: {
          'Authorization': authorization,
        },
        responseType: 'arraybuffer',
      });
      
      logger.info('LINE content retrieved successfully', {
        messageId,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
      });
      
      return {
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'application/octet-stream',
        contentLength: response.headers['content-length'] || '0',
      };
    });
  }

  async getQuota(authorization: string): Promise<LineQuota> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Getting LINE quota');
      
      const response = await this.httpClient.get('/quota', {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE quota retrieved successfully', {
        type: response.data.type,
        value: response.data.value,
      });
      
      return response.data;
    });
  }

  async getQuotaConsumption(authorization: string): Promise<LineQuotaConsumption> {
    return this.circuitBreaker.execute(async () => {
      logger.info('Getting LINE quota consumption');
      
      const response = await this.httpClient.get('/quota/consumption', {
        headers: {
          'Authorization': authorization,
        },
      });
      
      logger.info('LINE quota consumption retrieved successfully', {
        totalUsage: response.data.totalUsage,
      });
      
      return response.data;
    });
  }
}