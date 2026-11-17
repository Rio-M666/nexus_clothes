import { useEffect, useState } from 'react'

export function usePhotoUrl(file: Blob | null) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!file) {
      setUrl('')
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])

  return url
}
