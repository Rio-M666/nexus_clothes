import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './Home'
import { sampleOutfits } from './sampleOutfits'
import PhotoTryOn from './PhotoTryOn'
import SampleTryOn from './SampleTryOn'
import TryOnSetupGuide from './TryOnSetupGuide'
import SavedLooks from './SavedLooks'
import Wardrobe from './Wardrobe'
import { deleteWardrobeItem, updateWardrobeItem, addWardrobeItem, addLook, listWardrobe, type WardrobeItem, deleteLook, listLooks, type SavedLook } from './savedLookStore'
import './style.css'

type View = 'home' | 'try-on' | 'saved' | 'wardrobe'

function App() {
  const [mode, setMode] = useState<'sample' | 'photo'>(import.meta.env.DEV ? 'photo' : 'sample')
  const [view, setView] = useState<View>('home')
  const [outfit, setOutfit] = useState(sampleOutfits[0])
  const main = useRef<HTMLElement>(null)
  const [looks, setLooks] = useState<SavedLook[] | null>(null)
  const [wardrobe, setWardrobe] = useState<WardrobeItem[] | null>(null)
  const [wardrobeError, setWardrobeError] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let active = true
    listLooks().then((items) => {
      if (active) setLooks((current) => current ?? items)
    }).catch(() => { if (active) setLoadError(true) })
    listWardrobe().then((items) => {
      if (active) setWardrobe((current) => current ?? items)
    }).catch(() => { if (active) setWardrobeError(true) })
    return () => { active = false }
  }, [])

  function navigate(next: View) {
    setView(next)
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }

  function openTryOn(nextMode: 'sample' | 'photo') {
    setMode(nextMode)
    navigate('try-on')
  }

  async function save(look: SavedLook) {
    await addLook(look)
    setLooks(await listLooks())
    setLoadError(false)
  }

  async function remove(id: string) {
    await deleteLook(id)
    setLooks((items) => items?.filter((item) => item.id !== id) ?? null)
  }

  return <>
    <header className="header">
      <div className="header-inner">
        <button type="button" className="wordmark" aria-label="通販服試着 ホーム" onClick={() => navigate('home')}>通販服試着<span aria-hidden="true">.</span></button>
        <nav aria-label="メイン">
          <button type="button" aria-current={view === 'try-on' ? 'page' : undefined} onClick={() => navigate('try-on')}>試着する</button>
          {import.meta.env.DEV && <>
          <button type="button" aria-current={view === 'wardrobe' ? 'page' : undefined} onClick={() => navigate('wardrobe')}>手持ちの洋服</button>
          <button type="button" aria-current={view === 'saved' ? 'page' : undefined} onClick={() => navigate('saved')}>保存済み</button>
          </>}
        </nav>
      </div>
    </header>
    <main ref={main} tabIndex={-1} className={view === 'home' ? 'home-main' : 'workspace-main'}>
      {view === 'home' && <Home outfit={outfit} onOutfitChange={setOutfit} onSample={() => openTryOn('sample')} onPhoto={() => openTryOn('photo')} />}
      <div hidden={view !== 'try-on'}>
        <div className="workspace-heading">
          <h1 className="page-title">写真で試着</h1>
          <div className="mode-switch" role="group" aria-label="試着方法">
            <button type="button" aria-pressed={mode === 'sample'} aria-controls="sample-panel" onClick={() => setMode('sample')}>サンプル</button>
            <button type="button" aria-pressed={mode === 'photo'} aria-controls="photo-panel" onClick={() => setMode('photo')}>自分の写真</button>
          </div>
        </div>
        <div id="sample-panel" hidden={mode !== 'sample'}><SampleTryOn outfit={outfit} /></div>
        <div id="photo-panel" hidden={mode !== 'photo'}>
          {import.meta.env.DEV ? <PhotoTryOn wardrobe={wardrobe ?? []} onOpenWardrobe={() => navigate('wardrobe')} savedIds={looks?.map(({ id }) => id) ?? []} onSave={save} /> : <TryOnSetupGuide />}
        </div>
      </div>
      {import.meta.env.DEV && view === 'wardrobe' && <Wardrobe
        wardrobe={wardrobe}
        loadError={wardrobeError}
        onRegister={async (item) => {
          await addWardrobeItem(item)
          setWardrobe((items) => [...(items ?? []), item])
        }}
        onUpdate={async (item) => {
          await updateWardrobeItem(item)
          setWardrobe((items) => items?.map((current) => current.id === item.id ? item : current) ?? null)
        }}
        onDelete={async (id) => {
          await deleteWardrobeItem(id)
          setWardrobe((items) => items?.filter((item) => item.id !== id) ?? null)
        }}
        onTryOn={() => openTryOn('photo')}
      />}
      {import.meta.env.DEV && view === 'saved' && <SavedLooks looks={looks} loadError={loadError} onDelete={remove} />}
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
