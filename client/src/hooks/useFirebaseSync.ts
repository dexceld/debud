import { useEffect, useRef } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DEBOUNCE_MS = 1500

// Registry of pending saves so we can flush them before logout
const pendingSaves: Map<string, () => void> = new Map()

export function flushAllSaves(): Promise<void[]> {
  const promises: Promise<void>[] = []
  pendingSaves.forEach(fn => { fn(); promises.push(Promise.resolve()) })
  pendingSaves.clear()
  return Promise.all(promises)
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
    }).catch(err => console.error('Firebase load error:', err))
  }, [uid, key])

  // Save debounced on value change (skip if local mode)
  useEffect(() => {
    if (!uid || uid === 'local' || !loadedRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)

    const doSave = () => {
      const u = latestUidRef.current
      const v = latestValueRef.current
      if (!u || u === 'local') return
      setDoc(doc(db, 'users', u, 'data', key), { value: v }).catch(err => console.error('Firebase save error:', err))
      pendingSaves.delete(key)
    }

    pendingSaves.set(key, doSave)
    timerRef.current = setTimeout(doSave, DEBOUNCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [uid, key, value])
}
