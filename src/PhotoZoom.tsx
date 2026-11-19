import { useRef } from 'react'

export default function PhotoZoom({ src, label, onError }: { src: string; label: string; onError?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  return <>
    <button className="zoom-button" type="button" aria-label={label + 'を拡大'} onClick={() => dialog.current?.showModal()}>
      <img src={src} alt={label} referrerPolicy="no-referrer" onError={onError} />
    </button>
    <dialog ref={dialog} className="zoom-dialog" aria-label={label}>
      <button type="button" className="secondary" onClick={() => dialog.current?.close()}>閉じる</button>
      <img src={src} alt={label} referrerPolicy="no-referrer" />
    </dialog>
  </>
}
