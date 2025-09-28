# openroutes
ハイキング、自転車、散歩などのウェルネスにおすすめのルートは、誰でも無料で利用できるべきです。

[![日本語](https://img.shields.io/badge/lang-日本語-green.svg)](./README.md)
[![中文](https://img.shields.io/badge/lang-中文-red.svg)](./README_ZH.md)

[デモサイト](https://yougikou.github.io/openroutes/)

### 開発目的
自然と接することが好きで、このようなポジティブ、健康的な趣味のため、いろんな安全かつ質が高いルート情報が必要です。いろんなサービスを見てきたが、有料であることがなかなか気が済まなくて．．．

情報がハイキングユーザから集めるなら、すべてタダにするべき。

### 「すべてタダ！」を目指して
- できるだけ無料サービスでサーバレスのサービスを構築（Githubをメイン）
- なるべくシンプルに機能を維持、簡単に技術アップグレード
- ハイキング、ワーキング、サイクリングのルート情報を簡単に検索、共有できるように
- 使う人がいなくても、自分のルート記録として利用

### デモサイトリリース機能
1. Routeの作成（共有画面）<br>
  アップロードされたファイル、写真はプライバシー的に問題がないものと合意された前提で、<br>
  サーバレスのため、写真はimgurを利用、Geojsonは一時的にFile.ioに保存後、assetsブランチに管理される（大事だから）<br>
  注意：写真が万が一失効する場合、標準の山画像に統一表示しようと考えています。
2. Route一覧の表示（探す画面）<br>
  更新順に10件ずつロードする<br>
  Geojsonが統一保存ファイルで、変換してGPX/KMLをダウンロード可能<br>
  注意：但し、一度変換のため、元のGPX/KMLと比べ情報欠落可能性がある
3. GitHubトークン設定<br>
  GitHubで `public_repo` 権限を含むパーソナルアクセストークンを作成し、設定画面で貼り付ける方式に変更しました。<br>
  トークンを設定しない場合はRoute作成ができず、探索時のGitHub API制限は500/hのままです。<br>
  トークンを保存するとリクエスト制限が5000/hになり、Route作成が可能になります。保存済みの場合、右上のGitHubアイコンが緑色になります。

### TODO
- 探す画面
  - ルートの検索
- 共有画面
  - 入力チェック
  - 日付、距離、高度、経過時間のGPX,KML解析自動取得
- 言語の切り替え改善
- 継続コードのリファクタ（Typescriptへの書き換え．．．）
- Open Mapサービスを利用して、ルートの地図描画するなど．．．

## GitHub OAuth & Issues Integration

This repository now ships with a reusable GitHub authentication layer that supports both Authorization Code and Device Flow, secure token persistence, and a typed API client for working with repositories and issues.

### 1. Create a GitHub OAuth App

1. Visit [GitHub Developer Settings](https://github.com/settings/developers) and create a new **OAuth App**.
2. Set the callback URL to match your deployment. For local testing you can use `http://localhost:3000/api/auth/github/callback`.
3. Copy the generated **Client ID** and **Client Secret**.

Populate a `.env` file based on `.env.example`:

```
GITHUB_CLIENT_ID=<client-id>
GITHUB_CLIENT_SECRET=<client-secret>
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback
GITHUB_DEFAULT_SCOPES=read:user,user:email,public_repo,repo:status
TEST_OWNER=<repo-owner>
TEST_REPO=<repo-name>
```

Set `GITHUB_ALLOW_PRIVATE_REPO=true` when you need full private-repository access (adds the `repo` scope automatically).

### 2. CLI Smoke Tests

The TypeScript CLI (`src/cli/index.ts`) orchestrates the complete device-flow experience and offers health checks:

```bash
npm run auth:start     # 自动选择授权方式 (设备码优先)
npm run auth:whoami    # 查看当前账号与 scope
npm run test:repo      # 在 TEST_OWNER/TEST_REPO 上跑通 Issue 全流程
npm run auth:revoke    # 撤销并清理本地凭证
```

During CI you can skip interactive auth by injecting `GITHUB_TEST_TOKEN` (optionally with `GITHUB_TEST_LOGIN`, `GITHUB_TEST_USER_ID`, `GITHUB_TEST_SCOPES`).

### 3. Programmatic Usage

```ts
import { GitHubOAuth, createGitHubClient, createSecureStorage } from './src/github';

const storage = createSecureStorage();
const oauth = new GitHubOAuth({ storage });
const client = createGitHubClient({ storage });

// Start auth (web uses Authorization Code; Node/CLI falls back to Device Flow)
const start = await oauth.startAuthorization();

// After completing auth, call the GitHub Issues APIs
await client.createIssue('owner', 'repo', { title: 'New issue', body: '内容' });
```

### 4. Testing

Run unit tests and optional integration checks with Jest:

```bash
npm run test:unit
npm run test:integration   # requires GITHUB_TEST_TOKEN
```

The OAuth state machine, storage layer, retry/error handling, and repository access checks are all validated automatically.

### 5. Personal Access Token fallback (optional)

If you prefer using a fine-grained PAT, paste the token into `.env` as `GITHUB_TEST_TOKEN` and run `npm run auth:whoami`. The same storage, health checks, and revoke commands apply.