const apiOrigin = 'https://yce-api-01.makeupar.com'
const maxFileSize = 10_000_000
const maxBodySize = 2 * maxFileSize + 100_000
const taskLifetime = 10 * 60_000
const categories = new Set(['upper_body', 'lower_body', 'full_body'])

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(data))
}

const generationErrors = {
  error_pose: '人物の姿勢を認識できませんでした。正面を向いた写真をお試しください。',
  error_invalid_src: '人物を認識できませんでした。顔と体が写った写真をお試しください。',
  error_invalid_ref: '服を認識できませんでした。服全体がはっきり写った写真をお試しください。',
  error_apply_region_mismatch: '写真に試着する部位が写っていません。写真と服の種類を確認してください。',
  error_multi_person: '複数の人物を検出しました。1人だけ写った写真をお選びください。',
  error_nsfw_content_detected: 'この画像では生成できません。別の写真をお試しください。',
  exceed_max_filesize: '画像が大きすぎます。10MB未満・長辺4096px以下の写真をお選びください。',
  error_below_min_image_size: '画像が小さすぎます。512×384px以上の写真をお選びください。',
}

export function createTryOnMiddleware({ apiKey = '', fetchImpl = fetch } = {}) {
  const tasks = new Map()
  let creating = false

  async function request(path, body) {
    const response = await fetchImpl(`${apiOrigin}/s2s/v2.0${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    })
    const payload = await response.json().catch(() => null)
    const status = response.ok ? payload?.status : response.status
    if (status === 401 || status === 403) {
      throw new ApiError(502, '画像生成サービスの認証に失敗しました。APIキーの設定をご確認ください。')
    }
    if (status === 429) throw new ApiError(429, '利用枠または同時実行数の上限に達しました。時間を置いてご確認ください。')
    if (!response.ok || status !== 200 || !payload?.data) {
      throw new ApiError(502, '画像生成サービスとの通信に失敗しました。時間を置いてお試しください。')
    }
    return payload.data
  }

  async function upload(file, name) {
    const metadata = await request('/file', {
      files: [{ file_name: name, content_type: file.type, file_size: file.size }],
    })
    const registered = metadata.files?.[0]
    const uploadRequest = registered?.requests?.[0]
    let uploadUrl
    try { uploadUrl = new URL(uploadRequest?.url) } catch { /* handled below */ }
    if (!registered?.file_id || uploadRequest?.method !== 'PUT' || uploadUrl?.protocol !== 'https:') {
      throw new ApiError(502, '画像のアップロード先を取得できませんでした。')
    }
    // Use only the signed upload headers. The API key must never be sent to storage.
    const headers = new Headers(uploadRequest.headers)
    headers.delete('Authorization')
    const response = await fetchImpl(uploadUrl.href, {
      method: 'PUT', headers, body: new Uint8Array(await file.arrayBuffer()),
      signal: AbortSignal.timeout(60_000), redirect: 'error',
    })
    if (!response.ok) throw new ApiError(502, '写真をアップロードできませんでした。もう一度お試しください。')
    return registered.file_id
  }

  async function readImages(req) {
    const contentType = req.headers['content-type'] || ''
    if (!contentType.startsWith('multipart/form-data;')) throw new ApiError(400, '写真を2枚選択してください。')
    if (Number(req.headers['content-length']) > maxBodySize) throw new ApiError(413, '写真の合計サイズが大きすぎます。')
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > maxBodySize) throw new ApiError(413, '写真の合計サイズが大きすぎます。')
      chunks.push(chunk)
    }
    let form
    try {
      form = await new Request('http://localhost/', {
        method: 'POST', headers: { 'Content-Type': contentType }, body: Buffer.concat(chunks),
      }).formData()
    } catch { throw new ApiError(400, '写真の送信形式が正しくありません。') }
    const category = form.get('category')
    if (!categories.has(category)) throw new ApiError(400, '服の種類を選択してください。')
    const files = [form.get('person'), form.get('garment')]
    for (const file of files) {
      if (!(file instanceof File) || file.size === 0 || file.size >= maxFileSize) {
        throw new ApiError(400, '写真はそれぞれ10MB未満のファイルを選択してください。')
      }
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
      const jpeg = file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      const png = file.type === 'image/png' && Buffer.from(bytes).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      if (!jpeg && !png) throw new ApiError(400, 'JPEGまたはPNGの写真を選択してください。')
    }
    return { person: files[0], garment: files[1], category }
  }

  return async function tryOnMiddleware(req, res, next) {
    const path = (req.url || '').split('?')[0]
    if (!path.startsWith('/api/try-on')) return next()
    const host = req.headers.host || ''
    const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
    if (!localHost || (req.headers.origin && req.headers.origin !== `http://${host}`)) {
      return reply(res, 403, { error: 'ローカルのアプリ画面から操作してください。' })
    }
    if (path === '/api/try-on/config' && req.method === 'GET') return reply(res, 200, { configured: Boolean(apiKey) })
    if (!apiKey) return reply(res, 503, { error: 'APIキーが未設定です。.env.localを設定して開発サーバーを再起動してください。' })

    for (const [id, task] of tasks) if (Date.now() - task.createdAt > taskLifetime) tasks.delete(id)
    try {
      if (path === '/api/try-on' && req.method === 'POST') {
        if (creating || [...tasks.values()].some((task) => task.pending)) {
          throw new ApiError(409, '別の試着画像を生成中です。完了をお待ちください。')
        }
        creating = true
        try {
          const { person, garment, category } = await readImages(req)
          const sourceId = await upload(person, person.type === 'image/png' ? 'person.png' : 'person.jpg')
          const referenceId = await upload(garment, garment.type === 'image/png' ? 'garment.png' : 'garment.jpg')
          const data = await request('/task/cloth-v4', {
            src_file_id: sourceId, ref_file_id: referenceId, garment_category: category,
            change_shoes: false, filter_multi_person: 'strict',
          })
          if (typeof data.task_id !== 'string' || !data.task_id) throw new ApiError(502, '生成タスクを開始できませんでした。')
          tasks.set(data.task_id, { createdAt: Date.now(), pending: true })
          return reply(res, 202, { taskId: data.task_id })
        } finally { creating = false }
      }
      const match = /^\/api\/try-on\/tasks\/([^/]+)$/.exec(path)
      if (match && req.method === 'GET') {
        const taskId = decodeURIComponent(match[1])
        const task = tasks.get(taskId)
        if (!task) throw new ApiError(404, '生成タスクが見つからないか、有効期限が切れています。')
        const data = await request(`/task/cloth-v4/${encodeURIComponent(taskId)}`)
        if (data.task_status === 'error') {
          task.pending = false
          const code = typeof data.error === 'string' ? data.error : data.error?.error_code || data.error?.code
          return reply(res, 200, { status: 'error', error: generationErrors[code] || '画像を生成できませんでした。写真を変えてお試しください。' })
        }
        if (data.task_status === 'success') {
          task.pending = false
          let url
          try { url = new URL(data.results?.url) } catch { /* handled below */ }
          if (url?.protocol !== 'https:') throw new ApiError(502, '生成画像のURLを取得できませんでした。')
          return reply(res, 200, { status: 'success', imageUrl: url.href })
        }
        return reply(res, 200, { status: 'running' })
      }
      return reply(res, 404, { error: 'このAPIは利用できません。' })
    } catch (error) {
      if (error instanceof ApiError) return reply(res, error.status, { error: error.message })
      return reply(res, 502, { error: '画像生成サービスに接続できませんでした。時間を置いてお試しください。' })
    }
  }
}
