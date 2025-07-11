import { BaseContentScript } from '../base/base-content-script';
import { ChannelType } from '../../types/core/channel.types';

export class LineContentScript extends BaseContentScript {
  constructor() {
    super(ChannelType.LINE);
  }
  
  protected async setupDOM(): Promise<void> {
    await this.waitForLineLoad();
  }
  
  protected async injectUI(): Promise<void> {
    const chatList = document.querySelector('.MdTalk01List');
    if (chatList) {
      await this.uiInjector.injectInboxButton(chatList);
    }
    
    this.injectReplyButtons();
  }
  
  protected getMessageElements(): Element[] {
    return Array.from(document.querySelectorAll('.MdTalkTxtMsg01'));
  }
  
  protected onDOMChange(): void {
    setTimeout(() => {
      this.injectReplyButtons();
    }, 500);
  }
  
  protected handleReplyUIRequest(data: any): void {
    console.log('LINE reply UI request:', data);
  }
  
  private async waitForLineLoad(): Promise<void> {
    return new Promise((resolve) => {
      const checkLineReady = () => {
        if (document.querySelector('.MdTalk01List')) {
          resolve();
        } else {
          setTimeout(checkLineReady, 100);
        }
      };
      checkLineReady();
    });
  }
  
  private injectReplyButtons(): void {
    const messageElements = this.getMessageElements();
    
    messageElements.forEach((element) => {
      const messageData = this.parseLineMessage(element);
      if (!messageData) return;
      
      const messageContainer = element.closest('.MdTalkTxtMsg01Item');
      if (messageContainer && !messageContainer.querySelector(`#reply-btn-${messageData.id}`)) {
        this.uiInjector.injectReplyButton(messageContainer, messageData);
      }
    });
  }
  
  private parseLineMessage(element: Element): any | null {
    try {
      const messageId = `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const senderElement = element.querySelector('.MdTalkTxtMsgSenderName01');
      const timeElement = element.querySelector('.MdTalkTxtMsgTimestamp01');
      const contentElement = element.querySelector('.MdTalkTxtMsgText01');
      
      return {
        id: messageId,
        from: senderElement?.textContent?.trim() || '',
        timestamp: timeElement?.textContent?.trim() || '',
        content: contentElement?.textContent?.trim() || '',
        channel: 'line',
      };
    } catch (error) {
      console.error('Failed to parse LINE message:', error);
      return null;
    }
  }
}

// LINE Content Script 初期化
if (window.location.hostname === 'line.me') {
  const lineScript = new LineContentScript();
  lineScript.initialize();
}

export {}