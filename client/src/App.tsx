import { useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from './firebase'
import MobileDashboard from './components/MobileDashboard'
import { LoginScreen } from './components/LoginScreen'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null | 'loading'>('loading')
  const [localMode, setLocalMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('bva_local_mode')
    if (saved === 'true') setLocalMode(true)
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  if (user === 'loading' && !localMode) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#667eea' }}>
        <div style={{ color: 'white', fontSize: 32 }}>💰</div>
      </div>
    )
  }

  if (!user && !localMode) return <LoginScreen onLocalMode={() => { setLocalMode(true); localStorage.setItem('bva_local_mode', 'true') }} />

  return (
    <div className="app">
      <MobileDashboard 
        uid={localMode ? 'local' : (user && user !== 'loading' ? user.uid : '')} 
        userEmail={localMode ? 'local' : (user && user !== 'loading' ? user.email ?? '' : '')} 
        isLocalMode={localMode}
      />
    </div>
  )
}

export default App
