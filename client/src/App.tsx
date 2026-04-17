import { useState, useEffect } from 'react'
import BudgetMatrix from './components/BudgetMatrix'
import MobileDashboard from './components/MobileDashboard'
import './App.css'

function App() {
  // Check if mobile by smaller dimension (handles landscape)
  const isMobileDevice = () => Math.min(window.innerWidth, window.innerHeight) < 768
  const [isMobile, setIsMobile] = useState(() => isMobileDevice())

  useEffect(() => {
    const handler = () => setIsMobile(isMobileDevice())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="app">
      {isMobile ? <MobileDashboard /> : <BudgetMatrix />}
    </div>
  )
}

export default App
