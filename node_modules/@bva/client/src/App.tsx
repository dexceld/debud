import { useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from './firebase'
import MobileDashboard from './components/MobileDashboard'
import { LoginScreen } from './components/LoginScreen'
import type { Lang } from './i18n/timeTracking'
import './App.css'

const detectLang = (): Lang => {
  const saved = localStorage.getItem('bva_lang')
  if (saved === 'he' || saved === 'en') return saved
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const loc = (navigator.language || '').toLowerCase()
    if (tz === 'Asia/Jerusalem' || loc.startsWith('he')) return 'he'
  } catch {}
  return 'en'
}

function App() {
  const [user, setUser] = useState<User | null | 'loading'>('loading')
  const [localMode, setLocalMode] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lang, setLang] = useState<Lang>(detectLang)

  const handleLangChange = (l: Lang) => {
    setLang(l)
    localStorage.setItem('bva_lang', l)
  }

  useEffect(() => {
    const saved = localStorage.getItem('bva_local_mode')
    if (saved === 'true') setLocalMode(true)
    const goOffline = () => setIsOnline(false)
    const goOnline = () => setIsOnline(true)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  if (user === 'loading' && !localMode) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#667eea' }}>
        <div style={{ color: 'white', fontSize: 32 }}>💰</div>
      </div>
    )
  }

  if (!user && !localMode) return <LoginScreen onLocalMode={() => { setLocalMode(true); localStorage.setItem('bva_local_mode', 'true') }} lang={lang} onLangChange={handleLangChange} />

  return (
    <div className="app">
      {!isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#1f2937', color: 'white',
          padding: '10px 16px', textAlign: 'center',
          fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          <span>📡</span> אין חיבור לאינטרנט — הנתונים יסונכרנו כשהחיבור יחזור
        </div>
      )}
      <MobileDashboard 
        uid={localMode ? 'local' : (user && user !== 'loading' ? user.uid : '')} 
        userEmail={localMode ? 'local' : (user && user !== 'loading' ? user.email ?? '' : '')} 
        userPhoto={localMode ? '' : (user && user !== 'loading' ? user.photoURL ?? '' : '')}
        isLocalMode={localMode}
        lang={lang}
        onLangChange={handleLangChange}
      />
    </div>
  )
}

export default App
