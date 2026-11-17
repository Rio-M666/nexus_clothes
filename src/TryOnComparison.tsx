export default function TryOnComparison({ originalUrl, resultUrl, onResultError }: {
  originalUrl: string
  resultUrl: string
  onResultError?: () => void
}) {
  return <div className="comparison">
    <figure>
      <figcaption>元の写真</figcaption>
      {originalUrl && <img src={originalUrl} alt="試着前の着用写真" />}
    </figure>
    <figure>
      <figcaption>試着イメージ</figcaption>
      <img src={resultUrl} alt="選択した服を着た試着イメージ" referrerPolicy="no-referrer" onError={onResultError} />
    </figure>
  </div>
}
