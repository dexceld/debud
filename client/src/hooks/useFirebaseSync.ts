import { useEffect, useRef, useState } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DEBOUNCE_MS = 1500

// ── Sync status tracking ──
// Possible: 'idle' | 'loading' | 'saving' | 'saved' | 'load_error' | 'save_error' | 'ok'
let _syncStatus = 'idle'
let _syncError = ''
let _syncListeners = new Set<(s: string) => void>()
let _loadCount = 0
let _loadDone = 0

function setSyncStatus(s: string, err = '') {
  _syncStatus = s
  _syncError = err
  _syncListeners.forEach(fn => fn(s))
}

export function useSyncStatus(): { status: string; error: string } {
  const [status, setStatus] = useState(_syncStatus)
  useEffect(() => {
    const handler = (s: string) => setStatus(s)
    _syncListeners.add(handler)
    return () => { _syncListeners.delete(handler) }
  }, [])
  return { status, error: _syncError }
}

// ── Firestore health check ──
export async function firestoreHealthCheck(uid: string): Promise<string> {
  if (!uid || uid === 'local') return 'skip (local mode)'
  try {
    const testRef = doc(db, 'users', uid, 'data', '_health_check')
    const ts = Date.now()
    console.log('[sync] Health check: writing test doc...')
    await setDoc(testRef, { value: ts, ts: new Date().toISOString() })
    console.log('[sync] Health check: write OK, reading back...')
    const snap = await getDoc(testRef)
    if (snap.exists() && snap.data().value === ts) {
      console.log('[sync] Health check: PASS ✓')
      return 'pass'
    } else {
      console.error('[sync] Health check: read mismatch', snap.data())
      return 'fail: read mismatch'
    }
  } catch (err: any) {
    const msg = err?.code || err?.message || String(err)
    console.error('[sync] Health check FAILED:', msg)
    return `fail: ${msg}`
  }
}

// ── Flush pending saves ──
const pendingSaves: Map<string, () => void> = new Map()
const pendingWrites: Map<string, { uid: string; key: string; value: unknown }> = new Map()

export async function flushAllSaves(): Promise<void> {
  pendingSaves.forEach(fn => fn())
  pendingSaves.clear()
  const writes = Array.from(pendingWrites.values()).map(({ uid, key, value }) =>
    setDoc(doc(db, 'users', uid, 'data', key), { value }).catch(err => console.error('Flush save error:', key, err))
  )
  pendingWrites.clear()
  await Promise.all(writes)
}

// ── Main sync hook ──
export function useFirebaseSync(uid: string | null, key: string, value: unknown, onLoad: (v: unknown) => void) {
  const loadedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef(value)
  latestValueRef.current = value
  const latestUidRef = useRef(uid)
  latestUidRef.current = uid
  const firstSaveBlockedRef = useRef(true)

  // Load once on mount / uid change
  useEffect(() => {
    if (!uid || uid === 'local') return
    loadedRef.current = false
    firstSaveBlockedRef.current = false
    _loadCount++
    setSyncStatus('loading')
    console.log('[sync] loading', key, 'for uid', uid?.slice(0,8))

    getDoc(doc(db, 'users', uid, 'data', key))
      .then(snap => {
        if (snap.exists()) {
          console.log('[sync] loaded', key, '- doc exists')
          onLoad(snap.data().value)
          firstSaveBlockedRef.current = true // only block echo if we actually loaded data
        } else {
          console.log('[sync] loaded', key, '- doc does NOT exist, no echo to block')
          firstSaveBlockedRef.current = false
        }
        loadedRef.current = true
        _loadDone++
        if (_loadDone >= _loadCount) setSyncStatus('ok')
      })
      .catch(err => {
        const msg = err?.code || err?.message || String(err)
        console.error('[sync] LOAD error:', key, msg)
        loadedRef.current = true
        firstSaveBlockedRef.current = false
        _loadDone++
        setSyncStatus('load_error', `טעינה נכשלה (${key}): ${msg}`)
      })
  }, [uid, key])

  // Save debounced on value change
  useEffect(() => {
    if (!uid || uid === 'local' || !loadedRef.current) return

    // Skip the first save after load (it's just the loaded data echoing back)
    if (firstSaveBlockedRef.current) {
      firstSaveBlockedRef.current = false
      console.log('[sync] skip echo-back save for', key)
      return
    }

    console.log('[sync] scheduling save for', key)
    if (timerRef.current) clearTimeout(timerRef.current)
    pendingWrites.set(key, { uid, key, value })

    const doSave = () => {
      const u = latestUidRef.current
      const v = latestValueRef.current
      if (!u || u === 'local') return
      console.log('[sync] SAVING', key, 'to Firestore')
      setSyncStatus('saving')
      setDoc(doc(db, 'users', u, 'data', key), { value: v })
        .then(() => {
          console.log('[sync] SAVED', key, 'OK')
          setSyncStatus('saved')
          setTimeout(() => { if (_syncStatus === 'saved') setSyncStatus('ok') }, 2000)
        })
        .catch(err => {
          const msg = err?.code || err?.message || String(err)
          console.error('[sync] SAVE ERROR:', key, msg)
          setSyncStatus('save_error', `שמירה נכשלה (${key}): ${msg}`)
        })
      pendingSaves.delete(key)
      pendingWrites.delete(key)
    }

    pendingSaves.set(key, doSave)
    timerRef.current = setTimeout(doSave, DEBOUNCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [uid, key, value])
}
