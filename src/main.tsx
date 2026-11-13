import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const bottoms = [
  { id: 'denim', name: 'デニム' },
  { id: 'slacks', name: '黒スラックス' },
  { id: 'chinos', name: 'ベージュチノ' },
] as const

type Bottom = typeof bottoms[number]
type BottomId = Bottom['id']
type View = 'select' | 'compare' | 'saved'
const storageKey = 'nexus-clothes:saved:v1'

function readSaved(): BottomId[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(value) ? bottoms.filter(({ id }) => value.includes(id)).map(({ id }) => id) : []
  } catch {
    return []
  }
}

function App() {
  const [view, setView] = useState<View>('select')
  const [selected, setSelected] = useState<BottomId[]>(bottoms.map(({ id }) => id))
  const [results, setResults] = useState<BottomId[]>([])
  const [saved, setSaved] = useState(readSaved)
  const [storageError, setStorageError] = useState(false)
  const [enlarged, setEnlarged] = useState<Bottom | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  function navigate(next: View) {
    setView(next)
    window.scrollTo(0, 0)
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }))
  }

  function toggleSaved(id: BottomId) {
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id]
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setSaved(next)
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  function card(bottom: Bottom) {
    const name = `白シャツ × ${bottom.name}`
    const isSaved = saved.includes(bottom.id)
    return (
      <article className="look" key={bottom.id}>
        <button className="photo-button" aria-label={`${name}の画像を拡大`} onClick={() => {
          setEnlarged(bottom)
          dialog.current?.showModal()
        }}>
          <img src={`/images/look-${bottom.id}.jpg`} alt={name} />
          <span className="expand" aria-hidden="true">↗</span>
        </button>
        <div className="look-caption">
          <h2>{bottom.name}</h2>
          <button className="save" aria-label={`${bottom.name}のコーデを保存`} aria-pressed={isSaved} onClick={() => toggleSaved(bottom.id)}>
            <span aria-hidden="true">{isSaved ? '♥' : '♡'}</span> {isSaved ? '保存済み' : '保存'}
          </button>
        </div>
      </article>
    )
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <button className="brand" onClick={() => navigate('select')}><span aria-hidden="true" className="brand-icon">◇</span> 通販服試着</button>
          <nav aria-label="画面">
            <button aria-current={view === 'select' ? 'page' : undefined} onClick={() => navigate('select')}>組み合わせ</button>
            {results.length > 0 && <button aria-current={view === 'compare' ? 'page' : undefined} onClick={() => navigate('compare')}>比較結果</button>}
            <button aria-current={view === 'saved' ? 'page' : undefined} onClick={() => navigate('saved')}>保存したコーデ <span className="nav-count">{saved.length}</span></button>
          </nav>
        </div>
      </header>
      <main>
        {view === 'select' && <>
          <section className="intro">
            <p className="eyebrow">サンプルで体験</p>
            <h1 ref={heading} tabIndex={-1}>この服を買ったら、<br />手持ちで何通り着られる？</h1>
            <p>気になる白シャツを、手持ちのボトムスと合わせてみましょう。</p>
          </section>
          <div className="selection">
            <section className="product">
              <h2>試したいトップス</h2>
              <img src="/images/shirt.jpg" alt="白い長袖オックスフォードシャツの正面" />
              <p>白シャツ</p>
            </section>
            <fieldset className="bottoms">
              <legend>合わせるボトムス</legend>
              <p className="hint">1〜3着を選択 <span>{selected.length} / 3</span></p>
              <div className="options">
                {bottoms.map(({ id, name }) => (
                  <label key={id} className="option">
                    <input type="checkbox" checked={selected.includes(id)} onChange={(event) => {
                      const checked = event.currentTarget.checked
                      setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id))
                    }} />
                    <img src={`/images/bottom-${id}.jpg`} alt="" />
                    <span className="option-name">{name}</span>
                    <span className="tick" aria-hidden="true">✓</span>
                  </label>
                ))}
              </div>
              <button className="primary" disabled={!selected.length} onClick={() => {
                setResults(selected)
                navigate('compare')
              }}>サンプルで試着する <span aria-hidden="true">→</span></button>
            </fieldset>
          </div>
        </>}
        {view === 'compare' && <>
          <section className="intro">
            <p className="eyebrow">サンプル試着画像</p>
            <h1 ref={heading} tabIndex={-1}>白シャツの着こなしを比較</h1>
            <p className="counts" role="status">比較できたコーデ <strong>{results.length}件</strong> ／ 保存したコーデ <strong>{results.filter((id) => saved.includes(id)).length}件</strong></p>
          </section>
          <div className="looks">{results.map((id) => card(bottoms.find((bottom) => bottom.id === id)!))}</div>
          <button className="secondary" onClick={() => navigate('select')}>← 組み合わせを選び直す</button>
        </>}
        {view === 'saved' && <>
          <section className="intro">
            <p className="eyebrow">サンプル試着画像</p>
            <h1 ref={heading} tabIndex={-1}>保存したコーデ</h1>
            <p role="status">{saved.length}件</p>
          </section>
          {saved.length ? <div className="looks">{bottoms.filter(({ id }) => saved.includes(id)).map(card)}</div> : <div className="empty">
            <p>比較画面で気に入ったコーデを保存できます。</p>
            <button className="primary" onClick={() => navigate(results.length ? 'compare' : 'select')}>{results.length ? '比較結果を見る' : '組み合わせを選ぶ'} →</button>
          </div>}
        </>}
        {storageError && <p role="alert">保存内容を更新できませんでした。ブラウザの保存設定をご確認ください。</p>}
      </main>
      <dialog ref={dialog} aria-label="試着画像の拡大" onClose={() => setEnlarged(null)} onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}>
        {enlarged && <figure>
          <img src={`/images/look-${enlarged.id}.jpg`} alt={`白シャツ × ${enlarged.name}`} />
          <figcaption>白シャツ × {enlarged.name}</figcaption>
          <button className="close" aria-label="拡大画像を閉じる" onClick={() => dialog.current?.close()}>×</button>
        </figure>}
      </dialog>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
