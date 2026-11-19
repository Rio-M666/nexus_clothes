import { sampleOutfits, sampleShirt, type SampleOutfit } from './sampleOutfits'

export default function Home({ outfit, onOutfitChange, onSample, onPhoto }: {
  outfit: SampleOutfit
  onOutfitChange: (outfit: SampleOutfit) => void
  onSample: () => void
  onPhoto: () => void
}) {
  const local = import.meta.env.DEV

  return <section className="home-hero" aria-labelledby="home-title">
    <div className="home-copy">
      <h1 id="home-title">その服、<br />買う前に試着。</h1>
      <p>気になる一着は、手持ちの服とどう合う？ 白シャツを合わせるボトムスを選んで、着こなしを見てみましょう。</p>
      <fieldset className="home-picker">
        <legend>白シャツに合わせるボトムス</legend>
        <div className="home-options">
          {sampleOutfits.map((option) => <label className="home-option" key={option.id}>
            <input type="radio" name="sample-outfit" checked={outfit.id === option.id} onChange={() => onOutfitChange(option)} />
            <img src={option.originalUrl} alt="" width="408" height="512" />
            <span>{option.name}</span>
          </label>)}
        </div>
      </fieldset>
      <div className="home-actions">
        <button type="button" className="primary" onClick={local ? onPhoto : onSample}>
          {local ? '自分の写真で試着' : 'サンプルを試す'} <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="secondary" onClick={local ? onSample : onPhoto}>
          {local ? 'サンプルの試着を見る' : '自分の写真で試す方法'}
        </button>
      </div>
    </div>
    <div className="home-visual">
      <div className="home-studio">
        <figure className="home-outcome">
          <img key={outfit.id} src={outfit.resultUrl} alt={'白シャツと' + outfit.name + 'の試着イメージ'} width="408" height="512" />
        </figure>
        <div className="home-inputs">
          <figure>
            <img src={outfit.originalUrl} alt={outfit.name + 'を履いた元の写真'} width="408" height="512" />
            <figcaption>元の写真</figcaption>
          </figure>
          <figure>
            <img src={sampleShirt} alt="白シャツの商品画像" width="800" height="800" />
            <figcaption>試す服</figcaption>
          </figure>
        </div>
      </div>
      <div className="home-visual-caption">
        <p role="status">白シャツ × {outfit.name}</p>
        <span>サンプルの試着イメージ</span>
      </div>
    </div>
  </section>
}
