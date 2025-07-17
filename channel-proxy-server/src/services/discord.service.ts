import { Client, GatewayIntentBits, Partials, TextChannel } from 'discord.js';
import { messageCache } from './message-cache.js';
import { ChannelType, Message } from '../types/discord.types.js';

export class DiscordService {
  private client: Client;
  private static instance: DiscordService;
  private isReady: boolean = false;

  private constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel], // Required for DM events
    });

    this.client.once('ready', () => {
      console.log(`Discord Bot Ready! Logged in as ${this.client.user?.tag}`);
      this.isReady = true;
    });

    this.client.on('messageCreate', async (msg) => {
      if (msg.author.bot) return; // Ignore bot messages

      const message: Message = {
        id: msg.id,
        from: msg.author.username,
        to: msg.channel.id,
        content: msg.content,
        timestamp: msg.createdAt,
        isUnread: true, // Assume unread when received by bot
        channel: ChannelType.DISCORD,
        raw: msg.toJSON(),
      };
      messageCache.add(message);
      console.log(`Cached Discord message from ${msg.author.username}: ${msg.content}`);
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
  }

  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  public async start(): Promise<void> {
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.warn('DISCORD_BOT_TOKEN is not set. Discord bot will not start.');
      return;
    }
    if (!this.isReady) {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    }
  }

  public async sendMessage(channelId: string, content: string): Promise<any> {
    if (!this.isReady) {
      throw new Error('Discord bot is not ready.');
    }
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      throw new Error(`Channel ${channelId} not found or is not a text channel.`);
    }
    const message = await channel.send(content);
    return { messageId: message.id };
  }

  public getMessages(since?: Date): Message[] {
    return messageCache.get(since, 'discord');
  }

  public async stop(): Promise<void> {
    this.client.destroy();
    this.isReady = false;
    console.log('Discord Bot stopped.');
  }
}