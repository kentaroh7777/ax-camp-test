import { ChannelType } from '../../types/core/channel.types';
import { UIInjector } from './ui-injector';
import { DOMObserver } from './dom-observer';

export abstract class BaseContentScript {
  protected channel: ChannelType;
  protected uiInjector: UIInjector;
  protected domObserver: DOMObserver;
  
  constructor(channel: ChannelType) {
    this.channel = channel;
    this.uiInjector = new UIInjector();
    this.domObserver = new DOMObserver();
  }
  
  async initialize(): Promise<void> {
    try {
      await this.setupDOM();
      await this.injectUI();
      this.setupMessageListeners();
      this.startDOMObserver();
    } catch (error) {
      console.error(`Failed to initialize ${this.channel} content script:`, error);
    }
  }
  
  protected abstract setupDOM(): Promise<void>;
  protected abstract injectUI(): Promise<void>;
  protected abstract getMessageElements(): Element[];
  
  protected setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'INJECT_REPLY_UI') {
        this.handleReplyUIRequest(message.data);
      }
    });
  }
  
  protected startDOMObserver(): void {
    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    }, () => {
      this.onDOMChange();
    });
  }
  
  protected abstract onDOMChange(): void;
  protected abstract handleReplyUIRequest(data: any): void;
  
  cleanup(): void {
    this.uiInjector.cleanup();
    this.domObserver.disconnect();
  }
}