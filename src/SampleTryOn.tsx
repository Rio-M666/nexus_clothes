import { useEffect, useRef, useState } from 'react'
import TryOnComparison from './TryOnComparison'

const imageBase = `${import.meta.env.BASE_URL}images/`
const originalUrl = `${imageBase}bottom-denim.jpg`

export default function SampleTryOn() {
  const [showResult, setShowResult] = useState(false)
  const resultHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (showResult) resultHeading.current?.focus()
  }, [showResult])

  return <section>
    <div className="intro">
      <p>デニムを履いた写真に白シャツを合わせた、サンプルの試着イメージを見られます。</p>
    </div>
    <section className="tryon-form" aria-labelledby="sample-heading">
      <h2 id="sample-heading">サンプル写真</h2>
      <div className="upload-grid">
        <figure className="sample-photo">
          <figcaption>元の着用写真</figcaption>
          <div className="image-preview"><img src={originalUrl} alt="グレーのTシャツにデニムを合わせた着用写真" /></div>
        </figure>
        <figure className="sample-photo">
          <figcaption>白シャツ</figcaption>
          <div className="image-preview"><img src={`${imageBase}shirt.jpg`} alt="白い長袖シャツの正面" /></div>
        </figure>
      </div>
      <button className="primary" type="button" aria-expanded={showResult} aria-controls="sample-result" onClick={() => setShowResult(true)}>サンプルで試す</button>
    </section>
    <section id="sample-result" className="generated-result" hidden={!showResult}>
      {showResult && <>
        <h2 ref={resultHeading} tabIndex={-1}>サンプルの試着結果</h2>
        <TryOnComparison originalUrl={originalUrl} resultUrl={`${imageBase}look-denim.jpg`} />
      </>}
    </section>
  </section>
}
