export default function TryOnSetupGuide() {
  return (
    <section className="setup-guide" aria-labelledby="setup-heading">
      <h2 id="setup-heading">自分の写真で試す方法（YouCam API）</h2>
      <p>Macにアプリを用意して、自分のYouCamアカウントで試着画像を生成できます。生成には、そのアカウントの利用枠を使います。</p>
      <ol>
        <li>
          <strong>アプリを用意する</strong>
          <p>Node.js 22.12以上とGitを用意し、Macのターミナルで次のコマンドを順に実行します。すでにクローン済みなら、そのフォルダで <code>npm install</code> を実行します。</p>
          <pre><code>{`git clone --branch dev https://github.com/Rio-M666/nexus_clothes.git
cd nexus_clothes
npm install`}</code></pre>
        </li>
        <li>
          <strong>YouCamのAPIキーを設定する</strong>
          <p><a href="https://yce.makeupar.com/api-console/en/api-keys/">YouCamのAPIキー管理画面</a>でキーを取得し、利用枠を確認します。プロジェクトの <code>.env.local</code> を開きます。</p>
          <pre><code>nano .env.local</code></pre>
          <p>次の1行を入力し、<code>=</code> の右側を取得したキーに置き換えます。保存は <kbd>Ctrl+O</kbd> → <kbd>Enter</kbd>、終了は <kbd>Ctrl+X</kbd> です。キーはMacのこの設定ファイルに入れてください。</p>
          <pre><code>YOUCAM_API_KEY=取得したキー</code></pre>
        </li>
        <li>
          <strong>アプリを開いて試着する</strong>
          <pre><code>npm run dev</code></pre>
          <p>ターミナルの <code>Local:</code> に表示されたURLをブラウザで開きます。本人の正面写真と試したい服の画像を選び、服の種類と写真の送信先を確認してから「この服を試着する」を押します。起動済みの場合は <kbd>Ctrl+C</kbd> で止めて再起動します。</p>
        </li>
      </ol>
      <p><a href="https://github.com/Rio-M666/nexus_clothes/tree/dev#自分の写真で試着するローカルのみ">GitHubの詳しい起動手順</a></p>
    </section>
  )
}
