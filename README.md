# freee 経営ナビ

freeeのデータから**財務診断・新規事業提案・価格設計**をAIが支援するWebアプリです。

## スクリーンショット

- **財務診断**: PL・BSを自動分析。費用構造・赤字リスクを可視化
- **新規事業提案**: freeeのデータから会社の強みを読み取り、具体的な事業を提案
- **価格設計シミュレーター**: 原価と目標利益率から最適な単価を計算

---

## セットアップ手順

### 1. freee APIアプリの登録

1. [freeeデベロッパーコンソール](https://developer.freee.co.jp) にアクセス
2. 「アプリ登録」から新規アプリを作成
3. コールバックURLに以下を追加：
   - 開発環境: `http://localhost:3000/api/auth/freee`
   - 本番環境: `https://your-domain.com/api/auth/freee`
4. **クライアントID** と **クライアントシークレット** を控える

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```env
FREEE_CLIENT_ID=取得したクライアントID
FREEE_CLIENT_SECRET=取得したクライアントシークレット
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### 3. 依存パッケージのインストール・起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開き、freeeアカウントでログイン。

---

## デプロイ（Vercel）

```bash
npm install -g vercel
vercel deploy
```

Vercelのダッシュボードで環境変数を設定し、`NEXTAUTH_URL` を本番URLに変更してください。

---

## ファイル構成

```
src/
├── app/
│   ├── page.tsx               # トップページ（ログイン）
│   ├── dashboard/
│   │   └── page.tsx           # メインダッシュボード
│   └── api/
│       ├── auth/freee/        # OAuth認証フロー
│       └── freee/             # PLデータ取得・分析API
└── lib/
    └── freee.ts               # freee APIクライアント + 分析ロジック
```

---

## 注意事項

- freee APIの**一般公開**には freee の審査が必要です（社内利用は不要）
- アクセストークンはcookieに保存しています。本番環境ではDBへの保存を推奨
- 本アプリはfreee公式アプリではありません

## 技術スタック

- [Next.js 14](https://nextjs.org) (App Router)
- [Recharts](https://recharts.org) (グラフ)
- [freee会計API](https://developer.freee.co.jp/docs/accounting)
