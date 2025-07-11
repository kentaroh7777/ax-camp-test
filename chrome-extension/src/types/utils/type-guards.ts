// Type guard functions for type safety
// Based on design document requirements

import { Message } from '../core/message.types';
import { ResolvedMessage } from '../core/user.types';
import { ChannelType } from '../core/channel.types';

// Gmail message type guard
export function isGmailMessage(message: Message): message is Message & { channel: ChannelType.GMAIL } {
  return message.channel === ChannelType.GMAIL;
}

// Discord message type guard
export function isDiscordMessage(message: Message): message is Message & { channel: ChannelType.DISCORD } {
  return message.channel === ChannelType.DISCORD;
}

// LINE message type guard
export function isLineMessage(message: Message): message is Message & { channel: ChannelType.LINE } {
  return message.channel === ChannelType.LINE;
}

// Resolved message type guard
export function isResolvedMessage(message: Message): message is ResolvedMessage {
  return 'priority' in message;
}

// Unread message type guard
export function isUnreadMessage(message: Message): boolean {
  return message.isUnread;
}

// Message with attachments type guard
export function hasAttachments(message: Message): message is Message & { attachments: NonNullable<Message['attachments']> } {
  return message.attachments !== undefined && message.attachments.length > 0;
}

// Thread message type guard
export function isThreadMessage(message: Message): message is Message & { threadId: string } {
  return message.threadId !== undefined;
}

// Reply message type guard
export function isReplyMessage(message: Message): message is Message & { replyToId: string } {
  return message.replyToId !== undefined;
}