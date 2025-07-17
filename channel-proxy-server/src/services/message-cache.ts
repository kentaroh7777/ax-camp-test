import { Message, ChannelType } from '../types/discord.types.js';

class MessageCache {
  private messages: Message[] = [];
  private static instance: MessageCache;

  private constructor() {}

  public static getInstance(): MessageCache {
    if (!MessageCache.instance) {
      MessageCache.instance = new MessageCache();
    }
    return MessageCache.instance;
  }

  add(message: Message): void {
    this.messages.push(message);
    // Keep only the last 100 messages to prevent excessive memory usage
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }

  get(since?: Date, channelType?: string): Message[] {
    let filteredMessages = this.messages;
    
    // Filter by channel type if specified
    if (channelType) {
      filteredMessages = filteredMessages.filter(message => message.channel === channelType);
    }
    
    // Filter by date if specified
    if (since) {
      filteredMessages = filteredMessages.filter(message => 
        message.timestamp >= since
      );
    }
    
    // Sort by timestamp (newest first)
    return filteredMessages.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  getAll(): Message[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }
}

export const messageCache = MessageCache.getInstance();
