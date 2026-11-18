import { useEffect, useRef, useState } from 'react'
import ImagePicker from './ImagePicker'
import TryOnResult from './TryOnResult'
import { usePhotoUrl } from './usePhotoUrl'
import { apiResponse, createTask, RequestError, taskStatus, waitForPoll } from './tryOnApi'
import { categoryNames, type Category, type SavedLook, type WardrobeItem } from './savedLookStore'

type Trial = { person: File; name?: string } & (
  | { state: 'queued' | 'running' }
  | { state: 'success'; id: string; url: string }
  | { state: 'failed' | 'unknown'; message: string }
  | { state: 'paused'; id: string; message: string }
)
type Comparison = { id: string; garment: File; category: Category; trials: Trial[] }

function OwnedPhoto({ item }: { item: WardrobeItem }) {
  const preview = usePhotoUrl(item.photo)
  return <figure>
    <div className="image-preview">{preview && <img src={preview} alt={item.name + 'の着用写真'} />}</div>
    <figcaption>{item.name}</figcaption>
  </figure>
}

export default function PhotoTryOn({ savedIds, onSave, wardrobe, onOpenWardrobe }: {
  wardrobe: WardrobeItem[]
  onOpenWardrobe: () => void
  savedIds: string[]
  onSave: (look: SavedLook) => Promise<void>
}) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [configError, setConfigError] = useState(false)
  const [manualPhoto, setManualPhoto] = useState<File | null>(null)
  const [selection, setSelection] = useState<string[]>([])
  const selected = selection.flatMap((id) => wardrobe.filter((item) => item.id === id))
  const first = selected[0]
  const [garment, setGarment] = useState<File | null>(null)
  const [category, setCategory] = useState<Category>('upper_body')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    fetch('/api/try-on/config', { signal: abort.signal })
      .then(apiResponse)
      .then((data) => setConfigured(data.configured === true))
      .catch(() => { if (!abort.signal.aborted) setConfigError(true) })
    return () => { abort.abort(); controller.current?.abort() }
  }, [])

  useEffect(() => {
    setConsent(false)
    setSelection((ids) => ids.filter((id) => wardrobe.some((item) => item.id === id)))
  }, [wardrobe])

  const comparisonId = comparison?.id
  useEffect(() => {
    if (comparisonId) resultHeading.current?.focus()
  }, [comparisonId])

  function toggle(item: WardrobeItem) {
    if (selection.includes(item.id)) setSelection(selection.filter((id) => id !== item.id))
    else if (selected.length < 3) setSelection([...selection, item.id])
    setConsent(false)
  }

  async function run(batch: Comparison, indices: number[]) {
    if (controller.current || !configured) return
    const abort = new AbortController()
    controller.current = abort
    setBusy(true)
    setComparison(batch)

    function update(index: number, trial: Trial) {
      setComparison((current) => current?.id === batch.id
        ? { ...current, trials: current.trials.map((item, i) => i === index ? trial : item) }
        : current)
    }

    try {
      for (const index of indices) {
        const original = batch.trials[index]
        const source = { person: original.person, name: original.name }
        let id = original.state === 'paused' ? original.id : undefined
        const timeout = AbortSignal.any([abort.signal, AbortSignal.timeout(5 * 60_000)])
        update(index, { ...source, state: 'running' })
        try {
          if (!id) {
            setProgress('写真を送信しています…')
            id = await createTask(source.person, batch.garment, batch.category, timeout)
            setProgress('試着画像を生成しています…')
            await waitForPoll(timeout)
          }
          for (;;) {
            setProgress('結果を確認しています…')
            const status = await taskStatus(id, timeout)
            if (status.state !== 'running') {
              update(index, status.state === 'success' ? { ...source, ...status, id } : { ...source, ...status })
              break
            }
            setProgress('試着画像を生成しています…')
            await waitForPoll(timeout)
          }
        } catch (cause) {
          if (abort.signal.aborted) return
          const message = cause instanceof Error ? cause.message : '画像を生成できませんでした。'
          if (id) {
            if (cause instanceof RequestError && cause.status === 404) {
              update(index, { ...source, state: 'failed', message })
              continue
            }
            update(index, { ...source, state: 'paused', id, message: '結果を確認できませんでした。「結果を再確認」で同じ生成を確認できます。' })
            return
          }
          if (cause instanceof RequestError && [400, 413, 429, 503].includes(cause.status)) {
            update(index, { ...source, state: 'failed', message })
            if (cause.status === 400 || cause.status === 413) continue
            return
          }
          update(index, {
            ...source, state: 'unknown',
            message: cause instanceof RequestError && cause.status === 409 ? message
              : '生成の受付を確認できませんでした。利用履歴を確認してから新しく試着してください。',
          })
          return
        }
      }
    } finally {
      controller.current = null
      setBusy(false)
      setProgress('')
    }
  }

  function start() {
    if (!garment || !consent || (!first && !manualPhoto)) return
    const trials: Trial[] = first
      ? selected.map(({ photo, name }) => ({ person: photo, name, state: 'queued' }))
      : manualPhoto ? [{ person: manualPhoto, state: 'queued' }] : []
    void run({ id: crypto.randomUUID(), garment, category, trials }, trials.map((_, index) => index))
  }

  const trials = comparison?.trials ?? []
  const multiple = trials.length > 1
  const interrupted = trials.findIndex((trial) => trial.state === 'paused')
  const unknown = trials.some((trial) => trial.state === 'unknown')
  const queued = trials.flatMap((trial, index) => trial.state === 'queued' ? [index] : [])
  const successful = trials.filter((trial) => trial.state === 'success')
  const savedCount = successful.filter(({ id }) => savedIds.includes(id)).length
  const pickCount = first ? selected.length : manualPhoto ? 1 : 0

  return <section>
    <div className="intro"><p>手持ちの洋服を選ぶか、着用写真を直接選びます。</p></div>
    {configured === false && <p className="api-notice" role="status">YouCamのAPIキーが未設定です。プロジェクトの <code>.env.local</code> に <code>YOUCAM_API_KEY</code> を設定し、<code>npm run dev</code> を再起動してください。</p>}
    {configError && <p className="api-notice" role="alert">画像生成サービスに接続できません。Macで <code>npm run dev</code> を起動し、ターミナルに表示されたURLを開いてください。</p>}
    <form className="tryon-form" onSubmit={(event) => { event.preventDefault(); start() }}>
      <fieldset disabled={busy || interrupted >= 0}>
        <legend>写真を選ぶ</legend>
        <p className="hint">JPEG・PNG／各10MB未満／512×384px以上・長辺4096px以下</p>
        <div className="person-source">
          {wardrobe.length > 0 ? <fieldset className="wardrobe-options">
            <legend>手持ちの洋服</legend>
            <p className="hint">登録写真を最大3枚選べます。選ばない場合は写真を直接指定します。</p>
            <div className="wardrobe-choice-grid">
              {wardrobe.map((item) => {
                const checked = selection.includes(item.id)
                return <label key={item.id}>
                  <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 3} onChange={() => toggle(item)} />
                  {item.name}
                </label>
              })}
            </div>
          </fieldset> : <button type="button" className="secondary bottom-shortcut" onClick={onOpenWardrobe}>手持ちの洋服を登録</button>}
        </div>
        <label className="category-picker">着せ替える部位
          <select value={category} onChange={(event) => {
            setCategory(event.currentTarget.value as Category)
            setGarment(null)
            setConsent(false)
          }}>
            {Object.entries(categoryNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="upload-grid">
          {first ? <div><strong>元の着用写真</strong><div className="selected-photos">{selected.map((item) => <OwnedPhoto key={item.id} item={item} />)}</div></div>
            : <ImagePicker label="あなたの全身写真" file={manualPhoto} disabled={busy} onChange={(file) => { setManualPhoto(file); setConsent(false) }} />}
          <ImagePicker key={category} label={'試着したい' + categoryNames[category]} file={garment} disabled={busy} onChange={(file) => { setGarment(file); setConsent(false) }} />
        </div>
        <p className="photo-hint">顔と試着する部位がはっきり写った写真を使ってください。試したい服がボトムスや全身のコーデの場合は、その服を着た人物の写真を選んでください。トップスは商品単体の写真も使えます。</p>
        <label className="photo-consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.currentTarget.checked)} />
          <span>着用写真と試したい服の画像をPerfect Corp.へ送信することに同意します。選んだ服1着につき1回生成し、利用枠を消費します。</span>
        </label>
      </fieldset>
      <button className="primary" disabled={busy || interrupted >= 0 || !configured || !pickCount || !garment || !consent} type="submit">
        {busy ? '生成中…' : pickCount > 1 ? pickCount + '着を試着する' : 'この服を試着する'}
      </button>
    </form>
    {comparison && <section className="generated-result">
      <h2 ref={resultHeading} tabIndex={-1}>{multiple ? '試着結果を比較' : successful.length ? '試着画像ができました' : '試着結果'}</h2>
      {multiple && <p role="status">比較したコーデ {successful.length}件 ／ 保存したコーデ {savedCount}件</p>}
      <div className={multiple ? 'trial-grid' : undefined}>
        {trials.map((trial, index) => <article key={comparison.id + ':' + index} className="trial-card">
          {trial.name && <h3>{trial.name}</h3>}
          {trial.state === 'queued' && <p className="hint">{unknown ? '生成を開始していません' : '生成待ち'}</p>}
          {trial.state === 'running' && <p role="status" className="generation-status">{progress || '生成を準備しています…'}</p>}
          {trial.state === 'success' && <TryOnResult key={trial.id} id={trial.id} url={trial.url} original={trial.person} name={trial.name} category={comparison.category} compareOriginal={!multiple} saved={savedIds.includes(trial.id)} onSave={onSave} />}
          {'message' in trial && <p role="alert" className="form-error">{trial.message}</p>}
          {trial.state === 'paused' && <button type="button" className="secondary" disabled={busy} onClick={() => void run(comparison, [index, ...queued])}>結果を再確認</button>}
          {trial.state === 'failed' && <button type="button" className="secondary" disabled={busy || interrupted >= 0 || unknown} onClick={() => void run(comparison, [index])}>この組み合わせを再試行</button>}
        </article>)}
      </div>
      {!busy && interrupted < 0 && !unknown && queued.length > 0 && <button type="button" className="secondary" onClick={() => void run(comparison, queued)}>残り{queued.length}着を生成</button>}
      {successful.length > 0 && <p className="photo-hint">画像のURLには有効期限があります。気に入った画像は保存してください。着用感やサイズの正確さを保証するものではありません。</p>}
    </section>}
  </section>
}
