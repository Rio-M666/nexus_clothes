import { useState } from 'react'
import PhotoZoom from './PhotoZoom'
import { usePhotoUrl } from './usePhotoUrl'
import { categoryNames, type SavedLook } from './savedLookStore'

function SavedCard({ look, onDelete }: { look: SavedLook; onDelete: (id: string) => Promise<void> }) {
  const preview = usePhotoUrl(look.image)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(false)
  const name = categoryNames[look.category]
  return <article className="saved-card">
    {preview && <PhotoZoom src={preview} label={name + 'の試着画像'} />}
    <h2>{look.name ?? name}</h2>
    {look.name && <p>試着した服：{name}</p>}
    <p><time dateTime={new Date(look.savedAt).toISOString()}>{new Date(look.savedAt).toLocaleString('ja-JP')}</time></p>
    <button type="button" className="secondary" disabled={deleting} onClick={async () => {
      setDeleting(true)
      setError(false)
      try {
        await onDelete(look.id)
      } catch {
        setError(true)
        setDeleting(false)
      }
    }}>削除</button>
    {error && <p role="alert" className="form-error">削除できませんでした。もう一度お試しください。</p>}
  </article>
}

export default function SavedLooks({ looks, loadError, onDelete }: {
  looks: SavedLook[] | null
  loadError: boolean
  onDelete: (id: string) => Promise<void>
}) {
  return <>
    <div className="workspace-heading"><h1 className="page-title">保存済み</h1></div>
    {loadError ? <p role="alert">保存済みの画像を読み込めませんでした。ブラウザの保存設定を確認してください。</p>
      : looks === null ? <p role="status">保存済みの画像を読み込んでいます…</p>
      : looks.length === 0 ? <p className="workspace-empty">保存した試着画像はありません。</p>
      : <div className="saved-grid">{[...looks].sort((a, b) => b.savedAt - a.savedAt).map((look) => <SavedCard key={look.id} look={look} onDelete={onDelete} />)}</div>}
  </>
}
