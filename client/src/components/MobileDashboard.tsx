import React, { useState, useEffect, useRef } from 'react'
import './MobileDashboard.css'
import { useFirebaseSync, flushAllSaves, useSyncStatus, firestoreHealthCheck } from '../hooks/useFirebaseSync'
import { signOutUser } from '../firebase'
import { FeedbackModal } from './FeedbackModal'
import { AboutModal } from './AboutModal'

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

type Screen = 'home' | 'detail' | 'update' | 'chart' | 'forecast' | 'budget' | 'forecast-chart' | 'net-chart' | 'mortgage-calc' | 'time-tracking'

type ForecastSnapshot = {
  label: string
  date: string
  data: Record<string, number> // month -> running balance
}

type Client = {
  id: string
  name: string
  hourlyRate: number
  vatPercent: number // מע"מ
  incomeTaxPercent: number // מס הכנסה
}

type Employee = {
  id: string
  name: string
  email: string
  clientIds: string[] // לקוחות שהעובד יכול לדווח עליהם
}

type TimeEntry = {
  id: string
  clientId: string
  employeeId?: string // אופציונלי - אם דיווח בשם עובד
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  notes: string
  billingStatus?: 'pending' | 'invoiced' | 'paid' // סטטוס חיוב ללקוח
  invoiceNumber?: string // מספר חשבונית ללקוח
  employeePaidStatus?: 'pending' | 'paid' // סטטוס תשלום לעובד
  employeeInvoiceNumber?: string // מספר חשבונית של העובד אליי
}

export default function MobileDashboard({ uid, userEmail, userPhoto, isLocalMode }: { uid: string; userEmail: string; userPhoto?: string; isLocalMode?: boolean }) {
  // Prefix localStorage keys with uid so each account has separate data
  const lsKey = (key: string) => uid ? `${uid}:${key}` : key

  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem(lsKey('groups'))
    return saved ? JSON.parse(saved) : initialGroups
  })
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(lsKey('categories'))
    return saved ? JSON.parse(saved) : initialCategories
  })
  const [forecasts, setForecasts] = useState<Record<string, Record<string, number>>>(() => {
    const saved = localStorage.getItem(lsKey('forecasts'))
    return saved ? JSON.parse(saved) : {}
  })
  const [forecastSnapshots, setForecastSnapshots] = useState<ForecastSnapshot[]>(() => {
    const saved = localStorage.getItem(lsKey('forecast_snapshots'))
    return saved ? JSON.parse(saved) : []
  })
  const [saveFeedback, setSaveFeedback] = useState(false)
  const [actuals, setActuals] = useState<Record<string, Record<string, number>>>(() => {
    const saved = localStorage.getItem(lsKey('actuals'))
    return saved ? JSON.parse(saved) : {}
  })
  const [openingBalance, setOpeningBalance] = useState<{ month: string; amount: number } | null>(() => {
    const saved = localStorage.getItem(lsKey('opening_balance'))
    return saved ? JSON.parse(saved) : null
  })

  const currentMonth = getCurrentMonth()
  const currentIdx = months.indexOf(currentMonth)
  const visibleMonths = months.slice(
    Math.max(0, currentIdx),
    Math.min(months.length, Math.max(0, currentIdx) + 3)
  )
  const [screen, setScreen] = useState<Screen>('home')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [updateAmount, setUpdateAmount] = useState('')
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [menuCatId, setMenuCatId] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddGlobalAmount, setQuickAddGlobalAmount] = useState('')
  const [inlineSheetAmount, setInlineSheetAmount] = useState('')
  const [quickSearch, setQuickSearch] = useState('')
  
  // Time Tracking State
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(lsKey('time_clients'))
    return saved ? JSON.parse(saved) : []
  })
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem(lsKey('time_entries'))
    return saved ? JSON.parse(saved) : []
  })
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(lsKey('time_employees'))
    return saved ? JSON.parse(saved) : []
  })
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [timeTrackingTab, setTimeTrackingTab] = useState<'clients' | 'reports' | 'summary' | 'employees'>('clients')
  const [timerRunning, setTimerRunning] = useState(() => localStorage.getItem(lsKey('timer_running')) === '1')
  const [timerStart, setTimerStart] = useState<Date | null>(() => {
    const v = localStorage.getItem(lsKey('timer_start'))
    return v ? new Date(v) : null
  })
  const [timerClientId, setTimerClientId] = useState<string | null>(() => localStorage.getItem(lsKey('timer_client_id')))
  const [timerNow, setTimerNow] = useState(Date.now())
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [editClientId, setEditClientId] = useState<string | null>(null)
  const [addTimeEntryOpen, setAddTimeEntryOpen] = useState(false)
  const [quickTimeEntryOpen, setQuickTimeEntryOpen] = useState(false)
  const [quickTimeClientId, setQuickTimeClientId] = useState<string>('')
  const [timeSettingsOpen, setTimeSettingsOpen] = useState(false)
  const [defaultVat, setDefaultVat] = useState(() => {
    const saved = localStorage.getItem(lsKey('time_default_vat'))
    return saved || '18'
  })
  const [defaultIncomeTax, setDefaultIncomeTax] = useState(() => {
    const saved = localStorage.getItem(lsKey('time_default_income_tax'))
    return saved || '30'
  })
  const [summaryFromDate, setSummaryFromDate] = useState('')
  const [summaryToDate, setSummaryToDate] = useState('')
  const [summaryDatePickerOpen, setSummaryDatePickerOpen] = useState(false)
  const summaryScrollRef = useRef<HTMLDivElement>(null)
  const summaryScrollPos = useRef(0)
  const [summaryClientFilter, setSummaryClientFilter] = useState<string>('all')
  const [summaryStatusFilter, setSummaryStatusFilter] = useState<string>('all')
  const [reportsPeriod, setReportsPeriod] = useState<'week' | 'month' | 'year'>('week')
  const [clientFormName, setClientFormName] = useState('')
  const [clientFormRate, setClientFormRate] = useState('')
  const [clientFormVat, setClientFormVat] = useState('18')
  const [clientFormIncomeTax, setClientFormIncomeTax] = useState('30')
  const [entryFormStartDate, setEntryFormStartDate] = useState('')
  const [entryFormEndDate, setEntryFormEndDate] = useState('')
  const [entryFormStartTime, setEntryFormStartTime] = useState('')
  const [entryFormEndTime, setEntryFormEndTime] = useState('')
  const [entryFormNotes, setEntryFormNotes] = useState('')
  const [entryFormEmployeeId, setEntryFormEmployeeId] = useState<string>('self')
  const [entryFormClientId, setEntryFormClientId] = useState<string>('')
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)
  const [employeeFormName, setEmployeeFormName] = useState('')
  const [employeeFormEmail, setEmployeeFormEmail] = useState('')
  const [employeeFormClients, setEmployeeFormClients] = useState<string[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null)
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'pending' | 'invoiced' | 'paid'>('all')
  const [summaryPeriod, setSummaryPeriod] = useState<'week' | 'month' | 'year' | 'all'>('all')
  // Floating action buttons state (moved from IIFE to top-level to fix hooks violation)
  const [fabPos, setFabPos] = useState(() => {
    const saved = localStorage.getItem(lsKey('time_fab_pos'))
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 76, y: window.innerHeight - 200 }
  })
  // Separate refs for each button to prevent conflicts
  const clientFabDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; moved: boolean } | null>(null)
  const timeFabDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; moved: boolean } | null>(null)
  const clientFabTouchHandled = useRef(false)
  const timeFabTouchHandled = useRef(false)
  const [editEntryId, setEditEntryId] = useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([])
  const [employeeSelectedIds, setEmployeeSelectedIds] = useState<string[]>([])
  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [bulkInvoiceNumber, setBulkInvoiceNumber] = useState('')
  const [bulkEmployeeInvoiceNumber, setBulkEmployeeInvoiceNumber] = useState('')
  // Long-press helpers (shared across cards)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)
  const startLongPress = (cb: () => void) => {
    longPressFiredRef.current = false
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      cb()
    }, 500)
  }
  const cancelLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
  }
  const [quickNewName, setQuickNewName] = useState('')
  const quickNewNameRef = useRef('')
  const [quickNewGroupId, setQuickNewGroupId] = useState('g4')
  const [quickForecastOnly, setQuickForecastOnly] = useState(false)
  const [quickPanelCatId, setQuickPanelCatId] = useState<string | null>(null)
  const [quickPanelAmount, setQuickPanelAmount] = useState('')
  const [quickPanelMonth, setQuickPanelMonth] = useState('')
  const [quickPanelForecastEnd, setQuickPanelForecastEnd] = useState('')
  const [quickOpenKey, setQuickOpenKey] = useState(0)
  const savedAmountRef = useRef<string>('')
  const [deleteToast, setDeleteToast] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [globalMonth, setGlobalMonth] = useState(getCurrentMonth)
  const [homeView, setHomeView] = useState<'actual' | 'monthly'>(
    () => (localStorage.getItem(lsKey('home_view')) as 'actual' | 'monthly') || 'monthly'
  )
  // default is already 'monthly'
  const [catMgmtOpen, setCatMgmtOpen] = useState(false)
  const [catMgmtDrillGid, setCatMgmtDrillGid] = useState<string | null>(null)
  const [settingsPage, setSettingsPage] = useState<'main' | 'balance' | 'backup' | 'categories'>('main')
  const [catUsage, setCatUsage] = useState<Record<string, number>>(
    () => JSON.parse(localStorage.getItem(lsKey('cat_usage')) || '{}')
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

  const quickAmountFocusedOnce = useRef(false)
  const globalAmountInputRef = useRef<HTMLInputElement>(null)

  // Group ordering state (Income g5 first, then others)
  const [groupOrder, setGroupOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(lsKey('groupOrder'))
    return saved ? JSON.parse(saved) : ['g5', 'g1', 'g2', 'g4', 'g6']
  })
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const showExitConfirmRef = useRef(false)
  const exitingRef = useRef(false)
  const popStateHandlerRef = useRef<(() => void) | null>(null)
  useEffect(() => { showExitConfirmRef.current = showExitConfirm }, [showExitConfirm])

  // CatMgmt internal state (lifted here to prevent remount on state change)
  const [catMgmtRenamingId, setCatMgmtRenamingId] = useState<string | null>(null)
  const [catMgmtRenameVal, setCatMgmtRenameVal] = useState('')
  const [catMgmtAddingItem, setCatMgmtAddingItem] = useState(false)
  const [catMgmtNewItemName, setCatMgmtNewItemName] = useState('')
  const [catMgmtAddingGroup, setCatMgmtAddingGroup] = useState(false)
  const [catMgmtNewGroupName, setCatMgmtNewGroupName] = useState('')
  const [catMgmtRenamingGroupId, setCatMgmtRenamingGroupId] = useState<string | null>(null)
  const [catMgmtRenameGroupVal, setCatMgmtRenameGroupVal] = useState('')
  const catMgmtRenameRef = useRef<HTMLInputElement>(null)
  const catMgmtAddRef = useRef<HTMLInputElement>(null)
  const catMgmtAddGroupRef = useRef<HTMLInputElement>(null)
  const catMgmtRenameGroupRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (catMgmtAddingGroup) setTimeout(() => catMgmtAddGroupRef.current?.focus(), 50) }, [catMgmtAddingGroup])
  useEffect(() => { if (catMgmtRenamingId) setTimeout(() => catMgmtRenameRef.current?.focus(), 50) }, [catMgmtRenamingId])
  useEffect(() => { if (catMgmtAddingItem) setTimeout(() => catMgmtAddRef.current?.focus(), 50) }, [catMgmtAddingItem])
  useEffect(() => { if (catMgmtRenamingGroupId) setTimeout(() => catMgmtRenameGroupRef.current?.focus(), 50) }, [catMgmtRenamingGroupId])
  useEffect(() => { if (catMgmtOpen) { setCatMgmtRenamingId(null); setCatMgmtAddingItem(false); setCatMgmtAddingGroup(false); setCatMgmtRenamingGroupId(null) } }, [catMgmtOpen])

  // Trap Android back button — use refs to avoid re-registering on every state change
  const quickAddOpenRef = useRef(quickAddOpen)
  const inlineSheetRef = useRef(inlineSheet)
  const screenRef = useRef(screen)
  const catMgmtOpenRef = useRef(catMgmtOpen)
  const catMgmtDrillGidRef = useRef(catMgmtDrillGid)
  const settingsPageRef = useRef(settingsPage)
  useEffect(() => { quickAddOpenRef.current = quickAddOpen }, [quickAddOpen])
  useEffect(() => { inlineSheetRef.current = inlineSheet }, [inlineSheet])
  useEffect(() => { screenRef.current = screen }, [screen])
  useEffect(() => { catMgmtOpenRef.current = catMgmtOpen }, [catMgmtOpen])
  useEffect(() => { catMgmtDrillGidRef.current = catMgmtDrillGid }, [catMgmtDrillGid])
  useEffect(() => { settingsPageRef.current = settingsPage }, [settingsPage])

  // Time tracking back-button refs (to allow Android back to navigate within time tracking)
  const selectedClientIdRef = useRef<string | null>(null)
  const selectedEmployeeIdRef = useRef<string | null>(null)
  const addClientOpenRef = useRef(false)
  const addEmployeeOpenRef = useRef(false)
  const addTimeEntryOpenRef = useRef(false)
  const quickTimeEntryOpenRef = useRef(false)
  const timeSettingsOpenRef = useRef(false)
  const bulkActionOpenRef = useRef(false)
  const selectedEntryIdsRef = useRef<string[]>([])
  useEffect(() => { selectedClientIdRef.current = selectedClientId }, [selectedClientId])
  useEffect(() => { selectedEmployeeIdRef.current = selectedEmployeeId }, [selectedEmployeeId])
  useEffect(() => { addClientOpenRef.current = addClientOpen }, [addClientOpen])
  useEffect(() => { addEmployeeOpenRef.current = addEmployeeOpen }, [addEmployeeOpen])
  useEffect(() => { addTimeEntryOpenRef.current = addTimeEntryOpen }, [addTimeEntryOpen])
  useEffect(() => { quickTimeEntryOpenRef.current = quickTimeEntryOpen }, [quickTimeEntryOpen])
  useEffect(() => { timeSettingsOpenRef.current = timeSettingsOpen }, [timeSettingsOpen])
  useEffect(() => { bulkActionOpenRef.current = bulkActionOpen }, [bulkActionOpen])
  useEffect(() => { selectedEntryIdsRef.current = selectedEntryIds }, [selectedEntryIds])
  useEffect(() => {
    const pushState = () => window.history.pushState({ page: 'app' }, '')
    pushState()
    const onPopState = () => {
      if (exitingRef.current) return
      try {
        if (inlineSheetRef.current) {
          setInlineSheet(null)
        } else if (quickAddOpenRef.current) {
          setQuickAddOpen(false)
          setQuickPreOpenCat(null)
        } else if (catMgmtOpenRef.current) {
          if (catMgmtDrillGidRef.current) {
            setCatMgmtDrillGid(null)
            setCatMgmtRenamingId(null)
            setCatMgmtAddingItem(false)
          } else if (settingsPageRef.current !== 'main') {
            setSettingsPage('main')
          } else {
            setCatMgmtOpen(false)
            setCatMgmtDrillGid(null)
            setSettingsPage('main')
          }
        } else if (bulkActionOpenRef.current) {
          setBulkActionOpen(false)
        } else if (timeSettingsOpenRef.current) {
          setTimeSettingsOpen(false)
        } else if (addClientOpenRef.current) {
          setAddClientOpen(false); setEditClientId(null)
        } else if (addEmployeeOpenRef.current) {
          setAddEmployeeOpen(false); setEditEmployeeId(null)
        } else if (addTimeEntryOpenRef.current) {
          setAddTimeEntryOpen(false); setEditEntryId(null)
        } else if (quickTimeEntryOpenRef.current) {
          setQuickTimeEntryOpen(false)
        } else if (selectedEntryIdsRef.current.length > 0) {
          setSelectedEntryIds([])
        } else if (selectedEmployeeIdRef.current) {
          setSelectedEmployeeId(null)
        } else if (selectedClientIdRef.current) {
          setSelectedClientId(null)
        } else if (screenRef.current !== 'home') {
          setScreen('home')
        } else {
          // User is on home screen - just let the app minimize (don't show exit dialog)
        }
      } catch (err) {
        console.error('Back button error:', err)
      }
      pushState()
    }
    popStateHandlerRef.current = onPopState
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Firebase sync — save to cloud + load on login
  useFirebaseSync(uid, 'actuals', actuals, v => setActuals(v as typeof actuals))
  useFirebaseSync(uid, 'forecasts', forecasts, v => setForecasts(v as typeof forecasts))
  useFirebaseSync(uid, 'forecast_snapshots', forecastSnapshots, v => setForecastSnapshots(v as typeof forecastSnapshots))
  useFirebaseSync(uid, 'categories', categories, v => setCategories(v as typeof categories))
  useFirebaseSync(uid, 'groups', groups, v => setGroups(v as typeof groups))
  useFirebaseSync(uid, 'groupOrder', groupOrder, v => setGroupOrder(v as string[]))
  useFirebaseSync(uid, 'opening_balance', openingBalance, v => setOpeningBalance(v as typeof openingBalance))

  const { status: syncStatus, error: syncError } = useSyncStatus()

  // Run Firestore health check on login
  const [healthResult, setHealthResult] = useState<string | null>(null)
  useEffect(() => {
    if (!uid || uid === 'local' || isLocalMode) return
    firestoreHealthCheck(uid).then(result => {
      setHealthResult(result)
      if (result === 'pass') {
        // Auto-dismiss after 5 seconds
        setTimeout(() => setHealthResult(null), 5000)
      }
    })
  }, [uid])

  // Ensure groupOrder always includes all groups (new groups added elsewhere)
  useEffect(() => {
    const missing = groups.filter(g => !groupOrder.includes(g.id)).map(g => g.id)
    if (missing.length > 0) setGroupOrder(prev => [...prev, ...missing])
  }, [groups])

  // Auto-restore income group (g5) if missing — it is required and cannot be recreated via the UI
  useEffect(() => {
    if (!groups.some(g => g.id === 'g5')) {
      const incomeGroup: Group = { id: 'g5', name: 'הכנסות', color: '#D1FAE5', icon: '💰' }
      setGroups(prev => [...prev, incomeGroup])
      setGroupOrder(prev => prev.includes('g5') ? prev : ['g5', ...prev])
      if (!categories.some(c => c.groupId === 'g5')) {
        setCategories(prev => [...prev, { id: 'c23', groupId: 'g5', name: 'משכורת', budget: -15000 }])
      }
    }
  }, [groups])

  // Persist timer state to localStorage
  useEffect(() => { localStorage.setItem(lsKey('timer_running'), timerRunning ? '1' : '0') }, [timerRunning])
  useEffect(() => {
    if (timerStart) localStorage.setItem(lsKey('timer_start'), timerStart.toISOString())
    else localStorage.removeItem(lsKey('timer_start'))
  }, [timerStart])
  useEffect(() => {
    if (timerClientId) localStorage.setItem(lsKey('timer_client_id'), timerClientId)
    else localStorage.removeItem(lsKey('timer_client_id'))
  }, [timerClientId])

  // Tick every second when timer is running, to update elapsed display
  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => setTimerNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  // Sanitize clients: replace NaN/invalid VAT or income tax with defaults (fixes legacy clients)
  useEffect(() => {
    const needsFix = clients.some(c =>
      !Number.isFinite(c.vatPercent) || !Number.isFinite(c.incomeTaxPercent) || !Number.isFinite(c.hourlyRate)
    )
    if (needsFix) {
      setClients(prev => prev.map(c => ({
        ...c,
        hourlyRate: Number.isFinite(c.hourlyRate) ? c.hourlyRate : 0,
        vatPercent: Number.isFinite(c.vatPercent) ? c.vatPercent : parseFloat(defaultVat) || 18,
        incomeTaxPercent: Number.isFinite(c.incomeTaxPercent) ? c.incomeTaxPercent : parseFloat(defaultIncomeTax) || 30,
      })))
    }
  }, [clients])

  // Keep localStorage as fallback cache (uid-prefixed)
  useEffect(() => { localStorage.setItem(lsKey('actuals'), JSON.stringify(actuals)) }, [actuals])
  useEffect(() => { localStorage.setItem(lsKey('forecasts'), JSON.stringify(forecasts)) }, [forecasts])
  useEffect(() => { localStorage.setItem(lsKey('forecast_snapshots'), JSON.stringify(forecastSnapshots)) }, [forecastSnapshots])
  useEffect(() => { localStorage.setItem(lsKey('categories'), JSON.stringify(categories)) }, [categories])
  useEffect(() => { localStorage.setItem(lsKey('groups'), JSON.stringify(groups)) }, [groups])
  useEffect(() => { localStorage.setItem(lsKey('groupOrder'), JSON.stringify(groupOrder)) }, [groupOrder])
  useEffect(() => { localStorage.setItem(lsKey('time_clients'), JSON.stringify(clients)) }, [clients])
  useEffect(() => { localStorage.setItem(lsKey('time_entries'), JSON.stringify(timeEntries)) }, [timeEntries])
  useEffect(() => { localStorage.setItem(lsKey('time_employees'), JSON.stringify(employees)) }, [employees])
  useEffect(() => { localStorage.setItem(lsKey('time_default_vat'), defaultVat) }, [defaultVat])
  useEffect(() => { localStorage.setItem(lsKey('time_default_income_tax'), defaultIncomeTax) }, [defaultIncomeTax])
  useEffect(() => {
    if (openingBalance) localStorage.setItem(lsKey('opening_balance'), JSON.stringify(openingBalance))
    else localStorage.removeItem(lsKey('opening_balance'))
  }, [openingBalance])

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

    // If openingBalance is set, start from that month with that amount
    let startIdx = 0
    let balance = 0
    if (openingBalance) {
      const obIdx = months.indexOf(openingBalance.month)
      if (obIdx >= 0 && obIdx <= endIdx) {
        startIdx = obIdx + 1
        balance = openingBalance.amount
      }
    }

    for (let i = startIdx; i <= endIdx; i++) {
      const t = getMonthTotals(months[i])
      balance += t.net
    }
    return balance
  }

  const homeScrollRef = useRef<HTMLDivElement | null>(null)
  const homeScrollPosRef = useRef(0)
  const toggleGroup = (gId: string) => {
    if (homeScrollRef.current) homeScrollPosRef.current = homeScrollRef.current.scrollTop
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
    setQuickPanelCatId(null)
    savedAmountRef.current = ''
    setQuickAddGlobalAmount('')
    if (!quickAddOpen) {
      console.log('[openQuickAdd] Incrementing quickOpenKey')
      setQuickOpenKey(k => k + 1)
    } else {
      console.log('[openQuickAdd] QuickAdd already open, NOT incrementing key')
    }
    setGlobalMonth(getCurrentMonth())
    setQuickAddOpen(true)
    // Focus is now handled in QuickAddSheet useEffect
  }

  const addNewCategoryAndUpdate = () => {
    const nameVal = quickNewNameRef.current || quickNewName
    if (!nameVal.trim()) return
    const amt = savedAmountRef.current || ''
    const newId = `c_${Date.now()}`
    const newCat: Category = {
      id: newId,
      groupId: quickNewGroupId,
      name: nameVal.trim(),
      budget: 0,
    }
    setCategories((prev) => [...prev, newCat])

    if (quickForecastOnly) {
      // Forecast mode: create the category, then open the forecast period panel
      setQuickPanelCatId(newId)
      setQuickPanelMonth(currentMonth)
      setQuickPanelAmount(amt)
      setQuickPanelForecastEnd('')
      setQuickNewName('')
      quickNewNameRef.current = ''
      return
    }

    const isIncome = newCat.groupId === 'g5'
    const signedAmount = amt ? (isIncome ? -Math.abs(Number(amt)) : Math.abs(Number(amt))) : 0
    if (signedAmount !== 0) {
      setActuals((prev) => ({ ...prev, [newId]: { [globalMonth]: signedAmount } }))
      setCatUsage(prev => {
        const next = { ...prev, [newId]: 1 }
        localStorage.setItem(lsKey('cat_usage'), JSON.stringify(next))
        return next
      })
    }
    savedAmountRef.current = ''
    setSaveFeedback(true)
    setTimeout(() => setSaveFeedback(false), 1500)
    setQuickAddOpen(false)
    setQuickNewName('')
  }

  const trackCatUsage = (catId: string) => {
    setCatUsage(prev => {
      const next = { ...prev, [catId]: (prev[catId] || 0) + 1 }
      localStorage.setItem(lsKey('cat_usage'), JSON.stringify(next))
      return next
    })
  }

  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      groups,
      categories,
      forecasts,
      actuals,
      forecastSnapshots,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bva-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!data.groups || !data.categories) { alert('קובץ לא תקין'); return }
        if (!window.confirm('ייבוא יחליף את כל הנתונים הקיימים. להמשיך?')) return
        setGroups(data.groups)
        setCategories(data.categories)
        setForecasts(data.forecasts || {})
        setActuals(data.actuals || {})
        setForecastSnapshots(data.forecastSnapshots || [])
        alert('הנתונים יובאו בהצלחה ✓')
      } catch { alert('שגיאה בקריאת הקובץ') }
    }
    reader.readAsText(file)
  }

  const openUpdate = (cat: Category, month: string, mode: 'add' | 'replace' | 'forecast' = 'replace') => {
    setInlineSheetAmount('')
    setInlineSheet({ cat, month, forecastOnly: mode === 'forecast' })
  }


  const deleteCategory = (catId: string) => {
    {
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
    <div className="m-logo-block" onClick={() => { setScreen('home'); setExpandedGroups(new Set()); setViewMonthIdx(months.indexOf(currentMonth) >= 0 ? months.indexOf(currentMonth) : 0) }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }}>
      <img src="/Trn color.png" alt="Dexcel" style={{ height: 22, maxHeight: '85%' }} />
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
                    {gc.filter((cat) => {
                      // Always show income categories (g5), hide others only if value is zero
                      if (g.id === 'g5') return true
                      const b = getForecastValue(cat, vm), a = getActualValue(cat.id, vm)
                      const val = a !== null ? Math.abs(a) : b
                      return val > 0
                    }).map((cat) => {
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

  // --- DRAGGABLE FABs ---
  const DraggableFABs = () => {
    const [pos, setPos] = useState(() => {
      const saved = localStorage.getItem(lsKey('fab_pos'))
      return saved ? JSON.parse(saved) : { x: window.innerWidth - 76, y: window.innerHeight - 200 }
    })
    const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; moved: boolean } | null>(null)

    const onTouchStart = (e: React.TouchEvent) => {
      const t = e.touches[0]
      dragRef.current = { startX: t.clientX, startY: t.clientY, startPosX: pos.x, startPosY: pos.y, moved: false }
    }
    const onTouchMove = (e: React.TouchEvent) => {
      if (!dragRef.current) return
      e.stopPropagation()
      const dx = e.touches[0].clientX - dragRef.current.startX
      const dy = e.touches[0].clientY - dragRef.current.startY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true
      const newX = Math.max(0, Math.min(window.innerWidth - 72, dragRef.current.startPosX + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 160, dragRef.current.startPosY + dy))
      setPos({ x: newX, y: newY })
    }
    const onTouchEnd = (e: React.TouchEvent, action: () => void) => {
      if (!dragRef.current) return
      const wasDrag = dragRef.current.moved
      dragRef.current = null
      if (!wasDrag) { action(); return }
      localStorage.setItem(lsKey('fab_pos'), JSON.stringify(pos))
    }

    return (
      <div style={{ position: 'fixed', left: pos.x, top: pos.y, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 100, touchAction: 'none' }}>
        <button
          className="m-fab-glass m-fab-with-label"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={e => onTouchEnd(e, openQuickAdd)}
          onClick={() => { if (!dragRef.current?.moved) openQuickAdd() }}
          title="עדכון בפועל"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span className="m-fab-inner-label">בפועל</span>
        </button>
        <button
          className="m-fab-glass forecast m-fab-with-label"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={e => onTouchEnd(e, () => { setQuickForecastOnly(true); setQuickPanelCatId(null); setQuickPanelAmount(''); setQuickPanelMonth(''); setQuickPanelForecastEnd(''); setQuickPreOpenCat(null); setQuickNewName(''); savedAmountRef.current = ''; if (!quickAddOpen) { setQuickOpenKey(k => k + 1); setQuickAddGlobalAmount(''); } setQuickAddOpen(true); setTimeout(() => { if (globalAmountInputRef.current) { globalAmountInputRef.current.focus() } }, 50) })}
          onClick={() => { if (!dragRef.current?.moved) { setQuickForecastOnly(true); setQuickPanelCatId(null); setQuickPanelAmount(''); setQuickPanelMonth(''); setQuickPanelForecastEnd(''); setQuickPreOpenCat(null); setQuickNewName(''); savedAmountRef.current = ''; if (!quickAddOpen) { setQuickOpenKey(k => k + 1); setQuickAddGlobalAmount(''); } setQuickAddOpen(true); setTimeout(() => { if (globalAmountInputRef.current) { globalAmountInputRef.current.focus() } }, 50) } }}
          title="עדכון תחזית"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="m-fab-inner-label">תחזית</span>
        </button>
      </div>
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
    // months to show in monthly view — RTL: oldest on right, newest on left
    // months array is oldest-first, so index 0 = oldest
    // We show [idx+2, idx+1, idx] so oldest is rightmost
    const monthCols = [viewMonthIdx + 2, viewMonthIdx + 1, viewMonthIdx]
      .filter(i => i >= 0 && i < months.length)
      .map(i => months[i])

    const swipeStartX = useRef(0)
    const swipeStartY = useRef(0)

    return (
      <div className="m-screen">
        <div className="m-header">
          <DexcelLogo />
          <div className="m-account-badge">
            {!isLocalMode && userPhoto ? (
              <img src={userPhoto} alt="" className="m-account-avatar" referrerPolicy="no-referrer" title={userEmail} />
            ) : (
              <div className="m-account-avatar m-account-avatar-placeholder" title={isLocalMode ? 'ללא חשבון' : userEmail}>{isLocalMode ? '👤' : (userEmail?.[0]?.toUpperCase() || '?')}</div>
            )}
            {!isLocalMode && (
              <span className={`m-sync-label ${syncStatus.includes('error') ? 'error' : ''}`}>
                {syncStatus === 'loading' ? '⏳' : syncStatus === 'saving' ? '🔄' : syncStatus === 'saved' ? '✓' : syncStatus.includes('error') ? '⚠️' : ''}
              </span>
            )}
          </div>
          <div className="m-header-actions">
            <button className="m-hbtn m-hbtn-gear" onClick={() => setCatMgmtOpen(true)}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
              <span className="m-hbtn-label">הגדרות</span>
            </button>
            <button className="m-hbtn" onClick={() => setFeedbackOpen(true)} title="שלח הערה">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span className="m-hbtn-label">הערה</span>
            </button>
            <button className="m-hbtn" onClick={async () => {
              if (isLocalMode) {
                localStorage.removeItem('bva_local_mode')
              } else {
                // Flush all pending saves to Firestore before signing out
                await flushAllSaves()
                await new Promise(r => setTimeout(r, 800))
                // Keep localStorage data as backup — don't clear it
                await signOutUser().catch(() => {})
              }
              window.location.reload()
            }} title={userEmail || 'יציאה מחשבון'} style={{color:'#EF4444'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span className="m-hbtn-label">יציאה</span>
            </button>
          </div>
        </div>

        {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} userEmail={userEmail} />}
        {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

        {/* Sync error banner */}
        {!isLocalMode && syncStatus.includes('error') && (
          <div style={{margin:'8px 12px 0',padding:'10px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,direction:'rtl'}}>
            <div style={{fontSize:13,fontWeight:600,color:'#DC2626',marginBottom:4}}>⚠️ בעיית סנכרון עם הענן</div>
            <div style={{fontSize:11,color:'#7F1D1D',lineHeight:1.5}}>{syncError || 'הנתונים נשמרים מקומית בלבד'}</div>
            <div style={{fontSize:10,color:'#9CA3AF',marginTop:4}}>הנתונים שלך שמורים במכשיר. הסנכרון יתחדש כשהבעיה תיפתר.</div>
          </div>
        )}

        {/* Health check banner */}
        {!isLocalMode && healthResult && healthResult !== 'pass' && (
          <div style={{margin:'8px 12px 0',padding:'10px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,direction:'rtl'}}>
            <div style={{fontSize:13,fontWeight:600,color:'#DC2626',marginBottom:4}}>
              ❌ בעיית סנכרון
            </div>
            <div style={{fontSize:11,color:'#7F1D1D',lineHeight:1.5}}>
              שגיאה: {healthResult}
            </div>
          </div>
        )}

        {/* View toggle - segmented control style */}
        <div className="m-home-view-toggle">
          <div className="m-segmented-bg">
            <button
              className={`m-segmented-btn ${homeView === 'actual' ? 'active' : ''}`}
              onClick={() => {
                setHomeView('actual')
                localStorage.setItem(lsKey('home_view'), 'actual')
              }}
            >
              בפועל מול תחזית
            </button>
            <button
              className={`m-segmented-btn ${homeView === 'monthly' ? 'active' : ''}`}
              onClick={() => {
                setHomeView('monthly')
                localStorage.setItem(lsKey('home_view'), 'monthly')
              }}
            >
              חודש מול חודש
            </button>
          </div>
        </div>

        <div className="m-home-scroll"
          ref={el => { if (el && homeScrollPosRef.current) { el.scrollTop = homeScrollPosRef.current }; homeScrollRef.current = el }}
          onTouchStart={e => { swipeStartX.current = e.touches[0].clientX; swipeStartY.current = e.touches[0].clientY }}
          onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - swipeStartX.current
            const dy = e.changedTouches[0].clientY - swipeStartY.current
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              if (dx > 0 && viewMonthIdx < months.length - 1) setViewMonthIdx(i => i + 1)
              else if (dx < 0 && viewMonthIdx > 0) setViewMonthIdx(i => i - 1)
            }
          }}
        >
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
            const g = groups.find(x => x.id === gid)
            if (!g) return null
            const isIncome = gid === 'g5'
            const gc = categories.filter(c => c.groupId === g.id)
            const gb = gc.reduce((s, c) => s + getForecastValue(c, vm), 0)
            const ga = gc.reduce((s, c) => { const a = getActualValue(c.id, vm); return s + Math.abs(a !== null ? a : getForecastValue(c, vm)) }, 0)
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
                    <div key={cat.id} className="m-home-cat-row" style={{display:'flex',alignItems:'center'}}>
                      <span className="m-home-cat-name" style={{cursor:'pointer',flex:1}} onClick={() => openUpdate(cat, currentMonth)}>{cat.name}</span>
                      <span className={`m-home-group-actual ${a !== null ? 'blue' : ''}`} style={{cursor:'pointer'}} onClick={() => openUpdate(cat, vm)}>&#x202A;{Math.abs(a ?? b).toLocaleString()}&#x202C;</span>
                      <span className="m-home-group-budget">&#x202A;{b.toLocaleString()}&#x202C;</span>
                    </div>
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
            {(() => { const b = getRunningBalance(vm); const isManual = openingBalance?.month === vm; return <span className={`m-home-group-actual ${b >= 0 ? '' : 'neg'} ${isManual ? 'manual-balance' : ''}`}>{isManual && <span className="m-manual-pin">📌</span>}&#x202A;{b < 0 ? '−' : ''}{Math.abs(b).toLocaleString()}&#x202C;</span> })()}
            <span className="m-home-group-budget"></span>
          </div>
          <div className="m-forecast-expand-hint" onClick={() => {
            setExpandedGroups(new Set(categories.map(c => c.groupId)))
          }}>מפורט ›</div>
        </div>
        ) : (
        /* ── VIEW 2: month vs month ── */
        <>
        <div className="m-mm-header">
          <span className="m-mm-header-spacer"></span>
          <div className="m-mm-header-months">
            {monthCols.map(m => (
              <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''}`}>{m}</span>
            ))}
          </div>
        </div>
        <div className="m-home-summary-block" style={{marginTop:0,borderTopLeftRadius:0,borderTopRightRadius:0}}>
          {/* All groups in groupOrder */}
          {groupOrder.map((gid) => {
            const g = groups.find(x => x.id === gid)
            if (!g) return null
            const isIncome = gid === 'g5'
            const gc = categories.filter(c => c.groupId === g.id)
            const isOpen = expandedGroups.has(g.id)
            return (
              <React.Fragment key={g.id}>
                <button className={`m-home-group-row ${isIncome ? 'income-row' : ''}`} onClick={() => toggleGroup(g.id)}>
                  <span className="m-home-group-arrow">{isOpen ? '▾' : '▸'}</span>
                  <span className="m-mm-name">{g.name}</span>
                  <div className="m-mm-header-months scrollable">
                    {monthCols.map(m => {
                      const tot = gc.reduce((s,c) => { const a=getActualValue(c.id,m); return s+(a!==null?a:getForecastValue(c,m)) }, 0)
                      return <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''}`}>{Math.abs(tot).toLocaleString()}</span>
                    })}
                  </div>
                </button>
                {isOpen && gc.filter(cat => {
                  // Always show income categories (g5), hide others only if all values are zero
                  if (isIncome) return true
                  // Check if category has any non-zero values across displayed months
                  return monthCols.some(m => {
                    const a = getActualValue(cat.id, m)
                    const b = getForecastValue(cat, m)
                    const val = a !== null ? Math.abs(a) : b
                    return val > 0
                  })
                }).map(cat => (
                  <div key={cat.id} className="m-home-cat-row" style={{display:'flex',alignItems:'center',padding:'6px 6px 6px 4px',borderBottom:'1px solid #F3F4F6'}}>
                    <span className="m-home-group-arrow-spacer"></span>
                    <span className="m-mm-name" style={{cursor:'pointer'}} onClick={() => openUpdate(cat, currentMonth)}>{cat.name}</span>
                    <div className="m-mm-header-months scrollable">
                      {monthCols.map(m => {
                        const a = getActualValue(cat.id, m), b = getForecastValue(cat, m)
                        const displayVal = a !== null ? Math.abs(a) : b
                        return <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''} ${a !== null ? 'blue' : ''}`} onClick={() => openUpdate(cat, m)} style={{cursor:'pointer'}}>{displayVal.toLocaleString()}</span>
                      })}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            )
          })}
          {/* Net footer */}
          <div className="m-home-group-footer">
            <span className="m-home-group-arrow"></span>
            <span className="m-mm-name">נטו</span>
            <div className="m-mm-header-months scrollable">
              {monthCols.map(m => {
                const { net: n } = getMonthTotals(m)
                return <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''} ${n >= 0 ? '' : 'neg'}`}>{n>=0?'+':'−'}{Math.abs(n).toLocaleString()}</span>
              })}
            </div>
          </div>
          {/* Closing balance */}
          <div className="m-home-group-footer m-home-balance-row">
            <span className="m-home-group-arrow"></span>
            <span className="m-mm-name">יתרת סגירה</span>
            <div className="m-mm-header-months scrollable">
              {monthCols.map(m => {
                const b = getRunningBalance(m)
                return <span key={m} className={`m-mm-col ${m === vm ? 'current' : ''} ${b >= 0 ? '' : 'neg'}`}>{b < 0 ? '−' : ''}{Math.abs(b).toLocaleString()}</span>
              })}
            </div>
          </div>
        </div>
        </>
        )}

        {/* Action buttons - single row */}
        <div className="m-home-action-btns">
          <button className="m-hab-btn" onClick={saveSnapshot}>
            <span className="m-hab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            </span>
            <span>שמור</span>
          </button>
          <button className="m-hab-btn" onClick={() => setScreen('forecast-chart')}>
            <span className="m-hab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
              </svg>
            </span>
            <span>גרף</span>
          </button>
          <button className="m-hab-btn" onClick={() => setScreen('forecast')}>
            <span className="m-hab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </span>
            <span>יתרות סגירה ונטו</span>
          </button>
        </div>

        {/* Floating Action Buttons — draggable */}
        <DraggableFABs />
        {/* Save feedback toast */}
        {saveFeedback && (
          <div className="m-save-toast">
            <span className="m-save-toast-icon">✓</span>
            <span>נשמר בהצלחה!</span>
          </div>
        )}

        {/* Tools Section */}
        <div style={{
          padding: '16px',
          background: '#FAFAFA',
          borderTop: '2px solid #E0E0E0',
          marginTop: '16px'
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 12, textAlign: 'center' }}>
            כלים נוספים
          </div>
          <button 
            className="m-tool-btn"
            onClick={() => setScreen('time-tracking')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}
          >
            <span style={{ fontSize: '18px' }}>⏱</span>
            דיווחי שעות
          </button>
          <button 
            className="m-tool-btn"
            onClick={() => setScreen('mortgage-calc')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '18px' }}>🏠</span>
            מחשבון משכנתא
          </button>
        </div>

        {/* Spacer before footer */}
        <div style={{ flex: 1, minHeight: 20 }} />

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          textAlign: 'center',
          color: '#666',
          borderTop: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: 11, color: '#999' }}>
            © 2026 Dexcel
          </div>
        </div>

        {/* Dexcel Branding */}
        <div style={{
          padding: '12px 16px 20px 16px',
          textAlign: 'center',
          background: '#F0F0F0',
          borderTop: '1px solid #E0E0E0'
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>
            טרנספורמציה דיגיטלית
          </div>
          <a href="https://www.dexcel.co.il" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontSize: 11 }}>
            www.dexcel.co.il
          </a>
        </div>
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
              <div className="m-row-month" style={{visibility:'hidden'}}><span className="m-row-month-name">00/00</span></div>
              <span className="m-th-val col-forecast">יתרת סגירה</span>
              <span className="m-th-val col-net">נטו חודשי</span>
            </div>
            <div className="m-forecast-table" style={{ overflowY: 'auto', flex: 1 }}>
              {months.slice(Math.max(0, currentIdx)).map((month, i) => {
                const { net } = getMonthTotals(month)
                const balance = getRunningBalance(month)
                const isCurrent = month === currentMonth
                const isManual = openingBalance?.month === month
                return (
                  <div key={month} className={`m-table-row ${isCurrent ? 'current' : ''}`}>
                    <div className="m-row-month">
                      <span className="m-row-month-name">
                        {month}{isCurrent ? ' (נוכחי)' : i === 1 ? ' (הבא)' : ''}
                      </span>
                    </div>
                    <span className={`m-row-val col-forecast ${balance < 0 ? 'neg' : ''} ${isManual ? 'manual-balance' : ''}`}>
                      {isManual && <span className="m-manual-pin" title="יתרה שהוזנה ידנית">📌</span>}
                      &#x202A;{balance < 0 ? '−' : ''}{Math.abs(balance).toLocaleString()}&#x202C;
                    </span>
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

  // --- OPENING BALANCE SECTION ---
  const OpeningBalanceSection = () => {
    const [editing, setEditing] = useState(true)
    const [selMonth, setSelMonth] = useState(openingBalance?.month ?? currentMonth)
    const [selAmount, setSelAmount] = useState(openingBalance ? String(openingBalance.amount) : '')

    const save = () => {
      const amt = parseFloat(selAmount)
      if (isNaN(amt)) { alert('סכום לא תקין'); return }
      setOpeningBalance({ month: selMonth, amount: amt })
      setSettingsPage('main')
    }
    const clear = () => { setOpeningBalance(null); setSettingsPage('main') }

    return (
      <div className="m-ob-section">
        <div className="m-ob-form">
            <div className="m-ob-row">
              <label className="m-ob-label">חודש סגירה</label>
              <select className="m-ob-select" value={selMonth} onChange={e => setSelMonth(e.target.value)}>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="m-ob-row">
              <label className="m-ob-label">יתרת סגירה (₪)</label>
              <input
                className="m-ob-input"
                type="number" inputMode="numeric"
                placeholder="לדוגמה: 5000"
                value={selAmount}
                onChange={e => setSelAmount(e.target.value)}
              />
            </div>
            <p className="m-ob-hint">היתרה תהיה נקודת ההתחלה לחישוב יתרות הסגירה מהחודש הבא ואילך.</p>
            <div className="m-ob-actions">
              <button className="m-catmgmt-save-btn" onClick={save}>✓ שמור</button>
              {openingBalance && <button className="m-catmgmt-cancel-btn" style={{color:'#DC2626',borderColor:'#FCA5A5'}} onClick={clear}>אפס יתרה</button>}
            </div>
          </div>
      </div>
    )
  }

  // --- CAT MANAGEMENT (render function, not a component — avoids remount on state change) ---
  const renderCatMgmt = () => {
    if (!catMgmtOpen) return null

    const drillGid = catMgmtDrillGid
    const setDrillGid = setCatMgmtDrillGid
    const renamingCatId = catMgmtRenamingId
    const setRenamingCatId = setCatMgmtRenamingId
    const renameVal = catMgmtRenameVal
    const setRenameVal = setCatMgmtRenameVal
    const addingItem = catMgmtAddingItem
    const setAddingItem = setCatMgmtAddingItem
    const newItemName = catMgmtNewItemName
    const setNewItemName = setCatMgmtNewItemName
    const renameRef = catMgmtRenameRef
    const addRef = catMgmtAddRef

    const addingGroup = catMgmtAddingGroup
    const setAddingGroup = setCatMgmtAddingGroup
    const newGroupName = catMgmtNewGroupName
    const setNewGroupName = setCatMgmtNewGroupName
    const newGroupColor = '#E8F4F8'
    const addGroupRef = catMgmtAddGroupRef

    const closeAll = () => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main') }
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

    const saveRenameGroup = (groupId: string) => {
      const trimmed = catMgmtRenameGroupVal.trim()
      if (!trimmed) { setCatMgmtRenamingGroupId(null); return }
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: trimmed } : g))
      setCatMgmtRenamingGroupId(null)
    }

    /* ── MAIN SETTINGS MENU ── */
    if (!drillGid && settingsPage === 'main') return (
      <div className="m-catmgmt-screen">
        <div className="m-catmgmt-topbar">
          <button className="m-catmgmt-back" onClick={closeAll}>✕</button>
          <span className="m-catmgmt-topbar-title">הגדרות</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); setScreen('home') }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>
        <div className="m-settings-menu">
          <button className="m-settings-row" onClick={() => setSettingsPage('categories')}>
            <span className="m-settings-icon-wrap" style={{background:'#EEF2FF'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </span>
            <div className="m-settings-info">
              <span className="m-settings-title">ניהול קטגוריות</span>
              <span className="m-settings-sub">{categories.length} סעיפים ב-{groups.length} קבוצות</span>
            </div>
            <svg className="m-settings-chevron-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="m-settings-row" onClick={() => setSettingsPage('balance')}>
            <span className="m-settings-icon-wrap" style={{background:'#F0FDF4'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </span>
            <div className="m-settings-info">
              <span className="m-settings-title">יתרת פתיחה / סגירה</span>
              <span className="m-settings-sub">{openingBalance ? `${openingBalance.month}: ${openingBalance.amount.toLocaleString()} ₪` : 'לא מוגדר'}</span>
            </div>
            <svg className="m-settings-chevron-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="m-settings-row" onClick={() => setSettingsPage('backup')}>
            <span className="m-settings-icon-wrap" style={{background:'#FFF7ED'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 15 21 19 3 19 3 15"/><polyline points="17 9 12 4 7 9"/><line x1="12" y1="4" x2="12" y2="15"/></svg>
            </span>
            <div className="m-settings-info">
              <span className="m-settings-title">גיבוי ושחזור</span>
              <span className="m-settings-sub">ייצוא וייבוא נתונים</span>
            </div>
            <svg className="m-settings-chevron-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="m-settings-row" onClick={() => setAboutOpen(true)}>
            <span className="m-settings-icon-wrap" style={{background:'#F3E8FF'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </span>
            <div className="m-settings-info">
              <span className="m-settings-title">אודות</span>
              <span className="m-settings-sub">BVA Budget ו-Dexcel</span>
            </div>
            <svg className="m-settings-chevron-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    )

    /* ── BALANCE PAGE ── */
    if (!drillGid && settingsPage === 'balance') return (
      <div className="m-catmgmt-screen">
        <div className="m-catmgmt-topbar">
          <button className="m-catmgmt-back" onClick={() => setSettingsPage('main')}>‹ חזרה</button>
          <span className="m-catmgmt-topbar-title">יתרת פתיחה / סגירה</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); setScreen('home') }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>
        <OpeningBalanceSection />
      </div>
    )

    /* ── BACKUP PAGE ── */
    if (!drillGid && settingsPage === 'backup') return (
      <div className="m-catmgmt-screen">
        <div className="m-catmgmt-topbar">
          <button className="m-catmgmt-back" onClick={() => setSettingsPage('main')}>‹ חזרה</button>
          <span className="m-catmgmt-topbar-title">גיבוי ושחזור</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); setScreen('home') }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>
        <div style={{padding:'20px 16px',display:'flex',flexDirection:'column',gap:12}}>
          <p style={{margin:0,fontSize:13,color:'#6B7280',lineHeight:1.5}}>הנתונים שמורים בדפדפן. מומלץ לגבות לקובץ JSON ולשמור ב-Google Drive / iCloud.</p>
          <button className="m-catmgmt-backup-btn" style={{width:'100%',padding:'14px'}} onClick={exportData}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            גיבוי — ייצוא לקובץ
          </button>
          <label className="m-catmgmt-backup-btn m-catmgmt-restore-btn" style={{width:'100%',padding:'14px',boxSizing:'border-box'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 5 17 10"/><line x1="12" y1="5" x2="12" y2="17"/></svg>
            שחזור — ייבוא מקובץ
            <input type="file" accept=".json" style={{display:'none'}} onChange={e => { if (e.target.files?.[0]) importData(e.target.files[0]) }} />
          </label>
        </div>
      </div>
    )

    /* ── CATEGORIES PAGE ── */
    if (!drillGid && settingsPage === 'categories') return (
      <div className="m-catmgmt-screen">
        <div className="m-catmgmt-topbar">
          <button className="m-catmgmt-back" onClick={() => setSettingsPage('main')}>‹ חזרה</button>
          <span className="m-catmgmt-topbar-title">ניהול קטגוריות</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); setScreen('home') }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>
        <button className="m-catmgmt-add-row" onClick={() => setAddingGroup(true)}>
          <span className="m-catmgmt-add-plus">＋</span>
          <span className="m-catmgmt-add-label">קטגוריה חדשה</span>
        </button>
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
            const g = groups.find(x => x.id === gid)
            if (!g) return null
            const items = categories.filter(c => c.groupId === g.id)
            const accent = groupAccent(g.id)
            const isRenaming = catMgmtRenamingGroupId === g.id
            
            if (isRenaming) {
              return (
                <div key={g.id} className="m-catmgmt-group-card" style={{ borderRightColor: accent, background: groupBg(g.id), flexDirection: 'column', alignItems: 'stretch' }}>
                  <input
                    ref={catMgmtRenameGroupRef}
                    className="m-catmgmt-edit-input"
                    value={catMgmtRenameGroupVal}
                    onChange={e => setCatMgmtRenameGroupVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRenameGroup(g.id); if (e.key === 'Escape') setCatMgmtRenamingGroupId(null) }}
                    style={{ marginBottom: 8 }}
                  />
                  <div className="m-catmgmt-edit-actions">
                    <button className="m-catmgmt-save-btn" onClick={() => saveRenameGroup(g.id)} disabled={!catMgmtRenameGroupVal.trim()}>✓ שמור</button>
                    <button className="m-catmgmt-cancel-btn" onClick={() => setCatMgmtRenamingGroupId(null)}>ביטול</button>
                  </div>
                </div>
              )
            }
            
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
                <button className="m-catmgmt-rename-btn" onClick={e => { e.stopPropagation(); setCatMgmtRenameGroupVal(g.name); setCatMgmtRenamingGroupId(g.id) }}>✏️</button>
                <button className="m-catmgmt-delete-btn" onClick={e => { e.stopPropagation(); if (g.id === 'g5') { setErrorToast('לא ניתן למחוק את קטגוריית ההכנסות'); setTimeout(() => setErrorToast(null), 3000); return; } if (items.length > 0) { setErrorToast('לא ניתן למחוק קטגוריה שיש בה סעיפים'); setTimeout(() => setErrorToast(null), 3000); return; } setGroups(prev => prev.filter(gr => gr.id !== g.id)); setGroupOrder(prev => prev.filter(id => id !== g.id)); setDeleteToast(g.name); setTimeout(() => setDeleteToast(null), 2500) }}>🗑</button>
                <span className="m-catmgmt-chevron">›</span>
              </div>
            )
          })}
        </div>
      </div>
    )

    /* ── ITEMS LIST (drill-down) ── */
    const group   = groups.find(g => g.id === drillGid)
    if (!group || !drillGid) { setDrillGid(null); return null }
    const gid = drillGid as string
    const accent  = groupAccent(gid)
    const items   = categories.filter(c => c.groupId === gid)

    return (
      <div className="m-catmgmt-screen">
        {/* Header */}
        <div className="m-catmgmt-topbar" style={{ background: accent }}>
          <button className="m-catmgmt-back" onClick={goBack}>‹ חזרה</button>
          <span className="m-catmgmt-topbar-title">{group.icon} {group.name}</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); setScreen('home') }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>

        {/* Add new button */}
        <button className="m-catmgmt-add-row" onClick={() => { setAddingItem(true); setRenamingCatId(null) }}>
          <span className="m-catmgmt-add-plus">＋</span>
          <span className="m-catmgmt-add-label">סעיף חדש ב{group.name}</span>
        </button>

        {/* Add new form */}
        {addingItem && (
          <div className="m-catmgmt-add-form">
            <input
              ref={addRef}
              className="m-catmgmt-edit-input"
              placeholder="שם סעיף חדש..."
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
            <div className="m-catmgmt-empty">אין סעיפים בקטגוריה זו</div>
          )}
          {items.map(cat => {
            const isRenaming = renamingCatId === cat.id
            return (
              <div key={cat.id} className={`m-catmgmt-item ${isRenaming ? 'editing' : ''}`}
                style={{ borderRightColor: accent, background: isRenaming ? groupBg(gid) : 'white' }}>
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
                    <button className="m-catmgmt-delete-btn" onClick={e => { e.stopPropagation(); const name = cat.name; setCategories(prev => prev.filter(c => c.id !== cat.id)); setActuals(prev => { const n = {...prev}; delete n[cat.id]; return n }); setDeleteToast(name); setTimeout(() => setDeleteToast(null), 2500) }}>🗑</button>
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
    const [alsoForecast, setAlsoForecast] = useState(false)
    const [forecastEnd, setForecastEnd] = useState('')  // '' = forever
    const inputRef = useRef<HTMLInputElement>(null)

    const close = () => setInlineSheet(null)
    const startIdx = months.indexOf(month)
    const actual = getActualValue(cat.id, month)
    const forecast = getForecastValue(cat, month)
    const group = groups.find(g => g.id === cat.groupId)

    const saveActual = (isAdd: boolean) => {
      if (!inlineSheetAmount) return
      const isIncome = cat.groupId === 'g5'
      const signedVal = isIncome ? -Math.abs(Number(inlineSheetAmount)) : Math.abs(Number(inlineSheetAmount))
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
      if (!inlineSheetAmount) return
      const val = Number(inlineSheetAmount)
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
              value={inlineSheetAmount}
              onChange={e => setInlineSheetAmount(e.target.value)}
              className="m-qi-global-amount"
              autoFocus
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
              <button className="m-qi-forecast-save-btn" disabled={!inlineSheetAmount} onClick={saveForecast}>📅 עדכן תחזית</button>
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
                <button className="m-qi-big-btn m-qi-big-replace" disabled={!inlineSheetAmount} onClick={() => saveActual(false)}>
                  <span className="m-qi-big-icon">✏️</span>
                  <span className="m-qi-big-label">עדכון</span>
                  <span className="m-qi-big-hint">מחליף סכום</span>
                </button>
                <button className="m-qi-big-btn m-qi-big-add" disabled={!inlineSheetAmount} onClick={() => saveActual(true)}>
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
  const QuickAddSheet = ({ globalAmountValue, setGlobalAmountValue }: { 
    globalAmountValue: string
    setGlobalAmountValue: (val: string) => void 
  }) => {
    const panelRef = useRef<HTMLDivElement>(null)
    const [editingCatId, setEditingCatId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const touchReadyRef = useRef(false)
    const [amountShake, setAmountShake] = useState(false)
    const newNameRef = useRef<HTMLInputElement>(null)
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
    const [panelForecast, setPanelForecast] = useState(false)
    const [panelForward, setPanelForward] = useState(false)
    const [panelForwardStart, setPanelForwardStart] = useState(currentMonth)
    const [newItemName, setNewItemName] = useState('')
    
    // Initialize touchReady and focus on mount only
    useEffect(() => {
      touchReadyRef.current = false
      const t = setTimeout(() => { 
        touchReadyRef.current = true
      }, 200)
      
      // Focus immediately
      if (globalAmountInputRef.current) {
        globalAmountInputRef.current.focus()
      }
      
      return () => clearTimeout(t)
    }, [])

    if (!quickAddOpen) return null

    const incomeCatsList = categories.filter((c) => c.groupId === 'g5')
    const expenseCatsList = categories.filter((c) => c.groupId !== 'g5')
    const allExpenseGroups = groups.filter((g) => g.id !== 'g5')

    // Global month + amount at top
    const globalAmountRef = globalAmountInputRef

    const tabCats = activeTab === 'expense' ? expenseCatsList : incomeCatsList
    const filtered = quickForecastOnly
      ? [...tabCats].sort((a, b) => a.name.localeCompare(b.name, 'he'))
      : [...tabCats].sort((a, b) => (catUsage[b.id] || 0) - (catUsage[a.id] || 0))
    const noResults = false

    // Per-cat expanded panel state — all use outer state to survive re-renders
    const panelCatId = quickPanelCatId
    const setPanelCatId = setQuickPanelCatId
    const panelAmount = quickPanelAmount
    const setPanelAmount = setQuickPanelAmount
    const panelMonth = quickPanelMonth || currentMonth
    const setPanelMonth = setQuickPanelMonth
    const panelForecastEnd = quickPanelForecastEnd
    const setPanelForecastEnd = setQuickPanelForecastEnd

    const openPanel = (catId: string) => {
      const capturedAmt = globalAmountValue
      setPanelCatId(catId)
      setPanelMonth(currentMonth)
      setPanelAmount(capturedAmt)
      setPanelForecast(false)
      setPanelForecastEnd('')   // '' = לנצח (forever checked by default)
      setPanelForward(false)
      setPanelForwardStart(currentMonth)
      // no scroll - let user stay in place
    }

    const doClose = () => { setQuickAddOpen(false); setQuickPreOpenCat(null); setQuickSearch(''); setQuickPanelCatId(null); setQuickPanelAmount(''); setQuickPanelMonth(''); setQuickPanelForecastEnd('') }
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
      const amt = globalAmountRef.current?.value || panelAmount
      if (!amt) return
      const newVal = Number(amt)
      const pStartIdx = months.indexOf(panelMonth)
      const endIdx = panelForecastEnd ? months.indexOf(panelForecastEnd) : months.length - 1
      setForecasts(prev => {
        const next = { ...prev }
        for (let i = pStartIdx; i <= endIdx; i++) {
          next[cat.id] = { ...(next[cat.id] || {}), [months[i]]: newVal }
        }
        return next
      })
      // Show success feedback
      const monthsCount = endIdx - pStartIdx + 1
      const period = monthsCount === 1 ? panelMonth : `${panelMonth} - ${months[endIdx]}`
      setSuccessToast(`תחזית ${cat.name}: ${amt} ₪ (${period})`)
      setTimeout(() => setSuccessToast(null), 2000)
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
          <div className="m-qi-tabs-row">
            <div className="m-qi-tabs-segmented" style={{flex:1}}>
              <button
                className={`m-qi-tab-pill ${activeTab === 'expense' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('expense')
                  // Keep new-item form open if currently creating one
                  if (panelCatId !== '__new__') setPanelCatId(null)
                  // Ensure new-item default group matches the selected tab
                  const firstExpense = allExpenseGroups[0]?.id ?? 'g4'
                  setQuickNewGroupId(firstExpense)
                }}
                style={{flex:1}}>הוצאות</button>
              <button
                className={`m-qi-tab-pill ${activeTab === 'income' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('income')
                  // Keep new-item form open if currently creating one
                  if (panelCatId !== '__new__') setPanelCatId(null)
                  // Ensure new-item default group matches the selected tab
                  setQuickNewGroupId('g5')
                }}
                style={{flex:1}}>הכנסות</button>
            </div>
            {panelCatId !== '__new__' && (
              <button className="m-qi-new-cat-inline-btn" onClick={() => {
                savedAmountRef.current = globalAmountValue
                const defaultGid = activeTab === 'income' ? 'g5' : (allExpenseGroups[0]?.id ?? 'g4')
                setQuickNewGroupId(defaultGid)
                setPanelCatId('__new__')
                setNewItemName(quickNewNameRef.current || '')
                setQuickNewName('')
                quickNewNameRef.current = ''
                setTimeout(() => newNameRef.current?.focus(), 200)
              }}>סעיף חדש +</button>
            )}
          </div>

          {/* New category form — shown at top so keyboard doesn't hide it */}
          {panelCatId === '__new__' && (
            <div className="m-new-cat-box m-new-cat-box-top">
              <div className="m-new-cat-title">סעיף חדש</div>
              <input
                ref={newNameRef}
                className="m-qi-amount-input"
                placeholder="שם הסעיף..."
                defaultValue={quickNewNameRef.current}
                onChange={e => { quickNewNameRef.current = e.target.value }}
              />
              {activeTab === 'expense' && (
                <select className="m-sheet-select" value={quickNewGroupId} onChange={e => setQuickNewGroupId(e.target.value)}>
                  {allExpenseGroups.filter((g,i,arr) => arr.findIndex(x=>x.id===g.id)===i).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              <div style={{display:'flex',gap:8}}>
                <button className="m-btn-primary" style={{flex:1}} onClick={() => { addNewCategoryAndUpdate() }}>צור והוסף ✓</button>
                <button className="m-catmgmt-cancel-btn" onClick={() => { setPanelCatId(null); savedAmountRef.current = '' }}>ביטול</button>
              </div>
            </div>
          )}

          {/* Amount — big + centered (actuals + forecast); hidden when new-cat form open */}
          {panelCatId !== '__new__' && (
            <div className="m-qi-amount-hero">
              <input
                ref={globalAmountRef}
                type="number" inputMode="numeric"
                placeholder="0"
                value={globalAmountValue}
                onChange={(e) => setGlobalAmountValue(e.target.value)}
                autoFocus
                className={`m-qi-amount-hero-input${amountShake ? ' shake' : ''}`}
              />
              <span className="m-qi-amount-hero-symbol">₪</span>
            </div>
          )}

          {/* Month strip (actuals only) */}
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
                  const curVal = globalAmountRef.current?.value || ''
                  if (dx > 40 && mIdx > 0) { if (curVal) savedAmountRef.current = curVal; setGlobalMonth(months[mIdx - 1]) }
                  else if (dx < -40 && mIdx < months.length - 1) { if (curVal) savedAmountRef.current = curVal; setGlobalMonth(months[mIdx + 1]) }
                }}>
                <button className="m-month-nav-btn" onClick={() => { if (mIdx > 0) { const v = globalAmountRef.current?.value || ''; if (v) savedAmountRef.current = v; setGlobalMonth(months[mIdx-1]) }}}>‹</button>
                <span className="m-month-neighbor">{prev ?? ''}</span>
                <span className="m-month-current">{globalMonth}</span>
                <span className="m-month-neighbor">{next ?? ''}</span>
                <button className="m-month-nav-btn" onClick={() => { if (mIdx < months.length-1) { const v = globalAmountRef.current?.value || ''; if (v) savedAmountRef.current = v; setGlobalMonth(months[mIdx+1]) }}}>›</button>
              </div>
            )
          })()}


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
                    if (!touchReadyRef.current) return
                    swipeCatRef.current = { catId: cat.id, startX: e.touches[0].clientX }
                    setSwipeDx(null)
                  }}
                  onTouchMove={e => {
                    if (!swipeCatRef.current || swipeCatRef.current.catId !== cat.id) return
                    if (quickForecastOnly) return
                    e.preventDefault()
                    setSwipeDx({ catId: cat.id, dx: e.touches[0].clientX - swipeCatRef.current.startX })
                  }}
                  onTouchEnd={e => {
                    if (!swipeCatRef.current || swipeCatRef.current.catId !== cat.id) return
                    const dx = e.changedTouches[0].clientX - swipeCatRef.current.startX
                    swipeCatRef.current = null
                    setSwipeDx(null)
                    if (!touchReadyRef.current || quickForecastOnly) return
                    const _amt = globalAmountValue
                    if (!_amt || Math.abs(dx) < THRESHOLD) return
                    const isAdd = dx > 0
                    const isIncome = cat.groupId === 'g5'
                    const signedAmount = isIncome ? -Math.abs(Number(_amt)) : Math.abs(Number(_amt))
                    setActuals(p => {
                      const existing = p[cat.id]?.[globalMonth] ?? 0
                      const signedExisting = isIncome ? -Math.abs(existing) : Math.abs(existing)
                      return {...p,[cat.id]:{...(p[cat.id]||{}),[globalMonth]: isAdd ? signedExisting + signedAmount : signedAmount}}
                    })
                    trackCatUsage(cat.id)
                    // Show success feedback
                    const action = isAdd ? 'הוסף' : 'עודכן'
                    setSuccessToast(`${cat.name}: ${_amt} ₪ ${action}`)
                    setTimeout(() => setSuccessToast(null), 2000)
                    // Close the QuickAdd sheet
                    setQuickAddOpen(false)
                  }}>
                  {/* Reveal layer — always full width, behind the sliding card */}
                  {cardDx !== 0 && globalAmountValue && (
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
                    if (!touchReadyRef.current) return
                    const _amt = globalAmountValue
                    
                    if (quickForecastOnly) {
                      // Forecast mode: always open panel
                      if (!_amt) {
                        globalAmountInputRef.current?.focus()
                        setAmountShake(true)
                        setTimeout(() => setAmountShake(false), 600)
                        return
                      }
                      openPanel(cat.id)
                    } else {
                      // Actual mode: if amount exists, update (replace); otherwise open panel
                      if (_amt) {
                        const isIncome = cat.groupId === 'g5'
                        const signedAmount = isIncome ? -Math.abs(Number(_amt)) : Math.abs(Number(_amt))
                        setActuals(p => ({...p,[cat.id]:{...(p[cat.id]||{}),[globalMonth]: signedAmount}}))
                        trackCatUsage(cat.id)
                        // Show success feedback
                        setSuccessToast(`${cat.name}: ${_amt} ₪`)
                        setTimeout(() => setSuccessToast(null), 2000)
                        // Close the QuickAdd sheet
                        setQuickAddOpen(false)
                      } else {
                        // No amount - open panel to let user input details
                        openPanel(cat.id)
                      }
                    }
                  }}>
                    <span className="m-quick-item-name">{cat.name}</span>
                    <span className="m-qi-group-label-sm">{group?.icon} {group?.name}</span>
                    {!quickForecastOnly && <span className="m-qi-chevron">›</span>}
                  </button>

                  </div>
                </div>
              )
            })}

          </div>

          {/* Forecast confirm overlay — shown when a cat is selected in forecast mode */}
          {quickForecastOnly && panelCatId && (() => {
            const cat = categories.find(c => c.id === panelCatId)
            if (!cat) return null
            const amt = panelAmount
            return (
              <>
                <div className="m-overlay" onClick={() => setPanelCatId(null)} />
                <div className="m-forecast-confirm-sheet">
                  <div className="m-fc-header">
                    <span className="m-fc-cat-name">{cat.name}</span>
                    <span className="m-fc-amount">{amt ? `₪${Number(amt).toLocaleString()}` : '—'}</span>
                  </div>
                  <div className="m-fc-range-row">
                    <div className="m-fc-range-item">
                      <label className="m-fc-label">מחודש</label>
                      <select value={panelMonth} onChange={e => setPanelMonth(e.target.value)} className="m-fc-select">
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="m-fc-range-item">
                      <label className="m-fc-label">עד חודש</label>
                      <select value={panelForecastEnd} onChange={e => setPanelForecastEnd(e.target.value)} className="m-fc-select">
                        <option value="">לנצח ♾</option>
                        {months.filter((_, i) => i >= months.indexOf(panelMonth)).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    className="m-fc-confirm-btn"
                    disabled={!amt}
                    onClick={() => doSaveForecast(cat)}
                  >✓ אשר עדכון תחזית</button>
                  <button className="m-fc-cancel-btn" onClick={() => setPanelCatId(null)}>ביטול</button>
                </div>
              </>
            )
          })()}
        </div>
    )
  }

  // --- MORTGAGE CALCULATOR ---
  const MortgageCalculator = () => {
    const [mode, setMode] = useState<'calc-payment' | 'calc-loan' | 'calc-years'>('calc-payment')
    const [loanAmount, setLoanAmount] = useState('')
    const [monthlyPayment, setMonthlyPayment] = useState('')
    const [years, setYears] = useState('')
    const [interestRate, setInterestRate] = useState('4')
    const [result, setResult] = useState<number | null>(null)

    // PMT formula: Monthly Payment = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    const calculateMonthlyPayment = (principal: number, annualRate: number, years: number): number => {
      const monthlyRate = annualRate / 100 / 12
      const numPayments = years * 12
      if (monthlyRate === 0) return principal / numPayments
      return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    }

    // PV formula: Loan Amount = PMT * ((1 - (1 + r)^-n) / r)
    const calculateLoanAmount = (payment: number, annualRate: number, years: number): number => {
      const monthlyRate = annualRate / 100 / 12
      const numPayments = years * 12
      if (monthlyRate === 0) return payment * numPayments
      return payment * ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate)
    }

    // NPER formula: Years = log(PMT / (PMT - P*r)) / (12 * log(1 + r))
    const calculateYears = (principal: number, payment: number, annualRate: number): number => {
      const monthlyRate = annualRate / 100 / 12
      if (monthlyRate === 0) return principal / payment / 12
      const numPayments = Math.log(payment / (payment - principal * monthlyRate)) / Math.log(1 + monthlyRate)
      return numPayments / 12
    }

    const calculate = () => {
      const rate = parseFloat(interestRate)
      if (isNaN(rate) || rate < 0) {
        alert('ריבית לא תקינה')
        return
      }

      if (mode === 'calc-payment') {
        const loan = parseFloat(loanAmount)
        const yrs = parseFloat(years)
        if (isNaN(loan) || isNaN(yrs) || loan <= 0 || yrs <= 0) {
          alert('נא למלא סכום משכנתא ומספר שנים')
          return
        }
        setResult(calculateMonthlyPayment(loan, rate, yrs))
      } else if (mode === 'calc-loan') {
        const payment = parseFloat(monthlyPayment)
        const yrs = parseFloat(years)
        if (isNaN(payment) || isNaN(yrs) || payment <= 0 || yrs <= 0) {
          alert('נא למלא החזר חודשי ומספר שנים')
          return
        }
        setResult(calculateLoanAmount(payment, rate, yrs))
      } else {
        const loan = parseFloat(loanAmount)
        const payment = parseFloat(monthlyPayment)
        if (isNaN(loan) || isNaN(payment) || loan <= 0 || payment <= 0) {
          alert('נא למלא סכום משכנתא והחזר חודשי')
          return
        }
        setResult(calculateYears(loan, payment, rate))
      }
    }

    return (
      <div className="m-screen">
        <div className="m-header">
          <button className="m-back-btn" onClick={() => setScreen('home')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="m-title">מחשבון משכנתא</h1>
          <div style={{width:40}}></div>
        </div>

        <div className="m-mortgage-content">
          {/* Mode Tabs */}
          <div className="m-mortgage-tabs">
            <button 
              className={`m-mortgage-tab ${mode === 'calc-payment' ? 'active' : ''}`}
              onClick={() => { setMode('calc-payment'); setResult(null) }}
            >
              חישוב החזר חודשי
            </button>
            <button 
              className={`m-mortgage-tab ${mode === 'calc-loan' ? 'active' : ''}`}
              onClick={() => { setMode('calc-loan'); setResult(null) }}
            >
              חישוב סכום משכנתא
            </button>
            <button 
              className={`m-mortgage-tab ${mode === 'calc-years' ? 'active' : ''}`}
              onClick={() => { setMode('calc-years'); setResult(null) }}
            >
              חישוב מספר שנים
            </button>
          </div>

          {/* Interest Rate */}
          <div className="m-mortgage-field">
            <label>ריבית שנתית (%)</label>
            <input 
              type="number" 
              inputMode="decimal"
              value={interestRate}
              onChange={e => setInterestRate(e.target.value)}
              placeholder="4"
            />
          </div>

          {/* Input Fields based on mode */}
          {mode === 'calc-payment' && (
            <>
              <div className="m-mortgage-field">
                <label>סכום משכנתא (₪)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                  placeholder="1000000"
                />
              </div>
              <div className="m-mortgage-field">
                <label>מספר שנים</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={years}
                  onChange={e => setYears(e.target.value)}
                  placeholder="20"
                />
              </div>
            </>
          )}

          {mode === 'calc-loan' && (
            <>
              <div className="m-mortgage-field">
                <label>החזר חודשי (₪)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={monthlyPayment}
                  onChange={e => setMonthlyPayment(e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div className="m-mortgage-field">
                <label>מספר שנים</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={years}
                  onChange={e => setYears(e.target.value)}
                  placeholder="20"
                />
              </div>
            </>
          )}

          {mode === 'calc-years' && (
            <>
              <div className="m-mortgage-field">
                <label>סכום משכנתא (₪)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                  placeholder="1000000"
                />
              </div>
              <div className="m-mortgage-field">
                <label>החזר חודשי (₪)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={monthlyPayment}
                  onChange={e => setMonthlyPayment(e.target.value)}
                  placeholder="5000"
                />
              </div>
            </>
          )}

          {/* Calculate Button */}
          <button className="m-mortgage-calc-btn" onClick={calculate}>
            חשב
          </button>

          {/* Result */}
          {result !== null && (
            <div className="m-mortgage-result">
              <div className="m-mortgage-result-label">
                {mode === 'calc-payment' && 'החזר חודשי:'}
                {mode === 'calc-loan' && 'סכום משכנתא:'}
                {mode === 'calc-years' && 'מספר שנים:'}
              </div>
              <div className="m-mortgage-result-value">
                {mode === 'calc-years' 
                  ? `${result.toFixed(1)} שנים`
                  : `₪${result.toLocaleString('he-IL', {maximumFractionDigits: 0})}`
                }
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- TIME TRACKING ---
  const TimeTrackingScreen = () => {
    // Android back is handled by the global popstate handler at top of MobileDashboard

    // Restore summary scroll position after every render
    useEffect(() => {
      if (summaryScrollRef.current && summaryScrollPos.current > 0) {
        summaryScrollRef.current.scrollTop = summaryScrollPos.current
      }
    })

    // Helper function
    const calculateHours = (entry: TimeEntry): number => {
      const start = new Date(`${entry.startDate}T${entry.startTime}`)
      const end = new Date(`${entry.endDate}T${entry.endTime}`)
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }


    // Persistent timer banner — defined here so both selected-client and main views can use it
    const stopGlobalTimer = () => {
      if (!timerStart || !timerClientId) {
        setTimerStart(null); setTimerRunning(false); setTimerClientId(null); return
      }
      const now = new Date()
      const entry: TimeEntry = {
        id: Date.now().toString(),
        clientId: timerClientId,
        startDate: timerStart.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        startTime: timerStart.toTimeString().slice(0, 5),
        endTime: now.toTimeString().slice(0, 5),
        notes: ''
      }
      setTimeEntries(prev => [...prev, entry])
      setTimerStart(null); setTimerRunning(false); setTimerClientId(null)
    }
    const TimerBanner = () => {
      if (!timerRunning || !timerStart) return null
      const elapsedMs = timerNow - timerStart.getTime()
      const totalSec = Math.max(0, Math.floor(elapsedMs / 1000))
      const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0')
      const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
      const ss = String(totalSec % 60).padStart(2, '0')
      const tClient = clients.find(c => c.id === timerClientId)
      return (
        <div style={{
          margin: '8px 12px', padding: '10px 14px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white', borderRadius: 12, display: 'flex',
          alignItems: 'center', gap: 10, justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontSize: 16}}>⏱</span>
            <div>
              <div style={{fontSize: 13, opacity: 0.9}}>טיימר פועל{tClient ? ` · ${tClient.name}` : ''}</div>
              <div style={{fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{hh}:{mm}:{ss}</div>
            </div>
          </div>
          <button onClick={stopGlobalTimer} style={{
            background: 'white', color: '#1d4ed8', border: 'none',
            padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14,
            cursor: 'pointer'
          }}>סיים</button>
        </div>
      )
    }

    // Show client view only if no modal is open (to prevent jump when editing from summary)
    if (selectedClientId && !addTimeEntryOpen && !quickTimeEntryOpen) {
      // Show time entries for selected client
      const client = clients.find(c => c.id === selectedClientId)
      if (!client) return null

      const clientEntries = timeEntries.filter(e => e.clientId === selectedClientId)

      const startTimer = () => {
        setTimerStart(new Date())
        setTimerRunning(true)
        setTimerClientId(selectedClientId)
      }

      const stopTimer = () => {
        if (!timerStart) return
        const now = new Date()
        const entry: TimeEntry = {
          id: Date.now().toString(),
          clientId: timerClientId || selectedClientId,
          startDate: timerStart.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
          startTime: timerStart.toTimeString().slice(0, 5),
          endTime: now.toTimeString().slice(0, 5),
          notes: ''
        }
        setTimeEntries(prev => [...prev, entry])
        setTimerStart(null)
        setTimerRunning(false)
        setTimerClientId(null)
      }

      const openEditClient = () => {
        setClientFormName(client.name)
        setClientFormRate(client.hourlyRate.toString())
        setClientFormVat(client.vatPercent.toString())
        setClientFormIncomeTax(client.incomeTaxPercent.toString())
        setEditClientId(client.id)
        setAddClientOpen(true)
      }

      return (
        <div className="m-screen">
          <div className="m-header">
            <button className="m-back-btn" onClick={() => setSelectedClientId(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 className="m-title">{client.name}</h1>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              {/* Add Entry Button - like other screens */}
              <button className="m-hbtn m-hbtn-plus" onClick={() => {
                setEditEntryId(null)
                setEntryFormClientId(selectedClientId || '')
                const _today = new Date().toISOString().split('T')[0]
                const _now = new Date().toTimeString().slice(0, 5)
                setEntryFormStartDate(_today)
                setEntryFormEndDate(_today)
                setEntryFormStartTime(_now)
                setEntryFormEndTime(_now)
                setEntryFormNotes('')
                setEntryFormEmployeeId('self')
                setAddTimeEntryOpen(true)
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span className="m-hbtn-label">חדש</span>
              </button>
              <button className="m-add-btn" onClick={openEditClient}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="12" cy="5" r="1"/>
                  <circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
            </div>
          </div>

          <TimerBanner />

          {/* Timer & Manual Entry Buttons */}
          <div className="m-timer-row">
            <button
              className="m-timer-btn m-timer-start"
              onClick={startTimer}
              disabled={timerRunning}
            >
              ▶ התחלה
            </button>
            <button
              className="m-timer-btn m-timer-stop"
              onClick={stopTimer}
              disabled={!timerRunning}
            >
              ⏹ סיום
            </button>
          </div>

          {timerRunning && timerStart && (
            <div className="m-timer-display">
              ⏱ טיימר פועל מאז {timerStart.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})}
            </div>
          )}


          {/* Time Entries List - Compact, scrolls with the page */}
          <div style={{flex: 1, overflowY: 'auto', paddingBottom: 100}}>
            {clientEntries.length === 0 ? (
              <div className="m-empty-state">אין דיווחי שעות עדיין</div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', padding: '0 16px', background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', margin: '0 4px'}}>
                {[...clientEntries].sort((a,b)=>{
                  const dA = new Date(`${a.startDate}T${a.startTime}`).getTime()
                  const dB = new Date(`${b.startDate}T${b.startTime}`).getTime()
                  return dB - dA
                }).map((entry, idx, arr) => {
                  const hours = calculateHours(entry)
                  const amount = hours * client.hourlyRate * (1 + client.vatPercent / 100)
                  const status = entry.billingStatus || 'pending'
                  const statusColor = status === 'paid' ? '#10b981' : status === 'invoiced' ? '#3b82f6' : '#f59e0b'
                  const empStatus = entry.employeePaidStatus || 'pending'
                  const empStatusColor = empStatus === 'paid' ? '#8b5cf6' : '#cbd5e1'
                  const hasEmployee = !!entry.employeeId
                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        setEntryFormStartDate(entry.startDate)
                        setEntryFormEndDate(entry.endDate)
                        setEntryFormStartTime(entry.startTime)
                        setEntryFormEndTime(entry.endTime)
                        setEntryFormNotes(entry.notes || '')
                        setEntryFormEmployeeId(entry.employeeId || 'self')
                        setEntryFormClientId(entry.clientId)
                        setEditEntryId(entry.id)
                        setAddTimeEntryOpen(true)
                      }}
                      style={{
                        padding: '10px 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #E5E7EB',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{flex: 1, display:'flex', alignItems:'center', gap: 8}}>
                        <div>
                          <div style={{display:'flex', alignItems:'center', gap: 6, flexWrap:'wrap'}}>
                            <span style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>
                              {new Date(entry.startDate).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit'})}
                            </span>
                            <span style={{
                              fontSize: 11, padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                              background: status === 'paid' ? '#dcfce7' : status === 'invoiced' ? '#dbeafe' : '#fef3c7',
                              color: status === 'paid' ? '#166534' : status === 'invoiced' ? '#1e40af' : '#92400e'
                            }}>
                              {status === 'paid' ? 'שולם' : status === 'invoiced' ? 'חויב' : 'ממתין'}
                            </span>
                            {entry.invoiceNumber && <span style={{fontSize: 11, color: '#3b82f6'}}>#{entry.invoiceNumber}</span>}
                          </div>
                          <div style={{fontSize: 12, color: '#6B7280', marginTop: '2px'}}>
                            {entry.startTime}–{entry.endTime}
                          </div>
                          {entry.notes && (
                            <div style={{fontSize: 12, color: '#9CA3AF', marginTop: 2}}>{entry.notes}</div>
                          )}
                        </div>
                      </div>
                      <div style={{textAlign: 'left', marginLeft: '12px', flexShrink: 0}}>
                        <div style={{fontSize: 15, fontWeight: 700, color: '#111827'}}>
                          ₪{amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                        </div>
                        <div style={{fontSize: 11, color: '#6B7280'}}>
                          {hours.toFixed(1)}h
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )
    }

    // Show employee view when selectedEmployeeId is set (and no modal is open)
    if (selectedEmployeeId && !addTimeEntryOpen && !quickTimeEntryOpen && !bulkActionOpen) {
      const employee = employees.find(e => e.id === selectedEmployeeId)
      if (!employee) return null

      // Filter entries for this employee with period filter
      let employeeEntries = timeEntries.filter(e => e.employeeId === selectedEmployeeId)
      
      // Apply period filter
      const now = new Date()
      if (summaryPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        employeeEntries = employeeEntries.filter(e => new Date(e.startDate) >= weekAgo)
      } else if (summaryPeriod === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        employeeEntries = employeeEntries.filter(e => new Date(e.startDate) >= monthAgo)
      } else if (summaryPeriod === 'year') {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        employeeEntries = employeeEntries.filter(e => new Date(e.startDate) >= yearAgo)
      }

      // Apply status filter
      if (employeeStatusFilter !== 'all') {
        employeeEntries = employeeEntries.filter(e => (e.billingStatus || 'pending') === employeeStatusFilter)
      }

      // Sort by date desc
      employeeEntries.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

      return (
        <div className="m-screen">
          <div className="m-header">
            <button className="m-back-btn" onClick={() => setSelectedEmployeeId(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 className="m-title">{employee.name}</h1>
            <div style={{display: 'flex', gap: 8}}>
              <button className="m-hbtn" onClick={() => {
                setEmployeeFormName(employee.name)
                setEmployeeFormEmail(employee.email)
                setEmployeeFormClients(employee.clientIds)
                setEditEmployeeId(employee.id)
                setAddEmployeeOpen(true)
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          </div>

          {/* Period Filter */}
          <div style={{display: 'flex', gap: '8px', padding: '0 16px 8px', justifyContent: 'center'}}>
            <button 
              onClick={() => setSummaryPeriod('week')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                background: summaryPeriod === 'week' ? '#1d4ed8' : '#e5e7eb',
                color: summaryPeriod === 'week' ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              שבוע
            </button>
            <button 
              onClick={() => setSummaryPeriod('month')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                background: summaryPeriod === 'month' ? '#1d4ed8' : '#e5e7eb',
                color: summaryPeriod === 'month' ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              חודש
            </button>
            <button 
              onClick={() => setSummaryPeriod('year')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                background: summaryPeriod === 'year' ? '#1d4ed8' : '#e5e7eb',
                color: summaryPeriod === 'year' ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              שנה
            </button>
            <button 
              onClick={() => setSummaryPeriod('all')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                background: summaryPeriod === 'all' ? '#1d4ed8' : '#e5e7eb',
                color: summaryPeriod === 'all' ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              הכל
            </button>
          </div>

          {/* Status Filter */}
          <div style={{display: 'flex', gap: '8px', padding: '0 16px 12px', justifyContent: 'center'}}>
            <button 
              onClick={() => setEmployeeStatusFilter('all')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                background: employeeStatusFilter === 'all' ? '#1d4ed8' : '#e5e7eb',
                color: employeeStatusFilter === 'all' ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              כל הסטטוסים
            </button>
            <button 
              onClick={() => setEmployeeStatusFilter('pending')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                background: employeeStatusFilter === 'pending' ? '#f59e0b' : '#e5e7eb',
                color: employeeStatusFilter === 'pending' ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ממתין
            </button>
            <button 
              onClick={() => setEmployeeStatusFilter('invoiced')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                background: employeeStatusFilter === 'invoiced' ? '#3b82f6' : '#e5e7eb',
                color: employeeStatusFilter === 'invoiced' ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              חויב
            </button>
            <button 
              onClick={() => setEmployeeStatusFilter('paid')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '20px',
                border: 'none',
                background: employeeStatusFilter === 'paid' ? '#10b981' : '#e5e7eb',
                color: employeeStatusFilter === 'paid' ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              שולם
            </button>
          </div>

          {/* Entries List */}
          <div style={{flex: 1, overflowY: 'auto', paddingBottom: employeeSelectedIds.length > 0 ? 20 : 80}}>
            {employeeEntries.length === 0 ? (
              <div className="m-empty-state">
                <div style={{fontSize: 48, marginBottom: 16}}>📋</div>
                <div>אין דיווחים לעובד זה בתקופה שנבחרה</div>
              </div>
            ) : (
              <>
                {employeeSelectedIds.length === 0 && (
                  <button onClick={() => setEmployeeSelectedIds(employeeEntries.map(e => e.id))}
                    style={{width: '100%', padding: '8px 16px', margin: '4px 0', background: '#F5F3FF', color: '#6b21a8', border: '1px dashed #c4b5fd', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'}}>
                    ✓ בחר הכל
                  </button>
                )}
                {employeeEntries.map(entry => {
                  const client = clients.find(c => c.id === entry.clientId)
                  if (!client) return null
                  const hours = calculateHours(entry)
                  const amount = hours * client.hourlyRate * (1 + client.vatPercent / 100)
                  const status = entry.billingStatus || 'pending'
                  const empPaid = entry.employeePaidStatus === 'paid'
                  const isSelected = employeeSelectedIds.includes(entry.id)
                  const toggleSelect = () => setEmployeeSelectedIds(prev => prev.includes(entry.id) ? prev.filter(i => i !== entry.id) : [...prev, entry.id])

                  return (
                    <div
                      key={entry.id}
                      onTouchStart={() => startLongPress(toggleSelect)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      onContextMenu={(e) => { e.preventDefault(); toggleSelect() }}
                      onClick={() => {
                        if (employeeSelectedIds.length > 0) { toggleSelect(); return }
                        setEntryFormStartDate(entry.startDate)
                        setEntryFormEndDate(entry.endDate)
                        setEntryFormStartTime(entry.startTime)
                        setEntryFormEndTime(entry.endTime)
                        setEntryFormNotes(entry.notes || '')
                        setEntryFormEmployeeId(entry.employeeId || 'self')
                        setEntryFormClientId(entry.clientId)
                        setEditEntryId(entry.id)
                        setAddTimeEntryOpen(true)
                      }}
                      style={{
                        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '1px solid #E5E7EB', background: isSelected ? '#F5F3FF' : 'white', cursor: 'pointer'
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0}}>
                        {employeeSelectedIds.length > 0 && (
                          <input type="checkbox" checked={isSelected} onChange={() => {}} style={{width: 18, height: 18, accentColor: '#8b5cf6'}} />
                        )}
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                            <span style={{fontSize: 14, fontWeight: 600, color: '#111827'}}>{client.name}</span>
                            <span style={{fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                              background: empPaid ? '#f3e8ff' : '#fef3c7',
                              color: empPaid ? '#6b21a8' : '#92400e'}}>
                              {empPaid ? '✓ שולם' : '⏳ ממתין'}
                            </span>
                            {entry.employeeInvoiceNumber && <span style={{fontSize: 11, color: '#8b5cf6'}}>#{entry.employeeInvoiceNumber}</span>}
                          </div>
                          <div style={{fontSize: 12, color: '#6B7280', marginTop: 2}}>
                            {new Date(entry.startDate).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit', year: 'numeric'})} · {entry.startTime}–{entry.endTime}
                          </div>
                        </div>
                      </div>
                      <div style={{textAlign: 'left', flexShrink: 0}}>
                        <div style={{fontSize: 15, fontWeight: 700, color: '#111827'}}>₪{amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
                        <div style={{fontSize: 11, color: '#6B7280'}}>{hours.toFixed(1)}h</div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
          {/* Sticky bottom action bar when employee entries selected */}
          {employeeSelectedIds.length > 0 && (
            <div style={{flexShrink: 0, background: '#1e293b', borderTop: '2px solid #334155', padding: '10px 16px 16px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <span style={{fontSize: 13, fontWeight: 700, color: 'white'}}>תשלום לעובד ({employeeSelectedIds.length} נבחרו):</span>
                <button onClick={() => setEmployeeSelectedIds([])} style={{fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer'}}>✕ בטל</button>
              </div>
              <div style={{display: 'flex', gap: 6, marginBottom: 8}}>
                <button onClick={() => { setTimeEntries(prev => prev.map(e => employeeSelectedIds.includes(e.id) ? {...e, employeePaidStatus: 'pending'} : e)); setEmployeeSelectedIds([]); setEmployeeStatusFilter('all') }}
                  style={{flex: 1, padding: '10px 4px', fontSize: 13, border: 'none', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontWeight: 700, cursor: 'pointer'}}>⏳ טרם שולם</button>
                <button onClick={() => { setTimeEntries(prev => prev.map(e => employeeSelectedIds.includes(e.id) ? {...e, employeePaidStatus: 'paid'} : e)); setEmployeeSelectedIds([]); setEmployeeStatusFilter('all') }}
                  style={{flex: 1, padding: '10px 4px', fontSize: 13, border: 'none', borderRadius: 8, background: '#f3e8ff', color: '#6b21a8', fontWeight: 700, cursor: 'pointer'}}>✅ שולם לעובד</button>
              </div>
              <div style={{display: 'flex', gap: 6}}>
                <input type="text" placeholder="מס' חשבונית עובד"
                  value={bulkEmployeeInvoiceNumber} onChange={e => setBulkEmployeeInvoiceNumber(e.target.value)}
                  style={{flex: 1, padding: '8px 10px', fontSize: 13, border: 'none', borderRadius: 8, background: '#334155', color: 'white', outline: 'none'}} />
                <button onClick={() => {
                  if (!bulkEmployeeInvoiceNumber.trim()) return
                  setTimeEntries(prev => prev.map(e => employeeSelectedIds.includes(e.id) ? {...e, employeeInvoiceNumber: bulkEmployeeInvoiceNumber.trim(), employeePaidStatus: 'pending'} : e))
                  setBulkEmployeeInvoiceNumber('')
                  setEmployeeSelectedIds([])
                  setEmployeeStatusFilter('all')
                }} style={{padding: '8px 14px', fontSize: 13, border: 'none', borderRadius: 8, background: '#8b5cf6', color: 'white', fontWeight: 700, cursor: 'pointer'}}>שמור</button>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Main screen with tabs
    return (
      <div className="m-screen">
        <div className="m-header">
          <button className="m-back-btn" onClick={() => setScreen('home')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="m-title">דיווחי שעות</h1>
          <div className="m-header-actions">
            {timeTrackingTab === 'summary' && (
              <>
                <button className="m-hbtn" onClick={() => {
                  // Export to Excel - trigger from summary results
                  const filteredEntries = timeEntries.filter(e => {
                    const entryDate = new Date(e.startDate)
                    const from = summaryFromDate ? new Date(summaryFromDate) : null
                    const to = summaryToDate ? new Date(summaryToDate) : null
                    if (from && entryDate < from) return false
                    if (to && entryDate > to) return false
                    if (summaryClientFilter !== 'all' && e.clientId !== summaryClientFilter) return false
                    if (summaryStatusFilter !== 'all' && (e.billingStatus || 'pending') !== summaryStatusFilter) return false
                    return true
                  })
                  if (filteredEntries.length === 0) return
                  import('xlsx').then(XLSX => {
                    const data = filteredEntries.map(e => {
                      const client = clients.find(c => c.id === e.clientId)
                      const hours = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000 * 60 * 60)
                      const amount = client ? hours * client.hourlyRate * (1 + client.vatPercent / 100) : 0
                      return {
                        תאריך: e.startDate,
                        לקוח: client?.name || '',
                        'שעות': hours.toFixed(2),
                        סכום: amount.toFixed(2),
                        סטטוס: (e.billingStatus || 'pending') === 'paid' ? 'שולם' : (e.billingStatus || 'pending') === 'invoiced' ? 'חויב' : 'ממתין',
                        הערות: e.notes || ''
                      }
                    })
                    const ws = XLSX.utils.json_to_sheet(data)
                    const wb = XLSX.utils.book_new()
                    XLSX.utils.book_append_sheet(wb, ws, 'דיווחים')
                    XLSX.writeFile(wb, `דיווחי_שעות_${new Date().toISOString().split('T')[0]}.xlsx`)
                  })
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span className="m-hbtn-label">אקסל</span>
                </button>
                <button className="m-hbtn" onClick={() => {
                  // Send by Email - trigger from summary results
                  const filteredEntries = timeEntries.filter(e => {
                    const entryDate = new Date(e.startDate)
                    const from = summaryFromDate ? new Date(summaryFromDate) : null
                    const to = summaryToDate ? new Date(summaryToDate) : null
                    if (from && entryDate < from) return false
                    if (to && entryDate > to) return false
                    if (summaryClientFilter !== 'all' && e.clientId !== summaryClientFilter) return false
                    if (summaryStatusFilter !== 'all' && (e.billingStatus || 'pending') !== summaryStatusFilter) return false
                    return true
                  })
                  if (filteredEntries.length === 0) return
                  const totalHours = filteredEntries.reduce((sum, e) => sum + (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000 * 60 * 60), 0)
                  let totalAmount = 0
                  filteredEntries.forEach(e => {
                    const client = clients.find(c => c.id === e.clientId)
                    if (client) {
                      const hours = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000 * 60 * 60)
                      totalAmount += hours * client.hourlyRate * (1 + client.vatPercent / 100)
                    }
                  })
                  const subject = `דיווח שעות - ${filteredEntries.length} דיווחים`
                  let body = `דיווח שעות\n\n`
                  body += `תקופה: ${summaryFromDate || 'התחלה'} עד ${summaryToDate || 'סוף'}\n`
                  body += `סה"כ שעות: ${totalHours.toFixed(2)}\n`
                  body += `סה"כ הכנסות: ₪${totalAmount.toLocaleString('he-IL', {maximumFractionDigits: 0})}\n\n`
                  body += `דיווחים:\n`
                  filteredEntries.forEach(e => {
                    const client = clients.find(c => c.id === e.clientId)
                    const hours = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000 * 60 * 60)
                    const amount = client ? hours * client.hourlyRate * (1 + client.vatPercent / 100) : 0
                    body += `${e.startDate} ${e.startTime}-${e.endTime} | ${client?.name} | ${hours.toFixed(2)} שעות | ₪${amount.toFixed(2)}\n`
                  })
                  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span className="m-hbtn-label">מייל</span>
                </button>
              </>
            )}
            <button className="m-hbtn m-hbtn-gear" onClick={() => setTimeSettingsOpen(true)}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="m-hbtn-label">הגדרות</span>
            </button>
            {(timeTrackingTab === 'clients' || timeTrackingTab === 'reports') && (
              <button className="m-hbtn m-hbtn-plus" onClick={() => {
                if (timeTrackingTab === 'clients') {
                  setClientFormVat(defaultVat)
                  setClientFormIncomeTax(defaultIncomeTax)
                  setAddClientOpen(true)
                } else {
                  setQuickTimeClientId('')
                  setEntryFormStartDate('')
                  setEntryFormEndDate('')
                  setEntryFormStartTime('')
                  setEntryFormEndTime('')
                  setEntryFormNotes('')
                  setEntryFormEmployeeId('self')
                  setQuickTimeEntryOpen(true)
                }
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span className="m-hbtn-label">חדש</span>
              </button>
            )}
            {timeTrackingTab === 'employees' && (
              <button className="m-hbtn m-hbtn-plus" onClick={() => setAddEmployeeOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span className="m-hbtn-label">חדש</span>
              </button>
            )}
          </div>
        </div>

        <TimerBanner />

        {/* Tabs */}
        <div className="m-time-tabs">
          <button
            className={`m-time-tab ${timeTrackingTab === 'clients' ? 'active' : ''}`}
            onClick={() => setTimeTrackingTab('clients')}
          >
            לקוחות
          </button>
          <button
            className={`m-time-tab ${timeTrackingTab === 'reports' ? 'active' : ''}`}
            onClick={() => setTimeTrackingTab('reports')}
          >
            דיווחים
          </button>
          <button
            className={`m-time-tab ${timeTrackingTab === 'summary' ? 'active' : ''}`}
            onClick={() => setTimeTrackingTab('summary')}
          >
            ניהול חיובים
          </button>
          <button
            className={`m-time-tab ${timeTrackingTab === 'employees' ? 'active' : ''}`}
            onClick={() => setTimeTrackingTab('employees')}
          >
            עובדים
          </button>
        </div>

        {/* Tab 1: Clients */}
        {timeTrackingTab === 'clients' && (
          <div className="m-clients-list">
          {clients.length === 0 ? (
            <div className="m-empty-state">
              <div style={{fontSize: 48, marginBottom: 16}}>👥</div>
              <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>אין לקוחות עדיין</div>
              <div style={{fontSize: 14, color: '#999'}}>לחץ על + כדי להוסיף לקוח ראשון</div>
            </div>
          ) : (
            [...clients]
              .map(c => ({...c, entryCount: timeEntries.filter(e => e.clientId === c.id).length}))
              .sort((a, b) => b.entryCount - a.entryCount)
              .map(client => {
              const openClientEdit = () => {
                setClientFormName(client.name)
                setClientFormRate(String(client.hourlyRate))
                setClientFormVat(String(client.vatPercent))
                setClientFormIncomeTax(String(client.incomeTaxPercent))
                setEditClientId(client.id)
                setAddClientOpen(true)
              }
              return (
                <div
                  key={client.id}
                  className="m-client-card"
                  onClick={() => {
                    if (longPressFiredRef.current) { longPressFiredRef.current = false; return }
                    setSelectedClientId(client.id)
                  }}
                  onTouchStart={() => startLongPress(openClientEdit)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  onMouseDown={() => startLongPress(openClientEdit)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onContextMenu={(e) => { e.preventDefault(); openClientEdit() }}
                >
                  <div className="m-client-name">{client.name}</div>
                </div>
              )
            })
          )}
          </div>
        )}

        {/* Tab 2: Employees */}
        {timeTrackingTab === 'employees' && (
          <div className="m-clients-list">
            {employees.length === 0 ? (
              <div className="m-empty-state">
                <div style={{fontSize: 48, marginBottom: 16}}>👷</div>
                <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>אין עובדים עדיין</div>
                <div style={{fontSize: 14, color: '#999'}}>לחץ על + כדי להוסיף עובד</div>
              </div>
            ) : (
              employees.map(employee => {
                const employeeEntries = timeEntries.filter(e => e.employeeId === employee.id)
                const totalHours = employeeEntries.reduce((sum, e) => {
                  const start = new Date(`${e.startDate}T${e.startTime}`)
                  const end = new Date(`${e.endDate}T${e.endTime}`)
                  return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                }, 0)
                
                const openEmployeeEdit = () => {
                  setEmployeeFormName(employee.name)
                  setEmployeeFormEmail(employee.email)
                  setEmployeeFormClients(employee.clientIds)
                  setEditEmployeeId(employee.id)
                  setAddEmployeeOpen(true)
                }
                
                return (
                  <div 
                    key={employee.id} 
                    className="m-client-card"
                    onClick={() => {
                      // Click to view employee entries
                      setSelectedEmployeeId(employee.id)
                    }}
                    onTouchStart={() => startLongPress(openEmployeeEdit)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    onMouseDown={() => startLongPress(openEmployeeEdit)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onContextMenu={(e) => { e.preventDefault(); openEmployeeEdit() }}
                  >
                    <div className="m-client-name">{employee.name}</div>
                    <div className="m-client-rate">{employee.email}</div>
                    <div className="m-client-stats">
                      {employee.clientIds.length} לקוחות · {totalHours.toFixed(1)} שעות · {employeeEntries.length} דיווחים
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Tab 3: Reports */}
        {timeTrackingTab === 'reports' && (
          <div className="m-time-summary-tab">
            {/* Period Filter */}
            <div style={{display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center'}}>
              <button 
                onClick={() => setReportsPeriod('week')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: reportsPeriod === 'week' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#F3F4F6',
                  color: reportsPeriod === 'week' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                שבוע
              </button>
              <button 
                onClick={() => setReportsPeriod('month')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: reportsPeriod === 'month' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#F3F4F6',
                  color: reportsPeriod === 'month' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                חודש
              </button>
              <button 
                onClick={() => setReportsPeriod('year')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: reportsPeriod === 'year' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#F3F4F6',
                  color: reportsPeriod === 'year' ? 'white' : '#6B7280',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                שנה
              </button>
            </div>

            {(() => {
              // Group ALL entries by period key
              const getPeriodKey = (dateStr: string) => {
                const d = new Date(dateStr)
                if (reportsPeriod === 'week') {
                  // ISO week: Mon-Sun
                  const day = d.getDay() === 0 ? 6 : d.getDay() - 1 // Mon=0
                  const mon = new Date(d); mon.setDate(d.getDate() - day)
                  return mon.toISOString().split('T')[0]
                } else if (reportsPeriod === 'month') {
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                } else {
                  return `${d.getFullYear()}`
                }
              }

              const getPeriodLabel = (key: string) => {
                if (reportsPeriod === 'week') {
                  const mon = new Date(key)
                  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
                  return `${mon.toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit'})} – ${sun.toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'numeric'})}`
                } else if (reportsPeriod === 'month') {
                  const [y, m] = key.split('-')
                  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('he-IL', {month: 'long', year: 'numeric'})
                } else {
                  return key
                }
              }

              // Sort all entries by date desc
              const sorted = [...timeEntries].sort((a, b) => b.startDate.localeCompare(a.startDate))

              // Group by period key
              const grouped: Record<string, TimeEntry[]> = {}
              sorted.forEach(e => {
                const key = getPeriodKey(e.startDate)
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(e)
              })

              const keys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

              if (keys.length === 0) return <div className="m-empty-state">אין דיווחים</div>

              return (
                <>
                  {keys.map(key => {
                    const entries = grouped[key]
                    const totalHours = entries.reduce((sum, e) => sum + calculateHours(e), 0)
                    let totalAmount = 0
                    entries.forEach(e => {
                      const client = clients.find(c => c.id === e.clientId)
                      if (client) totalAmount += calculateHours(e) * client.hourlyRate * (1 + client.vatPercent / 100)
                    })

                    return (
                      <div key={key}>
                        {/* Period subtotal header */}
                        <div style={{background: '#BBF7D0', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6}}>
                          <span style={{fontSize: 16, fontWeight: 700, color: '#065F46'}}>{getPeriodLabel(key)}</span>
                          <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
                            <span style={{fontSize: 15, color: '#047857', fontWeight: 600}}>{totalHours.toFixed(1)}h</span>
                            <span style={{fontSize: 16, color: '#047857', fontWeight: 800}}>₪{totalAmount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</span>
                          </div>
                        </div>

                        {/* Entries in this period */}
                        <div style={{background: 'white', marginBottom: 4}}>
                          {entries.map(entry => {
                            const client = clients.find(c => c.id === entry.clientId)
                            if (!client) return null
                            const hours = calculateHours(entry)
                            const amount = hours * client.hourlyRate * (1 + client.vatPercent / 100)
                            const status = entry.billingStatus || 'pending'
                            return (
                              <div key={entry.id}
                                onClick={() => {
                                  setEntryFormStartDate(entry.startDate)
                                  setEntryFormEndDate(entry.endDate)
                                  setEntryFormStartTime(entry.startTime)
                                  setEntryFormEndTime(entry.endTime)
                                  setEntryFormNotes(entry.notes || '')
                                  setEntryFormEmployeeId(entry.employeeId || 'self')
                                  setEntryFormClientId(entry.clientId)
                                  setEditEntryId(entry.id)
                                  setAddTimeEntryOpen(true)
                                }}
                                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #F9FAFB', cursor: 'pointer'}}
                              >
                                <div style={{minWidth: 0}}>
                                  <div style={{fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{client.name}</div>
                                  <div style={{fontSize: 12, color: '#6B7280'}}>
                                    {new Date(entry.startDate).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'})}
                                    {entry.startTime && ` · ${entry.startTime}–${entry.endTime}`}
                                    <span style={{marginRight: 6, fontSize: 11, padding: '1px 5px', borderRadius: 4, background: status === 'paid' ? '#dcfce7' : status === 'invoiced' ? '#dbeafe' : '#fef3c7', color: status === 'paid' ? '#166534' : status === 'invoiced' ? '#1e40af' : '#92400e'}}>
                                      {status === 'paid' ? 'שולם' : status === 'invoiced' ? 'חויב' : 'ממתין'}
                                    </span>
                                  </div>
                                </div>
                                <div style={{textAlign: 'left', flexShrink: 0}}>
                                  <div style={{fontSize: 14, fontWeight: 700, color: '#059669'}}>₪{amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
                                  <div style={{fontSize: 12, color: '#6B7280'}}>{hours.toFixed(1)}h</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </>
              )
            })()}
          </div>
        )}

        {/* Tab 3: Summary */}
        {timeTrackingTab === 'summary' && (
          <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
          <div style={{flexShrink: 0, padding: '12px 16px 0', background: 'white', borderBottom: '1px solid #E5E7EB'}}>
            {/* Compact Filters */}
            <div style={{display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap'}}>
              <button
                onClick={() => setSummaryDatePickerOpen(true)}
                style={{
                  flex: 2, minWidth: '140px', padding: '8px 12px',
                  border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px',
                  background: summaryFromDate ? '#EFF6FF' : 'white',
                  color: summaryFromDate ? '#1d4ed8' : '#9CA3AF',
                  fontWeight: summaryFromDate ? 600 : 400,
                  cursor: 'pointer', textAlign: 'right'
                }}
              >
                {summaryFromDate
                  ? summaryFromDate === summaryToDate
                    ? `📅 ${new Date(summaryFromDate).toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'numeric'})}`
                    : `📅 ${new Date(summaryFromDate).toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit'})} – ${new Date(summaryToDate).toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'numeric'})}`
                  : 'בחר תקופה'
                }
              </button>
              {summaryFromDate && (
                <button onClick={() => { setSummaryFromDate(''); setSummaryToDate('') }}
                  style={{padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', background: 'white', color: '#9CA3AF', cursor: 'pointer'}}>
                  ✕
                </button>
              )}
              <select
                value={summaryClientFilter}
                onChange={e => setSummaryClientFilter(e.target.value)}
                style={{flex: 1, minWidth: '100px', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px'}}
              >
                <option value="all">כל הלקוחות</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {summaryDatePickerOpen && (
              <DateRangePicker
                startDate={summaryFromDate}
                endDate={summaryToDate}
                onChange={(s, e) => { setSummaryFromDate(s); setSummaryToDate(e) }}
                onClose={() => setSummaryDatePickerOpen(false)}
              />
            )}

            {/* Status Filter Slider */}
            <div style={{display: 'flex', gap: '4px', marginBottom: '12px', background: '#f3f4f6', padding: '4px', borderRadius: '20px'}}>
              <button 
                onClick={() => setSummaryStatusFilter('all')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '16px',
                  border: 'none',
                  background: summaryStatusFilter === 'all' ? '#1d4ed8' : 'transparent',
                  color: summaryStatusFilter === 'all' ? 'white' : '#374151',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >הכל</button>
              <button 
                onClick={() => setSummaryStatusFilter('pending')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '16px',
                  border: 'none',
                  background: summaryStatusFilter === 'pending' ? '#f59e0b' : 'transparent',
                  color: summaryStatusFilter === 'pending' ? 'white' : '#374151',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >ממתין</button>
              <button 
                onClick={() => setSummaryStatusFilter('invoiced')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '16px',
                  border: 'none',
                  background: summaryStatusFilter === 'invoiced' ? '#3b82f6' : 'transparent',
                  color: summaryStatusFilter === 'invoiced' ? 'white' : '#374151',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >חויב</button>
              <button 
                onClick={() => setSummaryStatusFilter('paid')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '16px',
                  border: 'none',
                  background: summaryStatusFilter === 'paid' ? '#10b981' : 'transparent',
                  color: summaryStatusFilter === 'paid' ? 'white' : '#374151',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >שולם</button>
            </div>

          </div>
          {/* Sticky bottom action bar when entries selected */}
          {selectedEntryIds.length > 0 && (
            <div style={{
              position: 'sticky', bottom: 0, zIndex: 50,
              background: '#1e293b',
              borderTop: '2px solid #334155',
              padding: '10px 16px 16px',
              flexShrink: 0
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <span style={{fontSize: 13, fontWeight: 700, color: 'white'}}>שנה סטטוס ({selectedEntryIds.length} נבחרו):</span>
                <button onClick={() => setSelectedEntryIds([])} style={{fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer'}}>✕ בטל</button>
              </div>
              <div style={{display: 'flex', gap: 6, marginBottom: 8}}>
                <button onClick={() => { setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, billingStatus: 'pending'} : e)); setSelectedEntryIds([]); setSummaryStatusFilter('all') }}
                  style={{flex: 1, padding: '10px 4px', fontSize: 13, border: 'none', borderRadius: 8, background: '#fef3c7', color: '#92400e', fontWeight: 700, cursor: 'pointer'}}>⏳ ממתין</button>
                <button onClick={() => { setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, billingStatus: 'invoiced'} : e)); setSelectedEntryIds([]); setSummaryStatusFilter('all') }}
                  style={{flex: 1, padding: '10px 4px', fontSize: 13, border: 'none', borderRadius: 8, background: '#dbeafe', color: '#1e40af', fontWeight: 700, cursor: 'pointer'}}>📄 חויב</button>
                <button onClick={() => { setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, billingStatus: 'paid'} : e)); setSelectedEntryIds([]); setSummaryStatusFilter('all') }}
                  style={{flex: 1, padding: '10px 4px', fontSize: 13, border: 'none', borderRadius: 8, background: '#dcfce7', color: '#166534', fontWeight: 700, cursor: 'pointer'}}>✅ שולם</button>
              </div>
              <div style={{display: 'flex', gap: 6}}>
                <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="מס' חשבונית"
                  value={bulkInvoiceNumber} onChange={e => setBulkInvoiceNumber(e.target.value)}
                  style={{flex: 1, padding: '8px 10px', fontSize: 13, border: 'none', borderRadius: 8, background: '#334155', color: 'white', outline: 'none'}} />
                <button onClick={() => {
                  if (!bulkInvoiceNumber.trim()) return
                  setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, invoiceNumber: bulkInvoiceNumber.trim(), billingStatus: e.billingStatus === 'paid' ? 'paid' : 'invoiced'} : e))
                  setBulkInvoiceNumber('')
                  setSelectedEntryIds([])
                  setSummaryStatusFilter('all')
                }} style={{padding: '8px 14px', fontSize: 13, border: 'none', borderRadius: 8, background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer'}}>שמור</button>
              </div>
            </div>
          )}
          <div
            ref={summaryScrollRef}
            onScroll={() => { if (summaryScrollRef.current) summaryScrollPos.current = summaryScrollRef.current.scrollTop }}
            style={{flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: selectedEntryIds.length > 0 ? 20 : 100}}
          >
            {(() => {
              const filteredEntries = timeEntries.filter(e => {
                const entryDate = new Date(e.startDate)
                const from = summaryFromDate ? new Date(summaryFromDate) : null
                const to = summaryToDate ? new Date(summaryToDate) : null
                
                if (from && entryDate < from) return false
                if (to && entryDate > to) return false
                if (summaryClientFilter !== 'all' && e.clientId !== summaryClientFilter) return false
                if (summaryStatusFilter !== 'all' && (e.billingStatus || 'pending') !== summaryStatusFilter) return false
                
                return true
              })

              const totalHours = filteredEntries.reduce((sum, e) => sum + calculateHours(e), 0)
              let totalAmount = 0
              filteredEntries.forEach(e => {
                const client = clients.find(c => c.id === e.clientId)
                if (client) totalAmount += calculateHours(e) * client.hourlyRate * (1 + client.vatPercent / 100)
              })

              // Selected entries totals
              const selectedEntries = selectedEntryIds.length > 0 ? filteredEntries.filter(e => selectedEntryIds.includes(e.id)) : []
              const selHours = selectedEntries.reduce((sum, e) => sum + calculateHours(e), 0)
              let selAmount = 0
              selectedEntries.forEach(e => {
                const client = clients.find(c => c.id === e.clientId)
                if (client) selAmount += calculateHours(e) * client.hourlyRate * (1 + client.vatPercent / 100)
              })

              const cardHours = selectedEntryIds.length > 0 ? selHours : totalHours
              const cardAmount = selectedEntryIds.length > 0 ? selAmount : totalAmount
              const cardLabel = selectedEntryIds.length > 0 ? `נבחרו ${selectedEntryIds.length}` : 'סה"כ'

              // Find first and last entry dates
              const sortedByDate = [...filteredEntries].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              const firstDate = sortedByDate[0]?.startDate
              const lastDate = sortedByDate[sortedByDate.length - 1]?.startDate

              return (
                <>
                  {/* Compact Summary Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'white',
                    marginBottom: '12px'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <div style={{fontSize: '11px', opacity: 0.9}}>{cardLabel}</div>
                        <div style={{fontSize: '20px', fontWeight: 700}}>
                          ₪{cardAmount.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                        </div>
                      </div>
                      <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '18px', fontWeight: 700}}>{cardHours.toFixed(1)}</div>
                        <div style={{fontSize: '10px', opacity: 0.8}}>שעות</div>
                      </div>
                    </div>
                  </div>


                  {/* Select All Button */}
                  {selectedEntryIds.length === 0 && filteredEntries.length > 0 && (
                    <button
                      onClick={() => setSelectedEntryIds(filteredEntries.map(e => e.id))}
                      style={{
                        width: '100%', padding: '8px', marginBottom: '12px',
                        background: '#EFF6FF', color: '#1d4ed8', border: '1px dashed #93c5fd',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      ☑ בחר את כל {filteredEntries.length} הדיווחים
                    </button>
                  )}

                  {/* Compact Entries List */}
                  {filteredEntries.length > 0 && (
                    <div style={{background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginTop: 8}}>
                      {[...filteredEntries].sort((a,b) => {
                        const dA = new Date(`${a.startDate}T${a.startTime}`).getTime()
                        const dB = new Date(`${b.startDate}T${b.startTime}`).getTime()
                        return dB - dA
                      }).map((entry, idx, arr) => {
                        const client = clients.find(c => c.id === entry.clientId)
                        if (!client) return null
                        const hours = calculateHours(entry)
                        const amount = hours * client.hourlyRate * (1 + client.vatPercent / 100)
                        const status = entry.billingStatus || 'pending'
                        const statusColor = status === 'paid' ? '#10b981' : status === 'invoiced' ? '#3b82f6' : '#f59e0b'
                        const isSelected = selectedEntryIds.includes(entry.id)
                        const inSelectMode = selectedEntryIds.length > 0
                        const toggleSelect = () => setSelectedEntryIds(prev => prev.includes(entry.id) ? prev.filter(i => i !== entry.id) : [...prev, entry.id])
                        const openEdit = () => {
                          // Open modal FIRST to prevent view switch
                          setAddTimeEntryOpen(true)
                          setEntryFormStartDate(entry.startDate)
                          setEntryFormEndDate(entry.endDate)
                          setEntryFormStartTime(entry.startTime)
                          setEntryFormEndTime(entry.endTime)
                          setEntryFormNotes(entry.notes || '')
                          setEntryFormEmployeeId(entry.employeeId || 'self')
                          setEntryFormClientId(entry.clientId)
                          setEditEntryId(entry.id)
                          setSelectedClientId(entry.clientId)
                        }
                        return (
                          <div
                            key={entry.id}
                            onClick={() => {
                              if (longPressFiredRef.current) { longPressFiredRef.current = false; return }
                              if (inSelectMode) toggleSelect(); else openEdit()
                            }}
                            onTouchStart={() => startLongPress(toggleSelect)}
                            onTouchEnd={cancelLongPress}
                            onTouchMove={cancelLongPress}
                            onTouchCancel={cancelLongPress}
                            onContextMenu={(e) => { e.preventDefault(); toggleSelect() }}
                            style={{
                              padding: '10px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #E5E7EB',
                              background: isSelected ? '#EFF6FF' : 'white',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
                              {inSelectMode && (
                                <input type="checkbox" checked={isSelected} onChange={() => {}} style={{width: 18, height: 18, accentColor: '#1d4ed8'}} />
                              )}
                              <span style={{width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0}} />
                              {entry.employeeId && (
                                <span style={{width: 8, height: 8, borderRadius: '50%', background: entry.employeePaidStatus === 'paid' ? '#8b5cf6' : '#cbd5e1', flexShrink: 0, marginLeft: -2}} title="עובד" />
                              )}
                              <div style={{minWidth: 0}}>
                                <div style={{fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                  {client.name}
                                </div>
                                <div style={{fontSize: 13, color: '#374151', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                                  {new Date(entry.startDate).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                                  <span style={{ 
                                    fontSize: 11, 
                                    padding: '2px 6px', 
                                    borderRadius: '4px', 
                                    background: status === 'paid' ? '#dcfce7' : status === 'invoiced' ? '#dbeafe' : '#fef3c7',
                                    color: status === 'paid' ? '#166534' : status === 'invoiced' ? '#1e40af' : '#92400e',
                                    fontWeight: 600
                                  }}>
                                    {status === 'paid' ? 'שולם' : status === 'invoiced' ? 'חויב' : 'ממתין'}
                                  </span>
                                  {entry.invoiceNumber && <span style={{color: '#3b82f6'}}>• #{entry.invoiceNumber}</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{textAlign: 'left', marginLeft: 8}}>
                              <div style={{fontSize: 15, fontWeight: 700, color: '#111827'}}>
                                ₪{amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                              </div>
                              <div style={{fontSize: 11, color: '#6B7280'}}>{hours.toFixed(1)}h</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          </div>
        )}

      </div>
    )
  }

  // Date Range Picker - Booking style
  const DateRangePicker = ({ startDate, endDate, onChange, onClose }: {
    startDate: string
    endDate: string
    onChange: (start: string, end: string) => void
    onClose: () => void
  }) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    // Always open to current month, never pre-select anything
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [picking, setPicking] = useState<'start' | 'end'>('start')
    const [tempStart, setTempStart] = useState('')
    const [tempEnd, setTempEnd] = useState('')

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun

    const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
    const dayNames = ['א','ב','ג','ד','ה','ו','ש']

    const toDateStr = (y: number, m: number, d: number) =>
      `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    const handleDayClick = (d: number) => {
      const dateStr = toDateStr(viewYear, viewMonth, d)
      if (picking === 'start') {
        // First click: set start = end (single day), wait for second click
        setTempStart(dateStr)
        setTempEnd(dateStr)
        setPicking('end')
      } else if (picking === 'end') {
        if (dateStr === tempStart) {
          // Clicked same day again → reset to new start pick
          setTempStart(dateStr)
          setTempEnd(dateStr)
          setPicking('end')
        } else if (dateStr < tempStart) {
          // Clicked before start → swap
          setTempStart(dateStr)
          setTempEnd(tempStart)
        } else {
          // Normal: set end
          setTempEnd(dateStr)
        }
        // After selecting end, stay open — user presses הגדר
      }
    }

    const isStart = (d: number) => toDateStr(viewYear, viewMonth, d) === tempStart
    const isEnd = (d: number) => toDateStr(viewYear, viewMonth, d) === tempEnd
    const isInRange = (d: number) => {
      const ds = toDateStr(viewYear, viewMonth, d)
      return ds > tempStart && ds < tempEnd
    }

    const prevMonth = () => {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
      else setViewMonth(m => m - 1)
    }
    const nextMonth = () => {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
      else setViewMonth(m => m + 1)
    }
    const prevYear = () => setViewYear(y => y - 1)
    const nextYear = () => setViewYear(y => y + 1)

    // Build calendar grid
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    return (
      <>
        <div className="m-overlay" onClick={onClose} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'white', borderRadius: '16px 16px 0 0',
          padding: '16px', zIndex: 500, maxHeight: '80vh', overflowY: 'auto'
        }}>
          {/* Header - Month */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
            <button onClick={prevMonth} style={{border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 10px', color: '#374151'}}>‹</button>
            <div style={{fontWeight: 700, fontSize: 16}}>{monthNames[viewMonth]}</div>
            <button onClick={nextMonth} style={{border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 10px', color: '#374151'}}>›</button>
          </div>
          {/* Header - Year */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
            <button onClick={prevYear} style={{border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', padding: '2px 10px', color: '#6B7280'}}>«</button>
            <div style={{fontSize: 14, color: '#6B7280', fontWeight: 600}}>{viewYear}</div>
            <button onClick={nextYear} style={{border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', padding: '2px 10px', color: '#6B7280'}}>»</button>
          </div>

          {/* Instructions */}
          <div style={{textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 12}}>
            {picking === 'start'
              ? 'בחר תאריך התחלה'
              : tempStart === tempEnd
                ? `נבחר: ${new Date(tempStart).toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'numeric'})} — לחץ על יום אחר לטווח`
                : `${new Date(tempStart).toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit'})} → ${new Date(tempEnd).toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'numeric'})}`
            }
          </div>

          {/* Day names */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4}}>
            {dayNames.map(d => (
              <div key={d} style={{textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: 600, padding: '4px 0'}}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2}}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const start = isStart(d)
              const end = isEnd(d)
              const inRange = isInRange(d)
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(d)}
                  style={{
                    padding: '10px 4px',
                    border: start || end ? 'none' : toDateStr(viewYear, viewMonth, d) === todayStr ? '2px solid #9CA3AF' : 'none',
                    borderRadius: start || end ? '50%' : inRange ? '0' : '50%',
                    background: start || end ? '#1d4ed8' : inRange ? '#dbeafe' : 'transparent',
                    color: start || end ? 'white' : inRange ? '#1e40af' : '#111827',
                    fontWeight: start || end ? 700 : toDateStr(viewYear, viewMonth, d) === todayStr ? 600 : 400,
                    fontSize: 15,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Confirm button */}
          <div style={{marginTop: 16, display: 'flex', gap: 8}}>
            <button
              onClick={onClose}
              style={{padding: '12px 16px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#6B7280'}}
            >
              ביטול
            </button>
            <button
              onClick={() => { if (tempStart) { onChange(tempStart, tempEnd || tempStart); onClose() } }}
              disabled={!tempStart}
              style={{
                flex: 1, padding: '12px', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: tempStart ? 'pointer' : 'default',
                background: tempStart ? '#1d4ed8' : '#E5E7EB',
                color: tempStart ? 'white' : '#9CA3AF'
              }}
            >
              {!tempStart
                ? 'הגדר'
                : tempStart === tempEnd
                  ? `הגדר · ${new Date(tempStart).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'})}`
                  : `הגדר · ${new Date(tempStart).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'})} – ${new Date(tempEnd).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'})}`
              }
            </button>
          </div>
        </div>
      </>
    )
  }

  // Analog Clock Picker - 4 steps: start-hour → start-min → end-hour → end-min
  const TimeRangePicker = ({ startTime, endTime, onChange, onClose }: {
    startTime: string
    endTime: string
    onChange: (start: string, end: string) => void
    onClose: () => void
  }) => {
    // step: 'startH' | 'startM' | 'endH' | 'endM'
    const [step, setStep] = useState<'startH' | 'startM' | 'endH' | 'endM'>('startH')
    const [startH, setStartH] = useState<number | null>(null)
    const [startM, setStartM] = useState<number | null>(null)
    const [endH, setEndH] = useState<number | null>(null)
    const pad = (n: number) => String(n).padStart(2, '0')
    // Fix size once on mount — never recalculate on step change
    const clockSizeRef = useRef(Math.min(window.innerWidth - 32, 340))

    const isHourStep = step === 'startH' || step === 'endH'
    const clockSize = clockSizeRef.current
    const cx = clockSize / 2
    const cy = clockSize / 2
    const rOuter = clockSize * 0.42  // outer ring radius
    const rInner = clockSize * 0.26  // inner ring radius (12-23)

    const numbers = isHourStep
      ? Array.from({length: 24}, (_, i) => i)
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

    const count = numbers.length
    const getPos = (i: number) => {
      if (isHourStep) {
        const n = numbers[i]
        const angle = ((n % 12) / 12) * 2 * Math.PI - Math.PI / 2
        const radius = n < 12 ? rOuter : rInner
        return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
      } else {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2
        return { x: cx + rOuter * Math.cos(angle), y: cy + rOuter * Math.sin(angle) }
      }
    }

    const selectedVal = step === 'startH' ? startH : step === 'startM' ? startM : step === 'endH' ? endH : null

    const handleSelect = (val: number) => {
      if (step === 'startH') { setStartH(val); setStep('startM') }
      else if (step === 'startM') { setStartM(val); setStep('endH') }
      else if (step === 'endH') { setEndH(val); setStep('endM') }
      else {
        const s = `${pad(startH!)}:${pad(startM!)}`
        const e = `${pad(endH!)}:${pad(val)}`
        onChange(s, e)
        onClose()
      }
    }

    const stepLabel = step === 'startH' ? 'שעת התחלה' : step === 'startM' ? `התחלה ${pad(startH!)} — דקות` : step === 'endH' ? `התחלה ${pad(startH!)}:${pad(startM!)} — שעת סיום` : `סיום ${pad(endH!)} — דקות`

    const handPos = selectedVal !== null ? (() => {
      const idx = numbers.indexOf(selectedVal)
      return idx >= 0 ? getPos(idx) : null
    })() : null

    const dotR = clockSize * 0.075  // touch target radius
    const fontSize = isHourStep
      ? (clockSize * 0.055)
      : (clockSize * 0.052)
    const fontSizeInner = clockSize * 0.045

    return (
      <>
        <div className="m-overlay" onClick={onClose} />
        <div style={{position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '16px 16px 0 0', padding: '16px 16px 28px', zIndex: 500}}>
          {/* Header */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
            <button onClick={onClose} style={{border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF', padding: '4px 8px'}}>✕</button>
            <div style={{fontWeight: 700, fontSize: 16, color: '#1F2937'}}>{stepLabel}</div>
            <div style={{width: 40}} />
          </div>

          {/* Time display */}
          <div style={{textAlign: 'center', marginBottom: 14}}>
            <span style={{fontSize: 42, fontWeight: 800, letterSpacing: 3, fontVariantNumeric: 'tabular-nums'}}>
              <span style={{color: (step === 'startH' || step === 'startM') ? '#1d4ed8' : '#CBD5E1'}}>
                {startH !== null ? pad(startH) : '--'}:{startM !== null ? pad(startM) : '--'}
              </span>
              <span style={{color: '#E2E8F0', margin: '0 10px', fontSize: 28, fontWeight: 400}}>→</span>
              <span style={{color: (step === 'endH' || step === 'endM') ? '#1d4ed8' : '#CBD5E1'}}>
                {endH !== null ? pad(endH) : '--'}:--
              </span>
            </span>
          </div>

          {/* Analog Clock */}
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <svg width={clockSize} height={clockSize} style={{touchAction: 'none', display: 'block'}}>
              <circle cx={cx} cy={cy} r={cx - 2} fill="#F8FAFC" stroke="#E5E7EB" strokeWidth={2} />
              {handPos && (
                <line x1={cx} y1={cy} x2={handPos.x} y2={handPos.y} stroke="#1d4ed8" strokeWidth={3} strokeLinecap="round" />
              )}
              <circle cx={cx} cy={cy} r={5} fill="#1d4ed8" />
              {numbers.map((n, i) => {
                const pos = getPos(i)
                const isSelected = selectedVal === n
                const isInner = isHourStep && n >= 12
                const fr = isInner ? fontSizeInner : fontSize
                const dr = isInner ? dotR * 0.85 : dotR
                return (
                  <g key={n} onClick={() => handleSelect(n)} style={{cursor: 'pointer'}}>
                    <circle cx={pos.x} cy={pos.y} r={dr} fill={isSelected ? '#1d4ed8' : 'transparent'} />
                    <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                      fontSize={fr} fontWeight={isSelected ? 700 : 500}
                      fill={isSelected ? 'white' : '#1E293B'}>
                      {pad(n)}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {step !== 'startH' && (
            <button onClick={() => {
              if (step === 'startM') setStep('startH')
              else if (step === 'endH') setStep('startM')
              else setStep('endH')
            }} style={{marginTop: 10, width: '100%', padding: '10px', background: 'none', border: 'none', color: '#6B7280', fontSize: 15, cursor: 'pointer'}}>
              ← חזור
            </button>
          )}
        </div>
      </>
    )
  }

  // Add Client Modal
  const AddClientModal = () => {
    if (!addClientOpen) return null

    const save = () => {
      if (!clientFormName || !clientFormRate) {
        alert('נא למלא שם ותעריף')
        return
      }
      
      if (editClientId) {
        // עריכת לקוח קיים
        setClients(prev => prev.map(c => 
          c.id === editClientId 
            ? {
                ...c,
                name: clientFormName,
                hourlyRate: parseFloat(clientFormRate),
                vatPercent: parseFloat(clientFormVat),
                incomeTaxPercent: parseFloat(clientFormIncomeTax)
              }
            : c
        ))
      } else {
        // לקוח חדש
        const client: Client = {
          id: Date.now().toString(),
          name: clientFormName,
          hourlyRate: parseFloat(clientFormRate),
          vatPercent: parseFloat(clientFormVat),
          incomeTaxPercent: parseFloat(clientFormIncomeTax)
        }
        setClients(prev => [...prev, client])
      }
      
      setClientFormName('')
      setClientFormRate('')
      setClientFormVat('18')
      setClientFormIncomeTax('30')
      setEditClientId(null)
      setAddClientOpen(false)
    }

    // חישוב נטו: (תעריף + מע"מ) - מס הכנסה
    const rate = parseFloat(clientFormRate || '0')
    const vat = parseFloat(clientFormVat || '0')
    const incomeTax = parseFloat(clientFormIncomeTax || '0')
    const grossPerHour = rate * (1 + vat / 100)
    const netPerHour = grossPerHour * (1 - incomeTax / 100)

    return (
      <>
        <div className="m-overlay" onClick={() => setAddClientOpen(false)} />
        <div className="m-top-sheet">
          <div className="m-sheet-header">
            <h2>{editClientId ? 'עריכת לקוח' : 'לקוח חדש'}</h2>
            <button className="m-close-btn" onClick={() => {
              setAddClientOpen(false)
              setEditClientId(null)
              setClientFormName('')
              setClientFormRate('')
              setClientFormVat('18')
              setClientFormIncomeTax('30')
            }}>✕</button>
          </div>

          <div className="m-mortgage-field">
            <label>שם הלקוח</label>
            <input 
              type="text"
              value={clientFormName}
              onChange={e => setClientFormName(e.target.value)}
              placeholder="שם הלקוח"
              autoFocus
            />
          </div>

          <div className="m-mortgage-field">
            <label>תעריף לשעה (₪)</label>
            <input 
              type="number"
              inputMode="numeric"
              value={clientFormRate}
              onChange={e => setClientFormRate(e.target.value)}
              placeholder="100"
            />
          </div>

          <div className="m-mortgage-field">
            <label>אחוז מע"מ (%)</label>
            <input 
              type="number"
              inputMode="decimal"
              value={clientFormVat}
              onChange={e => setClientFormVat(e.target.value)}
              placeholder="18"
            />
          </div>

          <div className="m-mortgage-field">
            <label>אחוז מס הכנסה (%)</label>
            <input 
              type="number"
              inputMode="decimal"
              value={clientFormIncomeTax}
              onChange={e => setClientFormIncomeTax(e.target.value)}
              placeholder="30"
            />
          </div>

          <div className="m-mortgage-field">
            <label>נטו לשעה</label>
            <div style={{fontSize: 20, fontWeight: 600, color: '#15803D'}}>
              ₪{netPerHour.toFixed(2)}
            </div>
            <div style={{fontSize: 12, color: '#6B7280', marginTop: 4}}>
              (תעריף {rate.toFixed(0)} + מע"מ {vat}% = ₪{grossPerHour.toFixed(2)} ברוטו, מינוס מס הכנסה {incomeTax}%)
            </div>
          </div>

          <button className="m-mortgage-calc-btn" onClick={save}>
            {editClientId ? 'עדכן לקוח' : 'שמור לקוח'}
          </button>
          
          {editClientId && (
            <button 
              onClick={() => {
                if (confirm('למחוק את הלקוח?')) {
                  setClients(prev => prev.filter(c => c.id !== editClientId))
                  setAddClientOpen(false)
                  setEditClientId(null)
                  setSelectedClientId(null)
                }
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '12px'
              }}
            >
              מחק לקוח
            </button>
          )}
        </div>
      </>
    )
  }

  // Quick Time Entry Modal (from main screen)
  const QuickTimeEntryModal = () => {
    if (!quickTimeEntryOpen) return null
    const [fieldErrors, setFieldErrors] = useState<{client?: boolean, date?: boolean, time?: boolean}>({})


    // Calculate hours and amount
    let calculatedHours = 0
    let calculatedAmount = 0
    try {
      if (entryFormStartDate && entryFormEndDate && entryFormStartTime && entryFormEndTime) {
        const start = new Date(`${entryFormStartDate}T${entryFormStartTime}`)
        const end = new Date(`${entryFormEndDate}T${entryFormEndTime}`)
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          calculatedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
          
          if (quickTimeClientId && clients && Array.isArray(clients)) {
            const client = clients.find(c => c && c.id === quickTimeClientId)
            if (client && calculatedHours > 0 && client.hourlyRate) {
              calculatedAmount = calculatedHours * client.hourlyRate * (1 + (client.vatPercent || 0) / 100)
            }
          }
        }
      }
    } catch (e) {
      console.error('Error calculating hours:', e)
    }

    const save = () => {
      const errors: {client?: boolean, date?: boolean, time?: boolean} = {}
      if (!quickTimeClientId) errors.client = true
      if (!entryFormStartDate || !entryFormEndDate) errors.date = true
      if (!entryFormStartTime || !entryFormEndTime) errors.time = true

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      setFieldErrors({})
      const entry: TimeEntry = {
        id: Date.now().toString(),
        clientId: quickTimeClientId,
        employeeId: entryFormEmployeeId === 'self' ? undefined : entryFormEmployeeId,
        startDate: entryFormStartDate,
        endDate: entryFormEndDate,
        startTime: entryFormStartTime,
        endTime: entryFormEndTime,
        notes: entryFormNotes
      }
      setTimeEntries(prev => [...prev, entry])
      setEntryFormStartDate('')
      setEntryFormEndDate('')
      setEntryFormStartTime('')
      setEntryFormEndTime('')
      setEntryFormNotes('')
      setEntryFormEmployeeId('self')
      setQuickTimeClientId('')
      setQuickTimeEntryOpen(false)
    }

    return (
      <>
        <div className="m-overlay" onClick={() => setQuickTimeEntryOpen(false)} />
        <div className="m-top-sheet">
          <div className="m-sheet-header">
            <h2>דיווח שעות מהיר</h2>
            <button className="m-close-btn" onClick={() => setQuickTimeEntryOpen(false)}>✕</button>
          </div>

          {/* Client picker */}
          <div style={{marginBottom: 8}}>
            <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 4, letterSpacing: 1}}>לקוח {fieldErrors.client && <span style={{color:'#DC2626'}}>*</span>}</div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
              {Array.isArray(clients) && clients.map(c => c && c.id ? (
                <button key={c.id} onClick={() => { setQuickTimeClientId(c.id); setFieldErrors(prev => ({...prev, client: false})) }}
                  style={{padding: '8px 16px', borderRadius: 20, border: 'none', fontSize: 14, fontWeight: 600,
                    background: quickTimeClientId === c.id ? '#1d4ed8' : '#F3F4F6',
                    color: quickTimeClientId === c.id ? 'white' : '#374151', cursor: 'pointer'}}
                >{c.name}</button>
              ) : null)}
            </div>
            {fieldErrors.client && <div style={{fontSize: 12, color: '#DC2626', marginTop: 4}}>נדרש לבחור לקוח</div>}
          </div>

          <div style={{borderTop: '1px solid #F3F4F6', margin: '12px 0'}} />

          {/* START row */}
          <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
            <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>התחלה</div>
            <button onClick={() => setDatePickerOpen(true)} style={{flex: 1, textAlign: 'right', border: 'none', background: 'none', fontSize: 17, fontWeight: 700, color: entryFormStartDate ? '#111827' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormStartDate || 'בחר תאריך'}
            </button>
            <button onClick={() => { setTimePickerOpen(true) }} style={{minWidth: 70, textAlign: 'left', border: 'none', background: 'none', fontSize: 17, fontWeight: 700, color: entryFormStartTime ? '#1d4ed8' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormStartTime || 'שעה'}
            </button>
          </div>

          {/* END row */}
          <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
            <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>סיום</div>
            <button onClick={() => setDatePickerOpen(true)} style={{flex: 1, textAlign: 'right', border: 'none', background: 'none', fontSize: 17, fontWeight: 700, color: entryFormEndDate ? '#111827' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormEndDate || 'בחר תאריך'}
            </button>
            <button onClick={() => { setTimePickerOpen(true) }} style={{minWidth: 70, textAlign: 'left', border: 'none', background: 'none', fontSize: 17, fontWeight: 700, color: entryFormEndTime ? '#1d4ed8' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormEndTime || 'שעה'}
            </button>
          </div>

          {datePickerOpen && (
            <DateRangePicker
              startDate={entryFormStartDate}
              endDate={entryFormEndDate}
              onChange={(s, e) => { setEntryFormStartDate(s); setEntryFormEndDate(e) }}
              onClose={() => setDatePickerOpen(false)}
            />
          )}
          {timePickerOpen && (
            <TimeRangePicker
              startTime={entryFormStartTime}
              endTime={entryFormEndTime}
              onChange={(s, e) => { setEntryFormStartTime(s); setEntryFormEndTime(e) }}
              onClose={() => setTimePickerOpen(false)}
            />
          )}

          {/* Duration + Amount on one row */}
          {calculatedHours > 0 && (
            <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
              <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>משך</div>
              <div style={{flex: 1, fontSize: 17, fontWeight: 700, color: '#111827'}}>{calculatedHours.toFixed(1)} שעות</div>
              {calculatedAmount > 0 && (
                <div style={{fontSize: 17, fontWeight: 700, color: '#10b981'}}>₪{calculatedAmount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
              )}
            </div>
          )}

          {/* Employee row */}
          {Array.isArray(employees) && employees.length > 0 && (
            <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
              <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>עובד</div>
              <div style={{flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                <button onClick={() => setEntryFormEmployeeId('self')} style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, background: entryFormEmployeeId === 'self' ? '#1d4ed8' : '#F3F4F6', color: entryFormEmployeeId === 'self' ? 'white' : '#374151', cursor: 'pointer'}}>עצמי</button>
                {employees.map(emp => emp && emp.id ? (
                  <button key={emp.id} onClick={() => setEntryFormEmployeeId(emp.id)} style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, background: entryFormEmployeeId === emp.id ? '#1d4ed8' : '#F3F4F6', color: entryFormEmployeeId === emp.id ? 'white' : '#374151', cursor: 'pointer'}}>{emp.name}</button>
                ) : null)}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{padding: '10px 0'}}>
            <input key="quick-notes" defaultValue={entryFormNotes} onBlur={e => setEntryFormNotes(e.target.value)} placeholder="הערה (אופציונלי)"
              style={{width: '100%', border: 'none', borderBottom: '1px solid #E5E7EB', padding: '8px 0', fontSize: 15, background: 'none', outline: 'none'}} />
          </div>


          <div style={{display: 'flex', gap: 10, marginTop: 16}}>
            <button onClick={() => setQuickTimeEntryOpen(false)}
              style={{flex: 1, padding: '14px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#6B7280'}}>
              ביטול
            </button>
            <button className="m-mortgage-calc-btn" onClick={save} style={{flex: 2, margin: 0}}>
              שמור ✓
            </button>
          </div>
        </div>
      </>
    )
  }

  // Add/Edit Time Entry Modal
  const AddTimeEntryModal = () => {
    if (!addTimeEntryOpen) return null
    const [fieldErrors, setFieldErrors] = useState<{client?: boolean, date?: boolean, time?: boolean}>({})


    const closeModal = () => {
      setAddTimeEntryOpen(false)
      setEditEntryId(null)
      setEntryFormStartDate('')
      setEntryFormEndDate('')
      setEntryFormStartTime('')
      setEntryFormEndTime('')
      setEntryFormNotes('')
      setEntryFormEmployeeId('self')
      setEntryFormClientId('')
    }

    const save = () => {
      const clientId = entryFormClientId || selectedClientId
      const errors: {client?: boolean, date?: boolean, time?: boolean} = {}
      if (!clientId) errors.client = true
      if (!entryFormStartDate || !entryFormEndDate) errors.date = true
      if (!entryFormStartTime || !entryFormEndTime) errors.time = true

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      setFieldErrors({})
      if (editEntryId) {
        setTimeEntries(prev => prev.map(en =>
          en.id === editEntryId
            ? {
                ...en,
                clientId: clientId!,
                employeeId: entryFormEmployeeId === 'self' ? undefined : entryFormEmployeeId,
                startDate: entryFormStartDate,
                endDate: entryFormEndDate,
                startTime: entryFormStartTime,
                endTime: entryFormEndTime,
                notes: entryFormNotes
              }
            : en
        ))
      } else {
        const entry: TimeEntry = {
          id: Date.now().toString(),
          clientId: clientId!,
          employeeId: entryFormEmployeeId === 'self' ? undefined : entryFormEmployeeId,
          startDate: entryFormStartDate,
          endDate: entryFormEndDate,
          startTime: entryFormStartTime,
          endTime: entryFormEndTime,
          notes: entryFormNotes
        }
        setTimeEntries(prev => [...prev, entry])
      }
      closeModal()
    }

    const deleteEntry = () => {
      if (!editEntryId) return
      if (!confirm('למחוק את הדיווח?')) return
      setTimeEntries(prev => prev.filter(e => e.id !== editEntryId))
      closeModal()
    }

    return (
      <>
        <div className="m-overlay" onClick={closeModal} />
        <div className="m-top-sheet">
          <div className="m-sheet-header">
            <h2>{editEntryId ? 'עריכת דיווח' : 'דיווח שעות ידני'}</h2>
            <button className="m-close-btn" onClick={closeModal}>✕</button>
          </div>

          {/* Client picker - only when no pre-selected client */}
          {!selectedClientId && (
            <div style={{marginBottom: 8}}>
              <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 4, letterSpacing: 1}}>לקוח {fieldErrors.client && <span style={{color:'#DC2626'}}>*</span>}</div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                {Array.isArray(clients) && clients.map(c => c && c.id ? (
                  <button key={c.id} onClick={() => { setEntryFormClientId(c.id); setFieldErrors(prev => ({...prev, client: false})) }}
                    style={{padding: '8px 16px', borderRadius: 20, border: 'none', fontSize: 14, fontWeight: 600,
                      background: entryFormClientId === c.id ? '#1d4ed8' : '#F3F4F6',
                      color: entryFormClientId === c.id ? 'white' : '#374151', cursor: 'pointer'}}
                  >{c.name}</button>
                ) : null)}
              </div>
              {fieldErrors.client && <div style={{fontSize: 12, color: '#DC2626', marginTop: 4}}>נדרש לבחור לקוח</div>}
              <div style={{borderTop: '1px solid #F3F4F6', margin: '12px 0'}} />
            </div>
          )}

          {/* START row */}
          <div style={{display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6'}}>
            <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>התחלה</div>
            <button onClick={() => { setDatePickerOpen(true); setFieldErrors(prev => ({...prev, date: false})) }}
              style={{flex: 1, textAlign: 'right', border: 'none', background: 'none', fontSize: 17, fontWeight: 700,
                color: fieldErrors.date ? '#DC2626' : entryFormStartDate ? '#111827' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormStartDate || 'בחר תאריך'}
            </button>
            <button onClick={() => { setTimePickerOpen(true); setFieldErrors(prev => ({...prev, time: false})) }}
              style={{minWidth: 70, textAlign: 'left', border: 'none', background: 'none', fontSize: 17, fontWeight: 700,
                color: fieldErrors.time ? '#DC2626' : entryFormStartTime ? '#1d4ed8' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormStartTime || 'שעה'}
            </button>
          </div>

          {/* END row */}
          <div style={{display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6'}}>
            <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>סיום</div>
            <button onClick={() => { setDatePickerOpen(true); setFieldErrors(prev => ({...prev, date: false})) }}
              style={{flex: 1, textAlign: 'right', border: 'none', background: 'none', fontSize: 17, fontWeight: 700,
                color: entryFormEndDate ? '#111827' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormEndDate || 'בחר תאריך'}
            </button>
            <button onClick={() => { setTimePickerOpen(true); setFieldErrors(prev => ({...prev, time: false})) }}
              style={{minWidth: 70, textAlign: 'left', border: 'none', background: 'none', fontSize: 17, fontWeight: 700,
                color: entryFormEndTime ? '#1d4ed8' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormEndTime || 'שעה'}
            </button>
          </div>

          {datePickerOpen && (
            <DateRangePicker
              startDate={entryFormStartDate}
              endDate={entryFormEndDate}
              onChange={(s, e) => { setEntryFormStartDate(s); setEntryFormEndDate(e) }}
              onClose={() => setDatePickerOpen(false)}
            />
          )}
          {timePickerOpen && (
            <TimeRangePicker
              startTime={entryFormStartTime}
              endTime={entryFormEndTime}
              onChange={(s, e) => { setEntryFormStartTime(s); setEntryFormEndTime(e) }}
              onClose={() => setTimePickerOpen(false)}
            />
          )}

          {/* Duration + Amount inline */}
          {(() => {
            if (!entryFormStartDate || !entryFormEndDate || !entryFormStartTime || !entryFormEndTime) return null
            const start = new Date(`${entryFormStartDate}T${entryFormStartTime}`)
            const end = new Date(`${entryFormEndDate}T${entryFormEndTime}`)
            const hrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
            if (hrs <= 0) return null
            const cid = entryFormClientId || selectedClientId
            const cl = clients.find(c => c && c.id === cid)
            const amt = cl && cl.hourlyRate ? hrs * cl.hourlyRate * (1 + (cl.vatPercent || 0) / 100) : 0
            return (
              <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
                <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>משך</div>
                <div style={{flex: 1, fontSize: 17, fontWeight: 700, color: '#111827'}}>{hrs.toFixed(1)} שעות</div>
                {amt > 0 && <div style={{fontSize: 17, fontWeight: 700, color: '#10b981'}}>₪{amt.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>}
              </div>
            )
          })()}

          {/* Employee row */}
          {Array.isArray(employees) && employees.length > 0 && (
            <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
              <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>עובד</div>
              <div style={{flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                <button onClick={() => setEntryFormEmployeeId('self')} style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, background: entryFormEmployeeId === 'self' ? '#1d4ed8' : '#F3F4F6', color: entryFormEmployeeId === 'self' ? 'white' : '#374151', cursor: 'pointer'}}>עצמי</button>
                {employees.map(emp => emp && emp.id ? (
                  <button key={emp.id} onClick={() => setEntryFormEmployeeId(emp.id)} style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, background: entryFormEmployeeId === emp.id ? '#1d4ed8' : '#F3F4F6', color: entryFormEmployeeId === emp.id ? 'white' : '#374151', cursor: 'pointer'}}>{emp.name}</button>
                ) : null)}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
            <input key="add-notes" defaultValue={entryFormNotes} onBlur={e => setEntryFormNotes(e.target.value)} placeholder="הערה (אופציונלי)"
              style={{width: '100%', border: 'none', padding: '4px 0', fontSize: 15, background: 'none', outline: 'none'}} />
          </div>

          <div style={{display: 'flex', gap: 10, marginTop: 16}}>
            {editEntryId && (
              <button onClick={deleteEntry}
                style={{padding: '14px 16px', background: '#FEF2F2', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#DC2626'}}>
                מחק
              </button>
            )}
            <button onClick={closeModal}
              style={{flex: 1, padding: '14px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#6B7280'}}>
              ביטול
            </button>
            <button className="m-mortgage-calc-btn" onClick={save} style={{flex: 2, margin: 0}}>
              {editEntryId ? 'עדכן ✓' : 'שמור ✓'}
            </button>
          </div>
        </div>
      </>
    )
  }

  // Time Tracking Settings Modal (no hooks inside — controlled by top-level state)
  const TimeSettingsModal = () => {
    if (!timeSettingsOpen) return null

    const tempVat = defaultVat
    const tempIncomeTax = defaultIncomeTax
    const setTempVat = (v: string) => setDefaultVat(v)
    const setTempIncomeTax = (v: string) => setDefaultIncomeTax(v)

    const save = () => {
      setTimeSettingsOpen(false)
    }

    const resetAllTimeData = () => {
      if (!confirm('למחוק את כל הלקוחות, העובדים והדיווחים? לא ניתן לשחזר את זה!')) return
      if (!confirm('אישור סופי — האם את בטוחה למחוק הכל?')) return
      setClients([])
      setTimeEntries([])
      setEmployees([])
      setTimerRunning(false)
      setTimerStart(null)
      setSelectedClientId(null)
      setSelectedEmployeeId(null)
      setEditClientId(null)
      setEditEmployeeId(null)
      setEditEntryId(null)
      setTimeSettingsOpen(false)
    }

    return (
      <>
        <div className="m-overlay" onClick={() => setTimeSettingsOpen(false)} />
        <div className="m-top-sheet">
          <div className="m-sheet-header">
            <h2>הגדרות דיווחי שעות</h2>
            <button className="m-close-btn" onClick={() => setTimeSettingsOpen(false)}>✕</button>
          </div>

          <div className="m-mortgage-field">
            <label>אחוז מע"מ ברירת מחדל (%)</label>
            <input 
              type="number"
              inputMode="decimal"
              value={tempVat}
              onChange={e => setTempVat(e.target.value)}
              placeholder="18"
            />
            <div style={{fontSize: 12, color: '#6B7280', marginTop: 4}}>
              ערך זה יוצג אוטומטית בעת הוספת לקוח חדש
            </div>
          </div>

          <div className="m-mortgage-field">
            <label>אחוז מס הכנסה ברירת מחדל (%)</label>
            <input 
              type="number"
              inputMode="decimal"
              value={tempIncomeTax}
              onChange={e => setTempIncomeTax(e.target.value)}
              placeholder="30"
            />
            <div style={{fontSize: 12, color: '#6B7280', marginTop: 4}}>
              ערך זה יוצג אוטומטית בעת הוספת לקוח חדש
            </div>
          </div>

          <div className="m-mortgage-field">
            <label>דוגמה לחישוב</label>
            <div style={{
              padding: '12px',
              background: '#F0FDF4',
              border: '2px solid #BBF7D0',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#166534'
            }}>
              <div>תעריף: ₪100</div>
              <div>+ מע"מ ({tempVat}%): ₪{(100 * parseFloat(tempVat || '0') / 100).toFixed(2)}</div>
              <div style={{borderTop: '1px solid #BBF7D0', marginTop: 4, paddingTop: 4}}>
                = ברוטו: ₪{(100 * (1 + parseFloat(tempVat || '0') / 100)).toFixed(2)}
              </div>
              <div style={{marginTop: 8}}>
                - מס הכנסה ({tempIncomeTax}%): ₪{(100 * (1 + parseFloat(tempVat || '0') / 100) * parseFloat(tempIncomeTax || '0') / 100).toFixed(2)}
              </div>
              <div style={{borderTop: '1px solid #BBF7D0', marginTop: 4, paddingTop: 4, fontWeight: 700}}>
                = נטו: ₪{(100 * (1 + parseFloat(tempVat || '0') / 100) * (1 - parseFloat(tempIncomeTax || '0') / 100)).toFixed(2)}
              </div>
            </div>
          </div>

          <button className="m-mortgage-calc-btn" onClick={save}>
            שמור הגדרות
          </button>

          <button
            onClick={resetAllTimeData}
            style={{
              width: '100%', padding: '14px', marginTop: '12px',
              background: '#fef2f2', color: '#b91c1c',
              border: '2px solid #fecaca', borderRadius: '12px',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            🗑 אפס כל הנתונים (לקוחות ודיווחים)
          </button>
        </div>
      </>
    )
  }

  // Bulk Action Modal — change status / invoice number / delete for many entries
  const BulkActionModal = () => {
    if (!bulkActionOpen) return null

    const close = () => {
      setBulkActionOpen(false)
      setBulkInvoiceNumber('')
      setBulkEmployeeInvoiceNumber('')
    }

    // How many of the selected entries have an employeeId — affects whether the employee section is shown
    const employeeEntriesCount = timeEntries.filter(e => selectedEntryIds.includes(e.id) && e.employeeId).length

    // Sum of selected entries (gross — what client owes me)
    const sumGross = timeEntries.filter(e => selectedEntryIds.includes(e.id)).reduce((sum, e) => {
      const c = clients.find(cl => cl.id === e.clientId)
      if (!c) return sum
      const start = new Date(`${e.startDate}T${e.startTime}`)
      const end = new Date(`${e.endDate}T${e.endTime}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return sum + hours * c.hourlyRate * (1 + c.vatPercent / 100)
    }, 0)

    const applyStatus = (st: 'pending' | 'invoiced' | 'paid') => {
      setTimeEntries(prev => prev.map(e =>
        selectedEntryIds.includes(e.id) ? { ...e, billingStatus: st } : e
      ))
    }

    const applyInvoiceNumber = () => {
      const num = bulkInvoiceNumber.trim()
      if (!num) { alert('נא להזין מספר חשבונית'); return }
      setTimeEntries(prev => prev.map(e =>
        selectedEntryIds.includes(e.id) ? { ...e, invoiceNumber: num, billingStatus: e.billingStatus === 'paid' ? 'paid' : 'invoiced' } : e
      ))
      setSuccessToast(`נשמר מספר חשבונית ל-${selectedEntryIds.length} דיווחים`)
      setTimeout(() => setSuccessToast(null), 2000)
      setSelectedEntryIds([])
      close()
    }

    const applyEmployeePaid = (st: 'pending' | 'paid') => {
      setTimeEntries(prev => prev.map(e =>
        selectedEntryIds.includes(e.id) && e.employeeId ? { ...e, employeePaidStatus: st } : e
      ))
    }

    const applyEmployeeInvoiceNumber = () => {
      const num = bulkEmployeeInvoiceNumber.trim()
      if (!num) { alert('נא להזין מספר חשבונית'); return }
      setTimeEntries(prev => prev.map(e =>
        selectedEntryIds.includes(e.id) && e.employeeId
          ? { ...e, employeeInvoiceNumber: num, employeePaidStatus: e.employeePaidStatus === 'paid' ? 'paid' : 'pending' }
          : e
      ))
      setSuccessToast(`נשמר מספר חשבונית עובד ל-${employeeEntriesCount} דיווחים`)
      setTimeout(() => setSuccessToast(null), 2000)
      setSelectedEntryIds([])
      close()
    }

    const deleteAll = () => {
      if (!confirm(`למחוק ${selectedEntryIds.length} דיווחים?`)) return
      setTimeEntries(prev => prev.filter(e => !selectedEntryIds.includes(e.id)))
      setSelectedEntryIds([])
      close()
    }

    return (
      <>
        <div className="m-overlay" onClick={close} />
        <div className="m-top-sheet">
          <div className="m-sheet-header">
            <h2>פעולה על {selectedEntryIds.length} דיווחים</h2>
            <button className="m-close-btn" onClick={close}>✕</button>
          </div>

          {/* Selected sum summary */}
          <div style={{
            padding: '14px 16px', marginBottom: 16,
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: 12, color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{fontSize: 12, opacity: 0.85}}>סה"כ ברוטו של הסימון</div>
              <div style={{fontSize: 22, fontWeight: 700}}>₪{sumGross.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
            </div>
            <div style={{fontSize: 13, opacity: 0.9}}>{selectedEntryIds.length} דיווחים</div>
          </div>

          <div className="m-mortgage-field">
            <label>סטטוס חיוב ללקוח</label>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              <button onClick={() => { applyStatus('pending'); close() }}
                style={{flex: 1, minWidth: 90, padding: '12px', background: '#fef3c7', color: '#92400e', border: '2px solid #fde68a', borderRadius: 10, fontWeight: 600, cursor: 'pointer'}}>
                ⏳ ממתין
              </button>
              <button onClick={() => { applyStatus('invoiced'); close() }}
                style={{flex: 1, minWidth: 90, padding: '12px', background: '#dbeafe', color: '#1e40af', border: '2px solid #93c5fd', borderRadius: 10, fontWeight: 600, cursor: 'pointer'}}>
                📄 חויב
              </button>
              <button onClick={() => { applyStatus('paid'); close() }}
                style={{flex: 1, minWidth: 90, padding: '12px', background: '#d1fae5', color: '#065f46', border: '2px solid #6ee7b7', borderRadius: 10, fontWeight: 600, cursor: 'pointer'}}>
                ✓ שולם
              </button>
            </div>
          </div>

          <div className="m-mortgage-field">
            <label>מספר חשבונית</label>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={bulkInvoiceNumber}
              onChange={e => setBulkInvoiceNumber(e.target.value)}
              placeholder="לדוגמה: 2026001"
            />
            <button onClick={applyInvoiceNumber}
              style={{width: '100%', padding: '12px', marginTop: 8, background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer'}}>
              שמור מספר חשבונית
            </button>
            <div style={{fontSize: 12, color: '#6B7280', marginTop: 6}}>
              שמירת מספר חשבונית תסמן אוטומטית את הדיווחים כ"חויב" (אם לא שולמו).
            </div>
          </div>

          <button onClick={deleteAll}
            style={{width: '100%', padding: '14px', marginTop: '12px', background: '#fef2f2', color: '#b91c1c', border: '2px solid #fecaca', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer'}}>
            🗑 מחק את כל הדיווחים שנבחרו
          </button>
        </div>
      </>
    )
  }

  // Add Employee Modal (handles both new and edit)
  const AddEmployeeModal = () => {
    if (!addEmployeeOpen) return null

    const closeModal = () => {
      setAddEmployeeOpen(false)
      setEditEmployeeId(null)
      setEmployeeFormName('')
      setEmployeeFormEmail('')
      setEmployeeFormClients([])
    }

    const save = () => {
      if (!employeeFormName || !employeeFormEmail) {
        alert('נא למלא שם ומייל')
        return
      }
      if (editEmployeeId) {
        setEmployees(prev => prev.map(emp =>
          emp.id === editEmployeeId
            ? { ...emp, name: employeeFormName, email: employeeFormEmail, clientIds: employeeFormClients }
            : emp
        ))
      } else {
        const employee: Employee = {
          id: Date.now().toString(),
          name: employeeFormName,
          email: employeeFormEmail,
          clientIds: employeeFormClients
        }
        setEmployees(prev => [...prev, employee])
      }
      closeModal()
    }

    const deleteEmployee = () => {
      if (!editEmployeeId) return
      if (!confirm('למחוק את העובד?')) return
      setEmployees(prev => prev.filter(e => e.id !== editEmployeeId))
      closeModal()
    }

    const toggleClient = (clientId: string) => {
      if (employeeFormClients.includes(clientId)) {
        setEmployeeFormClients(prev => prev.filter(id => id !== clientId))
      } else {
        setEmployeeFormClients(prev => [...prev, clientId])
      }
    }

    return (
      <>
        <div className="m-overlay" onClick={closeModal} />
        <div className="m-top-sheet">
          <div className="m-sheet-header">
            <h2>{editEmployeeId ? 'עריכת עובד' : 'עובד חדש'}</h2>
            <button className="m-close-btn" onClick={closeModal}>✕</button>
          </div>

          <div className="m-mortgage-field">
            <label>שם העובד</label>
            <input 
              type="text"
              value={employeeFormName}
              onChange={e => setEmployeeFormName(e.target.value)}
              placeholder="שם העובד"
              autoFocus
            />
          </div>

          <div className="m-mortgage-field">
            <label>מייל</label>
            <input 
              type="email"
              inputMode="email"
              value={employeeFormEmail}
              onChange={e => setEmployeeFormEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="m-mortgage-field">
            <label>לקוחות מקושרים</label>
            <div style={{marginTop: 8, maxHeight: '200px', overflow: 'auto', paddingRight: '4px'}}>
              {clients.length === 0 ? (
                <div style={{fontSize: 14, color: '#999'}}>אין לקוחות עדיין</div>
              ) : (
                clients.map(client => (
                  <div 
                    key={client.id}
                    onClick={() => toggleClient(client.id)}
                    style={{
                      padding: '10px 12px',
                      background: employeeFormClients.includes(client.id) ? '#DCFCE7' : 'white',
                      border: `2px solid ${employeeFormClients.includes(client.id) ? '#10b981' : '#E5E7EB'}`,
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '4px',
                      border: '2px solid #10b981',
                      background: employeeFormClients.includes(client.id) ? '#10b981' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 14
                    }}>
                      {employeeFormClients.includes(client.id) && '✓'}
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 600}}>{client.name}</div>
                      <div style={{fontSize: 13, color: '#6B7280'}}>₪{client.hourlyRate}/שעה</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button className="m-mortgage-calc-btn" onClick={save}>
            {editEmployeeId ? 'עדכן עובד' : 'שמור עובד'}
          </button>

          {editEmployeeId && (
            <button
              onClick={deleteEmployee}
              style={{
                width: '100%', padding: '14px', marginTop: '12px',
                background: '#ef4444', color: 'white',
                border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              מחק עובד
            </button>
          )}
        </div>
      </>
    )
  }

  const openQuickEntry = () => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toTimeString().slice(0, 5)
    setEntryFormStartDate(today)
    setEntryFormEndDate(today)
    setEntryFormStartTime(now)
    setEntryFormEndTime(now)
    setEntryFormNotes('')
    setEntryFormEmployeeId('self')
    setEntryFormClientId('')
    setEditEntryId(null)
    setQuickTimeEntryOpen(true)
  }

  return (
    <div className="m-app" onClick={() => { if (menuCatId) setMenuCatId(null) }}>
      {screen === 'home' && <HomeScreen />}
      {screen === 'forecast' && <ForecastScreen />}
      {screen === 'budget' && <BudgetScreen />}
      {screen === 'detail' && <DetailScreen />}
      {screen === 'forecast-chart' && <ForecastChartScreen />}
      {screen === 'net-chart' && <NetChartScreen />}
      {screen === 'mortgage-calc' && <MortgageCalculator />}
      {screen === 'time-tracking' && <TimeTrackingScreen />}
      {renderCatMgmt()}
      <InlineSheet />
      <AddClientModal />
      <QuickTimeEntryModal />
      <AddTimeEntryModal />
      {/* Global Floating Action Buttons */}
      {!quickTimeEntryOpen && !addTimeEntryOpen && !addClientOpen && !addEmployeeOpen && !bulkActionOpen && (
        <div
          style={{ position: 'fixed', left: fabPos.x, top: fabPos.y, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 100, touchAction: 'none' }}
          onTouchStart={(e) => {
            const t = e.touches[0]
            timeFabDragRef.current = { startX: t.clientX, startY: t.clientY, startPosX: fabPos.x, startPosY: fabPos.y, moved: false }
            clientFabDragRef.current = { startX: t.clientX, startY: t.clientY, startPosX: fabPos.x, startPosY: fabPos.y, moved: false }
          }}
          onTouchMove={(e) => {
            if (!timeFabDragRef.current) return
            const dx = e.touches[0].clientX - timeFabDragRef.current.startX
            const dy = e.touches[0].clientY - timeFabDragRef.current.startY
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
              timeFabDragRef.current.moved = true
              clientFabDragRef.current && (clientFabDragRef.current.moved = true)
              setFabPos({ x: Math.max(0, Math.min(window.innerWidth - 72, timeFabDragRef.current.startPosX + dx)), y: Math.max(0, Math.min(window.innerHeight - 160, timeFabDragRef.current.startPosY + dy)) })
            }
          }}
          onTouchEnd={() => {
            const wasDrag = timeFabDragRef.current?.moved
            timeFabDragRef.current = null
            clientFabDragRef.current = null
            if (wasDrag) localStorage.setItem(lsKey('time_fab_pos'), JSON.stringify(fabPos))
          }}
        >
          {screen === 'time-tracking' && (
            <button
              className="m-fab-glass m-fab-with-label"
              onTouchEnd={(e) => {
                e.stopPropagation()
                e.preventDefault()
                const wasDrag = clientFabDragRef.current?.moved
                clientFabDragRef.current = null
                timeFabDragRef.current = null
                localStorage.setItem(lsKey('time_fab_pos'), JSON.stringify(fabPos))
                if (!wasDrag) { setClientFormName(''); setClientFormRate(''); setClientFormVat(defaultVat); setClientFormIncomeTax(defaultIncomeTax); setEditClientId(null); setAddClientOpen(true) }
              }}
              onClick={(e) => {
                if (e.detail === 0) return
                setClientFormName(''); setClientFormRate(''); setClientFormVat(defaultVat); setClientFormIncomeTax(defaultIncomeTax); setEditClientId(null); setAddClientOpen(true)
              }}
              title="הוספת לקוח"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span className="m-fab-inner-label">לקוח</span>
            </button>
          )}
          <button
            className="m-fab-glass forecast m-fab-with-label"
            onTouchEnd={(e) => {
              e.stopPropagation()
              e.preventDefault()
              const wasDrag = timeFabDragRef.current?.moved
              timeFabDragRef.current = null
              clientFabDragRef.current = null
              localStorage.setItem(lsKey('time_fab_pos'), JSON.stringify(fabPos))
              if (!wasDrag) openQuickEntry()
            }}
            onClick={(e) => {
              if (e.detail === 0) return // fired from touch, already handled
              openQuickEntry()
            }}
            title="דיווח מהיר"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="m-fab-inner-label">דיווח</span>
          </button>
        </div>
      )}
      <TimeSettingsModal />
      <AddEmployeeModal />
      <BulkActionModal />
      <QuickAddSheet 
        globalAmountValue={quickAddGlobalAmount}
        setGlobalAmountValue={setQuickAddGlobalAmount}
      />
      {deleteToast && (
        <div className="m-delete-toast">
          🗑 הסעיף "{deleteToast}" נמחק
        </div>
      )}
      {successToast && (
        <div className="m-delete-toast" style={{background:'#F0FDF4',color:'#16A34A',border:'1px solid #BBF7D0'}}>
          ✓ {successToast}
        </div>
      )}
      {errorToast && (
        <div className="m-delete-toast" style={{background:'#FEF2F2',color:'#DC2626',border:'1px solid #FECACA'}}>
          ⚠️ {errorToast}
        </div>
      )}
      {showExitConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:'28px 24px',maxWidth:300,width:'100%',textAlign:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
            <div style={{fontSize:36,marginBottom:12}}>👋</div>
            <div style={{fontSize:17,fontWeight:600,color:'#1F2937',marginBottom:8}}>יציאה מהאפליקציה?</div>
            <div style={{fontSize:13,color:'#6B7280',marginBottom:20}}>בטוח/ה שרוצה לצאת?</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={() => setShowExitConfirm(false)} style={{flex:1,padding:'12px 0',borderRadius:10,border:'1px solid #E5E7EB',background:'#F9FAFB',color:'#374151',fontSize:15,fontWeight:500,cursor:'pointer'}}>להישאר</button>
              <button onClick={() => {
                exitingRef.current = true
                setShowExitConfirm(false)
                if (popStateHandlerRef.current) window.removeEventListener('popstate', popStateHandlerRef.current)
                // Try to minimize/close the app
                if ((navigator as any).app && (navigator as any).app.exitApp) {
                  // Cordova/Capacitor - actually exit
                  (navigator as any).app.exitApp()
                } else {
                  // PWA/Web - just minimize by moving to background
                  // Use the Android minimize trick if available
                  if ((window as any).Android && (window as any).Android.minimizeApp) {
                    (window as any).Android.minimizeApp()
                  } else {
                    // Standard web - just close the dialog and stay in app
                    // (Can't actually exit a PWA from JavaScript)
                    // User can manually minimize using Android home button
                  }
                }
              }} style={{flex:1,padding:'12px 0',borderRadius:10,border:'none',background:'#EF4444',color:'#fff',fontSize:15,fontWeight:500,cursor:'pointer'}}>לצאת</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
