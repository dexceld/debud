import { useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from './firebase'
import MobileDashboard from './components/MobileDashboard'
import { LoginScreen } from './components/LoginScreen'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null | 'loading'>('loading')

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  if (user === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#667eea' }}>
        <div style={{ color: 'white', fontSize: 32 }}>💰</div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <div className="app">
      <MobileDashboard uid={user.uid} userEmail={user.email ?? ''} />
    </div>
  )
}

export default App
