# Task 7: Content Scripts Integration（コンテンツスクリプト統合）

## 概要
Gmail、Discord、LINEの各サイトでContent Scriptsを実装し、統一UIをページに注入する。Task6のUI Layerコンポーネントを各サイトに統合し、シームレスな返信支援体験を提供する。

## 設計書詳細反映確認【新規必須セクション】
### 設計書参照箇所
- **設計書ファイル**: `doc/design/prototype-architecture.md`
- **参照セクション**: 8.2.2 ソースコード構成 - Content Scripts
- **参照行数**: Line 1150-1175

### 設計書詳細の具体的反映

#### Content Scripts構成（設計書Line 1150-1175から転記）
```
src/content-scripts/
├── base/                             # 共通ベースクラス
│   ├── base-content-script.ts        # 基底クラス
│   ├── ui-injector.ts                # UI注入機能
│   └── dom-observer.ts               # DOM監視機能
│
├── gmail/                            # Gmail専用
│   ├── gmail-content-script.ts       # Gmail Content Script
│   ├── gmail-dom-parser.ts           # Gmail DOM解析
│   └── gmail-ui-integration.ts       # Gmail UI統合
│
├── discord/                          # Discord専用
│   ├── discord-content-script.ts     # Discord Content Script
│   ├── discord-dom-parser.ts         # Discord DOM解析
│   └── discord-ui-integration.ts     # Discord UI統合
│
└── line/                             # LINE専用
    ├── line-content-script.ts        # LINE Content Script
    ├── line-dom-parser.ts            # LINE DOM解析
    └── line-ui-integration.ts        # LINE UI統合
```

#### Content Scripts manifest設定（設計書Line 1077-1095から転記）
```json
"content_scripts": [
  {
    "matches": ["https://mail.google.com/*"],
    "js": ["dist/content-scripts/gmail.js"],
    "css": ["dist/content-scripts/gmail.css"]
  },
  {
    "matches": ["https://discord.com/*"],
    "js": ["dist/content-scripts/discord.js"],
    "css": ["dist/content-scripts/discord.css"]
  },
  {
    "matches": ["https://line.me/*"],
    "js": ["dist/content-scripts/line.js"],
    "css": ["dist/content-scripts/line.css"]
  }
]
```

### 曖昧指示チェック
**以下の曖昧な指示を含まないことを確認**
- [ ] "設計書を参照して実装" ❌ 排除済み
- [ ] "設計書通りに実装" ❌ 排除済み  
- [ ] "～の実際のシナリオを実装" ❌ 排除済み
- [ ] "詳細は設計書を参照" ❌ 排除済み

## 依存関係
- **前提条件**: Task6 (UI Layer) - Reactコンポーネント利用に必要

### 成果物
- `chrome-extension/src/content-scripts/base/base-content-script.ts` - 基底クラス
- `chrome-extension/src/content-scripts/base/ui-injector.ts` - UI注入機能
- `chrome-extension/src/content-scripts/base/dom-observer.ts` - DOM監視機能
- `chrome-extension/src/content-scripts/gmail/gmail-content-script.ts` - Gmail Content Script
- `chrome-extension/src/content-scripts/discord/discord-content-script.ts` - Discord Content Script  
- `chrome-extension/src/content-scripts/line/line-content-script.ts` - LINE Content Script

### テスト成果物【必須】
- **テストファイル**: `tests/unit/content-scripts/base-content-script.test.ts`
- **テストファイル**: `tests/unit/content-scripts/gmail-content-script.test.ts`

## 実装要件
### 【必須制約】Chrome Content Scripts API準拠
- **DOM操作**: 安全なDOM操作とCSP対応必須
- **メッセージパッシング**: Background Scriptとの通信必須
- **UI注入**: React コンポーネントの動的注入必須

## 実装ガイド【設計書詳細反映必須】

### ステップ1: Base Content Script実装
**【設計書Line 1150-1158 対応】**
```typescript
// chrome-extension/src/content-scripts/base/base-content-script.ts
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
}
```

### ステップ2: UI Injector実装
```typescript
// chrome-extension/src/content-scripts/base/ui-injector.ts
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
```

### ステップ3: Gmail Content Script実装
**【Gmail専用DOM操作】**
```typescript
// chrome-extension/src/content-scripts/gmail/gmail-content-script.ts
import { BaseContentScript } from '../base/base-content-script';
import { ChannelType } from '@/types/core/channel.types';

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
```

### ステップ4: Discord Content Script実装
```typescript
// chrome-extension/src/content-scripts/discord/discord-content-script.ts
import { BaseContentScript } from '../base/base-content-script';
import { ChannelType } from '@/types/core/channel.types';

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
```

### ステップ5: LINE Content Script実装
```typescript
// chrome-extension/src/content-scripts/line/line-content-script.ts
import { BaseContentScript } from '../base/base-content-script';
import { ChannelType } from '@/types/core/channel.types';

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
```

### ステップ6: DOM Observer実装
```typescript
// chrome-extension/src/content-scripts/base/dom-observer.ts
export class DOMObserver {
  private observer: MutationObserver | null = null;
  
  observe(target: Element, options: MutationObserverInit, callback: () => void): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      let hasRelevantChanges = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          hasRelevantChanges = true;
        }
      });
      
      if (hasRelevantChanges) {
        callback();
      }
    });
    
    this.observer.observe(target, options);
  }
  
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
```

## 検証基準【ユーザー承認済み】
### 機能検証
- [ ] Gmail画面での返信ボタン注入が正常動作
- [ ] Discord画面での返信ボタン注入が正常動作
- [ ] LINE画面での返信ボタン注入が正常動作
- [ ] 統合受信箱ボタンの動作が正常
- [ ] Background Scriptとのメッセージパッシングが正常動作

### 技術検証
- [ ] Content Scripts がTypeScript strict modeでコンパイル成功
- [ ] DOM操作が安全に実行される
- [ ] React コンポーネントの動的注入が正常動作

### 設計書詳細反映検証【新規必須】
- [x] 設計書のContent Scripts構成が完全に実装済み
- [x] 設計書のmanifest Content Scripts設定が完全に反映済み
- [x] 曖昧な指示（"設計書を参照"等）が排除済み

## 注意事項
### 【厳守事項】
- Chrome Content Scripts API準拠必須
- 各サイトのCSP（Content Security Policy）対応必須
- DOM操作の安全性確保必須
- **【新規】設計書詳細完全反映ルールを必ず遵守すること** 