import { useState } from 'react'
import PhotoZoom from './PhotoZoom'

export default function ResultPhotoSwitch({ name, originalUrl, resultUrl, onResultError }: {
  name: string
  originalUrl: string
  resultUrl: string
  onResultError?: () => void
}) {
  const [showOriginal, setShowOriginal] = useState(false)
  const photoLabel = showOriginal ? '元写真' : '試着後'

  return <>
    <div className="result-photo-switch" role="group" aria-label={name + 'の表示'}>
      <button type="button" aria-pressed={showOriginal} disabled={!originalUrl} onClick={() => setShowOriginal(true)}>元写真</button>
      <button type="button" aria-pressed={!showOriginal} onClick={() => setShowOriginal(false)}>試着後</button>
    </div>
    <div className="result-switch-image" key={photoLabel}>
      <PhotoZoom src={showOriginal ? originalUrl : resultUrl} label={name + 'の' + photoLabel} onError={showOriginal ? undefined : onResultError} />
    </div>
  </>
}
