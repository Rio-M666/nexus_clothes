import PhotoZoom from './PhotoZoom'

export default function TryOnComparison({ originalUrl, resultUrl, onResultError }: {
  originalUrl: string
  resultUrl: string
  onResultError?: () => void
}) {
  return <div className="comparison">
    <figure>
      <figcaption>マイ写真で試す</figcaption>
      {originalUrl && <PhotoZoom src={originalUrl} label="試着前の着用写真" />}
    </figure>
    <figure>
      <figcaption>試着イメージ</figcaption>
      <PhotoZoom src={resultUrl} label="試着イメージ" onError={onResultError} />
    </figure>
  </div>
}
