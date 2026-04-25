import { useEffect, useRef } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DEBOUNCE_MS = 1500

// Registry of pending saves so we can flush them before logout
const pendingSaves: Map<string, () => void> = new Map()

// Pending writes keyed by data key → { uid, key, value }
const pendingWrites: Map<string, { uid: string; key: string; value: unknown }> = new Map()

export async function flushAllSaves(): Promise<void> {
  // Execute all registered save functions
  pendingSaves.forEach(fn => fn())
  pendingSaves.clear()
  // Also force-write any pending data
  const writes = Array.from(pendingWrites.values()).map(({ uid, key, value }) =>
    setDoc(doc(db, 'users', uid, 'data', key), { value }).catch(err => console.error('Flush save error:', key, err))
  )
  pendingWrites.clear()
  await Promise.all(writes)
}

export function useFirebaseSync(uid: string | null, key: string, value: unknown, onLoad: (v: unknown) => void) {
  const loadedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef(value)
  latestValueRef.current = value
  const latestUidRef = useRef(uid)
  latestUidRef.current = uid

  // Load once on mount / uid change (skip if local mode)
  useEffect(() => {
    if (!uid || uid === 'local') return
    loadedRef.current = false
    getDoc(doc(db, 'users', uid, 'data', key)).then(snap => {
      if (snap.exists()) onLoad(snap.data().value)
      loadedRef.current = true
    }).catch(err => {
      console.error('Firebase load error:', key, err)
      // Still allow saves even if initial load failed
      loadedRef.current = true
    })
  }, [uid, key])

  // Save debounced on value change (skip if local mode)
  useEffect(() => {
    if (!uid || uid === 'local' || !loadedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)

    // Track latest value for flush
    if (uid && uid !== 'local') {
      pendingWrites.set(key, { uid, key, value })
    }

    const doSave = () => {
      const u = latestUidRef.current
      const v = latestValueRef.current
      if (!u || u === 'local') return
      setDoc(doc(db, 'users', u, 'data', key), { value: v }).catch(err => console.error('Firebase save error:', key, err))
      pendingSaves.delete(key)
      pendingWrites.delete(key)
    }

    pendingSaves.set(key, doSave)
    timerRef.current = setTimeout(doSave, DEBOUNCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [uid, key, value])
}
