import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailContentScript } from '../../../chrome-extension/src/content-scripts/gmail/gmail-content-script';
import { ChannelType } from '../../../chrome-extension/src/types/core/channel.types';

// Mock Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
} as any;

// Mock DOM elements
const mockGmailDOM = () => {
  const toolbarElement = document.createElement('div');
  toolbarElement.className = 'G-Ni';
  
  const messageElement = document.createElement('div');
  messageElement.className = 'zA';
  messageElement.id = 'test-message-id';
  
  const replyArea = document.createElement('div');
  replyArea.className = 'amn';
  messageElement.appendChild(replyArea);
  
  const subjectElement = document.createElement('div');
  subjectElement.className = 'bog';
  subjectElement.textContent = 'Test Subject';
  messageElement.appendChild(subjectElement);
  
  const fromElement = document.createElement('div');
  fromElement.className = 'go';
  const fromInner = document.createElement('div');
  fromInner.className = 'g2';
  fromInner.textContent = 'test@example.com';
  fromElement.appendChild(fromInner);
  messageElement.appendChild(fromElement);
  
  const timeElement = document.createElement('div');
  timeElement.className = 'g3';
  timeElement.setAttribute('title', '2024-01-01');
  messageElement.appendChild(timeElement);
  
  const contentElement = document.createElement('div');
  contentElement.className = 'ii gt';
  const contentInner = document.createElement('div');
  contentInner.className = 'a3s aiL';
  contentInner.textContent = 'Test message content';
  contentElement.appendChild(contentInner);
  messageElement.appendChild(contentElement);
  
  return { toolbarElement, messageElement, replyArea };
};

// Mock document.querySelector
const mockElements = mockGmailDOM();
Object.defineProperty(document, 'querySelector', {
  value: vi.fn((selector: string) => {
    if (selector === '.G-Ni') return mockElements.toolbarElement;
    if (selector === '.zA') return mockElements.messageElement;
    return null;
  }),
  writable: true,
});

Object.defineProperty(document, 'querySelectorAll', {
  value: vi.fn((selector: string) => {
    if (selector === '.zA') return [mockElements.messageElement];
    return [];
  }),
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'mail.google.com',
  },
  writable: true,
});

describe('GmailContentScript', () => {
  let gmailScript: GmailContentScript;
  
  beforeEach(() => {
    vi.clearAllMocks();
    gmailScript = new GmailContentScript();
  });
  
  it('should initialize with Gmail channel type', () => {
    expect(gmailScript['channel']).toBe(ChannelType.GMAIL);
  });
  
  it('should wait for Gmail DOM to load', async () => {
    const waitForGmailLoadSpy = vi.spyOn(gmailScript as any, 'waitForGmailLoad');
    
    await gmailScript['setupDOM']();
    
    expect(waitForGmailLoadSpy).toHaveBeenCalled();
  });
  
  it('should inject UI elements', async () => {
    const injectInboxButtonSpy = vi.spyOn(gmailScript['uiInjector'], 'injectInboxButton');
    const injectReplyButtonsSpy = vi.spyOn(gmailScript as any, 'injectReplyButtons');
    
    await gmailScript['injectUI']();
    
    expect(injectInboxButtonSpy).toHaveBeenCalledWith(mockElements.toolbarElement);
    expect(injectReplyButtonsSpy).toHaveBeenCalled();
  });
  
  it('should get message elements', () => {
    const messageElements = gmailScript['getMessageElements']();
    
    expect(messageElements).toHaveLength(1);
    expect(messageElements[0]).toBe(mockElements.messageElement);
  });
  
  it('should extract message ID', () => {
    const messageId = gmailScript['extractMessageId'](mockElements.messageElement);
    
    expect(messageId).toBe('test-message-id');
  });
  
  it('should parse Gmail message', () => {
    const messageData = gmailScript['parseGmailMessage'](mockElements.messageElement);
    
    expect(messageData).toEqual({
      id: 'test-message-id',
      subject: 'Test Subject',
      from: 'test@example.com',
      timestamp: '2024-01-01',
      content: 'Test message content',
      channel: 'gmail',
    });
  });
  
  it('should handle DOM changes', () => {
    const injectReplyButtonsSpy = vi.spyOn(gmailScript as any, 'injectReplyButtons');
    
    gmailScript['onDOMChange']();
    
    // Wait for setTimeout
    setTimeout(() => {
      expect(injectReplyButtonsSpy).toHaveBeenCalled();
    }, 600);
  });
  
  it('should handle reply UI requests', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const testData = { test: 'data' };
    
    gmailScript['handleReplyUIRequest'](testData);
    
    expect(consoleSpy).toHaveBeenCalledWith('Gmail reply UI request:', testData);
    
    consoleSpy.mockRestore();
  });
  
  it('should handle parse errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invalidElement = document.createElement('div');
    
    const result = gmailScript['parseGmailMessage'](invalidElement);
    
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to parse Gmail message:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});