import { useEffect, useRef, useState } from 'react'
import ResultPhotoSwitch from './ResultPhotoSwitch'
import TryOnComparison from './TryOnComparison'
import { sampleOutfits, sampleShirt, type SampleOutfit } from './sampleOutfits'

export default function SampleTryOn({ outfit }: { outfit: SampleOutfit }) {
  const options = [outfit, ...sampleOutfits.filter((item) => item.id !== outfit.id)]
  const [selectedIds, setSelectedIds] = useState(() => options.map(({ id }) => id))
  const [results, setResults] = useState<SampleOutfit[]>([])
  const resultHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (results.length) resultHeading.current?.focus()
  }, [results])

  function toggle(id: string, checked: boolean) {
    setSelectedIds((ids) => checked ? [...ids, id] : ids.filter((value) => value !== id))
    setResults([])
  }

  return <section>
    <div className="intro">
      <p>ボトムスを選んで、白シャツを合わせた着こなしを見比べられます。</p>
    </div>
    <form className="tryon-form" onSubmit={(event) => {
      event.preventDefault()
      if (selectedIds.length) setResults(options.filter(({ id }) => selectedIds.includes(id)))
    }}>
      <div className="sample-picker">
        <figure className="sample-photo">
          <figcaption>試す服：白シャツ</figcaption>
          <div className="image-preview"><img src={sampleShirt} alt="白い長袖シャツの正面" /></div>
        </figure>
        <fieldset>
          <legend>合わせるボトムス</legend>
          <p className="hint">1〜3着を選択 · {selectedIds.length}着選択中</p>
          <div className="sample-options">
            {options.map((item) => <label className="sample-option" key={item.id}>
              <div className="image-preview"><img src={item.originalUrl} alt="" /></div>
              <span><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => toggle(item.id, event.currentTarget.checked)} />{item.name}</span>
            </label>)}
          </div>
        </fieldset>
      </div>
      <button className="primary" type="submit" disabled={!selectedIds.length}>
        {selectedIds.length > 1 ? selectedIds.length + '着を比較する' : 'サンプルで試す'}
      </button>
    </form>
    {results.length > 0 && <section className="generated-result" aria-labelledby="sample-result-heading">
      <h2 id="sample-result-heading" ref={resultHeading} tabIndex={-1}>サンプルの試着結果</h2>
      {results.length === 1
        ? <TryOnComparison key={results[0].id} originalUrl={results[0].originalUrl} resultUrl={results[0].resultUrl} />
        : <div className="trial-grid">
          {results.map((item) => <article className="trial-card" key={item.id}>
            <h3>{item.name}</h3>
            <ResultPhotoSwitch name={item.name} originalUrl={item.originalUrl} resultUrl={item.resultUrl} />
          </article>)}
        </div>}
    </section>}
  </section>
}
