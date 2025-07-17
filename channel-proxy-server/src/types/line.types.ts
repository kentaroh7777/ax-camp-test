// LINE API Message Types
export interface LineMessage {
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker' | 'template' | 'flex';
}

export interface LineTextMessage extends LineMessage {
  type: 'text';
  text: string;
  emojis?: LineEmoji[];
}

export interface LineImageMessage extends LineMessage {
  type: 'image';
  originalContentUrl: string;
  previewImageUrl: string;
}

export interface LineVideoMessage extends LineMessage {
  type: 'video';
  originalContentUrl: string;
  previewImageUrl: string;
  trackingId?: string;
}

export interface LineAudioMessage extends LineMessage {
  type: 'audio';
  originalContentUrl: string;
  duration: number;
}

export interface LineFileMessage extends LineMessage {
  type: 'file';
  originalContentUrl: string;
  fileName: string;
  fileSize: number;
}

export interface LineLocationMessage extends LineMessage {
  type: 'location';
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface LineStickerMessage extends LineMessage {
  type: 'sticker';
  packageId: string;
  stickerId: string;
}

export interface LineTemplateMessage extends LineMessage {
  type: 'template';
  altText: string;
  template: LineTemplate;
}

export interface LineFlexMessage extends LineMessage {
  type: 'flex';
  altText: string;
  contents: LineFlexContainer;
}

// LINE API Request Types
export interface LineMessageRequest {
  to: string;
  messages: LineMessage[];
  notificationDisabled?: boolean;
}

export interface LineMulticastRequest {
  to: string[];
  messages: LineMessage[];
  notificationDisabled?: boolean;
}

export interface LineBroadcastRequest {
  messages: LineMessage[];
  notificationDisabled?: boolean;
}

export interface LineReplyRequest {
  replyToken: string;
  messages: LineMessage[];
  notificationDisabled?: boolean;
}

// LINE API Response Types
export interface LineApiResponse {
  sentMessages?: {
    id: string;
    quoteToken?: string;
  }[];
}

export interface LineBotInfo {
  userId: string;
  basicId: string;
  premiumId?: string;
  displayName: string;
  pictureUrl?: string;
  chatMode: 'chat' | 'bot';
  markAsReadMode: 'auto' | 'manual';
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

export interface LineGroupMemberProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export interface LineGroupMemberIds {
  memberIds: string[];
  next?: string;
}

export interface LineQuota {
  type: 'none' | 'limited';
  value?: number;
}

export interface LineQuotaConsumption {
  totalUsage: number;
}

// LINE Webhook Types
export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'memberJoined' | 'memberLeft' | 'postback' | 'beacon' | 'accountLink' | 'things';
  timestamp: number;
  source: LineEventSource;
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
  replyToken?: string;
}

export interface LineMessageEvent extends LineWebhookEvent {
  type: 'message';
  message: LineReceivedMessage;
}

export interface LineFollowEvent extends LineWebhookEvent {
  type: 'follow';
}

export interface LineUnfollowEvent extends LineWebhookEvent {
  type: 'unfollow';
}

export interface LineJoinEvent extends LineWebhookEvent {
  type: 'join';
}

export interface LineLeaveEvent extends LineWebhookEvent {
  type: 'leave';
}

export interface LineMemberJoinedEvent extends LineWebhookEvent {
  type: 'memberJoined';
  joined: {
    members: LineEventSource[];
  };
}

export interface LineMemberLeftEvent extends LineWebhookEvent {
  type: 'memberLeft';
  left: {
    members: LineEventSource[];
  };
}

export interface LinePostbackEvent extends LineWebhookEvent {
  type: 'postback';
  postback: {
    data: string;
    params?: {
      datetime?: string;
      date?: string;
      time?: string;
    };
  };
}

export interface LineBeaconEvent extends LineWebhookEvent {
  type: 'beacon';
  beacon: {
    hwid: string;
    type: 'enter' | 'leave' | 'banner';
    dm?: string;
  };
}

export interface LineAccountLinkEvent extends LineWebhookEvent {
  type: 'accountLink';
  link: {
    result: 'ok' | 'failed';
    nonce: string;
  };
}

export interface LineThingsEvent extends LineWebhookEvent {
  type: 'things';
  things: {
    deviceId: string;
    type: 'link' | 'unlink' | 'scenarioResult';
    result?: {
      scenarioId: string;
      revision: number;
      startTime: number;
      endTime: number;
      resultCode: 'success' | 'giveup' | 'fail';
      bleNotificationPayload?: string;
      errorReason?: string;
    };
  };
}

export interface LineEventSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineReceivedMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
  text?: string;
  emojis?: LineEmoji[];
  mention?: LineMention;
  contentProvider?: {
    type: 'line' | 'external';
    originalContentUrl?: string;
    previewImageUrl?: string;
  };
  fileName?: string;
  fileSize?: number;
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  packageId?: string;
  stickerId?: string;
  stickerResourceType?: 'STATIC' | 'ANIMATION' | 'SOUND' | 'ANIMATION_SOUND' | 'POPUP' | 'POPUP_SOUND' | 'NAME_TEXT' | 'PER_STICKER_TEXT';
  keywords?: string[];
}

export interface LineWebhookRequest {
  destination: string;
  events: LineWebhookEvent[];
}

// LINE Template Types
export interface LineTemplate {
  type: 'buttons' | 'confirm' | 'carousel' | 'image_carousel';
}

export interface LineButtonsTemplate extends LineTemplate {
  type: 'buttons';
  thumbnailImageUrl?: string;
  imageAspectRatio?: 'rectangle' | 'square';
  imageSize?: 'cover' | 'contain';
  imageBackgroundColor?: string;
  title?: string;
  text: string;
  defaultAction?: LineAction;
  actions: LineAction[];
}

export interface LineConfirmTemplate extends LineTemplate {
  type: 'confirm';
  text: string;
  actions: [LineAction, LineAction];
}

export interface LineCarouselTemplate extends LineTemplate {
  type: 'carousel';
  columns: LineCarouselColumn[];
  imageAspectRatio?: 'rectangle' | 'square';
  imageSize?: 'cover' | 'contain';
}

export interface LineImageCarouselTemplate extends LineTemplate {
  type: 'image_carousel';
  columns: LineImageCarouselColumn[];
}

// LINE Action Types
export interface LineAction {
  type: 'postback' | 'message' | 'uri' | 'datetimepicker' | 'camera' | 'cameraRoll' | 'location';
  label?: string;
}

export interface LinePostbackAction extends LineAction {
  type: 'postback';
  data: string;
  displayText?: string;
  inputOption?: 'closeRichMenu' | 'openRichMenu' | 'openKeyboard' | 'openVoice';
  fillInText?: string;
}

export interface LineMessageAction extends LineAction {
  type: 'message';
  text: string;
}

export interface LineUriAction extends LineAction {
  type: 'uri';
  uri: string;
  altUri?: {
    desktop: string;
  };
}

export interface LineDatetimePickerAction extends LineAction {
  type: 'datetimepicker';
  data: string;
  mode: 'date' | 'time' | 'datetime';
  initial?: string;
  max?: string;
  min?: string;
}

// LINE Flex Types
export interface LineFlexContainer {
  type: 'bubble' | 'carousel';
}

export interface LineFlexBubble extends LineFlexContainer {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  direction?: 'ltr' | 'rtl';
  header?: LineFlexBox;
  hero?: LineFlexComponent;
  body?: LineFlexBox;
  footer?: LineFlexBox;
  styles?: LineFlexBubbleStyle;
  action?: LineAction;
}

export interface LineFlexCarousel extends LineFlexContainer {
  type: 'carousel';
  contents: LineFlexBubble[];
}

export interface LineFlexComponent {
  type: 'box' | 'button' | 'filler' | 'icon' | 'image' | 'separator' | 'spacer' | 'text' | 'video';
}

export interface LineFlexBox extends LineFlexComponent {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: LineFlexComponent[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  spacing?: string;
  action?: LineAction;
  height?: string;
  width?: string;
  maxWidth?: string;
  maxHeight?: string;
  flex?: number;
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end';
  background?: LineFlexBoxBackground;
  offsetTop?: string;
  offsetBottom?: string;
  offsetStart?: string;
  offsetEnd?: string;
  position?: 'relative' | 'absolute';
}

// Additional helper types
export interface LineEmoji {
  index: number;
  productId: string;
  emojiId: string;
}

export interface LineMention {
  mentionees: LineMentionee[];
}

export interface LineMentionee {
  index: number;
  length: number;
  userId: string;
}

export interface LineCarouselColumn {
  thumbnailImageUrl?: string;
  imageBackgroundColor?: string;
  title?: string;
  text: string;
  defaultAction?: LineAction;
  actions: LineAction[];
}

export interface LineImageCarouselColumn {
  imageUrl: string;
  action: LineAction;
}

export interface LineFlexBubbleStyle {
  header?: LineFlexBlockStyle;
  hero?: LineFlexBlockStyle;
  body?: LineFlexBlockStyle;
  footer?: LineFlexBlockStyle;
}

export interface LineFlexBlockStyle {
  backgroundColor?: string;
  separator?: boolean;
  separatorColor?: string;
}

export interface LineFlexBoxBackground {
  type: 'linearGradient';
  angle: string;
  startColor: string;
  endColor: string;
  centerColor?: string;
  centerColorPosition?: string;
}

// Error types
export interface LineApiError {
  message: string;
  details?: LineApiErrorDetail[];
}

export interface LineApiErrorDetail {
  message: string;
  property: string;
}