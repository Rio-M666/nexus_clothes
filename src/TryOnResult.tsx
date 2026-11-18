import { useState } from 'react'
import ResultPhotoSwitch from './ResultPhotoSwitch'
import TryOnComparison from './TryOnComparison'
import { apiResponse, RequestError } from './tryOnApi'
import { usePhotoUrl } from './usePhotoUrl'
import type { Category, SavedLook } from './savedLookStore'

export default function TryOnResult({ id, url, original, name, category, compareOriginal, saved, onSave }: {
  id: string
  url: string
  original: File
  name?: string
  category: Category
  compareOriginal: boolean
  saved: boolean
  onSave: (look: SavedLook) => Promise<void>
}) {
  const originalUrl = usePhotoUrl(original)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [displayError, setDisplayError] = useState(false)

  async function save() {
    if (saving || saved) return
    setSaving(true)
    setError('')
    try {
      const endpoint = '/api/try-on/tasks/' + encodeURIComponent(id) + '/image'
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(35_000) })
      if (!response.ok) await apiResponse(response)
      await onSave({ id, image: await response.blob(), category, savedAt: Date.now(), name })
    } catch (cause) {
      if (cause instanceof RequestError) setError(cause.message)
      else if (cause instanceof DOMException && cause.name === 'QuotaExceededError') setError('保存容量が足りません。保存済みの画像を削除してからお試しください。')
      else setError('このブラウザに画像を保存できませんでした。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  return <>
    {compareOriginal
      ? <TryOnComparison originalUrl={originalUrl} resultUrl={url} onResultError={() => setDisplayError(true)} />
      : <ResultPhotoSwitch name={name ?? '着用写真'} originalUrl={originalUrl} resultUrl={url} onResultError={() => setDisplayError(true)} />}
    <div className="result-actions">
      <button
        type="button"
        className={`save-icon-btn ${saved ? 'is-saved' : ''}`}
        disabled={saving || saved}
        onClick={() => void save()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2.2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5v16.38a.75.75 0 0 1-1.22.58L12 17.6l-4.78 3.86A.75.75 0 0 1 6 20.88V4.5Z"
          />
        </svg>
        <span className="save-btn-text">
          {saved ? '保存済み' : saving ? '保存中…' : '保存'}
        </span>
      </button>
      <a className="secondary" href={url} target="_blank" rel="noopener noreferrer">画像を開く ↗</a>
    </div>
    {displayError && <p className="form-error" role="alert">生成画像を表示できません。画像の有効期限が切れている可能性があります。</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </>
}

