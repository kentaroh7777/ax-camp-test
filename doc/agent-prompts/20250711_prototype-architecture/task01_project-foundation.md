# Task 1: プロジェクト基盤構築

## 概要
Multi-Channel Reply Assistant Chrome拡張機能の基盤となるプロジェクト構造、設定ファイル群、およびテスト環境を構築する。

## 設計書詳細反映確認【新規必須セクション】
### 設計書参照箇所
- **設計書ファイル**: `doc/design/prototype-architecture.md`
- **参照セクション**: 8. プロジェクト構成設計
- **参照行数**: Line 968-1299

### 設計書詳細の具体的反映

#### プロジェクト構造（設計書から転記）
```
multi-channel-reply-assistant/
├── README.md                           # プロジェクト概要
├── package.json                        # NPMパッケージ設定
├── tsconfig.json                       # TypeScript設定
├── .gitignore                          # Git除外設定
├── .env.example                        # 環境変数例
│
├── chrome-extension/                   # Chrome拡張機能
│   ├── manifest.json                   # 拡張機能マニフェスト
│   ├── package.json                    # 拡張機能用依存関係
│   ├── webpack.config.js               # ビルド設定
│   ├── tsconfig.json                   # 拡張機能用TypeScript設定
│   │
│   ├── src/                           # ソースコード
│   │   ├── background/                # Background Service Worker
│   │   ├── content-scripts/           # Content Scripts
│   │   ├── components/                # React Components
│   │   ├── services/                  # Business Logic Services
│   │   ├── repositories/              # Data Access Layer
│   │   ├── types/                     # TypeScript型定義
│   │   ├── utils/                     # ユーティリティ
│   │   └── assets/                    # 静的リソース
│   │
│   ├── public/                        # 公開リソース
│   │   ├── icons/                     # アイコンファイル
│   │   ├── _locales/                  # 多言語リソース
│   │   └── popup.html                 # ポップアップHTML
│   │
│   └── dist/                          # ビルド出力
│
├── shared/                           # 共通ライブラリ
│   ├── types/                        # 共通型定義
│   ├── constants/                    # 定数定義
│   └── utils/                        # 共通ユーティリティ
│
├── tests/                            # テストファイル
│   ├── unit/                         # ユニットテスト
│   ├── integration/                  # 統合テスト
│   ├── e2e/                          # E2Eテスト
│   └── mocks/                        # モックデータ
│
└── docs/                             # ドキュメント
    ├── design/                       # 設計文書
    ├── api/                          # API仕様書
    └── development/                  # 開発ガイド
```

#### manifest.json構造（設計書Line 1050-1085から転記）
```json
{
  "manifest_version": 3,
  "name": "Multi-Channel Reply Assistant",
  "version": "1.0.0",
  "description": "AI-powered unified reply assistant for Gmail, Discord, and LINE",
  
  "permissions": [
    "storage",
    "identity",
    "activeTab",
    "https://gmail.com/*",
    "https://discord.com/*",
    "https://line.me/*"
  ],
  
  "background": {
    "service_worker": "dist/background/service-worker.js"
  },
  
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
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

#### TypeScript設定（設計書Line 1270-1297から転記）
```json
// chrome-extension/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/components/*": ["components/*"],
      "@/services/*": ["services/*"],
      "@/types/*": ["types/*"],
      "@/utils/*": ["utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### パッケージ構成（設計書Line 1300-1325から転記）
```json
// chrome-extension/package.json
{
  "name": "multi-channel-reply-assistant",
  "version": "1.0.0",
  "description": "AI-powered unified reply assistant",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.246",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "webpack": "^5.0.0",
    "webpack-cli": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.0.0"
  }
}
```

### 曖昧指示チェック
**以下の曖昧な指示を含まないことを確認**
- [ ] "設計書を参照して実装" ❌ 排除済み
- [ ] "設計書通りに実装" ❌ 排除済み  
- [ ] "～の実際のシナリオを実装" ❌ 排除済み
- [ ] "詳細は設計書を参照" ❌ 排除済み

## 依存関係
- 本実装の元となる設計書: `doc/design/prototype-architecture.md`
- 実装依存: なし（最初のタスク）

### 前提条件
- Git リポジトリの初期化済み
- Node.js 18+ 環境

### 成果物
- `package.json` - ルートパッケージ設定
- `chrome-extension/package.json` - Chrome拡張機能用依存関係
- `chrome-extension/tsconfig.json` - TypeScript設定
- `chrome-extension/manifest.json` - Chrome拡張機能マニフェスト
- `chrome-extension/webpack.config.js` - ビルド設定
- `vitest.config.ts` - テスト設定
- `.gitignore` - Git除外設定
- `.env.example` - 環境変数テンプレート
- `README.md` - プロジェクト概要
- ディレクトリ構造一式

### テスト成果物【必須】
- **vitest設定**: `vitest.config.ts` - テスト環境設定
- **npmテストスクリプト**: `package.json`の`scripts.test`設定
- **テストディレクトリ**: `tests/` - テスト構造作成

### 影響範囲
- プロジェクト全体の基盤となるため、後続全タスクに影響

## 実装要件
### 【必須制約】Chrome拡張機能Manifest V3準拠
- **Manifest Version**: 必ず"3"を指定
- **Service Worker**: background.service_workerでService Worker指定必須
- **Content Scripts**: matches配列で対象サイト明確に指定

### 技術仕様
```typescript
// 基本型定義（最小限）
interface PackageConfig {
  name: string;
  version: string;
  description: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface ManifestConfig {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  background: {
    service_worker: string;
  };
  content_scripts: Array<{
    matches: string[];
    js: string[];
    css: string[];
  }>;
  action: {
    default_popup: string;
    default_icon: Record<string, string>;
  };
}
```

### 設計パターン
**パターン**: モノレポ構造採用
**理由**: Chrome拡張機能とProxy Serverの両方を含む統合開発環境

## 実装ガイド【設計書詳細反映必須】

### ステップ1: ルートプロジェクト構造作成
**【設計書Line 968-1010 対応】**
```bash
# プロジェクトルート構造作成
mkdir -p chrome-extension/src/{background,content-scripts,components,services,repositories,types,utils,assets}
mkdir -p chrome-extension/src/content-scripts/{base,gmail,discord,line}
mkdir -p chrome-extension/src/components/{common,inbox,reply,settings,popup}
mkdir -p chrome-extension/src/services/{application,channel,infrastructure}
mkdir -p chrome-extension/src/types/{core,services,infrastructure,external}
mkdir -p chrome-extension/public/{icons,_locales}
mkdir -p shared/{types,constants,utils}
mkdir -p tests/{unit,integration,e2e,mocks}
mkdir -p docs/{design,api,development}
```

### ステップ2: パッケージ設定ファイル作成
**【設計書Line 1300-1325 対応】**
```json
// package.json（ルート）
{
  "name": "multi-channel-reply-assistant",
  "version": "1.0.0",
  "description": "AI-powered unified reply assistant for Gmail, Discord, and LINE",
  "private": true,
  "workspaces": [
    "chrome-extension",
    "shared"
  ],
  "scripts": {
    "build": "npm run build --workspace=chrome-extension",
    "dev": "npm run dev --workspace=chrome-extension",
    "test": "npm run test --workspace=chrome-extension",
    "lint": "npm run lint --workspace=chrome-extension"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### ステップ3: Chrome拡張機能manifest.json作成
**【設計書Line 1050-1085 対応】**
```json
// chrome-extension/manifest.json
{
  "manifest_version": 3,
  "name": "Multi-Channel Reply Assistant",
  "version": "1.0.0",
  "description": "AI-powered unified reply assistant for Gmail, Discord, and LINE",
  
  "permissions": [
    "storage",
    "identity",
    "activeTab",
    "https://gmail.com/*",
    "https://discord.com/*",
    "https://line.me/*"
  ],
  
  "background": {
    "service_worker": "dist/background/service-worker.js"
  },
  
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
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

### ステップ4: TypeScript設定
**【設計書Line 1270-1297 対応】**
```json
// chrome-extension/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/components/*": ["components/*"],
      "@/services/*": ["services/*"],
      "@/types/*": ["types/*"],
      "@/utils/*": ["utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### テスト環境構築【全プロジェクト必須】

#### ステップA: vitest環境設定
```typescript
// vitest.config.ts （新規作成）
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['chrome-extension/src/**/*.{test,spec}.{js,ts,tsx}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', '**/*.d.ts'],
    coverage: {
      provider: 'v8',
      include: ['chrome-extension/src/**/*.{js,ts,tsx}'],
      exclude: ['chrome-extension/src/**/*.d.ts', 'tests/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'chrome-extension/src')
    }
  }
})
```

#### ステップB: webpack設定作成
```javascript
// chrome-extension/webpack.config.js
const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    'background/service-worker': './src/background/service-worker.ts',
    'content-scripts/gmail': './src/content-scripts/gmail/gmail-content-script.ts',
    'content-scripts/discord': './src/content-scripts/discord/discord-content-script.ts',
    'content-scripts/line': './src/content-scripts/line/line-content-script.ts',
    'popup/popup': './src/components/popup/PopupApp.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
```

#### ステップC: 基本設定ファイル作成
```gitignore
# .gitignore
node_modules/
dist/
*.log
.env
.DS_Store
chrome-extension/dist/
tests/coverage/
```

```bash
# .env.example
# Chrome Extension
CHROME_EXTENSION_ID=your_extension_id_here

# LLM API
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# LINE Proxy Server
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_PROXY_SERVER_URL=https://your-proxy-server.railway.app
```

## 検証基準【ユーザー承認済み】
### 機能検証
- [ ] プロジェクト構造が設計書通りに作成されている
- [ ] 全ての設定ファイルが正しい場所に配置されている
- [ ] manifest.jsonがManifest V3仕様に準拠している

### 技術検証
- [ ] TypeScript strict modeでコンパイル成功
- [ ] `npm install`が全てのworkspaceで成功
- [ ] `npm test`でvitest実行環境が動作する
- [ ] webpack buildが設定通りに動作する
- [ ] 基本ルール（@test-debug-rule.mdc）準拠

### 設計書詳細反映検証【新規必須】
- [x] 設計書の具体的なプロジェクト構造が完全に転記済み
- [x] 設計書のmanifest.json設定が完全に反映済み
- [x] 設計書のTypeScript設定が具体的に記載済み
- [x] 曖昧な指示（"設計書を参照"等）が排除済み
- [x] 設定値、ファイルパス等が具体的に記載済み

### 自動テスト検証【必須】
- [ ] `npm test` でテスト実行可能
- [ ] `npm run test:watch` で監視モード実行可能
- [ ] vitestによる基本テスト環境が構築済み
- [ ] テストディレクトリ構造が作成済み

### 統合検証
- [ ] Chrome拡張機能として読み込み可能な構造
- [ ] 後続タスクで必要となるディレクトリが全て準備済み

## 実装例【設計書詳細反映版】
```typescript
// 基本的なProject設定検証用の簡単なテスト
// tests/unit/project-structure.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('プロジェクト基盤構築', () => {
  it('manifest.jsonが正しく作成されている', () => {
    const manifestPath = path.join(process.cwd(), 'chrome-extension/manifest.json')
    expect(fs.existsSync(manifestPath)).toBe(true)
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.name).toBe('Multi-Channel Reply Assistant')
  })

  it('package.jsonにテストスクリプトが設定されている', () => {
    const packagePath = path.join(process.cwd(), 'chrome-extension/package.json')
    expect(fs.existsSync(packagePath)).toBe(true)
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
    expect(packageJson.scripts.test).toBeDefined()
    expect(packageJson.scripts.test).toContain('vitest')
  })
})
```

## 注意事項
### 【厳守事項】
- Manifest V3仕様を必ず遵守すること
- vitestによる自動テスト実行が可能な状態を維持すること
- package.jsonのtestスクリプト設定を必ず確認・設定すること
- 設計書詳細完全反映ルールを必ず遵守すること

### 【推奨事項】
- npm workspacesを活用したモノレポ構造
- TypeScriptパス解決の活用
- ESLint/Prettierによるコード品質管理

### 【禁止事項】
- Manifest V2の古い仕様を使用すること
- vitestの設定を破壊する変更
- npm testでテストが実行できなくなる変更
- 設計書詳細を「参照」のみで済ませる曖昧な指示

## 参考情報
- 設計書: `doc/design/prototype-architecture.md` 8章プロジェクト構成設計
- Chrome Extensions Manifest V3: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
- Vitest Configuration: https://vitest.dev/config/ 