import { BaseContentScript } from '../base/base-content-script';
import { ChannelType } from '../../types/core/channel.types';

export class GmailContentScript extends BaseContentScript {
  constructor() {
    super(ChannelType.GMAIL);
  }
  
  protected async setupDOM(): Promise<void> {
    // Gmailページの読み込み完了を待機
    await this.waitForGmailLoad();
  }
  
  protected async injectUI(): Promise<void> {
    // Gmail画面に統合受信箱ボタンを注入
    const toolbarElement = document.querySelector('.G-Ni');
    if (toolbarElement) {
      await this.uiInjector.injectInboxButton(toolbarElement);
    }
    
    // 既存のメールに返信ボタンを注入
    this.injectReplyButtons();
  }
  
  protected getMessageElements(): Element[] {
    return Array.from(document.querySelectorAll('.zA'));
  }
  
  protected onDOMChange(): void {
    // 新しいメッセージが表示された時に返信ボタンを注入
    setTimeout(() => {
      this.injectReplyButtons();
    }, 500);
  }
  
  protected handleReplyUIRequest(data: any): void {
    // Background Scriptからの返信UI要求を処理
    console.log('Gmail reply UI request:', data);
  }
  
  private async waitForGmailLoad(): Promise<void> {
    return new Promise((resolve) => {
      const checkGmailReady = () => {
        if (document.querySelector('.G-Ni') && document.querySelector('.zA')) {
          resolve();
        } else {
          setTimeout(checkGmailReady, 100);
        }
      };
      checkGmailReady();
    });
  }
  
  private injectReplyButtons(): void {
    const messageElements = this.getMessageElements();
    
    messageElements.forEach((element) => {
      const messageId = this.extractMessageId(element);
      if (!messageId) return;
      
      const messageData = this.parseGmailMessage(element);
      if (!messageData) return;
      
      // 返信ボタンエリアを探す
      const replyArea = element.querySelector('.amn');
      if (replyArea && !replyArea.querySelector(`#reply-btn-${messageId}`)) {
        this.uiInjector.injectReplyButton(replyArea, messageData);
      }
    });
  }
  
  private extractMessageId(element: Element): string | null {
    const idAttr = element.getAttribute('id');
    return idAttr ? idAttr.replace(':', '_') : null;
  }
  
  private parseGmailMessage(element: Element): any | null {
    try {
      const subjectElement = element.querySelector('.bog');
      const fromElement = element.querySelector('.go .g2');
      const timeElement = element.querySelector('.g3');
      const contentElement = element.querySelector('.ii.gt .a3s.aiL');
      
      // 必須要素が見つからない場合はnullを返す
      if (!subjectElement && !fromElement && !contentElement) {
        throw new Error('Required Gmail message elements not found');
      }
      
      return {
        id: this.extractMessageId(element),
        subject: subjectElement?.textContent?.trim() || '',
        from: fromElement?.textContent?.trim() || '',
        timestamp: timeElement?.getAttribute('title') || '',
        content: contentElement?.textContent?.trim() || '',
        channel: 'gmail',
      };
    } catch (error) {
      console.error('Failed to parse Gmail message:', error);
      return null;
    }
  }
}

// Gmail Content Script 初期化
if (window.location.hostname === 'mail.google.com') {
  const gmailScript = new GmailContentScript();
  gmailScript.initialize();
}

export {}