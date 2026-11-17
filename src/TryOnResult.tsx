import { useState } from 'react'
import PhotoZoom from './PhotoZoom'
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
  const originalUrl = usePhotoUrl(compareOriginal ? original : null)
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
      : <PhotoZoom src={url} label={name + 'の試着イメージ'} onError={() => setDisplayError(true)} />}
    <div className="result-actions">
      <button type="button" className="primary" disabled={saving || saved} onClick={() => void save()}>{saved ? '保存済み' : saving ? '保存中…' : '保存する'}</button>
      <a className="secondary" href={url} target="_blank" rel="noopener noreferrer">画像を開く ↗</a>
    </div>
    {displayError && <p className="form-error" role="alert">生成画像を表示できません。画像の有効期限が切れている可能性があります。</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </>
}
