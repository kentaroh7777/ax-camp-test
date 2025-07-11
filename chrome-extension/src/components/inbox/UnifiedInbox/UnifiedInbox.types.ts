import { ResolvedMessage } from '@/types/core/user.types';
import { ReplyAssistantService } from '@/services/application/reply-assistant.service';

export interface UnifiedInboxProps {
  replyAssistantService: ReplyAssistantService;
  onReplyClick: (message: ResolvedMessage) => void;
  onSettingsClick: () => void;
  onUserMappingClick: () => void;
}

export interface UnifiedInboxState {
  messages: ResolvedMessage[];
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}