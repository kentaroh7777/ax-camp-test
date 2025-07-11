import { ResolvedMessage } from '@/types/core/user.types';
import { Message } from '@/types/core/message.types';
import { ReplyAssistantService } from '@/services/application/reply-assistant.service';

export interface ReplyModalProps {
  visible: boolean;
  message: ResolvedMessage | null;
  replyAssistantService: ReplyAssistantService;
  onSend: (content: string, message: ResolvedMessage) => Promise<void>;
  onCancel: () => void;
}

export interface ReplyModalState {
  replyContent: string;
  generatedReply: string;
  relatedMessages: Message[];
  loading: boolean;
  generating: boolean;
  error: string | null;
}