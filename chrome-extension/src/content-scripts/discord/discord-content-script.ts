import { BaseContentScript } from '../base/base-content-script';
import { ChannelType } from '../../types/core/channel.types';

export class DiscordContentScript extends BaseContentScript {
  constructor() {
    super(ChannelType.DISCORD);
  }
  
  protected async setupDOM(): Promise<void> {
    await this.waitForDiscordLoad();
  }
  
  protected async injectUI(): Promise<void> {
    const chatContainer = document.querySelector('.chat-3bRxxu');
    if (chatContainer) {
      await this.uiInjector.injectInboxButton(chatContainer);
    }
    
    this.injectReplyButtons();
  }
  
  protected getMessageElements(): Element[] {
    return Array.from(document.querySelectorAll('.messageListItem-1-I1ju'));
  }
  
  protected onDOMChange(): void {
    setTimeout(() => {
      this.injectReplyButtons();
    }, 500);
  }
  
  protected handleReplyUIRequest(data: any): void {
    console.log('Discord reply UI request:', data);
  }
  
  private async waitForDiscordLoad(): Promise<void> {
    return new Promise((resolve) => {
      const checkDiscordReady = () => {
        if (document.querySelector('.chat-3bRxxu') && document.querySelector('.messageListItem-1-I1ju')) {
          resolve();
        } else {
          setTimeout(checkDiscordReady, 100);
        }
      };
      checkDiscordReady();
    });
  }
  
  private injectReplyButtons(): void {
    const messageElements = this.getMessageElements();
    
    messageElements.forEach((element) => {
      const messageData = this.parseDiscordMessage(element);
      if (!messageData) return;
      
      const buttonsContainer = element.querySelector('.buttonContainer-DHceWr');
      if (buttonsContainer && !buttonsContainer.querySelector(`#reply-btn-${messageData.id}`)) {
        this.uiInjector.injectReplyButton(buttonsContainer, messageData);
      }
    });
  }
  
  private parseDiscordMessage(element: Element): any | null {
    try {
      const messageId = element.id;
      const usernameElement = element.querySelector('.username-1A8OIy');
      const timestampElement = element.querySelector('.timestamp-3ZCmNB');
      const contentElement = element.querySelector('.markup-2BOw-j');
      
      return {
        id: messageId,
        from: usernameElement?.textContent?.trim() || '',
        timestamp: timestampElement?.getAttribute('datetime') || '',
        content: contentElement?.textContent?.trim() || '',
        channel: 'discord',
      };
    } catch (error) {
      console.error('Failed to parse Discord message:', error);
      return null;
    }
  }
}

// Discord Content Script 初期化
if (window.location.hostname === 'discord.com') {
  const discordScript = new DiscordContentScript();
  discordScript.initialize();
}

export {}