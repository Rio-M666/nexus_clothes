import { useRef, useState } from 'react'
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

  return <label className="image-picker">
    <span>{label}</span>
    <span className={`image-preview ${preview ? 'has-image' : ''}`}>
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
          <span className="upload-placeholder-title">写真を選択</span>
          <span className="upload-placeholder-sub">JPEGまたはPNG</span>
        </span>
      )}
    </span>
    <span className="file-action">{file ? '差し替える' : '写真を選ぶ'}</span>
    {file && <span className="file-name">{file.name}</span>}
    <input className="file-input" aria-label={label} type="file" accept="image/jpeg,image/png" disabled={disabled} onChange={async (event) => {
      const input = event.currentTarget
      const next = input.files?.[0]
      const current = ++selection.current
      setError('')
      onChange(null)
      if (!next) return
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
        input.value = ''
        setError(cause instanceof Error && !(cause instanceof DOMException) ? cause.message : '写真を読み込めませんでした。別の写真をお試しください。')
      }
    }} />
    {error && <span className="form-error" role="alert">{error}</span>}
  </label>
}