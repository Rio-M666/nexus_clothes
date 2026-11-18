import { useEffect, useRef, useState } from 'react'
import TryOnComparison from './TryOnComparison'

import { sampleShirt, type SampleOutfit } from './sampleOutfits'

export default function SampleTryOn({ outfit }: { outfit: SampleOutfit }) {
  const [showResult, setShowResult] = useState(false)
  const resultHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (showResult) resultHeading.current?.focus()
  }, [showResult])

  return <section>
    <div className="intro">
      <p>{outfit.name}を履いた写真に白シャツを合わせた、サンプルの試着イメージを見られます。</p>
    </div>
    <div className={showResult ? 'sample-workbench has-result' : 'sample-workbench'}>
      <section className="tryon-form" aria-labelledby="sample-heading">
        <h2 id="sample-heading">サンプル写真</h2>
        <div className="upload-grid">
          <figure className="sample-photo">
            <figcaption>サンプルの全身写真</figcaption>
            <div className="image-preview"><img src={outfit.originalUrl} alt={outfit.name + 'の着用写真'} /></div>
          </figure>
          <figure className="sample-photo">
            <figcaption>白シャツ</figcaption>
            <div className="image-preview"><img src={sampleShirt} alt="白い長袖シャツの正面" /></div>
          </figure>
        </div>
        <button className="primary" type="button" aria-expanded={showResult} aria-controls="sample-result" onClick={() => setShowResult(true)}>サンプルで試す</button>
      </section>
      <section id="sample-result" className="generated-result" hidden={!showResult}>
        {showResult && <>
          <h2 ref={resultHeading} tabIndex={-1}>サンプルの試着結果</h2>
          <TryOnComparison originalUrl={outfit.originalUrl} resultUrl={outfit.resultUrl} />
        </>}
      </section>
    </div>
  </section>
}
