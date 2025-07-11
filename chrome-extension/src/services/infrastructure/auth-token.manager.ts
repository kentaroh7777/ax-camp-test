// Auth Token Manager implementation
// Based on design document Line 730-750

import { IAuthTokenManager, AuthToken } from '../../types/infrastructure/auth.types';
import { IChromeStorageRepository } from '../../types/infrastructure/storage.types';
import { ChannelType } from '../../types/core/channel.types';
import { STORAGE_KEYS } from '../../types/infrastructure/storage.types';

export class AuthTokenManager implements IAuthTokenManager {
  private readonly storageRepository: IChromeStorageRepository;

  constructor(storageRepository: IChromeStorageRepository) {
    this.storageRepository = storageRepository;
  }

  /**
   * トークン保存
   * @param channel - チャンネルタイプ
   * @param token - 認証トークン
   */
  async saveToken(channel: ChannelType, token: AuthToken): Promise<void> {
    const tokens = await this.storageRepository.get<Record<string, AuthToken>>(STORAGE_KEYS.AUTH_TOKENS) || {};
    tokens[channel] = token;
    await this.storageRepository.save(STORAGE_KEYS.AUTH_TOKENS, tokens);
  }

  /**
   * トークン取得
   * @param channel - チャンネルタイプ
   * @returns 認証トークンまたはnull
   */
  async getToken(channel: ChannelType): Promise<AuthToken | null> {
    const tokens = await this.storageRepository.get<Record<string, AuthToken>>(STORAGE_KEYS.AUTH_TOKENS) || {};
    return tokens[channel] || null;
  }

  /**
   * トークン削除
   * @param channel - チャンネルタイプ
   */
  async removeToken(channel: ChannelType): Promise<void> {
    const tokens = await this.storageRepository.get<Record<string, AuthToken>>(STORAGE_KEYS.AUTH_TOKENS) || {};
    delete tokens[channel];
    await this.storageRepository.save(STORAGE_KEYS.AUTH_TOKENS, tokens);
  }

  /**
   * トークン更新
   * @param channel - チャンネルタイプ
   * @returns 更新された認証トークン
   */
  async refreshToken(channel: ChannelType): Promise<AuthToken> {
    const token = await this.getToken(channel);
    if (!token) {
      throw new Error(`No token found for channel: ${channel}`);
    }

    // チャンネル別のトークン更新ロジック
    switch (channel) {
      case ChannelType.GMAIL:
        return this.refreshGmailToken(token);
      case ChannelType.DISCORD:
        throw new Error('Discord does not support token refresh');
      case ChannelType.LINE:
        return this.refreshLineToken(token);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * トークン有効性確認
   * @param channel - チャンネルタイプ
   * @param token - 認証トークン
   * @returns トークンが有効かどうか
   */
  async validateToken(channel: ChannelType, token: AuthToken): Promise<boolean> {
    // トークンの有効期限確認
    if (token.expiresAt && new Date() >= token.expiresAt) {
      return false;
    }

    // チャンネル別の有効性確認
    switch (channel) {
      case ChannelType.GMAIL:
        return this.validateGmailToken(token);
      case ChannelType.DISCORD:
        return this.validateDiscordToken(token);
      case ChannelType.LINE:
        return this.validateLineToken(token);
      default:
        return false;
    }
  }

  /**
   * Gmail OAuth 2.0 トークン更新
   * @param token - 現在のトークン
   * @returns 更新されたトークン
   */
  private async refreshGmailToken(token: AuthToken): Promise<AuthToken> {
    if (!token.refreshToken) {
      throw new Error('No refresh token available for Gmail');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
          client_id: process.env.GMAIL_CLIENT_ID!,
          client_secret: process.env.GMAIL_CLIENT_SECRET!,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const newToken: AuthToken = {
        accessToken: data.access_token,
        refreshToken: token.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: token.scope,
        tokenType: 'Bearer',
      };

      await this.saveToken(ChannelType.GMAIL, newToken);
      return newToken;
    } catch (error) {
      throw new Error(`Failed to refresh Gmail token: ${error}`);
    }
  }

  /**
   * LINE Channel Access Token 更新
   * @param token - 現在のトークン
   * @returns トークン（LINE は基本的に期限なし）
   */
  private async refreshLineToken(token: AuthToken): Promise<AuthToken> {
    // LINE Channel Access Token は基本的に期限なし
    return token;
  }

  /**
   * Gmail トークン有効性確認
   * @param token - 認証トークン
   * @returns トークンが有効かどうか
   */
  private async validateGmailToken(token: AuthToken): Promise<boolean> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Discord Webhook URL 有効性確認
   * @param token - 認証トークン（Webhook URL）
   * @returns トークンが有効かどうか
   */
  private async validateDiscordToken(token: AuthToken): Promise<boolean> {
    try {
      const response = await fetch(token.accessToken, {
        method: 'GET',
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * LINE Channel Access Token 有効性確認
   * @param token - 認証トークン
   * @returns トークンが有効かどうか
   */
  private async validateLineToken(token: AuthToken): Promise<boolean> {
    try {
      const response = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}