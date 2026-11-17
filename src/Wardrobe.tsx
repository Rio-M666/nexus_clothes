import { useRef, useState } from 'react'
import ImagePicker from './ImagePicker'
import { usePhotoUrl } from './usePhotoUrl'
import type { WardrobeItem } from './savedLookStore'

function ClothingCard({ item, onEdit, onDelete }: {
  item: WardrobeItem
  onEdit: () => void
  onDelete: () => Promise<void>
}) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(false)
  const preview = usePhotoUrl(item.photo)
  return <article className="saved-card">
    {preview && <img className="bottom-thumbnail" src={preview} alt={item.name + 'の着用写真'} loading="lazy" />}
    <h2>{item.name}</h2>
    {confirm ? <div>
      <p>「{item.name}」の登録写真を削除しますか？</p>
      <div className="wardrobe-actions">
        <button type="button" className="secondary" disabled={deleting} onClick={async () => {
          setDeleting(true)
          setError(false)
          try { await onDelete() }
          catch { setError(true); setDeleting(false) }
        }}>{deleting ? '削除中…' : '削除する'}</button>
        <button type="button" className="secondary" disabled={deleting} onClick={() => { setConfirm(false); setError(false) }}>キャンセル</button>
      </div>
      {error && <p role="alert">削除できませんでした。もう一度お試しください。</p>}
    </div> : <div className="wardrobe-actions">
      <button type="button" className="secondary" aria-label={item.name + 'を編集'} onClick={onEdit}>編集</button>
      <button type="button" className="secondary" aria-label={item.name + 'を削除'} onClick={() => setConfirm(true)}>削除</button>
    </div>}
  </article>
}

export default function Wardrobe({ wardrobe, loadError, onRegister, onUpdate, onDelete, onTryOn }: {
  wardrobe: WardrobeItem[] | null
  loadError: boolean
  onRegister: (item: WardrobeItem) => Promise<void>
  onUpdate: (item: WardrobeItem) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTryOn: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null)
  const [formVersion, setFormVersion] = useState(0)

  function resetForm() {
    setEditingId(null)
    setName('')
    setPhoto(null)
    setFormVersion((version) => version + 1)
  }

  function edit(item: WardrobeItem) {
    setEditingId(item.id)
    setName(item.name)
    setPhoto(item.photo)
    setFormVersion((version) => version + 1)
    setFeedback(null)
    form.current?.scrollIntoView({ block: 'start' })
    nameInput.current?.focus({ preventScroll: true })
  }

  return <section>
    <div className="workspace-heading"><h1 className="page-title">手持ちの洋服</h1></div>
    <div className="wardrobe-layout">
      <form ref={form} className="tryon-form wardrobe-form" onSubmit={async (event) => {
        event.preventDefault()
        if (!name.trim() || !photo || submitting || !wardrobe) return
        setSubmitting(true)
        setFeedback(null)
        try {
          if (editingId) await onUpdate({ id: editingId, name: name.trim(), photo })
          else await onRegister({ id: crypto.randomUUID(), name: name.trim(), photo })
          resetForm()
          setFeedback({ message: editingId ? '変更を保存しました。' : '登録しました。試着画面で着用写真を選べます。', error: false })
        } catch {
          setFeedback({ message: '洋服を保存できませんでした。ブラウザの保存設定と空き容量を確認してください。', error: true })
        } finally {
          setSubmitting(false)
        }
      }}>
        <fieldset disabled={submitting || wardrobe === null}>
          <legend>{editingId ? '洋服を編集' : '洋服を登録'}</legend>
          <p><strong>顔がはっきり写った着用写真が必要です。</strong> 登録する服を着て、1人で正面を向いて立ち、顔から足元までが写る写真を選んでください。この写真を試着の元画像に使います。</p>
          <p className="hint">JPEG・PNG／10MB未満／512×384px以上・長辺4096px以下</p>
          <label className="bottom-choice">洋服の名前
            <input ref={nameInput} type="text" value={name} maxLength={60} required placeholder="例：デニム" onChange={(event) => setName(event.currentTarget.value)} />
          </label>
          <ImagePicker key={formVersion} label="洋服の着用写真" file={photo} disabled={submitting} onChange={setPhoto} />
        </fieldset>
        <button type="submit" className="primary" disabled={!wardrobe || submitting || !name.trim() || !photo}>{submitting ? '保存中…' : editingId ? '変更を保存' : '登録する'}</button>
        {editingId && <button type="button" className="secondary edit-cancel" disabled={submitting} onClick={() => { resetForm(); setFeedback(null) }}>編集をキャンセル</button>}
        {feedback && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'form-error' : 'generation-status'}>{feedback.message}</p>}
      </form>
      <section className="wardrobe-list">
        <h2>登録した洋服</h2>
        {loadError ? <p role="alert">洋服を読み込めませんでした。ブラウザの保存設定を確認して再読み込みしてください。</p>
          : wardrobe === null ? <p role="status">読み込んでいます…</p>
          : wardrobe.length === 0 ? <p>登録した洋服はありません。</p>
          : <>
            <div className="saved-grid">{wardrobe.map((item) => <ClothingCard key={item.id} item={item} onEdit={() => {
              if (!submitting) edit(item)
            }} onDelete={async () => {
              await onDelete(item.id)
              if (editingId === item.id) { resetForm(); setFeedback(null) }
            }} />)}</div>
            <button type="button" className="secondary" onClick={onTryOn}>試着画面で選ぶ</button>
          </>}
      </section>
    </div>
  </section>
}
