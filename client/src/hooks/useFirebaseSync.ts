import { useEffect, useRef } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DEBOUNCE_MS = 1500

export function useFirebaseSync(uid: string | null, key: string, value: unknown, onLoad: (v: unknown) => void) {
  const loadedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    timerRef.current = setTimeout(() => {
      setDoc(doc(db, 'users', uid, 'data', key), { value }).catch(err => console.error('Firebase save error:', err))
    }, DEBOUNCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [uid, key, value])
}
