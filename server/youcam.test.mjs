import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request as httpRequest } from 'node:http'
import { createTryOnMiddleware } from './youcam.mjs'

const key = 'test-key-never-return-to-browser'
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
const success = (data) => Response.json({ status: 200, data })

async function localApi(t, options) {
  const middleware = createTryOnMiddleware(options)
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end() }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve) }))
  return `http://127.0.0.1:${server.address().port}`
}

function photos({ category = 'upper_body', person = new File([png], 'original-name.png', { type: 'image/png' }) } = {}) {
  const form = new FormData()
  form.set('person', person)
  form.set('garment', new File([png], 'another-original.png', { type: 'image/png' }))
  form.set('category', category)
  return form
}

function provider({ state = 'success', failUpload = false } = {}) {
  const calls = []
  let files = 0
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    if (url.startsWith('https://storage.example/')) {
      assert.equal(new Headers(options.headers).has('Authorization'), false)
      assert.deepEqual(options.body, png)
      return new Response(null, { status: failUpload ? 500 : 200 })
    }
    assert.ok(url.startsWith('https://yce-api-01.makeupar.com/s2s/v2.0/'))
    assert.equal(options.headers.Authorization, `Bearer ${key}`)
    if (url.endsWith('/file')) {
      const body = JSON.parse(options.body)
      assert.equal(body.files[0].file_size, png.length)
      assert.equal(body.files[0].content_type, 'image/png')
      assert.ok(['person.png', 'garment.png'].includes(body.files[0].file_name))
      files++
      return success({ files: [{ file_id: `file-${files}`, requests: [{
        method: 'PUT', url: `https://storage.example/upload-${files}`,
        headers: { 'Content-Type': 'image/png', 'Content-Length': String(png.length) },
      }] }] })
    }
    if (options.method === 'POST') return success({ task_id: 'task-1' })
    if (state === 'error') return success({ task_status: 'error', error: { error_code: 'error_pose' } })
    if (state === 'running') return success({ task_status: 'running' })
    return success({ task_status: 'success', error: null, results: { url: 'https://storage.example/result.png' } })
  }
  return { calls, fetchImpl }
}

test('missing key is reported without contacting the provider or exposing a key', async (t) => {
  const base = await localApi(t, { fetchImpl: () => assert.fail('must not call provider') })
  assert.deepEqual(await fetch(`${base}/api/try-on/config`).then((r) => r.json()), { configured: false })
  const response = await fetch(`${base}/api/try-on`, { method: 'POST', body: photos() })
  assert.equal(response.status, 503)
})

test('uploads both images, creates the documented task, and returns the image URL', async (t) => {
  const mock = provider()
  const base = await localApi(t, { apiKey: key, fetchImpl: mock.fetchImpl })
  assert.deepEqual(await fetch(`${base}/api/try-on/config`).then((r) => r.json()), { configured: true })
  const response = await fetch(`${base}/api/try-on`, { method: 'POST', body: photos() })
  assert.equal(response.status, 202)
  assert.deepEqual(await response.json(), { taskId: 'task-1' })
  assert.deepEqual(JSON.parse(mock.calls[4].options.body), {
    src_file_id: 'file-1', ref_file_id: 'file-2', garment_category: 'upper_body',
    change_shoes: false, filter_multi_person: 'strict',
  })
  const result = await fetch(`${base}/api/try-on/tasks/task-1`).then((r) => r.json())
  assert.deepEqual(result, { status: 'success', imageUrl: 'https://storage.example/result.png' })
  assert.equal(JSON.stringify(result).includes(key), false)
})

test('blocks foreign origins and DNS rebinding hostnames before any paid calls', async (t) => {
  const base = await localApi(t, { apiKey: key, fetchImpl: () => assert.fail('must not call provider') })
  const foreign = await fetch(`${base}/api/try-on`, { method: 'POST', headers: { Origin: 'https://other.example' }, body: photos() })
  assert.equal(foreign.status, 403)
  const hostStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(`${base}/api/try-on/config`, { headers: { Host: 'other.example' } }, (response) => {
      response.resume()
      resolve(response.statusCode)
    })
    request.on('error', reject)
    request.end()
  })
  assert.equal(hostStatus, 403)
})

test('rejects invalid type, oversized files, invalid category, and malformed multipart before uploading', async (t) => {
  const base = await localApi(t, { apiKey: key, fetchImpl: () => assert.fail('must not call provider') })
  for (const body of [
    photos({ person: new File(['invalid'], 'fake.png', { type: 'image/png' }) }),
    photos({ person: new File([new Uint8Array(10_000_000)], 'too-big.png', { type: 'image/png' }) }),
    photos({ category: 'not-a-category' }),
  ]) {
    const response = await fetch(`${base}/api/try-on`, { method: 'POST', body })
    assert.equal(response.status, 400)
  }
  const invalid = await fetch(`${base}/api/try-on`, { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=invalid' }, body: 'broken' })
  assert.equal(invalid.status, 400)
})

test('failed image upload never starts a generation task and releases the busy state', async (t) => {
  const mock = provider({ failUpload: true })
  const base = await localApi(t, { apiKey: key, fetchImpl: mock.fetchImpl })
  for (let i = 0; i < 2; i++) {
    const response = await fetch(`${base}/api/try-on`, { method: 'POST', body: photos() })
    assert.equal(response.status, 502)
  }
  assert.equal(mock.calls.some((call) => call.url.includes('/task/')), false)
})

test('pending tasks block duplicate generation and unknown task IDs are not proxied', async (t) => {
  const mock = provider({ state: 'running' })
  const base = await localApi(t, { apiKey: key, fetchImpl: mock.fetchImpl })
  await fetch(`${base}/api/try-on`, { method: 'POST', body: photos() })
  assert.deepEqual(await fetch(`${base}/api/try-on/tasks/task-1`).then((r) => r.json()), { status: 'running' })
  const duplicate = await fetch(`${base}/api/try-on`, { method: 'POST', body: photos() })
  assert.equal(duplicate.status, 409)
  const count = mock.calls.length
  assert.equal((await fetch(`${base}/api/try-on/tasks/someone-elses-task`)).status, 404)
  assert.equal(mock.calls.length, count)
})

test('generation error is readable and allows a new generation', async (t) => {
  const mock = provider({ state: 'error' })
  const base = await localApi(t, { apiKey: key, fetchImpl: mock.fetchImpl })
  await fetch(`${base}/api/try-on`, { method: 'POST', body: photos() })
  const result = await fetch(`${base}/api/try-on/tasks/task-1`).then((r) => r.json())
  assert.equal(result.status, 'error')
  assert.match(result.error, /姿勢/)
  assert.equal((await fetch(`${base}/api/try-on`, { method: 'POST', body: photos() })).status, 202)
})

test('provider authentication errors are sanitized and a failed request can be retried', async (t) => {
  const base = await localApi(t, { apiKey: key, fetchImpl: async () => Response.json({ status: 401, error: key }, { status: 401 }) })
  for (let i = 0; i < 2; i++) {
    const response = await fetch(`${base}/api/try-on`, { method: 'POST', body: photos() })
    assert.equal(response.status, 502)
    const body = await response.text()
    assert.match(body, /認証/)
    assert.equal(body.includes(key), false)
  }
})
