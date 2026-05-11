# FlowAI 🤖

> チームの作業動線をAIがリアルタイムに最適化するWebアプリ

## 🔗 デモ
**[https://flow-ai-eta.vercel.app](https://flow-ai-eta.vercel.app)**

## 📌 概要
カフェ・飲食店などの現場で発生する複数のタスクを、AIが最適なスタッフに自動割り当てする意思決定支援ツールです。

## 🎯 解決する課題
- タスクの割り当てがマネージャーの経験と勘に依存している
- 混雑・遅延・欠員時の対応判断が遅れる
- スタッフのスキルと稼働状況を考慮した最適配分が難しい

## ✨ 主な機能
- **AI最適化提案** - Claude APIがスタッフのスキルと状況を分析し最適配分を提案
- **承認/却下UI** - AIの提案を人間が確認してから適用する安全設計
- **リアルタイム管理** - タスクとスタッフの状態をリアルタイムに管理
- **提案履歴** - 過去のAI提案と承認/却下の履歴を記録

## 🛠 技術スタック
| カテゴリ | 技術 |
|---|---|
| フロントエンド | Next.js 14 / TypeScript / Tailwind CSS |
| 状態管理 | Zustand |
| AI | Claude API (Anthropic) |
| デプロイ | Vercel |

## 🧠 AIの仕組み
1. スタッフのスキル・稼働状況・タスクの優先度をテキスト化
2. Claude APIにプロンプトとして送信
3. 最適な配分をJSON形式で受け取る
4. 人間が承認した場合のみ画面に反映

## 🚀 ローカル環境での起動
```bash
git clone https://github.com/Daiche-0624/flow-ai.git
cd flow-ai
npm install
```

`.env.local` を作成してAPIキーを設定：
```
ANTHROPIC_API_KEY=your_api_key
```

```bash
npm run dev
```

## 👤 作者
Daiche-0624

