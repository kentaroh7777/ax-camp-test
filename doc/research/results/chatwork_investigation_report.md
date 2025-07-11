# Chatwork Chrome拡張機能 返信支援システム調査報告書

## 調査概要
- 調査日時: 2025年1月10日
- 調査者: AIエージェント
- 対象: Chatwork API + Chrome拡張機能

## 実現可能性判定
- **総合評価**: 困難
- **推奨度**: C
- **実装優先度**: 中

## 技術的詳細

### 受信メッセージ取得

#### 推奨方法
1. **OAuth 2.0認証** + **REST API呼び出し**
   - エンドポイント: `GET /rooms/{room_id}/messages`
   - 基本URI: `https://api.chatwork.com/v2`
   - 認証: `x-chatworktoken`ヘッダーまたはOAuth 2.0 Bearer Token

2. **実装例**:
```javascript
// Chrome拡張機能内でのメッセージ取得
async function fetchChatworkMessages(roomId, accessToken) {
  const response = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 429) {
    // レート制限に達した場合の処理
    const retryAfter = response.headers.get('x-ratelimit-reset');
    console.log(`Rate limit exceeded. Retry after: ${retryAfter}`);
    return null;
  }
  
  return await response.json();
}
```

#### 難易度: 4/5
#### 制約事項
- **レート制限**: 5分間で300リクエスト
- **追加制限**: メッセージ投稿は10秒間で10リクエスト
- **無料プラン制限**: 過去40日間、5,000メッセージまで
- **リアルタイム性**: ポーリング方式のため遅延が発生

### 送信操作実行

#### 推奨方法
1. **API経由での送信**
   - エンドポイント: `POST /rooms/{room_id}/messages`
   - パラメータ: `body` (メッセージ本文)

2. **実装例**:
```javascript
async function sendChatworkMessage(roomId, messageBody, accessToken) {
  const formData = new FormData();
  formData.append('body', messageBody);
  
  const response = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  
  if (response.status === 429) {
    // レート制限処理
    return { error: 'Rate limit exceeded' };
  }
  
  return await response.json();
}
```

#### 難易度: 3/5
#### 制約事項
- **厳格なレート制限**: 10秒間で10リクエスト
- **認証必須**: 全てのリクエストでトークン必要
- **CSP制約**: Chrome拡張機能のContent Security Policy制約

### 認証・認可フロー

#### 認証方式: OAuth 2.0 Authorization Code Grant
#### 実装手順:
1. **Chatwork OAuth 2.0エンドポイント設定**
   - 認可エンドポイント: `https://www.chatwork.com/packages/oauth2/login.php`
   - トークンエンドポイント: `https://oauth.chatwork.com/token`

2. **Chrome拡張機能での実装**:
```javascript
// manifest.json
{
  "permissions": [
    "identity",
    "storage",
    "https://api.chatwork.com/*"
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID",
    "scopes": ["rooms.all", "rooms.messages.write"]
  }
}

// OAuth認証処理
async function authenticateWithChatwork() {
  const authUrl = `https://www.chatwork.com/packages/oauth2/login.php?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=rooms.all%20rooms.messages.write`;
  
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        const code = new URL(redirectUrl).searchParams.get('code');
        exchangeCodeForToken(code).then(resolve).catch(reject);
      }
    });
  });
}
```

#### セキュリティ要件
- **PKCE (Proof Key for Code Exchange)**: 公開クライアントには必須
- **クライアントシークレット**: 拡張機能では使用禁止
- **トークン保管**: Chrome Storage API使用推奨
- **HTTPSのみ**: 全通信はHTTPS必須

## 法的・規約的制約

### 利用規約詳細分析
1. **Chatwork API利用規約**
   - 組織管理者への申請が必要（パーソナルプラン除く）
   - APIトークンの第三者への開示禁止
   - 不正使用時のアカウント停止リスク

2. **禁止事項**
   - 知的財産権侵害
   - 第三者の個人情報無断送信
   - 著作権侵害コンテンツの送信
   - 公序良俗に反する行為

### 自動化制限
- **スパム防止**: 短時間での大量投稿は制限対象
- **レート制限**: 技術的制限により自動化を制御
- **利用監視**: 異常な使用パターンの検出システム

### リスク評価
- **高リスク**: APIトークンの漏洩
- **中リスク**: レート制限違反によるアカウント制限
- **低リスク**: 通常使用での利用規約違反

## 実装推奨事項

### 実装パターン: バックグラウンドサービス + コンテンツスクリプト
```javascript
// バックグラウンドサービス (service-worker.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendMessage') {
    sendChatworkMessage(request.roomId, request.message, request.token)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンス
  }
});

// コンテンツスクリプト (content.js)
function enhanceChatworkUI() {
  // UI拡張機能の実装
  const replyButton = document.createElement('button');
  replyButton.textContent = 'AI返信';
  replyButton.onclick = () => {
    chrome.runtime.sendMessage({
      action: 'sendMessage',
      roomId: getCurrentRoomId(),
      message: generateReply(),
      token: getStoredToken()
    });
  };
  
  document.querySelector('.chat-input').appendChild(replyButton);
}
```

### 技術スタック選定理由
1. **JavaScript ES6+**: Chrome拡張機能の標準
2. **Chrome Extension Manifest V3**: 最新セキュリティモデル
3. **OAuth 2.0**: Chatwork公式認証方式
4. **Chrome Storage API**: 安全なデータ保管

### 開発工数見積もり
- **OAuth認証実装**: 5-8時間
- **API統合**: 8-12時間
- **UI拡張**: 6-10時間
- **エラーハンドリング**: 4-6時間
- **テスト・デバッグ**: 8-12時間
- **総工数**: 31-48時間（約1-2週間）

## 代替案・回避策

### 制約回避方法
1. **レート制限対策**
   - 指数バックオフ戦略
   - リクエストキューイング
   - バッチ処理の実装

2. **CSP制約対策**
   - サービスワーカーでのAPI呼び出し
   - メッセージパッシング使用
   - サンドボックス環境の利用

### 技術的代替案
1. **ウェブフック使用**: リアルタイム通知対応
2. **プロキシサーバー**: CORS制約回避
3. **専用アプリケーション**: より高度な機能実装

### 長期的戦略
1. **API仕様変更対応**: 2025年4月予定の仕様変更への対応
2. **企業版API**: より高いレート制限のEnterprise API検討
3. **公式統合**: Chatwork公式アプリストアでの配布

## 結論・推奨事項

### 実装可否: 技術的には可能だが制約多数
Chatwork Chrome拡張機能の実装は技術的には可能ですが、以下の重要な制約があります：

1. **レート制限が厳格**: 特にメッセージ送信（10秒で10回）
2. **OAuth認証の複雑性**: 拡張機能での実装が困難
3. **利用規約の制約**: 自動化に対する明確な制限
4. **CSP制約**: セキュリティポリシーによる制限

### 推奨実装順序
1. **フェーズ1**: 基本的なOAuth認証とAPI接続
2. **フェーズ2**: メッセージ取得機能の実装
3. **フェーズ3**: メッセージ送信機能の実装
4. **フェーズ4**: UI拡張とユーザビリティ向上
5. **フェーズ5**: エラーハンドリングと最適化

### 重要な注意事項
- **レート制限遵守**: 必ずレート制限を監視し遵守する
- **利用規約確認**: 実装前に最新の利用規約を確認
- **セキュリティ重視**: トークンの安全な管理
- **ユーザー同意**: 自動化機能の透明性確保

## 参考資料・出典

### 公式ドキュメント
- [Chatwork API Documentation](https://developer.chatwork.com/docs/getting-started): 公式API仕様
- [Chatwork API利用規約](https://go.chatwork.com/ja/terms/api.html): 利用規約詳細
- [OAuth 2.0について](https://developer.chatwork.com/docs/oauth): 認証方式説明
- [エンドポイントについて](https://developer.chatwork.com/docs/endpoints): API endpoints一覧

### 技術参考資料
- [Chrome Extension OAuth 2.0](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth): Chrome拡張機能でのOAuth実装
- [Chrome Extension CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy): CSP制約について
- [Chatwork API GitHub](https://github.com/chatwork/api): 公式GitHubリポジトリ

### 実装参考
- [Chatwork Tools Chrome Extension](https://chromewebstore.google.com/detail/chatwork-input-tools/iaemcpeoioekjbbephpefmdoncmpdcdc): 既存拡張機能例
- [Browser Automation Tools](https://github.com/angrykoala/awesome-browser-automation): ブラウザ自動化ツール一覧

### 法的・規約情報
- [Chatwork Terms of Service](https://go.chatwork.com/en/terms.html): 一般利用規約
- [Chatwork Security](https://go.chatwork.com/en/security/): セキュリティ・信頼性情報

---

**免責事項**: 本調査は2025年1月10日時点の情報に基づいており、API仕様や利用規約は予告なく変更される可能性があります。実装前に最新の公式情報を確認してください。