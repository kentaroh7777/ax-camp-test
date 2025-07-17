# Multi-Channel Reply Assistant

AI-powered unified reply assistant for Gmail, Discord, and LINE

## 概要

Multi-Channel Reply Assistant は、Gmail、Discord、LINE の3つのチャンネルを統合し、AI による返信支援を提供する Chrome 拡張機能です。

## クイックスタート
```bash
npm install
npm install --workspace=chrome-extension
./scripts/proxy-server.sh start

# 表示されるURLをLINEのWebhookに設定
ngrok http 3000
```
「chrome拡張機能インストール」節を参照してインストール


## 主な機能

- **マルチチャネル統合**: Gmail、Discord、LINE を単一の UI で管理
- **AI 返信生成**: LLM を使用した自動返信案の生成
- **ユーザー紐づけ**: 複数チャンネルでの同一ユーザー管理
- **統一返信 UI**: 全チャンネル共通の返信インターフェース

## 技術仕様

- **Chrome Extension**: Manifest V3 対応
- **Frontend**: React + TypeScript + Ant Design
- **Build**: Webpack 5 + TypeScript
- **Test**: Vitest + Testing Library
- **Architecture**: Clean Architecture (4層構成)

## 各チャンネル調査資料
doc/research/results/*.md
にあります。

## プロジェクト構成

```
multi-channel-reply-assistant/
├── chrome-extension/           # Chrome拡張機能
│   ├── src/                   # ソースコード
│   ├── public/                # 公開リソース
│   ├── manifest.json          # 拡張機能マニフェスト
│   └── webpack.config.js      # ビルド設定
├── channel-proxy-server/       # プロキシサーバー
│   ├── src/                   # サーバーソースコード
│   │   ├── routes/            # API ルート
│   │   ├── services/          # ビジネスロジック
│   │   ├── middleware/        # ミドルウェア
│   │   └── types/             # 型定義
│   └── package.json           # サーバー依存関係
├── scripts/                   # 管理スクリプト
│   └── proxy-server.sh        # プロキシサーバー管理
├── logs/                      # ログファイル
├── shared/                    # 共通ライブラリ
├── tests/                     # テストファイル
└── docs/                      # ドキュメント
```

## 開発環境構築

### 前提条件

- Node.js 18.0.0 以上
- npm 8.0.0 以上
- Chrome ブラウザ（拡張機能用）
- ngrok（ローカル開発でLINE Webhook用）

### インストール

```bash
# 依存関係をインストール
npm install

# Chrome拡張機能の依存関係をインストール
npm install --workspace=chrome-extension
```

### 環境変数設定

プロキシサーバーで必要な環境変数を設定します：

```bash
# channel-proxy-server/.env ファイルを作成
cd channel-proxy-server
cp .env.example .env
```

主要な環境変数：

```env
# LINE Bot設定
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Discord Bot設定
DISCORD_BOT_TOKEN=your_discord_bot_token

# LLM設定
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# サーバー設定
NODE_ENV=development
PORT=3000
```

### Bot設定手順

#### LINE Bot設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 新しいプロバイダーとチャンネルを作成
3. チャンネルアクセストークンとチャンネルシークレットを取得
4. Webhook URLを設定（ローカル開発時は ngrok URL + `/api/webhook`）

#### Discord Bot設定

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 新しいアプリケーションを作成
3. Bot タブでBotを作成し、トークンを取得
4. サーバーに Bot を招待（適切な権限を付与）

### ビルド

```bash
# 本番ビルド
npm run build
```

### テスト

```bash
# テスト実行
npm test

# テスト監視モード
npm run test:watch
```

### 開発

```bash
# 型チェック
npm run type-check

# リンター実行
npm run lint
```

### 開発用セットアップスクリプト

#### チャンネル設定ウィザード (`setup-channels.ts`)

対話的なセットアップウィザードでチャンネル認証情報を設定できます：

```bash
# インタラクティブなチャンネル設定
npm run setup:channels
```

**機能:**
- **Gmail設定**: OAuth認証フローの自動化
  - Google OAuth認証URLの生成と表示
  - 認証コード入力による自動トークン取得
  - 認証情報の安全な保存
  
- **Discord設定**: Bot情報の入力と保存
  - Bot Token、Client ID、Test Channel IDの設定
  - 設定情報の`.env.local`への自動保存
  
- **LINE設定**: チャンネル情報の入力と保存
  - Channel Access Token、Channel Secret、Test User IDの設定
  - Proxy URLの設定（ngrok使用時）
  - Webhook署名検証の設定

**使用手順:**
1. スクリプトを実行: `npm run setup:channels`
2. 設定したいチャンネルを選択 (1: Gmail, 2: Discord, 3: LINE)
3. 画面の指示に従って認証情報を入力
4. 自動的に`.env.local`に設定が保存される

**Gmail設定の詳細手順:**
1. スクリプトが生成するOAuth URLをブラウザで開く
2. Googleアカウントでログインし、アプリケーションを承認
3. 表示される認証コードをコピー
4. スクリプトに認証コードを入力
5. 自動的にリフレッシュトークンが取得・保存される

#### デモユーザー設定 (`setup-demo-users.ts`)

```bash
# テスト用デモユーザーを設定
npm run setup:demo-users
```

テスト用のユーザーデータとサンプルメッセージを設定します。

### ngrok設定（ローカル開発）

LINE Webhookのローカル開発用：

```bash
# ngrokをインストール（未インストールの場合）
npm install -g ngrok

# プロキシサーバー起動後
./scripts/proxy-server.sh start

# 別ターミナルでngrok起動
ngrok http 3000

# 表示されたhttps URLをLINE Webhook URLに設定
# 例: https://abcd1234.ngrok.io/api/webhook
```

### プロキシサーバー管理

Discord、LINE 統合のためのプロキシサーバーを管理するスクリプトが用意されています。

```bash
# プロキシサーバーを起動
./scripts/proxy-server.sh start

# プロキシサーバーを停止
./scripts/proxy-server.sh stop

# プロキシサーバーを再起動
./scripts/proxy-server.sh restart

# サーバーステータスを確認
./scripts/proxy-server.sh status

# ログを表示
./scripts/proxy-server.sh logs
```

### LINE webhook設定
プロキシサーバー起動後、ローカルでテストする場合は
```bash
ngrok http 3000
```
で表示された公開用URLをLINEのWebhookに設定してください。

#### ログ表示オプション

```bash
# 全ログを表示（デフォルト: 50行）
./scripts/proxy-server.sh logs all

# エラーログのみ表示
./scripts/proxy-server.sh logs error

# メインログのみ表示
./scripts/proxy-server.sh logs main

# 指定行数のログを表示
./scripts/proxy-server.sh logs all 100
```

#### プロキシサーバーについて

- **ポート**: 3000
- **機能**: Discord Bot、LINE Webhook、メッセージキャッシュ
- **ログ場所**: `logs/proxy-server.log`, `logs/proxy-error.log`
- **認証**: テスト環境では無効化

プロキシサーバーは以下のエンドポイントを提供します：
- `GET /api/health` - ヘルスチェック
- `POST /api/discord/send` - Discord メッセージ送信
- `POST /api/line/message/push` - LINE メッセージ送信
- `GET /api/line/messages` - LINE メッセージキャッシュ取得
- `POST /api/webhook` - LINE Webhook 受信

## Chrome拡張機能のインストール

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパー モード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `chrome-extension/dist` フォルダを選択

### 拡張機能の初期設定

1. 拡張機能をインストール後、アイコンをクリック
2. 設定アイコンから以下を設定：
   - プロキシサーバーURL（ローカル: `http://localhost:3000`）
   - 各チャンネルのAPI認証情報
   - LLM設定（プロバイダー、モデル選択）

### 使用方法

1. Gmail、Discord、LINE のWebページを開く
2. メッセージにカーソルを合わせると返信ボタンが表示される
3. 返信ボタンをクリックしてAI返信支援を利用
4. 統合受信箱で全チャンネルのメッセージを確認

## 設計思想

### アーキテクチャ

- **User Interface Layer**: React コンポーネント
- **Application Service Layer**: ビジネスロジック
- **Channel Service Layer**: チャンネル固有処理
- **Infrastructure Layer**: データ永続化・外部 API

各チャンネルはプロキシサーバー経由でデータの送受信を行います。
またLLM生成もプロキシサーバーを経由します。

現状はクライアントとプロキシサーバー間の認証をスキップしています。
本番利用はご遠慮ください。


### 設計原則

- **手動支援**: 完全自動化を避け、ユーザーの手動操作を支援
- **チャンネル非依存**: ユーザーにチャンネルを意識させない統合体験
- **段階的実装**: MVP から段階的に機能拡張
- **型安全性**: TypeScript による厳密な型チェック

## トラブルシューティング

### よくある問題

#### プロキシサーバーが起動しない

```bash
# ポートが使用中の場合
lsof -ti:3000 | xargs kill -9

# ログを確認
./scripts/proxy-server.sh logs
```

#### セットアップスクリプトでエラーが発生する

```bash
# TypeScript実行環境を確認
npx tsx --version

# 依存関係を再インストール
npm install

# Chrome拡張機能のビルドを確認
npm run build --workspace=chrome-extension
```

#### Gmail OAuth認証が失敗する

1. Google Cloud Consoleの設定を確認
2. OAuth 2.0クライアントIDのリダイレクトURLに `http://localhost` を追加
3. Gmail APIが有効になっているか確認
4. 認証コードをコピペする際に余分な文字が含まれていないか確認

#### Discord Bot設定が反映されない

1. Bot Tokenが正しくコピーされているか確認
2. Botがサーバーに招待されているか確認
3. Botに適切な権限（メッセージ送信、履歴読み取り）があるか確認
4. Test Channel IDが正しいか確認

#### Chrome拡張機能が動作しない

1. `chrome://extensions/` で拡張機能が有効になっているか確認
2. コンソールエラーを確認（F12 → Console）
3. 拡張機能を再読み込み

#### LINE Webhookが受信されない

1. ngrok URLが正しく設定されているか確認
2. Webhook URLが `https://your-ngrok-url.ngrok.io/api/webhook` の形式か確認
3. LINE Bot チャンネルでWebhookが有効になっているか確認

#### API認証エラー

1. 環境変数が正しく設定されているか確認
2. API キーの有効期限を確認
3. API 使用制限に達していないか確認

### ログ確認

```bash
# プロキシサーバーログ
./scripts/proxy-server.sh logs

# エラーログのみ
./scripts/proxy-server.sh logs error

# Chrome拡張機能ログ
# F12 → Console でブラウザコンソールを確認
```

### デバッグモード

```bash
# 詳細ログを有効にしてサーバー起動
NODE_ENV=development LOG_LEVEL=debug ./scripts/proxy-server.sh start
```

## セキュリティ注意事項

⚠️ **重要**: 現在のバージョンは開発・テスト用です

- クライアント-サーバー間の認証は無効化されています
- 本番環境での使用は推奨されません
- API キーは安全に管理してください

## 本番デプロイ（参考）

### Railway デプロイ

詳細は `channel-proxy-server/README.md` を参照

1. Railway アカウントを作成
2. GitHub リポジトリを接続
3. 環境変数を設定
4. 自動デプロイ

### Docker デプロイ

```bash
# プロキシサーバーをDocker化
cd channel-proxy-server
docker build -t multi-channel-proxy .
docker run -p 3000:3000 --env-file .env multi-channel-proxy
```

## 開発フロー

### 新機能開発

1. 機能ブランチを作成：`git checkout -b feature/new-feature`
2. 必要に応じてテストを追加
3. 実装とテスト実行
4. リンターとタイプチェックを実行
5. プルリクエストを作成

### 推奨開発手順

```bash
# 1. 開発環境セットアップ
npm install
npm run setup:channels
npm run setup:demo-users

# 2. プロキシサーバー起動
npm run proxy:start

# 3. Chrome拡張機能をビルド・監視モード
npm run dev

# 4. テスト実行
npm test

# 5. 型チェックとリンター
npm run type-check
npm run lint
```

## FAQ

### Q: どのLLMプロバイダーがサポートされていますか？

A: 現在、OpenAI (GPT-4)、Anthropic (Claude)、Google (Gemini) をサポートしています。プロキシサーバーの設定で選択できます。

### Q: チャンネル設定を簡単に行う方法はありますか？

A: はい、`npm run setup:channels` を実行すると対話的なセットアップウィザードが起動します。Gmail、Discord、LINEの設定を段階的に行えます。

### Q: Gmail OAuth認証でエラーが発生します

A: 以下を確認してください：
1. Google Cloud ConsoleでOAuth 2.0クライアントIDが正しく設定されているか
2. リダイレクトURLに `http://localhost` が含まれているか
3. Gmail APIが有効になっているか
4. `setup-channels.ts` を使用してOAuth認証フローを正しく実行したか

### Q: ローカル環境でLINEのWebhookをテストするにはどうすればよいですか？

A: ngrokを使用してローカルサーバーを公開し、その公開URLをLINE Developers Consoleに設定してください。詳細は「ngrok設定」セクションを参照してください。

### Q: Chrome拡張機能が一部のページで動作しないのはなぜですか？

A: セキュリティ制限により、一部のページ（chrome://、file://など）では拡張機能が動作しません。また、Content Security Policy が厳しいページでは機能が制限される場合があります。

### Q: プロキシサーバーの認証を有効にするにはどうすればよいですか？

A: 現在のバージョンでは開発用途のため認証が無効化されています。本番環境では適切な認証機構を実装する必要があります。

### Q: 複数のDiscordサーバーで使用できますか？

A: はい、Discord Botを複数のサーバーに招待することで、複数サーバーでの使用が可能です。

### Q: 設定した認証情報を確認・変更するにはどうすればよいですか？

A: `.env.local` ファイルを直接編集するか、`npm run setup:channels` を再実行して設定を上書きできます。

## ライセンス

開発者が著作権を保有します。

## 貢献

このプロジェクトは現在開発中です。

### バグ報告

問題を発見した場合は、以下の情報を含めてGitHub Issueを作成してください：

- 再現手順
- 期待される動作
- 実際の動作
- 環境情報（OS、Chrome バージョンなど）
- ログ出力（該当する場合）

## 参考資料

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [設計文書](./docs/design/prototype-architecture.md)
- [プロキシサーバー詳細](./channel-proxy-server/README.md)
- [Gmail API](https://developers.google.com/workspace/gmail/api/guides)
- [Discord API](https://discord.com/developers/docs/)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)