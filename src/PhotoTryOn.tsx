import { useEffect, useRef, useState } from 'react'

type Category = 'upper_body' | 'lower_body' | 'full_body'

class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function apiResponse(response: Response) {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new RequestError(data?.error || '画像生成に接続できませんでした。時間を置いてお試しください。', response.status)
  if (!data || typeof data !== 'object') throw new Error('画像生成を利用できません。サンプルでお試しください。')
  return data
}

function ImagePicker({ label, file, disabled, onChange }: {
  label: string
  file: File | null
  disabled: boolean
  onChange: (file: File | null) => void
}) {
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const selection = useRef(0)

  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return <label className="image-picker">
    <span>{label}</span>
    {preview && <img src={preview} alt={`${label}のプレビュー`} />}
    <input type="file" accept="image/jpeg,image/png" disabled={disabled} onChange={async (event) => {
      const input = event.currentTarget
      const next = input.files?.[0]
      const current = ++selection.current
      setError('')
      onChange(null)
      if (!next) return
      try {
        if (!['image/jpeg', 'image/png'].includes(next.type) || !next.size || next.size >= 10_000_000) {
          throw new Error('10MB未満のJPEGまたはPNGを選択してください。')
        }
        const image = await createImageBitmap(next)
        const long = Math.max(image.width, image.height)
        const short = Math.min(image.width, image.height)
        image.close()
        if (long > 4096 || long < 512 || short < 384) {
          throw new Error('512×384px以上、長辺4096px以下の写真を選択してください。')
        }
        if (current === selection.current) onChange(next)
      } catch (cause) {
        if (current !== selection.current) return
        input.value = ''
        setError(cause instanceof Error && !(cause instanceof DOMException) ? cause.message : '写真を読み込めませんでした。別の写真をお試しください。')
      }
    }} />
    {error && <span className="form-error" role="alert">{error}</span>}
  </label>
}

export default function PhotoTryOn({ active }: { active: boolean }) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [person, setPerson] = useState<File | null>(null)
  const [garment, setGarment] = useState<File | null>(null)
  const [category, setCategory] = useState<Category>('upper_body')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [pendingTask, setPendingTask] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const abort = new AbortController()
    fetch('/api/try-on/config', { signal: abort.signal })
      .then(apiResponse)
      .then((data) => setConfigured(data.configured === true))
      .catch(() => { if (!abort.signal.aborted) setConfigured(false) })
    return () => { abort.abort(); controller.current?.abort() }
  }, [])

  useEffect(() => { if (active) heading.current?.focus({ preventScroll: true }) }, [active])

  async function generate() {
    if ((!pendingTask && (!person || !garment || !consent)) || !configured || controller.current) return
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 5 * 60_000)
    setBusy(true)
    setError('')
    setResult('')
    setProgress(pendingTask ? '結果を確認しています…' : '写真を送信しています…')
    let taskId = pendingTask
    try {
      if (!taskId) {
        const form = new FormData()
        form.set('person', person!)
        form.set('garment', garment!)
        form.set('category', category)
        const task = await fetch('/api/try-on', { method: 'POST', body: form, signal: abort.signal }).then(apiResponse)
        if (typeof task.taskId !== 'string' || !task.taskId) throw new Error('生成を開始できませんでした。')
        taskId = task.taskId as string
        setPendingTask(taskId)
      }
      setProgress('試着画像を生成しています。このままお待ちください…')
      while (!abort.signal.aborted) {
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => { window.clearTimeout(timer); reject(new Error('timeout')) }
          const timer = window.setTimeout(() => {
            abort.signal.removeEventListener('abort', onAbort)
            resolve()
          }, 10_000)
          abort.signal.addEventListener('abort', onAbort, { once: true })
          if (abort.signal.aborted) onAbort()
        })
        const status = await fetch(`/api/try-on/tasks/${encodeURIComponent(taskId)}`, { signal: abort.signal }).then(apiResponse)
        if (status.status === 'error') {
          setPendingTask(null)
          throw new Error(status.error || '画像を生成できませんでした。')
        }
        if (status.status === 'success') {
          const imageUrl = new URL(status.imageUrl)
          if (imageUrl.protocol !== 'https:') throw new Error('画像を取得できませんでした。')
          setResult(imageUrl.href)
          setPendingTask(null)
          requestAnimationFrame(() => { if (active) resultHeading.current?.focus() })
          return
        }
      }
    } catch (cause) {
      if (cause instanceof RequestError && cause.status === 404) setPendingTask(null)
      setError(abort.signal.aborted
        ? taskId
          ? '確認に時間がかかっています。生成は続いている場合があります。「結果を再確認」で同じ画像の結果を確認できます。'
          : '送信結果を確認できませんでした。生成が始まっている可能性があるため、すぐに再実行せず時間を置いてください。'
        : cause instanceof Error ? cause.message : '画像を生成できませんでした。')
    } finally {
      window.clearTimeout(timeout)
      controller.current = null
      setBusy(false)
      setProgress('')
    }
  }

  return <section hidden={!active}>
    <div className="intro">
      <p className="eyebrow">あなたの写真で試着</p>
      <h1 ref={heading} tabIndex={-1}>気になる服を、着てみよう。</h1>
      <p>正面を向いて1人で立った写真と、試したい服の写真を選びます。</p>
    </div>
    {configured === false && <p className="api-notice" role="status">現在、写真での画像生成は利用できません。「組み合わせ」からサンプルを体験できます。</p>}
    <form className="tryon-form" onSubmit={(event) => { event.preventDefault(); void generate() }}>
      <fieldset disabled={busy || Boolean(pendingTask)}>
        <legend>写真を選ぶ</legend>
        <p className="hint">JPEG・PNG／各10MB未満／512×384px以上・長辺4096px以下</p>
        <div className="upload-grid">
          <ImagePicker label="あなたの写真" file={person} disabled={busy} onChange={setPerson} />
          <ImagePicker label="試したい服の写真" file={garment} disabled={busy} onChange={setGarment} />
        </div>
        <label className="category-picker">服の種類
          <select value={category} onChange={(event) => setCategory(event.currentTarget.value as Category)}>
            <option value="upper_body">トップス</option>
            <option value="lower_body">ボトムス</option>
            <option value="full_body">全身のコーデ</option>
          </select>
        </label>
        <p className="photo-hint">顔と試着する部位がはっきり写った写真を使ってください。ボトムス・全身のコーデの参考には、服を着た人物の写真を選んでください。トップスは商品単体の写真も使えます。</p>
        <label className="photo-consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.currentTarget.checked)} />
          <span>選んだ2枚の写真をPerfect Corp.へ送信して生成することに同意します。生成には利用枠を消費します。</span>
        </label>
      </fieldset>
      <button className="primary" disabled={busy || !configured || (!pendingTask && (!person || !garment || !consent))} type="submit">{busy ? '生成中…' : pendingTask ? '結果を再確認' : 'この服を試着する'}</button>
      {progress && <p className="generation-status" role="status" aria-live="polite">{progress}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
    {result && <section className="generated-result">
      <h2 ref={resultHeading} tabIndex={-1}>試着画像ができました</h2>
      <img src={result} alt="選択した服を着たAI生成の試着イメージ" referrerPolicy="no-referrer" onError={() => setError('生成画像を表示できません。画像の有効期限が切れている可能性があります。')} />
      <a className="secondary" href={result} target="_blank" rel="noopener noreferrer">画像を開いて保存 ↗</a>
      <p className="photo-hint">画像のURLには有効期限があります。気に入った画像は保存してください。着用感やサイズの正確さを保証するものではありません。</p>
    </section>}
  </section>
}
