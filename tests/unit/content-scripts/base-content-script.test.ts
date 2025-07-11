import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseContentScript } from '../../../chrome-extension/src/content-scripts/base/base-content-script';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';
import { UIInjector } from '../../../chrome-extension/src/content-scripts/base/ui-injector';
import { DOMObserver } from '../../../chrome-extension/src/content-scripts/base/dom-observer';

// Mock Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
} as any;

// Mock DOM elements
Object.defineProperty(window, 'document', {
  value: {
    body: document.createElement('div'),
    readyState: 'complete',
    addEventListener: vi.fn(),
  },
  writable: true,
});

// Concrete implementation for testing
class TestContentScript extends BaseContentScript {
  constructor() {
    super(ChannelType.GMAIL);
  }
  
  protected async setupDOM(): Promise<void> {
    // Test implementation
  }
  
  protected async injectUI(): Promise<void> {
    // Test implementation
  }
  
  protected getMessageElements(): Element[] {
    return [];
  }
  
  protected onDOMChange(): void {
    // Test implementation
  }
  
  protected handleReplyUIRequest(data: any): void {
    // Test implementation
  }
}

describe('BaseContentScript', () => {
  let contentScript: TestContentScript;
  
  beforeEach(() => {
    vi.clearAllMocks();
    contentScript = new TestContentScript();
  });
  
  it('should initialize with correct channel type', () => {
    expect(contentScript['channel']).toBe(ChannelType.GMAIL);
  });
  
  it('should create UIInjector and DOMObserver instances', () => {
    expect(contentScript['uiInjector']).toBeInstanceOf(UIInjector);
    expect(contentScript['domObserver']).toBeInstanceOf(DOMObserver);
  });
  
  it('should initialize successfully', async () => {
    const setupDOMSpy = vi.spyOn(contentScript as any, 'setupDOM');
    const injectUISpy = vi.spyOn(contentScript as any, 'injectUI');
    const setupMessageListenersSpy = vi.spyOn(contentScript as any, 'setupMessageListeners');
    const startDOMObserverSpy = vi.spyOn(contentScript as any, 'startDOMObserver');
    
    await contentScript.initialize();
    
    expect(setupDOMSpy).toHaveBeenCalled();
    expect(injectUISpy).toHaveBeenCalled();
    expect(setupMessageListenersSpy).toHaveBeenCalled();
    expect(startDOMObserverSpy).toHaveBeenCalled();
  });
  
  it('should handle initialization errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setupDOMSpy = vi.spyOn(contentScript as any, 'setupDOM').mockRejectedValue(new Error('Test error'));
    
    await contentScript.initialize();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to initialize gmail content script:',
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });
  
  it('should setup message listeners', () => {
    contentScript['setupMessageListeners']();
    
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
  
  it('should cleanup resources', () => {
    const uiInjectorCleanupSpy = vi.spyOn(contentScript['uiInjector'], 'cleanup');
    const domObserverDisconnectSpy = vi.spyOn(contentScript['domObserver'], 'disconnect');
    
    contentScript.cleanup();
    
    expect(uiInjectorCleanupSpy).toHaveBeenCalled();
    expect(domObserverDisconnectSpy).toHaveBeenCalled();
  });
});