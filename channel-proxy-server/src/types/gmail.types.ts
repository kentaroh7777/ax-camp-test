// Gmail API types for proxy server
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers: GmailHeader[];
    body?: {
      attachmentId?: string;
      size: number;
      data?: string;
    };
    parts?: GmailMessagePart[];
  };
  sizeEstimate: number;
  historyId: string;
  internalDate: string;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers: GmailHeader[];
  body?: {
    attachmentId?: string;
    size: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailListResponse {
  messages: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailMessagesRequest {
  limit?: number;
  unreadOnly?: boolean;
  pageToken?: string;
}

export interface GmailMessagesResponse {
  success: boolean;
  data?: {
    messages: UnifiedGmailMessage[];
    hasMore: boolean;
    nextPageToken?: string;
  };
  error?: string;
  timestamp: string;
}

export interface GmailSendRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  content: string;
  isHtml?: boolean;
}

export interface GmailSendResponse {
  success: boolean;
  data?: {
    messageId: string;
    threadId: string;
  };
  error?: string;
  timestamp: string;
}

// 統一メッセージフォーマット（Chrome拡張用）
export interface UnifiedGmailMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  isUnread: boolean;
  channel: string;
  threadId?: string;
  raw?: any;
}

// OAuth2 Token types
export interface GmailOAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GmailTokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  clientId: string;
  clientSecret: string;
}

// Error types are now handled by GmailApiError class in the service 