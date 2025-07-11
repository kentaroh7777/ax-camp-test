import React from 'react';
import ReactDOM from 'react-dom/client';

export class UIInjector {
  private mountedComponents: Map<string, any> = new Map();
  
  async injectReplyButton(targetElement: Element, messageData: any): Promise<void> {
    const buttonId = `reply-btn-${messageData.id}`;
    
    if (document.getElementById(buttonId)) {
      return; // Already injected
    }
    
    const buttonContainer = document.createElement('div');
    buttonContainer.id = buttonId;
    buttonContainer.style.cssText = 'display: inline-block; margin-left: 8px;';
    
    targetElement.appendChild(buttonContainer);
    
    const ReplyButton = () => (
      React.createElement('button', {
        onClick: () => this.openReplyModal(messageData),
        style: {
          background: '#1890ff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: '12px',
        }
      }, '返信')
    );
    
    const root = ReactDOM.createRoot(buttonContainer);
    root.render(React.createElement(ReplyButton));
    this.mountedComponents.set(buttonId, root);
  }
  
  private openReplyModal(messageData: any): void {
    chrome.runtime.sendMessage({
      type: 'OPEN_REPLY_MODAL',
      data: messageData,
    });
  }
  
  async injectInboxButton(targetElement: Element): Promise<void> {
    const buttonId = 'unified-inbox-btn';
    
    if (document.getElementById(buttonId)) {
      return;
    }
    
    const buttonContainer = document.createElement('div');
    buttonContainer.id = buttonId;
    buttonContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
    
    document.body.appendChild(buttonContainer);
    
    const InboxButton = () => (
      React.createElement('button', {
        onClick: () => this.openUnifiedInbox(),
        style: {
          background: '#52c41a',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          cursor: 'pointer',
          fontSize: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }
      }, '📧')
    );
    
    const root = ReactDOM.createRoot(buttonContainer);
    root.render(React.createElement(InboxButton));
    this.mountedComponents.set(buttonId, root);
  }
  
  private openUnifiedInbox(): void {
    chrome.runtime.sendMessage({
      type: 'OPEN_UNIFIED_INBOX',
    });
  }
  
  cleanup(): void {
    this.mountedComponents.forEach((root, id) => {
      const element = document.getElementById(id);
      if (element) {
        root.unmount();
        element.remove();
      }
    });
    this.mountedComponents.clear();
  }
}