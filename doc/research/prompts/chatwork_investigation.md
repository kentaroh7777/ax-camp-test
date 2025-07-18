# Chatwork Chrome拡張機能 返信支援システム調査

## 指示

あなたは、Chatwork向けのChrome拡張機能による返信支援システムの実装可能性を調査する専門エージェントです。

**重要：必ず以下の出力ファイルを作成してください**
- 出力ファイル: `doc/research/results/chatwork_investigation_report.md`
- 言語: 日本語
- 形式: 詳細な技術報告書
- 出典: 全ての情報に対して具体的なURLリンクを明記

## 調査項目

### 1. 基本情報収集
- Chatwork API の最新仕様と機能
- Chrome拡張機能からのChatwork API利用方法
- 既存の類似実装事例とソースコード分析
- 公式SDKとライブラリの可用性

### 2. 技術的実現可能性分析
- **受信メッセージ取得**: API経由でのメッセージ受信確認方法
- **送信操作実行**: API経由でのメッセージ送信方法
- **認証・認可フロー**: OAuth 2.0実装の詳細手順
- **Rate Limiting**: APIレート制限の詳細と対策
- **Content Security Policy**: CSP制約と回避方法

### 3. 法的・規約的制約調査
- Chatwork API利用規約の詳細分析
- 自動化に関する制限事項
- 商用利用時の追加制約
- プライバシー・セキュリティ要件

### 4. 実装ガイダンス作成
- 推奨実装アーキテクチャ
- 技術スタック選定理由
- 開発工数見積もり（根拠付き）
- 実装時の注意点とベストプラクティス

### 5. 代替案・回避策
- API制約時の対応方法
- 技術的制約の回避策
- 長期的な保守性を考慮した設計

## 出力要件

**必須作成ファイル**: `doc/research/results/chatwork_investigation_report.md`

以下の構造で詳細な日本語レポートを作成してください：

```markdown
# Chatwork Chrome拡張機能 返信支援システム調査報告書

## 調査概要
- 調査日時: [日付]
- 調査者: AIエージェント
- 対象: Chatwork API + Chrome拡張機能

## 実現可能性判定
- **総合評価**: [可能/困難/不可能]
- **推奨度**: [A/B/C/D]
- **実装優先度**: [高/中/低]

## 技術的詳細
### 受信メッセージ取得
- **推奨方法**: [具体的な実装方法]
- **難易度**: [1-5]
- **制約事項**: [詳細な制約]
- **実装例**: [コード例]

### 送信操作実行
- **推奨方法**: [具体的な実装方法]
- **難易度**: [1-5]
- **制約事項**: [詳細な制約]
- **実装例**: [コード例]

### 認証・認可フロー
- **認証方式**: [OAuth 2.0詳細]
- **実装手順**: [ステップバイステップ]
- **セキュリティ要件**: [詳細要件]

## 法的・規約的制約
- **利用規約**: [詳細分析]
- **自動化制限**: [制限事項]
- **リスク評価**: [リスク分析]

## 実装推奨事項
- **実装パターン**: [推奨アーキテクチャ]
- **技術スタック**: [選定理由付き]
- **開発工数見積**: [詳細見積もり]

## 代替案・回避策
- **制約回避方法**: [具体的な方法]
- **技術的代替案**: [代替実装]
- **長期的戦略**: [保守性考慮]

## 結論・推奨事項
- **実装可否**: [最終判断]
- **推奨順序**: [実装ステップ]
- **注意事項**: [重要な注意点]

## 参考資料・出典
- [URL1]: [説明]
- [URL2]: [説明]
- [URL3]: [説明]
...
```

## 調査実行指示

1. **情報収集**: 最新のChatwork API仕様、Chrome拡張機能開発ガイド、既存事例を詳細に調査
2. **技術検証**: 実装可能性を具体的なコード例と共に分析
3. **法的調査**: 利用規約、プライバシーポリシーを詳細に分析
4. **実装計画**: 具体的な実装手順と工数見積もりを作成
5. **ファイル出力**: 必ず `doc/research/results/chatwork_investigation_report.md` に詳細レポートを日本語で作成

**重要**: 調査結果は必ず指定されたファイルに保存し、全ての情報に対して具体的な出典URLを明記してください。 