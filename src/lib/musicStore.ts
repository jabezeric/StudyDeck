/**
 * Local audio library. Files never leave the machine: they live in IndexedDB as
 * blobs so the playlist survives a reload without any upload.
 */
const DB_NAME = 'studydeck-music'
const STORE = 'tracks'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local music storage'))
  })
}

export async function saveTrackFile(id: string, file: Blob): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(file, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not store the audio file'))
  })
  db.close()
}

export async function getTrackFile(id: string): Promise<Blob | undefined> {
  const db = await openDb()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error ?? new Error('Could not read the audio file'))
  })
  db.close()
  return blob
}

export async function deleteTrackFile(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not delete the audio file'))
  })
  db.close()
}
