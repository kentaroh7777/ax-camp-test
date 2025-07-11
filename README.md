# Multi-Channel Reply Assistant

AI-powered unified reply assistant for Gmail, Discord, and LINE

## 概要

Multi-Channel Reply Assistant は、Gmail、Discord、LINE の3つのチャンネルを統合し、AI による返信支援を提供する Chrome 拡張機能です。

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

## プロジェクト構成

```
multi-channel-reply-assistant/
├── chrome-extension/           # Chrome拡張機能
│   ├── src/                   # ソースコード
│   ├── public/                # 公開リソース
│   ├── manifest.json          # 拡張機能マニフェスト
│   └── webpack.config.js      # ビルド設定
├── shared/                    # 共通ライブラリ
├── tests/                     # テストファイル
└── docs/                      # ドキュメント
```

## 開発環境構築

### 前提条件

- Node.js 18.0.0 以上
- npm 8.0.0 以上

### インストール

```bash
# 依存関係をインストール
npm install

# Chrome拡張機能の依存関係をインストール
npm install --workspace=chrome-extension
```

### ビルド

```bash
# 開発ビルド
npm run dev

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
# 開発サーバー起動
npm run dev

# 型チェック
npm run type-check

# リンター実行
npm run lint
```

## Chrome拡張機能のインストール

1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパー モード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `chrome-extension/dist` フォルダを選択

## 設計思想

### アーキテクチャ

- **User Interface Layer**: React コンポーネント
- **Application Service Layer**: ビジネスロジック
- **Channel Service Layer**: チャンネル固有処理
- **Infrastructure Layer**: データ永続化・外部 API

### 設計原則

- **手動支援**: 完全自動化を避け、ユーザーの手動操作を支援
- **チャンネル非依存**: ユーザーにチャンネルを意識させない統合体験
- **段階的実装**: MVP から段階的に機能拡張
- **型安全性**: TypeScript による厳密な型チェック

## ライセンス

MIT License

## 貢献

このプロジェクトは現在開発中です。貢献に関するガイドラインは今後整備予定です。

## 参考資料

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [設計文書](./docs/design/prototype-architecture.md)
- [Gmail API](https://developers.google.com/workspace/gmail/api/guides)
- [Discord API](https://discord.com/developers/docs/)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)