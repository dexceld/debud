import React, { useState, useEffect, useRef } from 'react'
import './MobileDashboard.css'

type Category = {
  id: string
  groupId: string
  name: string
  budget: number
}

type Group = {
  id: string
  name: string
  color: string
  icon: string
}

const initialGroups: Group[] = [
  { id: 'g1', name: 'דיור',           color: '#E0F2FE', icon: '🏠' },
  { id: 'g2', name: 'רכב',            color: '#FEF3C7', icon: '🚗' },
  { id: 'g4', name: 'עלויות כלליות', color: '#FCE7F3', icon: '🛒' },
  { id: 'g6', name: 'בריאות',         color: '#E0E7FF', icon: '🏥' },
  { id: 'g5', name: 'הכנסות',         color: '#D1FAE5', icon: '💰' },
]

const initialCategories: Category[] = [
  // דיור
  { id: 'c1', groupId: 'g1', name: 'משכנתא', budget: 4500 },
  { id: 'c1b', groupId: 'g1', name: 'שכ"ד', budget: 0 },
  { id: 'c1c', groupId: 'g1', name: 'מים', budget: 150 },
  { id: 'c2', groupId: 'g1', name: 'ארנונה', budget: 450 },
  { id: 'c3', groupId: 'g1', name: 'חשמל', budget: 450 },
  { id: 'c3b', groupId: 'g1', name: 'גז', budget: 80 },
  { id: 'c3c', groupId: 'g1', name: 'אינטרנט', budget: 100 },
  { id: 'c3d', groupId: 'g1', name: 'דיסני פלוס', budget: 35 },
  { id: 'c3e', groupId: 'g1', name: 'סלקום', budget: 200 },
  // רכב
  { id: 'c4', groupId: 'g2', name: 'דלק', budget: 2750 },
  { id: 'c5', groupId: 'g2', name: 'טיפולים', budget: 112 },
  // עלויות כלליות
  { id: 'c20', groupId: 'g4', name: 'מזון', budget: 4000 },
  { id: 'c21', groupId: 'g4', name: 'הלוואות', budget: 364 },
  // בריאות
  { id: 'c24', groupId: 'g6', name: 'ביטוח בריאות', budget: 400 },
  { id: 'c25', groupId: 'g6', name: 'קופ"ח', budget: 120 },
  // הכנסות
  { id: 'c23', groupId: 'g5', name: 'משכורת', budget: -15000 },
]

const generateMonths = () => {
  const months: string[] = []
  const startYear = 2026
  const startMonth = 1
  for (let i = 0; i < 48; i++) {
    const month = ((startMonth - 1 + i) % 12) + 1
    const year = startYear + Math.floor((startMonth - 1 + i) / 12)
    months.push(`${month.toString().padStart(2, '0')}/${(year % 100).toString().padStart(2, '0')}`)
  }
  return months
}

const allMonths = generateMonths()
const months = allMonths.slice(2)

const getCurrentMonth = (): string => {
  const now = new Date()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const year = now.getFullYear().toString().slice(-2)
  return `${month}/${year}`
}

type Screen = 'home' | 'detail' | 'update' | 'chart' | 'forecast' | 'budget' | 'forecast-chart' | 'net-chart'

type ForecastSnapshot = {
  label: string
  date: string
  data: Record<string, number> // month -> running balance
}

export default function MobileDashboard() {
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem('groups')
    return saved ? JSON.parse(saved) : initialGroups
  })
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('categories')
    return saved ? JSON.parse(saved) : initialCategories
  })
  const [forecasts, setForecasts] = useState<Record<string, Record<string, number>>>(() => {
    const saved = localStorage.getItem('forecasts')
    return saved ? JSON.parse(saved) : {}
  })
  const [forecastSnapshots, setForecastSnapshots] = useState<ForecastSnapshot[]>(() => {
    const saved = localStorage.getItem('forecast_snapshots')
    return saved ? JSON.parse(saved) : []
  })
  const [saveFeedback, setSaveFeedback] = useState(false)
  const [actuals, setActuals] = useState<Record<string, Record<string, number>>>(() => {
    const saved = localStorage.getItem('actuals')
    return saved ? JSON.parse(saved) : {}
  })

  const currentMonth = getCurrentMonth()
  const currentIdx = months.indexOf(currentMonth)
  const visibleMonths = months.slice(
    Math.max(0, currentIdx),
    Math.min(months.length, Math.max(0, currentIdx) + 3)
  )
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [updateAmount, setUpdateAmount] = useState('')
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [menuCatId, setMenuCatId] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const [quickNewName, setQuickNewName] = useState('')
  const [quickNewGroupId, setQuickNewGroupId] = useState('g4')
  const [quickForecastOnly, setQuickForecastOnly] = useState(false)
  const [homeView, setHomeView] = useState<'actual' | 'monthly'>(
    () => (localStorage.getItem('home_view') as 'actual' | 'monthly') || 'actual'
  )
  const [catMgmtOpen, setCatMgmtOpen] = useState(false)
  const [catUsage, setCatUsage] = useState<Record<string, number>>(
    () => JSON.parse(localStorage.getItem('cat_usage') || '{}')
  )
  const [quickPreOpenCat, setQuickPreOpenCat] = useState<{ catId: string; month: string } | null>(null)
  const [inlineSheet, setInlineSheet] = useState<{ cat: Category; month: string; forecastOnly: boolean } | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [viewMonthIdx, setViewMonthIdx] = useState(() => {
    const idx = months.indexOf(getCurrentMonth())
    return idx >= 0 ? idx : 0
  })
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const touchStartX = { current: 0 }

  // Group ordering state (Income g5 first, then others)
  const [groupOrder, setGroupOrder] = useState<string[]>([
    'g5', 'g1', 'g2', 'g4', 'g6'
  ])

  // Trap Android back button — go to home instead of exiting
  useEffect(() => {
    const pushState = () => window.history.pushState({ page: 'app' }, '')
    pushState()
    const onPopState = () => {
      if (inlineSheet) {
        setInlineSheet(null)
      } else if (quickAddOpen) {
        setQuickAddOpen(false)
        setQuickPreOpenCat(null)
      } else if (screen !== 'home') {
        setScreen('home')
      }
      // Always push a new state so next back press is also caught
      pushState()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [screen, quickAddOpen, inlineSheet])

  useEffect(() => {
    localStorage.setItem('forecast_snapshots', JSON.stringify(forecastSnapshots))
  }, [forecastSnapshots])

  useEffect(() => {
    localStorage.setItem('actuals', JSON.stringify(actuals))
  }, [actuals])

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories))
  }, [categories])

  useEffect(() => {
    localStorage.setItem('forecasts', JSON.stringify(forecasts))
  }, [forecasts])

  useEffect(() => {
    localStorage.setItem('groups', JSON.stringify(groups))
  }, [groups])

  const getForecastValue = (cat: Category, month: string): number => {
    const monthForecast = forecasts[cat.id]?.[month]
    if (monthForecast !== undefined) return Math.abs(monthForecast)
    return Math.abs(cat.budget)
  }

  const getActualValue = (catId: string, month: string): number | null => {
    const val = actuals[catId]?.[month]
    if (val === undefined || val === null) return null
    return val // preserve sign - income is negative, expense is positive
  }

  const hasActual = (catId: string, month: string): boolean =>
    actuals[catId]?.[month] !== undefined

  const getMonthTotals = (month: string) => {
    let income = 0, expense = 0
    for (const cat of categories) {
      const actual = getActualValue(cat.id, month)
      const forecast = getForecastValue(cat, month)
      // Get absolute value (positive)
      const val = actual !== null ? Math.abs(actual) : forecast
      if (cat.groupId === 'g5') income += val  // Income adds to balance
      else expense += val  // Expense subtracts from balance
    }
    // net: positive = surplus (income > expense), negative = deficit (expense > income)
    return { income, expense, net: income - expense }
  }

  const saveSnapshot = () => {
    const now = new Date()
    const label = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
    const data: Record<string, number> = {}
    months.forEach(m => { data[m] = getRunningBalance(m) })
    setForecastSnapshots(prev => [...prev.slice(-4), { label, date: now.toISOString(), data }])
    // Show save feedback
    setSaveFeedback(true)
    setTimeout(() => setSaveFeedback(false), 1500)
  }

  const getRunningBalance = (upToMonth: string): number => {
    const endIdx = months.indexOf(upToMonth)
    if (endIdx < 0) return 0
    
    // Calculate cumulative balance from first month (index 0) up to endIdx
    let balance = 0
    for (let i = 0; i <= endIdx; i++) {
      const t = getMonthTotals(months[i])
      balance += t.net
    }
    return balance
  }

  const toggleGroup = (gId: string) => {
    setExpandedGroups((prev) => {
      const n = new Set(prev)
      n.has(gId) ? n.delete(gId) : n.add(gId)
      return n
    })
  }

  const openQuickAdd = () => {
    setQuickSearch('')
    setQuickNewName('')
    setQuickNewGroupId('g4')
    setUpdateAmount('')
    setQuickForecastOnly(false)
    setQuickAddOpen(true)
  }

  const addNewCategoryAndUpdate = () => {
    if (!quickNewName.trim()) return
    const newCat: Category = {
      id: `c_${Date.now()}`,
      groupId: quickNewGroupId,
      name: quickNewName.trim(),
      budget: Number(updateAmount) || 0,
    }
    const isIncome = newCat.groupId === 'g5'
    const signedAmount = isIncome ? -Math.abs(Number(updateAmount)) : Math.abs(Number(updateAmount))
    setCategories((prev) => [...prev, newCat])
    setActuals((prev) => ({
      ...prev,
      [newCat.id]: { [currentMonth]: signedAmount },
    }))
    setQuickAddOpen(false)
    setQuickNewName('')
  }

  const trackCatUsage = (catId: string) => {
    setCatUsage(prev => {
      const next = { ...prev, [catId]: (prev[catId] || 0) + 1 }
      localStorage.setItem('cat_usage', JSON.stringify(next))
      return next
    })
  }

  const openUpdate = (cat: Category, month: string, mode: 'add' | 'replace' | 'forecast' = 'replace') => {
    setInlineSheet({ cat, month, forecastOnly: mode === 'forecast' })
  }


  const deleteCategory = (catId: string) => {
    if (confirm('האם למחוק הוצאה זו?')) {
      setCategories((prev) => prev.filter((c) => c.id !== catId))
      setActuals((prev) => { const n = { ...prev }; delete n[catId]; return n })
      setMenuCatId(null)
    }
  }

  const handleLongPressStart = (catId: string) => {
    const t = setTimeout(() => setMenuCatId(catId), 500)
    setLongPressTimer(t)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null) }
  }

  const DexcelLogo = () => (
    <div className="m-logo-block" onClick={() => { setScreen('home'); setExpandedGroups(new Set()); setViewMonthIdx(months.indexOf(currentMonth) >= 0 ? months.indexOf(currentMonth) : 0) }} style={{ cursor: 'pointer' }}>
      <svg width="36" height="26" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dg1" x1="0" y1="0" x2="100" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#cc22ff"/><stop offset="100%" stopColor="#3333cc"/>
          </linearGradient>
          <linearGradient id="dg2" x1="100" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#aa22ee"/><stop offset="100%" stopColor="#2244bb"/>
          </linearGradient>
        </defs>
        {/* D shape — rounded right side, open left */}
        <path d="M8 10 L8 130 L14 130 L14 20 L44 20 Q80 20 80 70 Q80 120 44 120 L14 120 L14 130 L46 130 Q96 130 96 70 Q96 10 46 10 Z" fill="url(#dg1)" strokeWidth="0"/>
        {/* X shape — two crossing strokes */}
        <path d="M108 10 L128 10 L164 58 L200 10 L200 22 L170 62 L200 112 L200 130 L164 130 L140 92 L108 130 L108 118 L136 80 L108 28 Z" fill="url(#dg2)"/>
      </svg>
      <div className="m-logo-text">
        <span className="m-logo-name">DEXCEL</span>
        <span className="m-logo-sub">מבית דקסל</span>
      </div>
    </div>
  )

  // helper for accordion content (shared between HomeScreen summary and BudgetScreen)
  const AccordionContent = ({ vm }: { vm: string }) => {
    const orderedGroups = groupOrder.map(id => groups.find(g => g.id === id)!).filter(Boolean)
    const incomeCats = categories.filter((c) => c.groupId === 'g5')
    const incomeBudget = incomeCats.reduce((s, c) => s + getForecastValue(c, vm), 0)
    const incomeActual = incomeCats.reduce((s, c) => {
      const a = getActualValue(c.id, vm); return s + (a !== null ? a : getForecastValue(c, vm))
    }, 0)
    const incomeDiff = incomeActual - incomeBudget
    const incomeExpanded = expandedGroups.has('g5')
    return (
      <>
        <div className="m-acc-col-header m-acc-col-header-global">
          <span className="m-acc-col-name"></span>
          <span className="m-acc-col-val">תחזית</span>
          <span className="m-acc-col-val">בפועל</span>
          <span className="m-acc-col-val">פער</span>
        </div>
        <div className={`m-acc-content ${slideDir ? 'slide-' + slideDir : ''}`}>
          {/* Income */}
          <div className="m-accordion-group m-income-group">
            <button className="m-accordion-header m-income-header" onClick={() => toggleGroup('g5')}>
              <div className="m-acc-left">
                <span className="m-acc-arrow">{incomeExpanded ? '▾' : '▸'}</span>
                <span className="m-acc-income-badge">הכנסות</span>
              </div>
              <div className="m-acc-right">
                <span className="m-acc-budget">&#x202A;{incomeBudget.toLocaleString()}&#x202C;</span>
                <span className={`m-acc-actual ${incomeDiff < 0 ? 'over' : incomeDiff > 0 ? 'under' : ''}`}>&#x202A;{incomeActual.toLocaleString()}&#x202C;</span>
                <span className={`m-acc-diff ${incomeDiff < 0 ? 'over' : incomeDiff > 0 ? 'under' : 'even'}`}>{incomeDiff > 0 ? '+' : ''}{incomeDiff.toLocaleString()}</span>
              </div>
            </button>
            {incomeExpanded && (
              <div className="m-accordion-body">
                {incomeCats.map((cat) => {
                  const b = getForecastValue(cat, vm), a = getActualValue(cat.id, vm), d = (a ?? b) - b
                  return (
                    <button key={cat.id} className="m-acc-row" onClick={() => openUpdate(cat, vm)}>
                      <span className="m-acc-cat-name">{cat.name}</span>
                      <span className="m-acc-col-val muted">&#x202A;{b.toLocaleString()}&#x202C;</span>
                      <span className={`m-acc-col-val ${a !== null ? 'blue' : 'muted'}`}>&#x202A;{(a ?? b).toLocaleString()}&#x202C;</span>
                      <span className={`m-acc-col-val ${d > 0 ? 'under' : d < 0 ? 'over' : 'even'}`}>{d !== 0 ? `‎${d > 0 ? '+' : ''}${d.toLocaleString()}` : '—'}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {orderedGroups.filter(g => g.id !== 'g5').map((g) => {
            const gc = categories.filter((c) => c.groupId === g.id)
            const gb = gc.reduce((s, c) => s + getForecastValue(c, vm), 0)
            const ga = gc.reduce((s, c) => { const a = getActualValue(c.id, vm); return s + (a !== null ? a : getForecastValue(c, vm)) }, 0)
            const gd = ga - gb
            const expanded = expandedGroups.has(g.id)
            return (
              <div key={g.id} className="m-accordion-group">
                <button className="m-accordion-header" onClick={() => toggleGroup(g.id)}>
                  <div className="m-acc-left">
                    <span className="m-acc-arrow">{expanded ? '▾' : '▸'}</span>
                    <span className="m-acc-name">{g.name}</span>
                  </div>
                  <div className="m-acc-right">
                    <span className="m-acc-budget">&#x202A;{gb.toLocaleString()}&#x202C;</span>
                    <span className={`m-acc-actual ${gd > 0 ? 'over' : gd < 0 ? 'under' : ''}`}>&#x202A;{ga.toLocaleString()}&#x202C;</span>
                    <span className={`m-acc-diff ${gd > 0 ? 'over' : gd < 0 ? 'under' : 'even'}`}>{gd > 0 ? '+' : ''}{gd.toLocaleString()}</span>
                  </div>
                </button>
                {expanded && (
                  <div className="m-accordion-body">
                    {gc.map((cat) => {
                      const b = getForecastValue(cat, vm), a = getActualValue(cat.id, vm), d = (a ?? b) - b
                      return (
                        <button key={cat.id} className="m-acc-row" onClick={() => openUpdate(cat, vm)}>
                          <span className="m-acc-cat-name">{cat.name}</span>
                          <span className="m-acc-col-val muted">&#x202A;{b.toLocaleString()}&#x202C;</span>
                          <span className={`m-acc-col-val ${a !== null ? 'blue' : 'muted'}`}>&#x202A;{(a ?? b).toLocaleString()}&#x202C;</span>
                          <span className={`m-acc-col-val ${d > 0 ? 'over' : d < 0 ? 'under' : 'even'}`}>{d !== 0 ? `‎${d > 0 ? '+' : ''}${d.toLocaleString()}` : '—'}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // --- HOME SCREEN ---
  const HomeScreen = () => {
    const vm = months[viewMonthIdx] || currentMonth
    const { net } = getMonthTotals(vm)
    // Use running balance (cumulative from month 0)
    const forecastBalance = getRunningBalance(vm)
    const monthLabel = new Date(2000 + Number(vm.slice(3)), Number(vm.slice(0,2)) - 1)
      .toLocaleString('he-IL', { month: 'long', year: 'numeric' })
    const goMonth = (dir: 'prev' | 'next') => {
      const newIdx = dir === 'prev' ? viewMonthIdx - 1 : viewMonthIdx + 1
      if (newIdx >= 0 && newIdx < months.length) setViewMonthIdx(newIdx)
    }
    // months to show in monthly view — current + next 2
    const monthCols = [viewMonthIdx, viewMonthIdx + 1, viewMonthIdx + 2]
      .filter(i => i >= 0 && i < months.length)
      .map(i => months[i])

    return (
      <div className="m-screen">
        <div className="m-header">
          <DexcelLogo />
          <div className="m-header-actions">
            <button className="m-hbtn m-hbtn-gear" onClick={() => setCatMgmtOpen(true)}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
              <span className="m-hbtn-label">הגדרות</span>
            </button>
            <button className="m-hbtn m-hbtn-shekel" onClick={() => { setQuickSearch(''); setUpdateAmount(''); setQuickForecastOnly(true); setQuickAddOpen(true) }}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
              <span className="m-hbtn-label">תחזית</span>
            </button>
            <button className="m-hbtn m-hbtn-plus" onClick={openQuickAdd}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              <span className="m-hbtn-label">הוצאה</span>
            </button>
          </div>
        </div>

        <div className="m-home-scroll">
        {/* Month navigator — only in actual vs forecast view */}
        {homeView === 'actual' && (
        <div className="m-home-nav">
          <button className="m-nav-btn" disabled={viewMonthIdx === 0} onClick={() => goMonth('prev')}>‹</button>
          <div className="m-home-month-label">{monthLabel}</div>
          <button className="m-nav-btn" disabled={viewMonthIdx >= months.length - 1} onClick={() => goMonth('next')}>›</button>
        </div>
        )}

        {homeView === 'actual' ? (
        /* ── VIEW 1: actual vs forecast ── */
        <div className="m-home-summary-block">
          <button
            className="m-home-group-col-header"
            onClick={() => {
              const allIds = groups.map(g => g.id)
              setExpandedGroups(new Set(allIds))
              setScreen('budget')
            }}
          >
            <span className="m-home-group-arrow"></span>
            <span className="m-home-group-name"></span>
            <span className="m-home-group-actual">בפועל</span>
            <span className="m-home-group-budget">תחזית</span>
          </button>
          {groupOrder.map((gid) => {
            const g = groups.find(x => x.id === gid)!
            const isIncome = gid === 'g5'
            const gc = categories.filter(c => c.groupId === g.id)
            const gb = gc.reduce((s, c) => s + getForecastValue(c, vm), 0)
            const ga = gc.reduce((s, c) => { const a = getActualValue(c.id, vm); return s + (a !== null ? a : getForecastValue(c, vm)) }, 0)
            const isOpen = expandedGroups.has(g.id)
            return (
              <React.Fragment key={g.id}>
                <button className={`m-home-group-row ${isIncome ? 'income-row' : ''}`} onClick={() => toggleGroup(g.id)}>
                  <span className="m-home-group-arrow">{isOpen ? '▾' : '▸'}</span>
                  <span className="m-home-group-name">{g.name}</span>
                  <span className="m-home-group-actual">&#x202A;{ga.toLocaleString()}&#x202C;</span>
                  <span className="m-home-group-budget">&#x202A;{gb.toLocaleString()}&#x202C;</span>
                </button>
                {isOpen && gc.map(cat => {
                  const b = getForecastValue(cat, vm), a = getActualValue(cat.id, vm)
                  return (
                    <button key={cat.id} className="m-home-cat-row" onClick={() => openUpdate(cat, vm)}>
                      <span className="m-home-cat-name">{cat.name}</span>
                      <span className={`m-home-group-actual ${a !== null ? 'blue' : ''}`}>&#x202A;{(a ?? b).toLocaleString()}&#x202C;</span>
                      <span className="m-home-group-budget">&#x202A;{b.toLocaleString()}&#x202C;</span>
                    </button>
                  )
                })}
              </React.Fragment>
            )
          })}
          <div className="m-home-group-footer">
            <span className="m-home-group-arrow"></span>
            <span className="m-home-group-name">נטו</span>
            <span className={`m-home-group-actual ${net >= 0 ? '' : 'neg'}`}>&#x202A;{net < 0 ? '−' : ''}{Math.abs(net).toLocaleString()}&#x202C;</span>
            <span className="m-home-group-budget">&#x202A;{forecastBalance < 0 ? '−' : ''}{Math.abs(forecastBalance).toLocaleString()}&#x202C;</span>
          </div>
          <div className="m-home-group-footer m-home-balance-row">
            <span className="m-home-group-arrow"></span>
            <span className="m-home-group-name">יתרת סגירה</span>
            {(() => { const b = getRunningBalance(vm); return <span className={`m-home-group-actual ${b >= 0 ? '' : 'neg'}`}>&#x202A;{b < 0 ? '−' : ''}{Math.abs(b).toLocaleString()}&#x202C;</span> })()}
            <span className="m-home-group-budget"></span>
          </div>
          <div className="m-forecast-expand-hint" onClick={() => {
            setExpandedGroups(new Set(categories.map(c => c.groupId)))
          }}>מפורט ›</div>
        </div>
        ) : (
        /* ── VIEW 2: month vs month ── */
        <div className="m-home-summary-block">
          {/* Header row with navigation arrows - matching row structure */}
          <div className="m-mm-header">
            <span className="m-home-group-arrow-spacer"></span>
            <span className="m-mm-name">תצוגה</span>
            <div className="m-mm-header-nav">
              <button 
                className="m-mm-header-btn" 
                onClick={() => goMonth('prev')}
                disabled={viewMonthIdx <= 0}
              >‹</button>
            </div>
            <div className="m-mm-header-months">
              {monthCols.map(m => (
                <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''}`}>{m}</span>
              ))}
            </div>
            <div className="m-mm-header-nav">
              <button 
                className="m-mm-header-btn" 
                onClick={() => goMonth('next')}
                disabled={viewMonthIdx >= months.length - 3}
              >›</button>
            </div>
          </div>
          {/* All groups in groupOrder */}
          {groupOrder.map((gid) => {
            const g = groups.find(x => x.id === gid)!
            const isIncome = gid === 'g5'
            const gc = categories.filter(c => c.groupId === g.id)
            const isOpen = expandedGroups.has(g.id)
            return (
              <React.Fragment key={g.id}>
                <button className={`m-home-group-row ${isIncome ? 'income-row' : ''}`} onClick={() => toggleGroup(g.id)}>
                  <span className="m-home-group-arrow">{isOpen ? '▾' : '▸'}</span>
                  <span className="m-mm-name">{g.name}</span>
                  {monthCols.map(m => {
                    const tot = gc.reduce((s,c) => { const a=getActualValue(c.id,m); return s+(a!==null?a:getForecastValue(c,m)) }, 0)
                    return <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''}`}>{Math.abs(tot).toLocaleString()}</span>
                  })}
                </button>
                {isOpen && gc.map(cat => (
                  <button key={cat.id} className="m-home-cat-row" onClick={() => openUpdate(cat, vm)}>
                    <span className="m-home-group-arrow-spacer"></span>
                    <span className="m-mm-name">{cat.name}</span>
                    {monthCols.map(m => {
                      const a = getActualValue(cat.id, m), b = getForecastValue(cat, m)
                      const displayVal = a !== null ? Math.abs(a) : b
                      return <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''} ${a !== null ? 'blue' : ''}`}>{displayVal.toLocaleString()}</span>
                    })}
                  </button>
                ))}
              </React.Fragment>
            )
          })}
          {/* Net footer */}
          <div className="m-home-group-footer">
            <span className="m-home-group-arrow"></span>
            <span className="m-mm-name">נטו</span>
            {monthCols.map(m => {
              const { net: n } = getMonthTotals(m)
              return <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''} ${n >= 0 ? '' : 'neg'}`}>{n>=0?'+':'−'}{Math.abs(n).toLocaleString()}</span>
            })}
          </div>
          {/* Closing balance */}
          <div className="m-home-group-footer m-home-balance-row">
            <span className="m-home-group-arrow"></span>
            <span className="m-mm-name">יתרת סגירה</span>
            {monthCols.map(m => {
              const b = getRunningBalance(m)
              return <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''} ${b >= 0 ? '' : 'neg'}`}>{b < 0 ? '−' : ''}{Math.abs(b).toLocaleString()}</span>
            })}
          </div>
        </div>
        )}

        {/* Action buttons - single row */}
        <div className="m-home-action-btns">
          <button className="m-hab-btn" onClick={saveSnapshot}>
            <span className="m-hab-icon m-icon-save">S</span>
            <span>שמור</span>
          </button>
          <button className="m-hab-btn" onClick={() => setScreen('forecast-chart')}>
            <span className="m-hab-icon m-icon-chart">G</span>
            <span>גרף</span>
          </button>
          <button className="m-hab-btn" onClick={() => setScreen('forecast')}>
            <span className="m-hab-icon m-icon-list">L</span>
            <span>יתרות סגירה ונטו</span>
          </button>
        </div>

        {/* View toggle button */}
        <button 
          className="m-view-toggle-btn" 
          onClick={() => {
            const newView = homeView === 'actual' ? 'monthly' : 'actual'
            setHomeView(newView)
            localStorage.setItem('home_view', newView)
          }}
        >
          {homeView === 'actual' ? '📅 חודש מול חודש' : '✓ בפועל מול תחזית'}
        </button>

        {/* Floating Action Button for quick add */}
        <button className="m-fab" onClick={() => setQuickAddOpen(true)}>
          <span className="m-fab-icon">+</span>
        </button>
        {/* Save feedback toast */}
        {saveFeedback && (
          <div className="m-save-toast">
            <span className="m-save-toast-icon">✓</span>
            <span>נשמר בהצלחה!</span>
          </div>
        )}
        </div>
      </div>
    )
  }

  // --- FORECAST SCREEN ---
  const ForecastScreen = () => {
    const [forecastView, setForecastView] = useState<'current' | 'history'>('current')
    const [historyIdx, setHistoryIdx] = useState(0)
    
    return (
      <div className="m-screen">
        <div className="m-header">
          <button className="m-back-btn" onClick={() => setScreen('home')}>← חזרה</button>
          <span className="m-header-title">יתרות סגירה ונטו</span>
          <div style={{ width: 60 }} />
        </div>
        
        {/* Tabs */}
        <div className="m-forecast-tabs">
          <button 
            className={`m-forecast-tab ${forecastView === 'current' ? 'active' : ''}`}
            onClick={() => setForecastView('current')}
          >
            נוכחי
          </button>
          <button 
            className={`m-forecast-tab ${forecastView === 'history' ? 'active' : ''}`}
            onClick={() => setForecastView('history')}
          >
            היסטוריה
          </button>
        </div>
        
        {forecastView === 'current' ? (
          <>
            <div className="m-table-header">
              <span className="m-th-month">חודש</span>
              <span className="m-th-val col-forecast">יתרת סגירה</span>
              <span className="m-th-val col-net">נטו חודשי</span>
            </div>
            <div className="m-forecast-table" style={{ overflowY: 'auto', flex: 1 }}>
              {months.slice(Math.max(0, currentIdx)).map((month, i) => {
                const { net } = getMonthTotals(month)
                const balance = getRunningBalance(month)
                const isCurrent = month === currentMonth
                return (
                  <div key={month} className={`m-table-row ${isCurrent ? 'current' : ''}`}>
                    <div className="m-row-month">
                      <span className="m-row-month-name">
                        {month}{isCurrent ? ' (נוכחי)' : i === 1 ? ' (הבא)' : ''}
                      </span>
                    </div>
                    <span className="m-row-val col-forecast">&#x202A;{Math.abs(balance).toLocaleString()}&#x202C;</span>
                    <span className={`m-row-val col-net m-net-highlight ${net >= 0 ? 'pos' : 'neg'}`}>&#x202A;{net >= 0 ? '+' : '−'}{Math.abs(net).toLocaleString()}&#x202C;</span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          /* History View */
          <div className="m-history-view" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {forecastSnapshots.length === 0 ? (
              <div className="m-history-empty">אין היסטוריית שמירות עדיין</div>
            ) : (
              <>
                {/* Navigation */}
                <div className="m-history-nav">
                  <button 
                    className="m-history-nav-btn" 
                    disabled={historyIdx >= forecastSnapshots.length - 1}
                    onClick={() => setHistoryIdx(prev => Math.min(prev + 1, forecastSnapshots.length - 1))}
                  >
                    ← ישנים יותר
                  </button>
                  <span className="m-history-counter">
                    {historyIdx + 1} / {forecastSnapshots.length}
                  </span>
                  <button 
                    className="m-history-nav-btn" 
                    disabled={historyIdx <= 0}
                    onClick={() => setHistoryIdx(prev => Math.max(prev - 1, 0))}
                  >
                    חדשים יותר →
                  </button>
                </div>
                
                {/* Show last 3 snapshots starting from historyIdx */}
                <div className="m-history-table">
                  <div className="m-history-header">
                    <span className="m-history-h-col">חודש</span>
                    {forecastSnapshots.slice(historyIdx, historyIdx + 3).reverse().map((snap, i) => (
                      <span key={snap.date} className="m-history-h-col">
                        {i === 0 ? 'אחרון' : `${i} קודם`}
                        <small>{snap.label}</small>
                      </span>
                    ))}
                  </div>
                  {months.slice(Math.max(0, currentIdx)).map((month) => (
                    <div key={month} className="m-history-row">
                      <span className="m-history-month">{month}</span>
                      {forecastSnapshots.slice(historyIdx, historyIdx + 3).reverse().map((snap) => (
                        <span key={snap.date} className="m-history-val">
                          {snap.data[month] !== undefined 
                            ? Math.abs(snap.data[month]).toLocaleString() 
                            : '-'}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // --- BUDGET SCREEN ---
  const BudgetScreen = () => {
    const vm = months[viewMonthIdx] || currentMonth
    const isCurrentM = vm === currentMonth
    const navigateMonth = (dir: 'prev' | 'next') => {
      const newIdx = dir === 'prev' ? viewMonthIdx - 1 : viewMonthIdx + 1
      if (newIdx < 0 || newIdx >= months.length) return
      setSlideDir(dir === 'next' ? 'left' : 'right')
      setTimeout(() => { setViewMonthIdx(newIdx); setSlideDir(null) }, 180)
    }
    return (
      <div className="m-screen">
        <div className="m-header">
          <button className="m-back-btn" onClick={() => setScreen('home')}>← חזרה</button>
          <span className="m-header-title">תחזית מול ביצוע</span>
          <div className="m-header-actions">
            <button className="m-icon-btn" onClick={() => setScreen('detail')} title="עדכן תחזית">📋</button>
            <button className="m-icon-btn m-icon-btn-add" onClick={openQuickAdd} title="עדכן הוצאה">＋</button>
          </div>
        </div>
        <div
          className="m-accordion-scroll"
          onTouchStart={(e) => {
            // Disable swipe when QuickAddSheet is open
            if (quickAddOpen) return
            touchStartX.current = e.touches[0].clientX
          }}
          onTouchEnd={(e) => {
            // Disable swipe when QuickAddSheet is open
            if (quickAddOpen) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (dx > 50) navigateMonth('prev')
            else if (dx < -50) navigateMonth('next')
          }}
        >
          <div className="m-month-nav">
            <button className="m-nav-btn" disabled={viewMonthIdx === 0} onClick={() => navigateMonth('prev')}>‹</button>
            <div className="m-month-nav-center">
              <span className={`m-month-nav-month ${isCurrentM ? 'current' : ''}`}>
                {new Date(2000 + Number(vm.slice(3)), Number(vm.slice(0,2)) - 1).toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                {isCurrentM && <span className="m-month-current-tag"> · חודש נוכחי</span>}
              </span>
            </div>
            <button className="m-nav-btn" disabled={viewMonthIdx >= months.length - 1} onClick={() => navigateMonth('next')}>›</button>
          </div>
          <AccordionContent vm={vm} />
        </div>
      </div>
    )
  }

  // --- DETAIL SCREEN ---
  const DetailScreen = () => {
    const group = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : null
    const groupCats = selectedGroupId
      ? categories.filter((c) => c.groupId === selectedGroupId)
      : categories.filter((c) => c.groupId !== 'g5')

    return (
      <div className="m-screen">
        <div className="m-header">
          <button className="m-back-btn" onClick={() => { setScreen('home'); setSelectedGroupId(null) }}>← חזרה</button>
          <span className="m-header-title">{group ? group.name : 'כל ההוצאות'}</span>
          <div style={{ width: 40 }} />
        </div>

        <div className="m-month-tabs">
          {visibleMonths.map((m) => (
            <span key={m} className={`m-tab ${m === currentMonth ? 'active' : ''}`}>{m}</span>
          ))}
        </div>

        <div className="m-cat-list">
          {groupCats.map((cat) => (
            <div key={cat.id} className="m-cat-row">
              <div
                className="m-cat-name"
                onTouchStart={() => handleLongPressStart(cat.id)}
                onTouchEnd={handleLongPressEnd}
              >
                {cat.name}
                {menuCatId === cat.id && (
                  <div className="m-cat-menu">
                    <button onClick={() => setMenuCatId(null)}>✏️ עדכון שם</button>
                    <button className="danger" onClick={() => deleteCategory(cat.id)}>🗑️ מחיקה</button>
                  </div>
                )}
              </div>
              <div className="m-cat-values">
                {visibleMonths.map((month) => {
                  const actual = getActualValue(cat.id, month)
                  const forecast = getForecastValue(cat, month)
                  const display = actual !== null ? actual : forecast
                  const isAct = hasActual(cat.id, month)
                  const isOver = actual !== null && actual > forecast
                  return (
                    <button
                      key={month}
                      className={`m-cell ${isAct ? 'actual' : ''} ${isOver ? 'over' : ''}`}
                      onClick={() => openUpdate(cat, month)}
                    >
                      {display.toLocaleString()}
                      {isOver && <span className="m-cell-arrow">▲</span>}
                      {isAct && !isOver && actual! < forecast && <span className="m-cell-arrow under">▼</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="m-footer-totals">
          {visibleMonths.map((month) => {
            const { net } = getMonthTotals(month)
            const balance = getRunningBalance(month)
            return (
              <div key={month} className="m-footer-col">
                <div className={`m-footer-balance ${balance >= 0 ? 'pos' : 'neg'}`}>{Math.abs(balance).toLocaleString()}</div>
                <div className={`m-footer-net ${net >= 0 ? 'pos' : 'neg'}`}>{net >= 0 ? '+' : '-'}{Math.abs(net).toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // --- FORECAST LINE CHART ---
  const ForecastChartScreen = () => {
    const chartMonths = months.slice(currentIdx, currentIdx + 12)
    const values = chartMonths.map(m => getRunningBalance(m))
    const allVals = [
      ...values,
      ...forecastSnapshots.flatMap(s => chartMonths.map(m => s.data[m] ?? 0))
    ]
    const minV = Math.min(...allVals)
    const maxV = Math.max(...allVals)
    const range = maxV - minV || 1
    const W = 320; const H = 180; const PAD = 24
    const toX = (i: number) => PAD + (i / (chartMonths.length - 1)) * (W - PAD * 2)
    const toY = (v: number) => PAD + (1 - (v - minV) / range) * (H - PAD * 2)
    const pointsPath = (vals: number[]) =>
      vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
    const snapshotColors = ['#A78BFA','#22D3EE','#34D399','#818CF8']
    return (
      <div className="m-screen">
        <div className="m-header">
          <button className="m-back-btn" onClick={() => setScreen('home')}>← חזרה</button>
          <span className="m-header-title">📉 גרף תחזית</span>
          <button className="m-icon-btn" onClick={saveSnapshot} title="שמור תחזית">💾</button>
        </div>
        <div className="m-chart-wrap">
          <div className="m-chart-legend">
            <span className="m-legend-line" style={{background:'#7C3AED'}} />
            <span className="m-legend-label">תחזית נוכחית</span>
            {forecastSnapshots.map((s, i) => (
              <React.Fragment key={i}>
                <span className="m-legend-line" style={{background: snapshotColors[i % 4], opacity: 0.5}} />
                <span className="m-legend-label" style={{opacity:0.6}}>{s.label}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="m-chart-container">
            {/* Y-axis labels */}
            <div className="m-chart-y-axis">
              <span className="m-chart-y-label">{(maxV/1000).toFixed(0)}K</span>
              <span className="m-chart-y-label">{((maxV+minV)/2/1000).toFixed(0)}K</span>
              <span className="m-chart-y-label">{(minV/1000).toFixed(0)}K</span>
            </div>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="m-line-chart">
              {/* grid lines */}
              <line x1={PAD} y1={toY(maxV)} x2={W-PAD} y2={toY(maxV)} stroke="#F3F4F6" strokeWidth="1" />
              <line x1={PAD} y1={toY((maxV+minV)/2)} x2={W-PAD} y2={toY((maxV+minV)/2)} stroke="#F3F4F6" strokeWidth="1" />
              <line x1={PAD} y1={toY(minV)} x2={W-PAD} y2={toY(minV)} stroke="#F3F4F6" strokeWidth="1" />
              {/* zero line */}
              {minV < 0 && maxV > 0 && (
                <line x1={PAD} y1={toY(0)} x2={W-PAD} y2={toY(0)} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 3" />
              )}
              {/* snapshot lines */}
              {forecastSnapshots.map((s, i) => (
                <path key={i} d={pointsPath(chartMonths.map(m => s.data[m] ?? 0))}
                  stroke={snapshotColors[i % 4]} strokeWidth="1.5" fill="none"
                  strokeDasharray="5 3" opacity="0.45" strokeLinejoin="round" />
              ))}
              {/* current line */}
              <path d={pointsPath(values)} stroke="#7C3AED" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
              {/* dots */}
              {values.map((v, i) => (
                <circle key={i} cx={toX(i)} cy={toY(v)} r="3.5" fill="#7C3AED" />
              ))}
              {/* month labels at bottom */}
              {chartMonths.map((m, i) => (
                <text key={i} x={toX(i)} y={H - 6} fontSize="9" fill="#6B7280" textAnchor="middle" fontWeight="600">{m.slice(0,2)}</text>
              ))}
            </svg>
          </div>
          {/* X-axis year label */}
          <div className="m-chart-x-label">{chartMonths[0]?.slice(3) === chartMonths[chartMonths.length-1]?.slice(3) ? '20' + chartMonths[0]?.slice(3) : '20' + chartMonths[0]?.slice(3) + ' - 20' + chartMonths[chartMonths.length-1]?.slice(3)}</div>
          {forecastSnapshots.length > 0 && (
            <button className="m-clear-snapshots" onClick={() => setForecastSnapshots([])}>מחק ניתוחים שמורים</button>
          )}
        </div>
      </div>
    )
  }

  // --- NET MONTHLY LINE CHART ---
  const NetChartScreen = () => {
    const chartMonths = months.slice(currentIdx, currentIdx + 12)
    const values = chartMonths.map(m => getMonthTotals(m).net)
    const maxAbs = Math.max(...values.map(Math.abs), 1)
    const W = 320; const H = 180; const PAD = 24
    const toX = (i: number) => PAD + (i / (chartMonths.length - 1)) * (W - PAD * 2)
    const toY = (v: number) => PAD + (1 - (v + maxAbs) / (maxAbs * 2)) * (H - PAD * 2)
    return (
      <div className="m-screen">
        <div className="m-header">
          <button className="m-back-btn" onClick={() => setScreen('home')}>← חזרה</button>
          <span className="m-header-title">📊 גרף נטו חודשי</span>
          <div style={{width:40}} />
        </div>
        <div className="m-chart-wrap">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="m-line-chart">
            <line x1={PAD} y1={toY(0)} x2={W-PAD} y2={toY(0)} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 3" />
            {values.map((v, i) => (
              <rect key={i}
                x={toX(i) - 7} y={v >= 0 ? toY(v) : toY(0)}
                width="14" height={Math.abs(toY(0) - toY(v))}
                fill={v >= 0 ? '#10B981' : '#EF4444'} opacity="0.8" rx="2" />
            ))}
            {chartMonths.map((m, i) => (
              <text key={i} x={toX(i)} y={H - 4} fontSize="8" fill="#9CA3AF" textAnchor="middle">{m.slice(0,2)}</text>
            ))}
            {values.map((v, i) => (
              <text key={i} x={toX(i)} y={v >= 0 ? toY(v) - 4 : toY(v) + 10} fontSize="8"
                fill={v >= 0 ? '#065F46' : '#991B1B'} textAnchor="middle">
                {v >= 0 ? '+' : ''}{(v/1000).toFixed(0)}K
              </text>
            ))}
          </svg>
        </div>
      </div>
    )
  }

  // --- CAT MANAGEMENT SHEET ---
  const CatMgmtSheet = () => {
    if (!catMgmtOpen) return null

    // nav: null = groups list, string = group id drill-down
    const [drillGid, setDrillGid]         = useState<string | null>(null)
    const [renamingCatId, setRenamingCatId] = useState<string | null>(null)
    const [renameVal, setRenameVal]         = useState('')
    const [addingItem, setAddingItem]       = useState(false)
    const [newItemName, setNewItemName]     = useState('')
    const renameRef = useRef<HTMLInputElement>(null)
    const addRef    = useRef<HTMLInputElement>(null)

    // Add new group state
    const [addingGroup, setAddingGroup]     = useState(false)
    const [newGroupName, setNewGroupName]   = useState('')
    const newGroupColor = '#E8F4F8'
    const addGroupRef = useRef<HTMLInputElement>(null)
    useEffect(() => { if (addingGroup) setTimeout(() => addGroupRef.current?.focus(), 50) }, [addingGroup])

    useEffect(() => { if (renamingCatId) setTimeout(() => renameRef.current?.focus(), 50) }, [renamingCatId])
    useEffect(() => { if (addingItem)    setTimeout(() => addRef.current?.focus(),    50) }, [addingItem])

    const closeAll = () => { setCatMgmtOpen(false) }
    const goBack   = () => { setDrillGid(null); setRenamingCatId(null); setAddingItem(false) }

    const groupAccent = (gid: string) => {
      const map: Record<string,string> = { 'g1':'#7EC8E3','g2':'#4CAF7D','g3':'#F0C040','g4':'#E88080','g6':'#C87ABE','g5':'#6FCF97' }
      return map[gid] ?? '#9CA3AF'
    }
    const groupBg = (gid: string) => groups.find(g => g.id === gid)?.color ?? '#F9FAFB'

    const saveRename = (catId: string) => {
      const trimmed = renameVal.trim()
      if (!trimmed) { setRenamingCatId(null); return }
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, name: trimmed } : c))
      setRenamingCatId(null)
    }

    const saveNewItem = () => {
      if (!newItemName.trim() || !drillGid) return
      const c: Category = { id: `c_${Date.now()}`, groupId: drillGid, name: newItemName.trim(), budget: 0 }
      setCategories(prev => [...prev, c])
      setNewItemName('')
      setAddingItem(false)
    }

    const vm = months[viewMonthIdx]

    const saveNewGroup = () => {
      const trimmed = newGroupName.trim()
      if (!trimmed) return
      const gid = `g_${Date.now()}`
      const newGroup: Group = { id: gid, name: trimmed, color: newGroupColor, icon: '📁' }
      setGroups(prev => [...prev, newGroup])
      setGroupOrder(prev => [...prev, gid])
      setNewGroupName('')
      setAddingGroup(false)
    }

    /* ── GROUPS LIST ── */
    if (!drillGid) return (
      <div className="m-catmgmt-screen">
        <div className="m-catmgmt-topbar">
          <button className="m-catmgmt-back" onClick={closeAll}>✕</button>
          <span className="m-catmgmt-topbar-title">קטגוריות</span>
          <span style={{width:36}} />
        </div>
        {/* Add new group button */}
        <button className="m-catmgmt-add-row" onClick={() => setAddingGroup(true)}>
          <span className="m-catmgmt-add-plus">＋</span>
          <span className="m-catmgmt-add-label">קטגוריה חדשה</span>
        </button>
        {/* Add new group form */}
        {addingGroup && (
          <div className="m-catmgmt-add-form">
            <input
              ref={addGroupRef}
              className="m-catmgmt-edit-input"
              placeholder="שם קטגוריה חדשה..."
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNewGroup(); if (e.key === 'Escape') setAddingGroup(false) }}
            />
            <div className="m-catmgmt-edit-actions">
              <button className="m-catmgmt-save-btn" onClick={saveNewGroup} disabled={!newGroupName.trim()}>✓ צור</button>
              <button className="m-catmgmt-cancel-btn" onClick={() => setAddingGroup(false)}>ביטול</button>
            </div>
          </div>
        )}
        <div className="m-catmgmt-list" style={{paddingTop:12}}>
          {groupOrder.map((gid) => {
            const g = groups.find(x => x.id === gid)!
            const items = categories.filter(c => c.groupId === g.id)
            const accent = groupAccent(g.id)
            return (
              <div
                key={g.id}
                className="m-catmgmt-group-card"
                style={{ borderRightColor: accent, background: groupBg(g.id) }}
                onClick={() => setDrillGid(g.id)}
              >
                <span className="m-catmgmt-group-icon">{g.icon}</span>
                <div className="m-catmgmt-group-info">
                  <span className="m-catmgmt-group-name-lg">{g.name}</span>
                  <span className="m-catmgmt-group-count">{items.length} פריטים</span>
                </div>
                <span className="m-catmgmt-chevron">›</span>
              </div>
            )
          })}
        </div>
      </div>
    )

    /* ── ITEMS LIST (drill-down) ── */
    const group   = groups.find(g => g.id === drillGid)!
    const accent  = groupAccent(drillGid)
    const items   = categories.filter(c => c.groupId === drillGid)
      .filter(c => {
        const a = getActualValue(c.id, vm)
        const f = getForecastValue(c, vm)
        return (a !== null && a > 0) || f > 0
      })

    return (
      <div className="m-catmgmt-screen">
        {/* Header */}
        <div className="m-catmgmt-topbar" style={{ background: accent }}>
          <button className="m-catmgmt-back" onClick={goBack}>‹ חזרה</button>
          <span className="m-catmgmt-topbar-title">{group.icon} {group.name}</span>
          <span style={{width:36}} />
        </div>

        {/* Add new button */}
        <button className="m-catmgmt-add-row" onClick={() => { setAddingItem(true); setRenamingCatId(null) }}>
          <span className="m-catmgmt-add-plus">＋</span>
          <span className="m-catmgmt-add-label">הוצאה חדשה ב{group.name}</span>
        </button>

        {/* Add new form */}
        {addingItem && (
          <div className="m-catmgmt-add-form">
            <input
              ref={addRef}
              className="m-catmgmt-edit-input"
              placeholder="שם הוצאה חדשה..."
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNewItem(); if (e.key === 'Escape') setAddingItem(false) }}
            />
            <div className="m-catmgmt-edit-actions">
              <button className="m-catmgmt-save-btn" onClick={saveNewItem} disabled={!newItemName.trim()}>✓ הוסף</button>
              <button className="m-catmgmt-cancel-btn" onClick={() => setAddingItem(false)}>ביטול</button>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="m-catmgmt-list">
          {items.length === 0 && (
            <div className="m-catmgmt-empty">אין פריטים עם סכום בחודש {vm}</div>
          )}
          {items.map(cat => {
            const isRenaming = renamingCatId === cat.id
            return (
              <div key={cat.id} className={`m-catmgmt-item ${isRenaming ? 'editing' : ''}`}
                style={{ borderRightColor: accent, background: isRenaming ? groupBg(drillGid) : 'white' }}>
                {isRenaming ? (
                  <>
                    <input
                      ref={renameRef}
                      className="m-catmgmt-inline-input"
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveRename(cat.id); if (e.key === 'Escape') setRenamingCatId(null) }}
                    />
                    <div className="m-catmgmt-edit-actions" style={{marginTop:8}}>
                      <button className="m-catmgmt-save-btn" onClick={() => saveRename(cat.id)} disabled={!renameVal.trim()}>✓ שמור</button>
                      <button className="m-catmgmt-cancel-btn" onClick={() => setRenamingCatId(null)}>ביטול</button>
                    </div>
                  </>
                ) : (
                  <>
                    <button className="m-catmgmt-rename-btn" onClick={e => { e.stopPropagation(); setRenamingCatId(cat.id); setRenameVal(cat.name); setAddingItem(false) }}>✎</button>
                    <div className="m-catmgmt-item-dot" style={{ background: accent }} />
                    <span className="m-catmgmt-cat-name">{cat.name}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // --- INLINE SHEET — single category, no navigation away ---
  const InlineSheet = () => {
    if (!inlineSheet) return null
    const { cat, forecastOnly } = inlineSheet
    const [month, setMonth] = useState(inlineSheet.month)
    const [amount, setAmount] = useState('')
    const [alsoForecast, setAlsoForecast] = useState(false)
    const [forecastEnd, setForecastEnd] = useState('')  // '' = forever
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      setTimeout(() => inputRef.current?.focus(), 80)
    }, [])

    const close = () => setInlineSheet(null)
    const startIdx = months.indexOf(month)
    const actual = getActualValue(cat.id, month)
    const forecast = getForecastValue(cat, month)
    const group = groups.find(g => g.id === cat.groupId)

    const saveActual = (isAdd: boolean) => {
      if (!amount) return
      const isIncome = cat.groupId === 'g5'
      const signedVal = isIncome ? -Math.abs(Number(amount)) : Math.abs(Number(amount))
      setActuals(prev => {
        const existing = prev[cat.id]?.[month] ?? (actual ?? 0)
        const signedExisting = isIncome ? -Math.abs(existing) : Math.abs(existing)
        return { ...prev, [cat.id]: { ...(prev[cat.id] || {}), [month]: isAdd ? signedExisting + signedVal : signedVal } }
      })
      if (alsoForecast) {
        const endIdx = forecastEnd ? months.indexOf(forecastEnd) : months.length - 1
        setForecasts(prev => {
          const next = { ...prev }
          for (let i = startIdx; i <= endIdx; i++) next[cat.id] = { ...(next[cat.id] || {}), [months[i]]: signedVal }
          return next
        })
      }
      trackCatUsage(cat.id)
      close()
    }

    const saveForecast = () => {
      if (!amount) return
      const val = Number(amount)
      const endIdx = forecastEnd ? months.indexOf(forecastEnd) : months.length - 1
      setForecasts(prev => {
        const next = { ...prev }
        for (let i = startIdx; i <= endIdx; i++) next[cat.id] = { ...(next[cat.id] || {}), [months[i]]: val }
        return next
      })
      trackCatUsage(cat.id)
      close()
    }

    return (
      <>
        <div className="m-overlay" onClick={close} />
        <div className="m-top-sheet m-inline-sheet">
          {/* Cat name + group + close */}
          <div className="m-is-cat-header">
            <div className="m-is-cat-header-row">
              <span className="m-is-cat-name">{cat.name}</span>
              <button className="m-is-close-btn" onClick={close}>✕</button>
            </div>
            <span className="m-is-cat-sub">{group?.name}{actual !== null ? ` · בפועל: ${actual.toLocaleString()}` : ''} · תחזית: {forecast.toLocaleString()}</span>
          </div>

          {/* Amount + month */}
          <div className="m-qi-global-row">
            <input
              ref={inputRef}
              type="number" inputMode="numeric"
              placeholder="סכום..."
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="m-qi-global-amount"
            />
            <select value={month} onChange={e => setMonth(e.target.value)} className="m-qi-global-month">
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>


          {forecastOnly ? (
            <>
              <div className="m-qi-forever-row">
                <label className="m-qi-checkbox-row" style={{marginBottom:0}}>
                  <input type="checkbox" checked={forecastEnd === ''} onChange={e => setForecastEnd(e.target.checked ? '' : month)} />
                  <span>לנצח</span>
                </label>
                {forecastEnd !== '' && (
                  <>
                    <span className="m-qi-until-label">עד:</span>
                    <select value={forecastEnd} onChange={e => setForecastEnd(e.target.value)} className="m-sheet-select-sm">
                      {months.filter((_, i) => i >= startIdx).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </>
                )}
              </div>
              <button className="m-qi-forecast-save-btn" disabled={!amount} onClick={saveForecast}>📅 עדכן תחזית</button>
            </>
          ) : (
            <>
              <label className="m-qi-checkbox-row">
                <input type="checkbox" checked={alsoForecast} onChange={e => setAlsoForecast(e.target.checked)} />
                <span>עדכן גם תחזית קדימה</span>
              </label>
              {alsoForecast && (
                <div className="m-qi-forecast-sub">
                  <div className="m-qi-forever-row">
                    <label className="m-qi-checkbox-row" style={{marginBottom:0}}>
                      <input type="checkbox" checked={forecastEnd === ''} onChange={e => setForecastEnd(e.target.checked ? '' : month)} />
                      <span>לנצח</span>
                    </label>
                    {forecastEnd !== '' && (
                      <>
                        <span className="m-qi-until-label">עד:</span>
                        <select value={forecastEnd} onChange={e => setForecastEnd(e.target.value)} className="m-sheet-select-sm">
                          {months.filter((_, i) => i >= startIdx).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="m-qi-action-row">
                <button className="m-qi-big-btn m-qi-big-replace" disabled={!amount} onClick={() => saveActual(false)}>
                  <span className="m-qi-big-icon">✏️</span>
                  <span className="m-qi-big-label">עדכון</span>
                  <span className="m-qi-big-hint">מחליף סכום</span>
                </button>
                <button className="m-qi-big-btn m-qi-big-add" disabled={!amount} onClick={() => saveActual(true)}>
                  <span className="m-qi-big-icon">➕</span>
                  <span className="m-qi-big-label">הוספה</span>
                  <span className="m-qi-big-hint">מוסיף לקיים</span>
                </button>
              </div>
            </>
          )}
        </div>
      </>
    )
  }

  // --- QUICK ADD SHEET (unified with tabs) ---
  const QuickAddSheet = () => {
    if (!quickAddOpen) return null

    const panelRef = useRef<HTMLDivElement>(null)
    const [editingCatId, setEditingCatId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    const incomeCatsList = categories.filter((c) => c.groupId === 'g5')
    const expenseCatsList = categories.filter((c) => c.groupId !== 'g5')
    const allExpenseGroups = groups.filter((g) => g.id !== 'g5')

    const [activeTab, setActiveTab] = useState<'expense' | 'income'>(
      quickPreOpenCat
        ? (categories.find(c => c.id === quickPreOpenCat.catId)?.groupId === 'g5' ? 'income' : 'expense')
        : 'expense'
    )

    // Global month + amount at top
    const [globalMonth, setGlobalMonth] = useState(currentMonth)
    const [globalAmount, setGlobalAmount] = useState('')
    const globalAmountRef = useRef<HTMLInputElement>(null)
    useEffect(() => { setTimeout(() => globalAmountRef.current?.focus(), 80) }, [])

    const tabCats = activeTab === 'expense' ? expenseCatsList : incomeCatsList
    const baseFiltered = quickSearch.trim()
      ? tabCats.filter((c) =>
          c.name.includes(quickSearch) ||
          (groups.find((g) => g.id === c.groupId)?.name || '').includes(quickSearch)
        )
      : tabCats
    const filtered = [...baseFiltered].sort((a, b) => (catUsage[b.id] || 0) - (catUsage[a.id] || 0))

    // Per-cat expanded panel state
    const [panelCatId, setPanelCatId] = useState<string | null>(quickPreOpenCat?.catId ?? null)
    const [panelMonth, setPanelMonth] = useState(quickPreOpenCat?.month ?? currentMonth)
    const [panelAmount, setPanelAmount] = useState('')
    const [panelForecast, setPanelForecast] = useState(false)
    const [panelForecastEnd, setPanelForecastEnd] = useState('')
    // "update forward months" for actuals
    const [panelForward, setPanelForward] = useState(false)
    const [panelForwardStart, setPanelForwardStart] = useState(quickPreOpenCat?.month ?? currentMonth)

    const openPanel = (catId: string) => {
      setPanelCatId(catId)
      setPanelMonth(currentMonth)
      setPanelAmount('')
      setPanelForecast(false)
      setPanelForecastEnd('')   // '' = לנצח (forever checked by default)
      setPanelForward(false)
      setPanelForwardStart(currentMonth)
      // scroll into view after render
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }

    const doClose = () => { setQuickAddOpen(false); setQuickPreOpenCat(null); setQuickSearch('') }
    const swipeCatRef = useRef<{ catId: string; startX: number } | null>(null)
    const monthSwipeRef = useRef<number | null>(null)
    const [swipeDx, setSwipeDx] = useState<{ catId: string; dx: number } | null>(null)

    const doSaveActual = (cat: Category, isAdd: boolean) => {
      if (!panelAmount) return
      const isIncome = cat.groupId === 'g5'
      const signedNewVal = isIncome ? -Math.abs(Number(panelAmount)) : Math.abs(Number(panelAmount))
      if (panelForward) {
        // update actuals from panelForwardStart forward
        const startIdx = months.indexOf(panelForwardStart)
        setActuals(prev => {
          const next = { ...prev }
          for (let i = startIdx; i < months.length; i++) {
            const existing = prev[cat.id]?.[months[i]] ?? (getActualValue(cat.id, months[i]) ?? 0)
            const signedExisting = isIncome ? -Math.abs(existing) : Math.abs(existing)
            next[cat.id] = { ...(next[cat.id] || {}), [months[i]]: isAdd ? signedExisting + signedNewVal : signedNewVal }
          }
          return next
        })
      } else {
        setActuals(prev => {
          const existing = prev[cat.id]?.[panelMonth] ?? (getActualValue(cat.id, panelMonth) ?? 0)
          const signedExisting = isIncome ? -Math.abs(existing) : Math.abs(existing)
          const finalVal = isAdd ? signedExisting + signedNewVal : signedNewVal
          return { ...prev, [cat.id]: { ...(prev[cat.id] || {}), [panelMonth]: finalVal } }
        })
      }
      if (panelForecast) {
        const fStartIdx = months.indexOf(panelMonth)
        const endIdx = panelForecastEnd ? months.indexOf(panelForecastEnd) : months.length - 1
        setForecasts(prev => {
          const next = { ...prev }
          for (let i = fStartIdx; i <= endIdx; i++) {
            next[cat.id] = { ...(next[cat.id] || {}), [months[i]]: signedNewVal }
          }
          return next
        })
      }
      doClose()
    }

    const doSaveForecast = (cat: Category) => {
      if (!panelAmount) return
      const newVal = Number(panelAmount)
      const pStartIdx = months.indexOf(panelMonth)
      const endIdx = panelForecastEnd ? months.indexOf(panelForecastEnd) : months.length - 1
      setForecasts(prev => {
        const next = { ...prev }
        for (let i = pStartIdx; i <= endIdx; i++) {
          next[cat.id] = { ...(next[cat.id] || {}), [months[i]]: newVal }
        }
        return next
      })
      doClose()
    }

    const saveEditName = () => {
      const trimmed = editName.trim()
      if (!trimmed || !editingCatId) return
      setCategories(prev => prev.map(c => c.id === editingCatId ? { ...c, name: trimmed } : c))
      setEditingCatId(null)
    }

    return (
      <div className="m-quick-fullscreen"
        onTouchMove={(e) => {
          // Prevent swipe gestures from propagating to the screen below
          // when swiping within the quick add sheet
          e.stopPropagation()
        }}
      >
          {/* Edit name inline panel */}
          {editingCatId && (
            <div className="m-qi-edit-panel">
              <span className="m-qi-edit-label">עריכת שם קטגוריה</span>
              <input
                className="m-qi-edit-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEditName(); if (e.key === 'Escape') setEditingCatId(null) }}
                autoFocus
              />
              <div className="m-qi-edit-actions">
                <button className="m-qi-edit-save" onClick={saveEditName} disabled={!editName.trim()}>שמור</button>
                <button className="m-qi-edit-cancel" onClick={() => setEditingCatId(null)}>ביטול</button>
              </div>
            </div>
          )}
          <div className="m-quick-topbar">
            <button className="m-quick-close" onClick={doClose}>✕</button>
            <span className="m-quick-topbar-title">{quickForecastOnly ? 'עדכון תחזית' : 'עדכון בפועל'}</span>
            <span style={{width:36}} />
          </div>

          {/* Tabs — Segmented Control with semantic colors */}
          <div className="m-qi-tabs-segmented">
            <button
              className={`m-qi-tab-pill ${activeTab === 'expense' ? 'active' : ''}`}
              onClick={() => { setActiveTab('expense'); setPanelCatId(null); setQuickSearch('') }}
            >הוצאות</button>
            <button
              className={`m-qi-tab-pill ${activeTab === 'income' ? 'active' : ''}`}
              onClick={() => { setActiveTab('income'); setPanelCatId(null); setQuickSearch('') }}
            >הכנסות</button>
          </div>

          {/* Amount — big + centered (actuals only) */}
          <div className="m-qi-amount-hero" style={{ display: quickForecastOnly ? 'none' : undefined }}>
            <input
              ref={globalAmountRef}
              type="number" inputMode="numeric"
              placeholder="0"
              value={globalAmount}
              onChange={e => setGlobalAmount(e.target.value)}
              className="m-qi-amount-hero-input"
            />
            <span className="m-qi-amount-hero-symbol">₪</span>
          </div>

          {/* Month strip below amount (actuals only) */}
          {!quickForecastOnly && (() => {
            const mIdx = months.indexOf(globalMonth)
            const prev = months[mIdx - 1]
            const next = months[mIdx + 1]
            return (
              <div className="m-month-swipe m-month-swipe-standalone"
                onTouchStart={e => { monthSwipeRef.current = e.touches[0].clientX }}
                onTouchEnd={e => {
                  if (monthSwipeRef.current === null) return
                  const dx = e.changedTouches[0].clientX - monthSwipeRef.current
                  monthSwipeRef.current = null
                  if (dx > 40 && mIdx > 0) setGlobalMonth(months[mIdx - 1])
                  else if (dx < -40 && mIdx < months.length - 1) setGlobalMonth(months[mIdx + 1])
                }}>
                <button className="m-month-nav-btn" onClick={() => mIdx > 0 && setGlobalMonth(months[mIdx-1])}>‹</button>
                <span className="m-month-neighbor">{prev ?? ''}</span>
                <span className="m-month-current">{globalMonth}</span>
                <span className="m-month-neighbor">{next ?? ''}</span>
                <button className="m-month-nav-btn" onClick={() => mIdx < months.length-1 && setGlobalMonth(months[mIdx+1])}>›</button>
              </div>
            )
          })()}

          {/* Search */}
          <input
            className="m-search-input"
            type="text"
            placeholder="🔍  חפש..."
            value={quickSearch}
            onChange={e => { setQuickSearch(e.target.value); setQuickNewName(e.target.value); setPanelCatId(null) }}
          />

          {/* Category list */}
          <div className="m-quick-list">
            {filtered.map((cat) => {
              const group = groups.find((g) => g.id === cat.groupId)
              const isOpen = panelCatId === cat.id
              const pStartIdx = months.indexOf(globalMonth)
              const cardBg = group?.color ?? '#F9FAFB'
              const cardDx = swipeDx?.catId === cat.id ? swipeDx.dx : 0
              const THRESHOLD = 60
              return (
                <div key={cat.id} className="m-qi-swipe-wrapper"
                  onTouchStart={e => {
                    swipeCatRef.current = { catId: cat.id, startX: e.touches[0].clientX }
                    setSwipeDx(null)
                  }}
                  onTouchMove={e => {
                    if (!swipeCatRef.current || swipeCatRef.current.catId !== cat.id) return
                    e.preventDefault()
                    setSwipeDx({ catId: cat.id, dx: e.touches[0].clientX - swipeCatRef.current.startX })
                  }}
                  onTouchEnd={e => {
                    if (!swipeCatRef.current || swipeCatRef.current.catId !== cat.id) return
                    const dx = e.changedTouches[0].clientX - swipeCatRef.current.startX
                    swipeCatRef.current = null
                    setSwipeDx(null)
                    if (!globalAmount || Math.abs(dx) < THRESHOLD) return
                    const isAdd = dx > 0
                    const isIncome = cat.groupId === 'g5'
                    const signedAmount = isIncome ? -Math.abs(Number(globalAmount)) : Math.abs(Number(globalAmount))
                    setActuals(p => {
                      const existing = p[cat.id]?.[globalMonth] ?? 0
                      const signedExisting = isIncome ? -Math.abs(existing) : Math.abs(existing)
                      return {...p,[cat.id]:{...(p[cat.id]||{}),[globalMonth]: isAdd ? signedExisting + signedAmount : signedAmount}}
                    })
                    trackCatUsage(cat.id)
                    doClose()
                  }}>
                  {/* Reveal layer — always full width, behind the sliding card */}
                  {cardDx !== 0 && globalAmount && (
                    <div className="m-qi-reveal-layer" style={{
                      background: cardDx > 0 ? '#16A34A' : '#2563EB',
                      justifyContent: cardDx > 0 ? 'flex-start' : 'flex-end',
                      direction: 'ltr',
                    }}>
                      {cardDx > 0 ? (
                        <>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                          <span>תוספת</span>
                        </>
                      ) : (
                        <>
                          <span>עדכון</span>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </>
                      )}
                    </div>
                  )}
                  {/* The card itself slides, reveal shown in wrapper bg */}
                  <div className={`m-qi-card ${isOpen ? 'open' : ''}`}
                    style={{
                      background: cardBg,
                      transform: cardDx !== 0 ? `translateX(${Math.max(-120, Math.min(120, cardDx))}px)` : undefined,
                      transition: cardDx === 0 ? 'transform 0.3s cubic-bezier(.25,.46,.45,.94)' : 'none',
                      position: 'relative',
                      zIndex: 1,
                    }}>
                  <button className="m-qi-card-header" style={{ background: 'transparent' }} onClick={() => {
                    if (globalAmount) {
                      const isIncome = cat.groupId === 'g5'
                      const signedAmount = isIncome ? -Math.abs(Number(globalAmount)) : Math.abs(Number(globalAmount))
                      setActuals(p => ({...p,[cat.id]:{...(p[cat.id]||{}),[globalMonth]: signedAmount}}))
                      trackCatUsage(cat.id)
                      doClose()
                    } else {
                      isOpen ? setPanelCatId(null) : openPanel(cat.id)
                    }
                  }}>
                    <span className="m-quick-item-name">{cat.name}</span>
                    <button
                      className="m-qi-edit-btn"
                      onClick={e => { e.stopPropagation(); setEditingCatId(cat.id); setEditName(cat.name) }}
                      title="ערוך שם"
                    >✎</button>
                    <span className="m-qi-group-label-sm">{group?.icon} {group?.name}</span>
                    {globalAmount
                      ? <span className="m-qi-swipe-tip">← הוסף &nbsp;&nbsp; עדכן →</span>
                      : <span className="m-qi-chevron">{isOpen ? '▲' : '▼'}</span>
                    }
                  </button>

                  {isOpen && !globalAmount && (
                    <div className="m-qi-panel" ref={panelRef}>
                      <div className="m-qi-panel-row">
                        <input
                          type="number" inputMode="numeric"
                          placeholder="סכום..."
                          value={panelAmount}
                          onChange={e => setPanelAmount(e.target.value)}
                          className="m-qi-amount-input"
                          autoFocus
                        />
                      </div>

                      {quickForecastOnly ? (
                        <>
                          <div className="m-qi-range-row">
                            <span className="m-qi-range-label">מחודש</span>
                            <select value={panelMonth} onChange={e => setPanelMonth(e.target.value)} className="m-sheet-select-sm">
                              {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <span className="m-qi-range-label">עד</span>
                            <select
                              value={panelForecastEnd}
                              onChange={e => setPanelForecastEnd(e.target.value)}
                              className="m-sheet-select-sm"
                            >
                              <option value="">לנצח</option>
                              {months.filter((_, i) => i >= pStartIdx).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <button className="m-qi-forecast-save-btn" disabled={!panelAmount} onClick={() => doSaveForecast(cat)}>
                            📅 עדכן תחזית
                          </button>
                        </>
                      ) : (
                        <div className="m-qi-action-row">
                          <button
                            className="m-qi-big-btn m-qi-big-replace"
                            disabled={!panelAmount}
                            onClick={() => doSaveActual(cat, false)}
                          >
                            <span className="m-qi-big-icon">✏️</span>
                            <span className="m-qi-big-label">עדכון</span>
                            <span className="m-qi-big-hint">מחליף סכום</span>
                          </button>
                          <button
                            className="m-qi-big-btn m-qi-big-add"
                            disabled={!panelAmount}
                            onClick={() => doSaveActual(cat, true)}
                          >
                            <span className="m-qi-big-icon">➕</span>
                            <span className="m-qi-big-label">הוספה</span>
                            <span className="m-qi-big-hint">מוסיף לקיים</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )
            })}

            {/* Create new category */}
            {activeTab === 'expense' && (
              quickSearch.trim() && filtered.length === 0 ? (
                <div className="m-new-cat-box">
                  <div className="m-new-cat-title">לא נמצא — צור הוצאה חדשה?</div>
                  <div className="m-new-cat-name-preview">{quickSearch.trim()}</div>
                  <select className="m-sheet-select" value={quickNewGroupId} onChange={e => setQuickNewGroupId(e.target.value)}>
                    {allExpenseGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <button className="m-btn-primary" onClick={addNewCategoryAndUpdate}>צור והוסף ✓</button>
                </div>
              ) : (
                <div className="m-new-cat-inline">
                  {panelCatId === '__new__' ? (
                    <div className="m-new-cat-box">
                      <div className="m-new-cat-title">הוצאה חדשה</div>
                      <input
                        className="m-qi-amount-input"
                        placeholder="שם ההוצאה..."
                        value={quickNewName}
                        onChange={e => setQuickNewName(e.target.value)}
                        autoFocus
                      />
                      <select className="m-sheet-select" value={quickNewGroupId} onChange={e => setQuickNewGroupId(e.target.value)}>
                        {allExpenseGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <div style={{display:'flex',gap:8}}>
                        <button className="m-btn-primary" style={{flex:1}} onClick={() => { setQuickSearch(quickNewName); addNewCategoryAndUpdate() }} disabled={!quickNewName.trim()}>צור והוסף ✓</button>
                        <button className="m-catmgmt-cancel-btn" onClick={() => setPanelCatId(null)}>ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <button className="m-new-cat-trigger" onClick={() => { setPanelCatId('__new__'); setQuickNewName('') }}>
                      ＋ הוצאה חדשה
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </div>
    )
  }

  return (
    <div className="m-app" onClick={() => { if (menuCatId) setMenuCatId(null) }}>
      {screen === 'home' && <HomeScreen />}
      {screen === 'forecast' && <ForecastScreen />}
      {screen === 'budget' && <BudgetScreen />}
      {screen === 'detail' && <DetailScreen />}
      {screen === 'forecast-chart' && <ForecastChartScreen />}
      {screen === 'net-chart' && <NetChartScreen />}
      <CatMgmtSheet />
      <InlineSheet />
      <QuickAddSheet />
    </div>
  )
}
