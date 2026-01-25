# openroutes
ハイキング、自転車、散歩などのウェルネスにおすすめのルートは、誰でも無料で利用できるべきです。

[![日本語](https://img.shields.io/badge/lang-日本語-green.svg)](./README.md)
[![English](https://img.shields.io/badge/lang-English-blue.svg)](./README_EN.md)
[![中文](https://img.shields.io/badge/lang-中文-red.svg)](./README_ZH.md)

[デモサイト](https://yougikou.github.io/openroutes/)

## プロジェクト概要
OpenRoutesは、React Native (Expo) で構築された、サーバーレスのルート共有プラットフォームです。
バックエンドとして **GitHub Issues** をデータベースとして利用し、完全無料で運用可能なエコシステムを目指しています。

### アーキテクチャ
-   **フロントエンド:** React Native / Expo (Web, iOS, Android対応)
-   **データベース:** GitHub Issues (メタデータ, 説明, コメント)
-   **認証:** GitHub OAuth
-   **ストレージ (現状):**
    -   画像: Imgur API
    -   GeoJSON (ルートデータ): File.io (※一時保存のため、永続化が課題)

## 機能
1.  **ルート一覧 (Explore)**
    -   GitHub Issuesからルート情報を取得し、リスト表示します。
    -   GPX / KML 形式でのダウンロードが可能です。
    -   キーワード検索機能。
2.  **ルート共有 (Share)**
    -   GPX / KML ファイルをアップロードし、距離・所要時間・日付を自動解析します。
    -   写真を添付し、ルートの説明を追加して投稿できます。
    -   ※ 投稿にはGitHub認証が必要です。
3.  **認証 (Auth)**
    -   GitHubアカウントを使用してログインします。
    -   ログインすることでルート作成が可能になり、APIレート制限が緩和されます。

## 開発環境のセットアップ

### 前提条件
-   Node.js (v22以上推奨)
-   npm

### インストール
```bash
npm install
```

### 実行
```bash
# Webで起動
npm run web

# iOS / Android (Expo Goが必要)
npm run ios
npm run android
```

## 現状の課題とロードマップ
-   **データ永続性:** 現在GeoJSONは一時的なストレージ(File.io)に保存されているため、リンク切れのリスクがあります。GitHubリポジトリへの直接コミット等への移行を検討中です。
-   **詳細画面:** ルートの詳細地図表示機能が未実装です。
-   **検索機能:** フィルタリング機能のUI実装が必要です。

---
### 開発目的
自然と接することが好きで、このようなポジティブ、健康的な趣味のため、いろんな安全かつ質が高いルート情報が必要です。いろんなサービスを見てきたが、有料であることがなかなか気が済まなくて．．．
情報がハイキングユーザから集めるなら、すべてタダにするべき。
