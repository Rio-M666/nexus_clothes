export const categoryNames = { upper_body: 'トップス', lower_body: 'ボトムス', full_body: '全身のコーデ' }
export type Category = keyof typeof categoryNames
export type SavedLook = { id: string; image: Blob; category: Category; savedAt: number; name?: string }

export type WardrobeItem = { id: string; name: string; photo: File }
type StoreName = 'saved-looks' | 'bottoms'

async function accessStore<T>(name: StoreName, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('nexus-clothes', 2)
    request.onupgradeneeded = ({ oldVersion }) => {
      if (oldVersion < 1) request.result.createObjectStore('saved-looks', { keyPath: 'id' })
      if (oldVersion < 2) request.result.createObjectStore('bottoms', { keyPath: 'id' })
    }
    let blocked = false
    request.onblocked = () => {
      blocked = true
      reject(new Error('別のタブが保存領域を使用しています。'))
    }
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return }
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
  })
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(name, mode)
      const request = operation(transaction.objectStore(name))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error ?? request.error)
    })
  } finally {
    db.close()
  }
}

export function listLooks(): Promise<SavedLook[]> {
  return accessStore('saved-looks', 'readonly', (store) => store.getAll())
}

export async function addLook(look: SavedLook) {
  try {
    await accessStore('saved-looks', 'readwrite', (store) => store.add(look))
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'ConstraintError')) throw cause
  }
}

export function deleteLook(id: string) {
  return accessStore('saved-looks', 'readwrite', (store) => store.delete(id))
}


export function listWardrobe(): Promise<WardrobeItem[]> {
  return accessStore('bottoms', 'readonly', (store) => store.getAll())
}

export function addWardrobeItem(item: WardrobeItem) {
  return accessStore('bottoms', 'readwrite', (store) => store.add(item))
}

export async function updateWardrobeItem(item: WardrobeItem) {
  // Read and update in the same transaction so an edit cannot recreate a deleted item.
  const cursor = await accessStore('bottoms', 'readwrite', (store) => {
    const request = store.openCursor(item.id)
    request.addEventListener('success', () => request.result?.update(item))
    return request
  })
  if (!cursor) throw new Error('登録した洋服が見つかりません。')
}

export function deleteWardrobeItem(id: string) {
  return accessStore('bottoms', 'readwrite', (store) => store.delete(id))
}
