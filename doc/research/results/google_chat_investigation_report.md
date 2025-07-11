# Google Chat Chrome拡張機能 返信支援システム調査報告書

## 1. 調査概要

本報告書は、Google Chat向けのChrome拡張機能による返信支援システムの実現可能性を評価するために実施した調査の結果をまとめたものである。調査は、技術仕様の分析、法的側面の検討、および具体的な実装計画の策定に焦点を当てて行われた。

## 2. 情報収集結果

### 2.1. Google Chat API

Google Chat APIは、Google Chatとの連携を可能にするためのAPIであり、スペースの管理、メンバーの管理、メッセージの送受信などの機能を提供する。

- **主な機能**:
    - メッセージの投稿、取得、更新、削除
    - スペースの作成、情報の取得
    - メンバーシップの管理
- **インターフェース**: RESTful APIおよびgRPC
- **認証**: OAuth 2.0
- **ドキュメント**: [https://developers.google.com/chat/api/reference/rest](https://developers.google.com/chat/api/reference/rest)

返信支援システムにおいて、APIは主に以下の目的で利用可能である。
- **定型文の管理**: 特定のスペースに定型文をメッセージとして投稿し、それを拡張機能が読み込む。
- **高度な機能**: 将来的に、AIによる返信文案の生成や、外部サービスとの連携を行う場合にAPI連携が必須となる。

### 2.2. Chrome拡張機能

Chrome拡張機能は、Chromeブラウザの機能を拡張するためのプログラムである。Content Scriptを利用することで、表示されているウェブページのDOMを操作し、独自のUIを追加したり、ページの内容を書き換えたりすることが可能である。

- **Content Scripts**: ウェブページのコンテキストで実行されるJavaScript。Google ChatのUI（入力フォーム、ボタンなど）を直接操作できる。
- **DOM操作**: `document.querySelector`や`element.addEventListener`などの標準的なDOM APIを用いて、Google Chatの画面に返信支援ボタンの追加や、テキスト入力の自動化が可能。
- **ドキュメント**: [https://developer.chrome.com/docs/extensions/mv3/content_scripts/](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### 2.3. 既存事例

類似の返信支援・定型文挿入Chrome拡張機能は多数存在するが、Google Chatに特化した高機能なものは少ない。多くはGmailやその他のSNSを対象としており、Google Chatでの利用にはUIの構造に合わせたカスタマイズが必要となる。

## 3. 技術的実現可能性の検証

### 3.1. 実装方式

最も現実的な実装方式は、Content Scriptを用いてGoogle Chatのウェブインターフェース上に直接UI（例：返信候補ボタン）を構築し、ユーザーのアクションに応じて定義済みのテキストを入力フォームに挿入する方式である。

**アーキテクチャ概要:**
1.  **`manifest.json`**: 拡張機能の基本情報、権限、Content Scriptの読み込み設定を定義する。
2.  **Content Script (`content.js`)**: Google Chatのページが読み込まれた際に実行される。DOMを監視し、入力フォームがアクティブになったタイミングで返信支援UIを挿入する。
3.  **UI（HTML/CSS）**: 挿入するボタンやパネルのスタイルを定義する。
4.  **Background Script (`background.js`)**: (任意) より複雑なロジック（API連携、設定管理など）をバックグラウンドで処理する。

### 3.2. サンプルコード（概念実証）

以下に、Google Chatの入力フォームの隣に「定型文」ボタンを追加し、クリックするとテキストが挿入される簡単なContent Scriptの例を示す。

**`manifest.json`**
```json
{
  "manifest_version": 3,
  "name": "Google Chat Reply Helper",
  "version": "1.0",
  "description": "Assists in replying on Google Chat.",
  "permissions": ["activeTab", "scripting"],
  "content_scripts": [
    {
      "matches": ["https://chat.google.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ]
}
```

**`content.js`**
```javascript
// Google Chatの入力フォームを特定するためのセレクタ（実際のセレクタは変更される可能性あり）
const targetSelector = 'div.Am.Al.editable';

// DOMの変更を監視し、入力フォームが表示されたらボタンを挿入
const observer = new MutationObserver((mutations, obs) => {
  const targetElement = document.querySelector(targetSelector);
  if (targetElement && !document.getElementById('reply-helper-button')) {
    const button = document.createElement('button');
    button.id = 'reply-helper-button';
    button.textContent = '定型文';
    button.onclick = () => {
      const message = 'お疲れ様です。承知いたしました。';
      targetElement.textContent = message;
      // イベントを発火させて入力フォームに認識させる
      targetElement.dispatchEvent(new Event('input', { bubbles: true }));
    };
    targetElement.parentNode.insertBefore(button, targetElement.nextSibling);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

**`styles.css`**
```css
#reply-helper-button {
  margin-left: 8px;
  padding: 6px 12px;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  cursor: pointer;
}
```

このコードは、Google ChatのUI構造に依存するため、Google側のアップデートで動作しなくなる可能性がある。定期的なメンテナンスが必要となる。

## 4. 法的・規約的側面の調査

### 4.1. Google API利用規約

- **準拠**: APIを利用するアプリケーションは、適用されるすべての法律、規制、第三者の権利を遵守する必要がある。
- **ユーザーデータ**: 収集したユーザー情報の保護は開発者の責任であり、不正アクセスがあった場合は報告義務がある。
- **出典**: [https://developers.google.com/terms](https://developers.google.com/terms)

### 4.2. Google Chatプライバシーポリシー

- **データのプライバシー**: Google Chatで共有されるコンテンツは、ユーザーとチャット相手に限定される。Googleは広告目的でChatのコンテンツを使用しない。
- **暗号化**: データは転送中および保存時に暗号化されるが、エンドツーエンド暗号化ではないため、Googleはデータにアクセス可能。
- **出典**: [https://support.google.com/chat/answer/9343226](https://support.google.com/chat/answer/9343226)

### 4.3. 開発における注意点

- **透明性の確保**: ユーザーデータ（例：返信内容）を外部サーバーに送信する場合は、その目的と内容をプライバシーポリシーで明記し、ユーザーの同意を得る必要がある。
- **DOM操作のリスク**: UIの変更はGoogleの利用規約に抵触する可能性は低いが、ユーザー体験を損なう過度な改変や、広告の挿入などは避けるべきである。

## 5. 実装計画

### 5.1. 開発ロードマップ

- **フェーズ1: 基本機能開発 (MVP)** (約2週間)
    - Content Scriptによる定型文挿入ボタンの実装
    - ポップアップ画面での定型文リストの管理（追加・編集・削除）
- **フェーズ2: 機能拡張** (約3週間)
    - カテゴリ別での定型文管理
    - プレースホルダー機能（例：`{name}`さん）の実装
- **フェーズ3: API連携** (約4週間)
    - Google Chat APIを利用したチーム内での定型文共有機能
    - (オプション) AI（例：Gemini API）を利用した返信文案の自動生成

### 5.2. 工数見積もり

| タスク | 想定工数（人日） |
| :--- | :--- |
| **フェーズ1: MVP開発** | |
| 環境構築・プロジェクト設定 | 1 |
| UI（ボタン）挿入ロジック実装 | 3 |
| ポップアップでの定型文管理画面作成 | 4 |
| テスト・デバッグ | 2 |
| **小計** | **10** |
| **フェーズ2: 機能拡張** | |
| カテゴリ機能のデータ構造設計と実装 | 5 |
| プレースホルダー機能の実装 | 5 |
| UI/UX改善 | 3 |
| テスト・デバッグ | 2 |
| **小計** | **15** |
| **フェーズ3: API連携** | |
| Google API認証（OAuth）フロー実装 | 5 |
| 定型文共有機能のバックエンド・フロントエンド実装 | 8 |
| AI連携機能の調査・実装 | 5 |
| テスト・デバッグ | 2 |
| **小計** | **20** |
| **合計** | **45** |

※上記は1人日を8時間として計算。

## 6. 結論

Google Chat向けの返信支援Chrome拡張機能の開発は、**技術的に十分に実現可能**である。

- **実装**: 主にChrome拡張機能のContent Scriptを用いたDOM操作によって実現する。
- **リスク**: Google ChatのUI変更に追従するための継続的なメンテナンスが必要となる。
- **法的側面**: ユーザーデータの取り扱いに関する透明性を確保し、Googleの利用規約を遵守することが重要である。

まずはMVP（Minimum Viable Product）として、基本的な定型文挿入機能を開発し、ユーザーのフィードバックを得ながら段階的に機能を拡張していくアプローチを推奨する。

## 7. 参考資料

- **Google Chat API**: [https://developers.google.com/chat/api/reference/rest](https://developers.google.com/chat/api/reference/rest)
- **Chrome Extensions (Content Scripts)**: [https://developer.chrome.com/docs/extensions/mv3/content_scripts/](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- **Google API Terms of Service**: [https://developers.google.com/terms](https://developers.google.com/terms)
- **Google Privacy Policy**: [https://policies.google.com/privacy](https://policies.google.com/privacy)
