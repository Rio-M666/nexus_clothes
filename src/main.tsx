import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import PhotoTryOn from './PhotoTryOn'
import SampleTryOn from './SampleTryOn'
import TryOnSetupGuide from './TryOnSetupGuide'
import './style.css'

function App() {
  const [mode, setMode] = useState<'sample' | 'photo'>(import.meta.env.DEV ? 'photo' : 'sample')

  return <>
    <header className="header">
      <div className="header-inner"><span aria-hidden="true">◇</span> 通販服試着</div>
    </header>
    <main>
      <h1 className="page-title">写真で試着</h1>
      <div className="mode-switch" role="group" aria-label="試着方法">
        <button type="button" aria-pressed={mode === 'sample'} aria-controls="sample-panel" onClick={() => setMode('sample')}>サンプル</button>
        <button type="button" aria-pressed={mode === 'photo'} aria-controls="photo-panel" onClick={() => setMode('photo')}>自分の写真</button>
      </div>
      <div id="sample-panel" hidden={mode !== 'sample'}><SampleTryOn /></div>
      <div id="photo-panel" hidden={mode !== 'photo'}>
        {import.meta.env.DEV ? <PhotoTryOn /> : <TryOnSetupGuide />}
      </div>
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
