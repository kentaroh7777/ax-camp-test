// Discord service specific types
export enum ChannelType {
  GMAIL = 'gmail',
  DISCORD = 'discord',
  LINE = 'line',
}

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  isUnread: boolean;
  channel: ChannelType;
  threadId?: string;
  raw?: any;
} 