import { useId, useRef, useState } from 'react'
import { usePhotoUrl } from './usePhotoUrl'

export default function ImagePicker({ label, file, disabled, onChange }: {
  label: string
  file: File | null
  disabled: boolean
  onChange: (file: File | null) => void
}) {
  const preview = usePhotoUrl(file)
  const [error, setError] = useState('')
  const selection = useRef(0)

  const input = useRef<HTMLInputElement>(null)
  const dropDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const hint = useId()

  async function selectImage(next: File) {
    if (input.current?.matches(':disabled')) return
    const current = ++selection.current
    setError('')
    onChange(null)
    try {
      if (!['image/jpeg', 'image/png'].includes(next.type) || !next.size || next.size >= 10_000_000) {
        throw new Error('10MB未満のJPEGまたはPNGを選択してください。')
      }
      const image = await createImageBitmap(next)
      const long = Math.max(image.width, image.height)
      const short = Math.min(image.width, image.height)
      image.close()
      if (long > 4096 || long < 512 || short < 384) {
        throw new Error('512×384px以上、長辺4096px以下の写真を選択してください。')
      }
      if (current === selection.current) onChange(next)
    } catch (cause) {
      if (current !== selection.current) return
      setError(cause instanceof Error && !(cause instanceof DOMException) ? cause.message : '写真を読み込めませんでした。別の写真をお試しください。')
    }
  }

  return <label className="image-picker"
    onDragEnter={(event) => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      if (input.current?.matches(':disabled')) return
      dropDepth.current++
      setDragging(true)
    }}
    onDragOver={(event) => {
      if (!event.dataTransfer.types.includes('Files')) return
      event.preventDefault()
      event.dataTransfer.dropEffect = input.current?.matches(':disabled') ? 'none' : 'copy'
    }}
    onDragLeave={() => {
      dropDepth.current = Math.max(0, dropDepth.current - 1)
      if (!dropDepth.current) setDragging(false)
    }}
    onDrop={(event) => {
      event.preventDefault()
      dropDepth.current = 0
      setDragging(false)
      const next = event.dataTransfer.files[0]
      if (next) void selectImage(next)
    }}
    onPaste={(event) => {
      const next = Array.from(event.clipboardData.items).find((item) =>
        item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile() ?? event.clipboardData.files[0]
      if (!next) return
      event.preventDefault()
      void selectImage(next)
    }}
  >
    <span>{label}</span>
    <span className={`image-preview ${preview ? 'has-image' : ''} ${dragging ? 'is-dragging' : ''}`}>
      {preview ? (
        <img src={preview} alt={`${label}のプレビュー`} />
      ) : (
        <span className="upload-placeholder">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="upload-placeholder-title">写真をドロップ、またはクリックで選択</span>
          <span className="upload-placeholder-sub">JPEGまたはPNG</span>
        </span>
      )}
    </span>
    <span className="file-action">{file ? '差し替える' : '写真を選ぶ'}</span>
    {file && <span className="file-name">{file.name}</span>}
    <span id={hint} className="photo-hint">画像をコピーし、Tabキーでこの入力欄に移動すると ⌘V で貼り付けられます。</span>
    <input ref={input} className="file-input" aria-label={label} aria-describedby={hint} type="file" accept="image/jpeg,image/png" disabled={disabled} onChange={async (event) => {
      const next = event.currentTarget.files?.[0]
      event.currentTarget.value = ''
      if (next) void selectImage(next)
    }} />
    {error && <span className="form-error" role="alert">{error}</span>}
  </label>
}
