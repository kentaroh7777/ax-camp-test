# プロトタイプ実装

## 元の仕様書
doc/requirements.md

## プロトタイプ要求仕様
- 少なくとも Gmail＋1チャネル以上 を統合した MVP を目指してください。
  - Gmail, Discord, Lineがベター
- 返信案生成は 任意の LLM／API（OpenAI など）を利用して可。
- ワンクリック送信前に 編集モーダル を挟む UI を実装。
- コードは TypeScript + Manifest v3
- チャンネル間の同一ユーザー紐づけ管理
- 返信時UI
  - 返信チャンネルのメッセージとLLM生成の返信案を表示。返信案は編集可。
  - 他チャンネルの同一人物の最新メッセージもあれば表示

## 各チャンネルの調査結果
- Gmail: doc/research/results/gmail_investigation_report.md
- Discord: doc/research/results/discord_investigation_report.md
- Line: doc/research/results/line_investigation_report.md
- その他: doc/research/results/*.md



