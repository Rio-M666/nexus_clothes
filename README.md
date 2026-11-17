# 通販服試着

**「この服を買ったら、手持ちで何通り着られる？」**

元の着用写真と、服を合わせた試着イメージを見比べられるアプリです。

[公開デモ（GitHub Pages）](https://rio-m666.github.io/nexus_clothes/) では、「サンプル」で試着を体験し、「自分の写真」でローカルでのセットアップ手順を確認できます。この版の公開後に利用できます。サンプル画像は同梱されており、YouCamの利用枠は消費しません。

## Macで起動する

Node.js 20.19以上、または22.12以上の対応するLTS版を用意し、このリポジトリのディレクトリで実行します。

```sh
npm install
npm run dev
```

ターミナルに表示されるURL（通常は `http://localhost:5173/`）をブラウザで開きます。型チェックと本番ビルドは `npm run build` で実行できます。

## 自分の写真で試着する（ローカルのみ）

1. [YouCam APIキー管理画面](https://yce.makeupar.com/api-console/en/api-keys/)でAPIキーと利用枠を用意します。
2. プロジェクト直下の `.env.local` に `YOUCAM_API_KEY=取得したキー` を設定します。ファイルがない場合は `.env.example` をコピーしてください。キーに `VITE_` を付けたり、ソースやチャットに貼ったりしないでください。
3. `npm run dev` を再起動し、ターミナルに出たURLを開きます。「自分の写真」で写真試着を使えます。「サンプル」に切り替えると同じアプリでデモを体験できます。このMacで古いNode.jsが優先される場合は `PATH="/opt/homebrew/bin:$PATH" npm run dev` で起動できます。
4. 本人写真と服の写真、服の種類を選び、送信への同意にチェックして生成します。生成にはYouCamの利用枠を消費します。

JPEG/PNG、各10MB未満、512×384px以上・長辺4096px以下の画像を使用してください。ボトムス・全身の参考画像には着用写真を使用し、商品単体の写真はトップスで使用してください。

APIキーはViteのローカルサーバーだけで読み込み、アップロード・生成・10秒間隔の完了確認を仲介します。本人写真と生成結果はブラウザのメモリで扱い、アプリのディスクやlocalStorageには保存しません。送信した画像はPerfect Corp.のサービスで処理されます。生成結果のURLには有効期限があるため、必要な画像は手元に保存してください。

このAPIルートは `npm run dev` 専用です。`npm run build` の成果物やGitHub Pagesには含まれません。公開時は認証・利用制限を備えた別のバックエンドが必要です。

実APIを呼ばない通信処理のテストは `node --test server/youcam.test.mjs` で実行できます。[YouCam公式仕様](https://docs.perfectcorp.com/reference/ai_clothes)
