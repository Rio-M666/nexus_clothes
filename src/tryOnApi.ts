import type { Category } from './savedLookStore'

export class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

export async function apiResponse(response: Response) {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new RequestError(data?.error || '画像生成に接続できませんでした。時間を置いてお試しください。', response.status)
  if (!data || typeof data !== 'object') throw new Error('画像生成サービスに接続できませんでした。')
  return data
}

export async function createTask(person: File, garment: File, category: Category, signal: AbortSignal): Promise<string> {
  const body = new FormData()
  body.set('person', person)
  body.set('garment', garment)
  body.set('category', category)
  const task = await fetch('/api/try-on', { method: 'POST', body, signal }).then(apiResponse)
  if (typeof task.taskId !== 'string' || !task.taskId) throw new Error('生成を開始できませんでした。')
  return task.taskId
}

export async function taskStatus(id: string, signal: AbortSignal) {
  const data = await fetch('/api/try-on/tasks/' + encodeURIComponent(id), { signal }).then(apiResponse)
  if (data.status === 'error') return { state: 'failed' as const, message: data.error || '画像を生成できませんでした。' }
  if (data.status === 'success') {
    const url = new URL(data.imageUrl)
    if (url.protocol !== 'https:') throw new Error('画像を取得できませんでした。')
    return { state: 'success' as const, url: url.href }
  }
  if (data.status !== 'running') throw new Error('生成状態を確認できませんでした。')
  return { state: 'running' as const }
}

export function waitForPoll(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const abort = () => { window.clearTimeout(timer); reject(signal.reason) }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, 10_000)
    signal.addEventListener('abort', abort, { once: true })
  })
}
