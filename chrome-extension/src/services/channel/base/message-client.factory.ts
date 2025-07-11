// Message Client Factory implementation
// Based on design document Line 1253-1279

import { IMessageClient } from '../../../types/core/message.types';
import { ChannelType } from '../../../types/core/channel.types';
import { IAuthTokenManager } from '../../../types/infrastructure/auth.types';
import { GmailService } from '../gmail/gmail.service';
import { DiscordService } from '../discord/discord.service';
import { LineService } from '../line/line.service';

export class MessageClientFactory {
  private authTokenManager: IAuthTokenManager;
  
  constructor(authTokenManager: IAuthTokenManager) {
    this.authTokenManager = authTokenManager;
  }
  
  createClient(channel: ChannelType): IMessageClient {
    switch (channel) {
      case ChannelType.GMAIL:
        return new GmailService(this.authTokenManager);
      case ChannelType.DISCORD:
        return new DiscordService(this.authTokenManager);
      case ChannelType.LINE:
        return new LineService(this.authTokenManager);
      default:
        throw new Error(`Unsupported channel type: ${channel}`);
    }
  }
  
  createAllClients(): Record<ChannelType, IMessageClient> {
    return {
      [ChannelType.GMAIL]: this.createClient(ChannelType.GMAIL),
      [ChannelType.DISCORD]: this.createClient(ChannelType.DISCORD),
      [ChannelType.LINE]: this.createClient(ChannelType.LINE),
    };
  }
}