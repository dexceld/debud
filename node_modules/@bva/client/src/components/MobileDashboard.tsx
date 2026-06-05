import React, { useState, useEffect, useRef } from 'react'
import './MobileDashboard.css'
import { useFirebaseSync, flushAllSaves, useSyncStatus, firestoreHealthCheck } from '../hooks/useFirebaseSync'
import { signOutUser } from '../firebase'
import { FeedbackModal } from './FeedbackModal'
import { AboutModal } from './AboutModal'
import { PropertyManagement } from './PropertyManagement'
import { tt, type Lang } from '../i18n/timeTracking'

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

const initialGroups: Record<'he'|'en', Group[]> = {
  he: [
    { id: 'g1', name: 'דיור',           color: '#E0F2FE', icon: '🏠' },
    { id: 'g2', name: 'רכב',            color: '#FEF3C7', icon: '🚗' },
    { id: 'g4', name: 'עלויות כלליות', color: '#FCE7F3', icon: '🛒' },
    { id: 'g6', name: 'בריאות',         color: '#E0E7FF', icon: '🏥' },
    { id: 'g5', name: 'הכנסות',         color: '#D1FAE5', icon: '💰' },
  ],
  en: [
    { id: 'g1', name: 'Housing',  color: '#E0F2FE', icon: '🏠' },
    { id: 'g2', name: 'Car',      color: '#FEF3C7', icon: '🚗' },
    { id: 'g4', name: 'General',  color: '#FCE7F3', icon: '🛒' },
    { id: 'g6', name: 'Health',   color: '#E0E7FF', icon: '🏥' },
    { id: 'g5', name: 'Income',   color: '#D1FAE5', icon: '💰' },
  ],
}

const initialCategories: Record<'he'|'en', Category[]> = {
  he: [
    { id: 'c1',  groupId: 'g1', name: 'משכנתא',        budget: 4500  },
    { id: 'c1b', groupId: 'g1', name: 'שכ"ד',           budget: 0     },
    { id: 'c1c', groupId: 'g1', name: 'מים',             budget: 150   },
    { id: 'c2',  groupId: 'g1', name: 'ארנונה',          budget: 450   },
    { id: 'c3',  groupId: 'g1', name: 'חשמל',            budget: 450   },
    { id: 'c3b', groupId: 'g1', name: 'גז',              budget: 80    },
    { id: 'c3c', groupId: 'g1', name: 'אינטרנט',         budget: 100   },
    { id: 'c3d', groupId: 'g1', name: 'דיסני פלוס',      budget: 35    },
    { id: 'c3e', groupId: 'g1', name: 'סלקום',           budget: 200   },
    { id: 'c4',  groupId: 'g2', name: 'דלק',             budget: 2750  },
    { id: 'c5',  groupId: 'g2', name: 'טיפולים',         budget: 112   },
    { id: 'c20', groupId: 'g4', name: 'מזון',             budget: 4000  },
    { id: 'c21', groupId: 'g4', name: 'הלוואות',          budget: 364   },
    { id: 'c24', groupId: 'g6', name: 'ביטוח בריאות',    budget: 400   },
    { id: 'c25', groupId: 'g6', name: 'קופ"ח',            budget: 120   },
    { id: 'c23', groupId: 'g5', name: 'משכורת',           budget: -15000 },
  ],
  en: [
    { id: 'c1',  groupId: 'g1', name: 'Mortgage',        budget: 4500  },
    { id: 'c1b', groupId: 'g1', name: 'Rent',             budget: 0     },
    { id: 'c1c', groupId: 'g1', name: 'Water',            budget: 150   },
    { id: 'c2',  groupId: 'g1', name: 'Property Tax',     budget: 450   },
    { id: 'c3',  groupId: 'g1', name: 'Electricity',      budget: 450   },
    { id: 'c3b', groupId: 'g1', name: 'Gas',              budget: 80    },
    { id: 'c3c', groupId: 'g1', name: 'Internet',         budget: 100   },
    { id: 'c3d', groupId: 'g1', name: 'Disney+',          budget: 35    },
    { id: 'c3e', groupId: 'g1', name: 'Mobile',           budget: 200   },
    { id: 'c4',  groupId: 'g2', name: 'Fuel',             budget: 2750  },
    { id: 'c5',  groupId: 'g2', name: 'Maintenance',      budget: 112   },
    { id: 'c20', groupId: 'g4', name: 'Groceries',        budget: 4000  },
    { id: 'c21', groupId: 'g4', name: 'Loans',            budget: 364   },
    { id: 'c24', groupId: 'g6', name: 'Health Insurance', budget: 400   },
    { id: 'c25', groupId: 'g6', name: 'HMO',              budget: 120   },
    { id: 'c23', groupId: 'g5', name: 'Salary',           budget: -15000 },
  ],
}

const generateMonths = () => {
  const months: string[] = []
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth() + 1
  const totalMonths = 20 * 12 + 2
  for (let i = -2; i < totalMonths; i++) {
    const raw = startMonth - 1 + i
    const month = ((raw % 12) + 12) % 12 + 1
    const year = startYear + Math.floor(raw / 12)
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

type Screen = 'hub' | 'home' | 'detail' | 'update' | 'chart' | 'forecast' | 'budget' | 'forecast-chart' | 'net-chart' | 'mortgage-calc' | 'time-tracking' | 'property-management'

type AppModule = 'family-budget' | 'time-tracking' | 'mortgage-calc' | 'property-management'

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
  employeePaymentAmount?: number // סכום ששולם לעובד בפועל
}

type ChargeEntry = {
  id: string
  clientId: string
  date: string // YYYY-MM-DD
  amount: number
  tagId: string
  notes?: string
  billingStatus?: 'pending' | 'invoiced' | 'paid'
  invoiceNumber?: string
  employeeId?: string // העובד שביצע את ההוצאה
}

type ChargeTag = {
  id: string
  name: string
}

export default function MobileDashboard({ uid, userEmail, userPhoto, isLocalMode, lang = 'he', onLangChange }: { uid: string; userEmail: string; userPhoto?: string; isLocalMode?: boolean; lang?: Lang; onLangChange?: (l: Lang) => void }) {
  // Prefix localStorage keys with uid so each account has separate data
  const lsKey = (key: string) => uid ? `${uid}:${key}` : key
  const t = (key: keyof typeof tt.he): string => (tt[lang] as typeof tt.he)[key] as string

  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem(lsKey('groups'))
    return saved ? JSON.parse(saved) : initialGroups[lang]
  })
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(lsKey('categories'))
    return saved ? JSON.parse(saved) : initialCategories[lang]
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
  const [enabledModules, setEnabledModules] = useState<AppModule[]>(() => {
    const saved = localStorage.getItem(lsKey('enabled_modules'))
    return saved ? JSON.parse(saved) : ['family-budget', 'time-tracking', 'mortgage-calc', 'property-management']
  })
  const [defaultModule, setDefaultModule] = useState<AppModule>(() =>
    (localStorage.getItem(lsKey('default_module')) as AppModule) || 'family-budget'
  )
  const [screen, setScreen] = useState<Screen>(() => {
    const def = localStorage.getItem(lsKey('default_module')) as AppModule | null
    if (def === 'family-budget') return 'home'
    if (def && def !== 'family-budget') return def as Screen
    return 'hub'
  })
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [updateAmount, setUpdateAmount] = useState('')
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [menuCatId, setMenuCatId] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickEntryMenuOpen, setQuickEntryMenuOpen] = useState(false)
  const [quickEntryActiveTab, setQuickEntryActiveTab] = useState<'hourly' | 'charge'>('hourly')
  const [quickAddGlobalAmount, setQuickAddGlobalAmount] = useState('')
  const [inlineSheetAmount, setInlineSheetAmount] = useState('')
  const [quickSearch, setQuickSearch] = useState('')
  
  // Time Tracking State
  const [chargeEntries, setChargeEntries] = useState<ChargeEntry[]>(() => {
    const saved = localStorage.getItem(lsKey('charge_entries'))
    return saved ? JSON.parse(saved) : []
  })

  // Firebase sync for charge entries to sync across devices
  useFirebaseSync(uid, 'charge_entries', chargeEntries, v => setChargeEntries(v as typeof chargeEntries))

  const [chargeTags, setChargeTags] = useState<ChargeTag[]>(() => {
    const saved = localStorage.getItem(lsKey('charge_tags'))
    return saved ? JSON.parse(saved) : [
      { id: 'travel', name: 'נסיעות' },
      { id: 'parking', name: 'חניה' },
      { id: 'toll', name: 'כביש 6' },
      { id: 'fixprice', name: 'פיתוח פיקס' },
    ]
  })
  const [addChargeOpen, setAddChargeOpen] = useState(false)
  const [editChargeId, setEditChargeId] = useState<string | null>(null)
  const [chargeFormClientId, setChargeFormClientId] = useState('')
  const [chargeFormDate, setChargeFormDate] = useState('')
  const [chargeFormAmount, setChargeFormAmount] = useState('')
  const [chargeFormTagId, setChargeFormTagId] = useState('')
  const [chargeFormNotes, setChargeFormNotes] = useState('')
  const [chargeFormEmployeeId, setChargeFormEmployeeId] = useState('self')
  const [chargeFormNewTag, setChargeFormNewTag] = useState('')
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(lsKey('time_clients'))
    return saved ? JSON.parse(saved) : []
  })

  // Firebase sync for time clients to sync across devices
  useFirebaseSync(uid, 'time_clients', clients, v => setClients(v as typeof clients))

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem(lsKey('time_entries'))
    return saved ? JSON.parse(saved) : []
  })

  // Firebase sync for time entries to sync across devices
  useFirebaseSync(uid, 'time_entries', timeEntries, v => setTimeEntries(v as typeof timeEntries))

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(lsKey('time_employees'))
    return saved ? JSON.parse(saved) : []
  })

  // Firebase sync for time employees to sync across devices
  useFirebaseSync(uid, 'time_employees', employees, v => setEmployees(v as typeof employees))
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
  const summaryVisibleEntryIds = useRef<string[]>([])
  const summaryVisibleChargeIds = useRef<string[]>([])
  const employeeVisibleIdsRef = useRef<string[]>([])
  const employeeListRef = useRef<HTMLDivElement>(null)
  const employeeListScrollPos = useRef(0)
  const [summaryClientFilter, setSummaryClientFilter] = useState<string>('all')
  const [summaryStatusFilter, setSummaryStatusFilter] = useState<string>('all')
  const [reportsPeriod, setReportsPeriod] = useState<'week' | 'month' | 'year'>('month')
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
  const [employeePaymentStatusFilter, setEmployeePaymentStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [employeePeriodFilter, setEmployeePeriodFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [employeeFromDate, setEmployeeFromDate] = useState('')
  const [employeeToDate, setEmployeeToDate] = useState('')
  const [employeeDatePickerOpen, setEmployeeDatePickerOpen] = useState(false)
  const [employeeShareOpen, setEmployeeShareOpen] = useState(false)
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'pending' | 'invoiced' | 'paid'>('all')
  const [tempClientStatus, setTempClientStatus] = useState<'all' | 'pending' | 'invoiced' | 'paid'>('all')
  const [clientPeriodFilter, setClientPeriodFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [clientFilterSheetOpen, setClientFilterSheetOpen] = useState(false)
  const [clientFromDate, setClientFromDate] = useState('')
  const [clientToDate, setClientToDate] = useState('')
  const [clientDatePickerOpen, setClientDatePickerOpen] = useState(false)
  const [clientShareOpen, setClientShareOpen] = useState(false)
  const [tempEmployeeStatus, setTempEmployeeStatus] = useState<'all' | 'pending' | 'invoiced' | 'paid'>('all')
  const [tempEmployeePaymentStatus, setTempEmployeePaymentStatus] = useState<'all' | 'pending' | 'paid'>('all')
  const [employeeFilterSheetOpen, setEmployeeFilterSheetOpen] = useState(false)
  const [employeeStatusPickerOpen, setEmployeeStatusPickerOpen] = useState(false)
  const [summaryFilterSheetOpen, setSummaryFilterSheetOpen] = useState(false)
  const [summaryShareOpen, setSummaryShareOpen] = useState(false)
  const [tempSummaryClient, setTempSummaryClient] = useState<string>('all')
  const [tempSummaryStatus, setTempSummaryStatus] = useState<string>('all')
  const [summaryPeriod, setSummaryPeriod] = useState<'week' | 'month' | 'year' | 'all'>('all')
  // Reports filter state
  const [reportsFilterSheetOpen, setReportsFilterSheetOpen] = useState(false)
  const [reportsClientFilter, setReportsClientFilter] = useState<string>('all')
  const [reportsStatusFilter, setReportsStatusFilter] = useState<string[]>(['all'])
  const [tempReportsClient, setTempReportsClient] = useState<string>('all')
  const [tempReportsStatuses, setTempReportsStatuses] = useState<string[]>(['all'])
  const [reportsFromDate, setReportsFromDate] = useState<string>('')
  const [reportsToDate, setReportsToDate] = useState<string>('')
  const [reportsDatePickerOpen, setReportsDatePickerOpen] = useState(false)
  const [reportsShareOpen, setReportsShareOpen] = useState(false)
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
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null)
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([])
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([])
  const [employeeSelectedIds, setEmployeeSelectedIds] = useState<string[]>([])
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null)
  // Employee invitation mode - set when accessing via invitation link
  const [employeeMode, setEmployeeMode] = useState<{email: string, name: string, clientIds: string[]} | null>(null)
  const swipeTouchStartX = useRef(0)
  const swipeTouchStartY = useRef(0)
  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [statusLabelOpen, setStatusLabelOpen] = useState(false)
  const [summaryInvoiceOpen, setSummaryInvoiceOpen] = useState(false)
  const [summaryInvoiceInput, setSummaryInvoiceInput] = useState('')
  const [employeeHeaderStatusOpen, setEmployeeHeaderStatusOpen] = useState(false)
  const [employeeHeaderAmountOpen, setEmployeeHeaderAmountOpen] = useState(false)
  const [employeeHeaderAmountInput, setEmployeeHeaderAmountInput] = useState('')
  const [bulkInvoiceNumber, setBulkInvoiceNumber] = useState('')
  const [bulkEmployeeInvoiceNumber, setBulkEmployeeInvoiceNumber] = useState('')
  const [bulkEmployeePaymentAmount, setBulkEmployeePaymentAmount] = useState('')
  const [showFabsBudget, setShowFabsBudget] = useState(() => localStorage.getItem(lsKey('show_fabs_budget')) !== '0')
  const [showFabsTime, setShowFabsTime] = useState(() => localStorage.getItem(lsKey('show_fabs_time')) !== '0')
  const [showFabsVoice, setShowFabsVoice] = useState(() => localStorage.getItem(lsKey('show_fabs_voice')) !== '0')
  const [voiceListening, setVoiceListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  type VoiceParsed =
    | { type: 'timeEntry'; clientId: string; clientName: string; startTime: string; endTime: string; date: string }
    | { type: 'expense'; catId: string; catName: string; amount: number; month: string; isIncome: boolean }
  const voiceRecogRef = useRef<any>(null)
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
  const toolLpRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [deleteToast, setDeleteToast] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [globalMonth, setGlobalMonth] = useState(getCurrentMonth)
  const [homeView, setHomeView] = useState<'actual' | 'monthly'>(
    () => (localStorage.getItem(lsKey('home_view')) as 'actual' | 'monthly') || 'monthly'
  )
  // default is already 'monthly'
  const [catMgmtOpen, setCatMgmtOpen] = useState(false)
  const [catMgmtDrillGid, setCatMgmtDrillGid] = useState<string | null>(null)
  const [settingsPage, setSettingsPage] = useState<'main' | 'balance' | 'backup' | 'categories' | 'fabs' | 'modules'>('main')
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
  const pmBackHandlerRef = useRef<(() => boolean) | null>(null)
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
  // Restore employee list scroll position after selection changes
  useEffect(() => {
    if (employeeListRef.current && employeeListScrollPos.current > 0) {
      employeeListRef.current.scrollTop = employeeListScrollPos.current
    }
  }, [employeeSelectedIds])
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
        } else if (screenRef.current === 'property-management') {
          const handled = pmBackHandlerRef.current?.()
          if (!handled) setScreen('hub')
        } else if (screenRef.current !== 'hub' && screenRef.current !== 'home') {
          setScreen('hub')
        } else if (screenRef.current === 'home') {
          setScreen('hub')
        } else {
          // Already on hub — let app minimize
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

  const [voiceMode, setVoiceMode] = useState<'hours' | 'expense' | 'income' | undefined>(undefined)

  // Handle ?action= (App Actions / shortcuts) and legacy ?voice= deep links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const voiceParam = params.get('voice')
    if (action === 'hours') {
      setVoiceMode('hours'); setScreen('time-tracking')
      setTimeout(() => startVoiceRecognition(), 1000)
    } else if (action === 'expense') {
      setVoiceMode('expense')
      setTimeout(() => startVoiceRecognition(), 1000)
    } else if (action === 'income') {
      setVoiceMode('income')
      setTimeout(() => startVoiceRecognition(), 1000)
    } else if (voiceParam === 'time') {
      setVoiceMode('hours'); setScreen('time-tracking')
      setTimeout(() => startVoiceRecognition(), 1000)
    } else if (voiceParam === 'expense') {
      setVoiceMode('expense')
      setTimeout(() => startVoiceRecognition(), 1000)
    } else if (voiceParam === '1') {
      setTimeout(() => startVoiceRecognition(), 1000)
    }
    // Clean URL regardless
    if (action || voiceParam) window.history.replaceState({}, '', window.location.pathname)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle employee invitation link - check URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const employeeEmail = params.get('employee')
    if (employeeEmail) {
      // Find employee by email
      const employee = employees.find(e => e.email === employeeEmail)
      if (employee) {
        setEmployeeMode({
          email: employee.email,
          name: employee.name,
          clientIds: employee.clientIds
        })
        // Switch to time tracking screen and show only assigned clients
        setScreen('time-tracking')
        // Filter to show only assigned clients
        if (employee.clientIds.length > 0) {
          setClientFilterSheetOpen(false)
        }
      }
    }
  }, [employees])

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
  useEffect(() => { localStorage.setItem(lsKey('show_fabs_budget'), showFabsBudget ? '1' : '0') }, [showFabsBudget])
  useEffect(() => { localStorage.setItem(lsKey('show_fabs_time'), showFabsTime ? '1' : '0') }, [showFabsTime])
  useEffect(() => { localStorage.setItem(lsKey('show_fabs_voice'), showFabsVoice ? '1' : '0') }, [showFabsVoice])
  useEffect(() => { localStorage.setItem(lsKey('time_employees'), JSON.stringify(employees)) }, [employees])
  useEffect(() => { localStorage.setItem(lsKey('charge_entries'), JSON.stringify(chargeEntries)) }, [chargeEntries])
  useEffect(() => { localStorage.setItem(lsKey('charge_tags'), JSON.stringify(chargeTags)) }, [chargeTags])
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

  const hebrewTimeToHHMM = (timeStr: string): string | null => {
    if (/בצהרים|צהרים/.test(timeStr)) return '12:00'
    const isPM = /אחר הצהרים|אחה"צ|אחה״צ|בערב|בלילה/.test(timeStr)
    const isAM = /בבוקר/.test(timeStr)
    const m = timeStr.match(/(\d{1,2})(?::(\d{2}))?/)
    if (!m) return null
    let h = parseInt(m[1])
    const min = m[2] ? parseInt(m[2]) : 0
    if (isPM && h < 12) h += 12
    if (isAM && h === 12) h = 0
    if (h > 23 || min > 59) return null
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
  }

  const parseTimeEntryVoice = (text: string): VoiceParsed | null => {
    const today = new Date()
    let date = today.toISOString().slice(0, 10)
    if (text.includes('מחר')) {
      const d = new Date(today); d.setDate(d.getDate() + 1); date = d.toISOString().slice(0, 10)
    } else if (text.includes('אתמול')) {
      const d = new Date(today); d.setDate(d.getDate() - 1); date = d.toISOString().slice(0, 10)
    } else {
      const dayNames: Record<string, number> = { 'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6 }
      for (const [name, targetDay] of Object.entries(dayNames)) {
        if (text.includes(`יום ${name}`) || text.includes(name)) {
          const d = new Date(today)
          const diff = (d.getDay() - targetDay + 7) % 7
          d.setDate(d.getDate() - (diff === 0 ? 7 : diff))
          date = d.toISOString().slice(0, 10)
          break
        }
      }
    }
    let matchedClient: {id: string, name: string} | null = null
    for (const c of clients) {
      if (text.includes(c.name)) { matchedClient = c; break }
    }
    if (!matchedClient) {
      for (const c of clients) {
        const words = c.name.split(/\s+/).filter(w => w.length > 1)
        if (words.some(w => text.includes(w))) { matchedClient = c; break }
      }
    }
    const timeMatch =
      text.match(/מ-?\s*(?:שעה\s+)?(.+?)\s+עד\s+(.+?)(?:\s+(?:היום|מחר|אתמול|בבוקר|בלילה)|$)/) ||
      text.match(/מ-?\s*(?:שעה\s+)?(.+?)\s+עד\s+(.+)/) ||
      text.match(/\b(\d{1,2}(?::\d{2})?)\s+עד\s+(\d{1,2}(?::\d{2})?)/)
    if (!timeMatch) return null
    const startTime = hebrewTimeToHHMM(timeMatch[1])
    const endTime = hebrewTimeToHHMM(timeMatch[2])
    if (!matchedClient || !startTime || !endTime) return null
    return { type: 'timeEntry', clientId: matchedClient.id, clientName: matchedClient.name, startTime, endTime, date }
  }

  const parseExpenseVoice = (text: string, forceIncome = false): VoiceParsed | null => {
    const amountMatch = text.match(/(\d+(?:[.,]\d+)?)/)
    if (!amountMatch) return null
    const amount = parseFloat(amountMatch[1].replace(',', '.'))
    if (!amount || amount <= 0) return null
    const isIncomeContext = forceIncome || /קיבל|הכנס|משכורת|שכר|הכנסה/.test(text)
    const expCats = categories.filter(c => c.groupId !== 'g5')
    const incCats = categories.filter(c => c.groupId === 'g5')
    const orderedCats = isIncomeContext ? [...incCats, ...expCats] : [...expCats, ...incCats]
    let matchedCat: Category | null = null
    for (const cat of orderedCats) {
      if (text.includes(cat.name)) { matchedCat = cat; break }
    }
    if (!matchedCat) {
      for (const cat of orderedCats) {
        const words = cat.name.split(/\s+/).filter(w => w.length > 1)
        if (words.some(w => text.includes(w))) { matchedCat = cat; break }
      }
    }
    if (!matchedCat && forceIncome && incCats.length > 0) matchedCat = incCats[0]
    if (!matchedCat) return null
    const isIncome = matchedCat.groupId === 'g5'
    return { type: 'expense', catId: matchedCat.id, catName: matchedCat.name, amount, month: currentMonth, isIncome }
  }

  const parseVoiceCommand = (transcript: string, mode?: 'hours' | 'expense' | 'income'): VoiceParsed | null => {
    const text = transcript.trim()
    if (mode === 'hours') return parseTimeEntryVoice(text)
    if (mode === 'income') return parseExpenseVoice(text, true)
    if (mode === 'expense') return parseExpenseVoice(text, false)
    // Auto-detect: time entry has a time range pattern
    if (/עד\s+\d|עד שעה/.test(text)) {
      const r = parseTimeEntryVoice(text)
      if (r) return r
    }
    const expenseResult = parseExpenseVoice(text)
    if (expenseResult) return expenseResult
    return parseTimeEntryVoice(text)
  }

  const startVoiceRecognition = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) { alert('הדפדפן שלך לא תומך בזיהוי קול. נסי Chrome.'); return }
    if (voiceListening) { voiceRecogRef.current?.stop(); setVoiceListening(false); return }
    const recog = new SpeechRecognitionAPI()
    recog.lang = 'he-IL'
    recog.continuous = false
    recog.interimResults = true
    recog.maxAlternatives = 3
    voiceRecogRef.current = recog

    let pauseTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleStop = () => {
      if (pauseTimer) clearTimeout(pauseTimer)
      pauseTimer = setTimeout(() => recog.stop(), 900)
    }

    recog.onstart = () => setVoiceListening(true)
    recog.onspeechend = () => { if (pauseTimer) clearTimeout(pauseTimer); recog.stop() }
    recog.onend = () => { if (pauseTimer) clearTimeout(pauseTimer); setVoiceListening(false) }
    recog.onerror = (e: any) => {
      if (pauseTimer) clearTimeout(pauseTimer)
      setVoiceListening(false)
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setErrorToast('נדרשת הרשאת מיקרופון — אפשרי בהגדרות הדפדפן')
        setTimeout(() => setErrorToast(null), 5000)
      }
    }
    recog.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1]
      if (!lastResult.isFinal) { scheduleStop(); return }
      if (pauseTimer) clearTimeout(pauseTimer)
      recog.stop()
      const alternatives: string[] = Array.from(lastResult).map((r: any) => r.transcript)
      const allText = alternatives.join(' ')
      for (const t of alternatives) {
        const parsed = parseVoiceCommand(t, voiceMode)
        if (parsed) {
          if (parsed.type === 'timeEntry') {
            const entry: TimeEntry = { id: Date.now().toString(), clientId: parsed.clientId, startDate: parsed.date, endDate: parsed.date, startTime: parsed.startTime, endTime: parsed.endTime, notes: '' }
            setTimeEntries(prev => [...prev, entry])
            const dateStr = new Date(parsed.date).toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' })
            setSuccessToast(`✓ ${parsed.clientName}: ${parsed.startTime}–${parsed.endTime} (${dateStr})`)
          } else {
            const isReplace = /עדכן|עדכון|לעדכן|תעדכן|שנה|שינוי|החלף|תחליף|לשנות/.test(allText)
            const signedAmount = parsed.isIncome ? -Math.abs(parsed.amount) : Math.abs(parsed.amount)
            setActuals(prev => ({
              ...prev,
              [parsed.catId]: { ...(prev[parsed.catId] || {}), [parsed.month]: isReplace ? signedAmount : (prev[parsed.catId]?.[parsed.month] ?? 0) + signedAmount }
            }))
            const action = isReplace ? 'עודכן' : 'נוסף'
            setSuccessToast(`✓ ${action} ${parsed.isIncome ? '+' : ''}₪${Math.abs(parsed.amount).toLocaleString()} — ${parsed.catName}`)
            setVoiceMode(undefined)
          }
          setTimeout(() => setSuccessToast(null), 4000)
          return
        }
      }
      setErrorToast('לא הצלחתי לפענח. דיווח: "[לקוח] מ8 עד 16". הוצאה: "[קטגוריה] [סכום]"')
      setTimeout(() => setErrorToast(null), 4000)
    }
    recog.start()
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

  const goHome = () => {
    const dest: Screen = ({'family-budget':'home','time-tracking':'time-tracking','mortgage-calc':'mortgage-calc','property-management':'property-management'} as Record<AppModule,Screen>)[defaultModule] ?? 'home'
    setScreen(dest)
    if (dest === 'home') { setExpandedGroups(new Set()); setViewMonthIdx(months.indexOf(currentMonth) >= 0 ? months.indexOf(currentMonth) : 0) }
  }

  const handleLogoClick = () => {
    const fbSubs: Screen[] = ['detail', 'update', 'chart', 'budget', 'forecast', 'forecast-chart', 'net-chart']
    if (screen === 'hub') { goHome(); return }
    if (fbSubs.includes(screen)) {
      setScreen('home')
      setExpandedGroups(new Set())
      setViewMonthIdx(months.indexOf(currentMonth) >= 0 ? months.indexOf(currentMonth) : 0)
      setSelectedGroupId(null)
      return
    }
    // On any module main screen → hub
    if (employeeMode) setEmployeeMode(null)
    setScreen('hub')
  }

  const DexcelLogo = () => (
    <div className="m-logo-block" onClick={handleLogoClick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }}>
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
          <span className="m-acc-col-val">{t('forecastLabel')}</span>
          <span className="m-acc-col-val">{t('actualLabel')}</span>
          <span className="m-acc-col-val">{t('gapLabel')}</span>
        </div>
        <div className={`m-acc-content ${slideDir ? 'slide-' + slideDir : ''}`}>
          {/* Income */}
          <div className="m-accordion-group m-income-group">
            <button className="m-accordion-header m-income-header" onClick={() => toggleGroup('g5')}>
              <div className="m-acc-left">
                <span className="m-acc-arrow">{incomeExpanded ? '▾' : '▸'}</span>
                <span className="m-acc-income-badge">{t('incomeBadge')}</span>
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
          <span className="m-fab-inner-label">{t('actualLabel')}</span>
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
          <span className="m-fab-inner-label">{t('forecastLabel')}</span>
        </button>
      </div>
    )
  }

  // --- HUB SCREEN (module launcher) ---
  const HubScreen = () => {
    const [lpTimer, setLpTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
    const HUB_MODULES: { id: AppModule; label: string; icon: string; dest: Screen; bg: string }[] = [
      { id: 'family-budget',       label: t('familyBudgetLabel'), icon: '💰', dest: 'home',                bg: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
      { id: 'time-tracking',       label: t('timeTrackingLabel'), icon: '⏱',  dest: 'time-tracking',       bg: 'linear-gradient(135deg,#10B981,#059669)' },
      { id: 'mortgage-calc',       label: t('mortgageLabel'),     icon: '🏠', dest: 'mortgage-calc',        bg: 'linear-gradient(135deg,#667EEA,#764BA2)' },
      { id: 'property-management', label: t('propertyLabel'),     icon: '🏢', dest: 'property-management',  bg: 'linear-gradient(135deg,#F59E0B,#D97706)' },
    ]

    const startLp = (id: AppModule) => {
      const timer = setTimeout(() => {
        const isEnabled = enabledModules.includes(id)
        if (isEnabled && enabledModules.length <= 1) {
          setSuccessToast('⚠️ חייב להישאר לפחות עולם אחד פעיל'); setTimeout(() => setSuccessToast(null), 2500); return
        }
        const next = isEnabled ? enabledModules.filter(m => m !== id) : [...enabledModules, id]
        setEnabledModules(next)
        localStorage.setItem(lsKey('enabled_modules'), JSON.stringify(next))
        if (!next.includes(defaultModule)) { setDefaultModule(next[0]); localStorage.setItem(lsKey('default_module'), next[0]) }
        const mod = HUB_MODULES.find(m => m.id === id)
        setSuccessToast(isEnabled ? `🔴 ${mod?.label} הוסר` : `✅ ${mod?.label} הופעל`)
        setTimeout(() => setSuccessToast(null), 2500)
      }, 600)
      setLpTimer(timer)
    }
    const cancelLp = () => { if (lpTimer) { clearTimeout(lpTimer); setLpTimer(null) } }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'linear-gradient(180deg,#EEF2FF 0%,#F9FAFB 100%)' }}>
        <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <DexcelLogo />
          {onLangChange && (
            <div style={{ display: 'flex', gap: 4 }}>
              {(['he', 'en'] as Lang[]).map(l => (
                <button key={l} onClick={() => onLangChange(l)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: lang === l ? '#6366F1' : '#E5E7EB', color: lang === l ? 'white' : '#6B7280',
                }}>{l === 'he' ? 'עב' : 'EN'}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', overflowY: 'auto', justifyContent: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {HUB_MODULES.map(m => {
              const isEnabled = enabledModules.includes(m.id)
              const isDefault = defaultModule === m.id
              return (
                <div key={m.id}
                  onTouchStart={() => startLp(m.id)} onTouchEnd={cancelLp} onTouchCancel={cancelLp}
                  onMouseDown={() => startLp(m.id)} onMouseUp={cancelLp} onMouseLeave={cancelLp}
                  style={{ display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', opacity: isEnabled ? 1 : 0.42, transition: 'opacity 0.2s', userSelect: 'none' }}>
                  <button
                    onClick={() => { if (!isEnabled) { setSuccessToast(t('longPressActivate')); setTimeout(() => setSuccessToast(null), 2000) } else { setScreen(m.dest) } }}
                    style={{ flex: 1, padding: '22px 14px 16px', background: isEnabled ? m.bg : 'linear-gradient(135deg,#9CA3AF,#6B7280)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', WebkitUserSelect: 'none' }}>
                    <span style={{ fontSize: 44 }}>{m.icon}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'white', lineHeight: 1.25 }}>{m.label}</span>
                  </button>
                  {isEnabled ? (
                    <button onClick={() => { setDefaultModule(m.id); localStorage.setItem(lsKey('default_module'), m.id); setSuccessToast((tt[lang].setAsHomeToast as (n:string)=>string)(m.label)); setTimeout(() => setSuccessToast(null), 2500) }}
                      style={{ padding: '10px', background: isDefault ? '#FFFBEB' : 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: isDefault ? '#D97706' : '#9CA3AF', borderTop: '1px solid #F3F4F6' }}>
                      {isDefault ? `⭐ ${t('homeScreen')}` : `☆ ${t('setAsHome')}`}
                    </button>
                  ) : (
                    <div style={{ padding: '8px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6', textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>
                      {t('longPressActivate')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* FABs toggles */}
          <div style={{ background: 'white', borderRadius: 14, padding: '10px 14px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 700, flexShrink: 0 }}>⚡ {t('floatingButtons')}</span>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              {([
                { label: t('fabForecast'), val: showFabsBudget, set: setShowFabsBudget, color: '#6366F1' },
                { label: t('fabHoursShort'), val: showFabsTime, set: setShowFabsTime, color: '#10B981' },
                { label: t('voice'), val: showFabsVoice, set: setShowFabsVoice, color: '#7C3AED' },
              ] as { label: string; val: boolean; set: React.Dispatch<React.SetStateAction<boolean>>; color: string }[]).map(({ label, val, set, color }) => (
                <button key={label} type="button" onClick={() => set(p => !p)}
                  style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: `1.5px solid ${val ? color : '#E5E7EB'}`, background: val ? color + '18' : '#F9FAFB', color: val ? color : '#9CA3AF', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
          {!isLocalMode && userPhoto
            ? <img src={userPhoto} alt="" style={{ width: 26, height: 26, borderRadius: '50%' }} referrerPolicy="no-referrer" />
            : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#6366F1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{isLocalMode ? '👤' : userEmail?.[0]?.toUpperCase() || '?'}</div>}
          <span style={{ fontSize: 12, color: '#6B7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</span>
          <button onClick={() => setAboutOpen(true)} style={{ background: '#F3E8FF', border: '1px solid #E9D5FF', color: '#7C3AED', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            ⓘ {t('about')}
          </button>
          <button onClick={async () => {
            if (!window.confirm(isLocalMode ? t('leaveLocalMode') : t('logoutConfirm'))) return
            if (isLocalMode) { localStorage.removeItem('bva_local_mode') }
            else { await flushAllSaves(); await new Promise(r => setTimeout(r, 500)); await signOutUser().catch(() => {}) }
            window.location.reload()
          }} style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            {t('logout')}
          </button>
        </div>
        {successToast && <div className="m-save-toast"><span className="m-save-toast-icon">✓</span><span>{successToast}</span></div>}
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
              <span className="m-hbtn-label">{t('settingsTitle')}</span>
            </button>
            <button className="m-hbtn" onClick={() => setFeedbackOpen(true)} title="שלח הערה">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span className="m-hbtn-label">{t('noteBtn')}</span>
            </button>
            <button className="m-hbtn" onClick={() => setShowExitConfirm(true)} title="יציאה" style={{color: '#DC2626'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span className="m-hbtn-label">{t('exitBtn')}</span>
            </button>
          </div>
        </div>

        {/* Sync error banner */}
        {!isLocalMode && syncStatus.includes('error') && (
          <div style={{margin:'8px 12px 0',padding:'10px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,direction:'rtl'}}>
            <div style={{fontSize:13,fontWeight:600,color:'#DC2626',marginBottom:4}}>⚠️ {t('syncErrorTitle')}</div>
            <div style={{fontSize:11,color:'#7F1D1D',lineHeight:1.5}}>{syncError || t('syncLocalOnly')}</div>
            <div style={{fontSize:10,color:'#9CA3AF',marginTop:4}}>{t('syncWillResume')}</div>
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
              {t('viewActualVsForecast')}
            </button>
            <button
              className={`m-segmented-btn ${homeView === 'monthly' ? 'active' : ''}`}
              onClick={() => {
                setHomeView('monthly')
                localStorage.setItem(lsKey('home_view'), 'monthly')
              }}
            >
              {t('viewMonthVsMonth')}
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
            <span className="m-home-group-actual">{t('actualLabel')}</span>
            <span className="m-home-group-budget">{t('forecastLabel')}</span>
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
            <span className="m-home-group-name">{t('net')}</span>
            <span className={`m-home-group-actual ${net >= 0 ? '' : 'neg'}`}>&#x202A;{net < 0 ? '−' : ''}{Math.abs(net).toLocaleString()}&#x202C;</span>
            <span className="m-home-group-budget">&#x202A;{forecastBalance < 0 ? '−' : ''}{Math.abs(forecastBalance).toLocaleString()}&#x202C;</span>
          </div>
          <div className="m-home-group-footer m-home-balance-row">
            <span className="m-home-group-arrow"></span>
            <span className="m-home-group-name">{t('closingBalance')}</span>
            {(() => { const b = getRunningBalance(vm); const isManual = openingBalance?.month === vm; return <span className={`m-home-group-actual ${b >= 0 ? '' : 'neg'} ${isManual ? 'manual-balance' : ''}`}>{isManual && <span className="m-manual-pin">📌</span>}&#x202A;{b < 0 ? '−' : ''}{Math.abs(b).toLocaleString()}&#x202C;</span> })()}
            <span className="m-home-group-budget"></span>
          </div>
          <div className="m-forecast-expand-hint" onClick={() => {
            setExpandedGroups(new Set(categories.map(c => c.groupId)))
          }}>{t('detailedHint')}</div>
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
            <span className="m-mm-name">{t('net')}</span>
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
            <span className="m-mm-name">{t('closingBalance')}</span>
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
            <span>{t('saveLabel')}</span>
          </button>
          <button className="m-hab-btn" onClick={() => setScreen('forecast-chart')}>
            <span className="m-hab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
              </svg>
            </span>
            <span>{t('chartLabel')}</span>
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
            <span>{t('closingAndNet')}</span>
          </button>
        </div>

        {/* Floating Action Buttons — draggable */}
        {showFabsBudget && <DraggableFABs />}
        {/* Save feedback toast */}
        {saveFeedback && (
          <div className="m-save-toast">
            <span className="m-save-toast-icon">✓</span>
            <span>{t('savedSuccess')}</span>
          </div>
        )}

        {/* Hub shortcut strip */}
        <div style={{ padding: '12px 16px 4px', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setScreen('hub')}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            {t('allWorlds')}
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
          <DexcelLogo />
          <span className="m-header-title">{t('closingAndNet')}</span>
          <div style={{ width: 60 }} />
        </div>
        
        {/* Tabs */}
        <div className="m-forecast-tabs">
          <button 
            className={`m-forecast-tab ${forecastView === 'current' ? 'active' : ''}`}
            onClick={() => setForecastView('current')}
          >
            {t('currentLabel')}
          </button>
          <button 
            className={`m-forecast-tab ${forecastView === 'history' ? 'active' : ''}`}
            onClick={() => setForecastView('history')}
          >
            {t('historyLabel')}
          </button>
        </div>
        
        {forecastView === 'current' ? (
          <>
            <div className="m-table-header">
              <div className="m-row-month" style={{visibility:'hidden'}}><span className="m-row-month-name">00/00</span></div>
              <span className="m-th-val col-forecast">{t('closingBalance')}</span>
              <span className="m-th-val col-net">{t('monthlyNet')}</span>
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
                        {month}{isCurrent ? ` (${t('currentMonthTag')})` : i === 1 ? ` (${t('nextMonthTag')})` : ''}
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
              <div className="m-history-empty">{t('noHistoryYet')}</div>
            ) : (
              <>
                {/* Navigation */}
                <div className="m-history-nav">
                  <button 
                    className="m-history-nav-btn" 
                    disabled={historyIdx >= forecastSnapshots.length - 1}
                    onClick={() => setHistoryIdx(prev => Math.min(prev + 1, forecastSnapshots.length - 1))}
                  >
                    ← {t('olderLabel')}
                  </button>
                  <span className="m-history-counter">
                    {historyIdx + 1} / {forecastSnapshots.length}
                  </span>
                  <button 
                    className="m-history-nav-btn" 
                    disabled={historyIdx <= 0}
                    onClick={() => setHistoryIdx(prev => Math.max(prev - 1, 0))}
                  >
                    {t('newerLabel')} →
                  </button>
                </div>
                
                {/* Show last 3 snapshots starting from historyIdx */}
                <div className="m-history-table">
                  <div className="m-history-header">
                    <span className="m-history-h-col">{t('monthCol')}</span>
                    {forecastSnapshots.slice(historyIdx, historyIdx + 3).reverse().map((snap, i) => (
                      <span key={snap.date} className="m-history-h-col">
                        {i === 0 ? t('lastSnapshot') : (tt[lang].prevSnapshot as (n:number)=>string)(i)}
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
          <DexcelLogo />
          <span className="m-header-title">{t('forecastVsActual')}</span>
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
                {isCurrentM && <span className="m-month-current-tag"> · {t('currentMonthLabel')}</span>}
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
          <DexcelLogo />
          <span className="m-header-title">{group ? group.name : t('allExpenses')}</span>
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
                    <button onClick={() => setMenuCatId(null)}>✏️ {t('renameAction')}</button>
                    <button className="danger" onClick={() => deleteCategory(cat.id)}>🗑️ {t('deleteAction')}</button>
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
          <DexcelLogo />
          <span className="m-header-title">📉 {t('forecastChartTitle')}</span>
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
            <button className="m-clear-snapshots" onClick={() => setForecastSnapshots([])}>{t('deleteSnapshotsBtn')}</button>
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
          <DexcelLogo />
          <span className="m-header-title">📊 {t('netChartTitle')}</span>
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
              <label className="m-ob-label">{t('closingMonthLabel')}</label>
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
            <p className="m-ob-hint">{t('balanceHint')}</p>
            <div className="m-ob-actions">
              <button className="m-catmgmt-save-btn" onClick={save}>✓ שמור</button>
              {openingBalance && <button className="m-catmgmt-cancel-btn" style={{color:'#DC2626',borderColor:'#FCA5A5'}} onClick={clear}>{t('resetBalance')}</button>}
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
          <span className="m-catmgmt-topbar-title">{t('settingsTitle')}</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); handleLogoClick() }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>
        <div className="m-settings-menu">
          <button className="m-settings-row" onClick={() => setSettingsPage('categories')}>
            <span className="m-settings-icon-wrap" style={{background:'#EEF2FF'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </span>
            <div className="m-settings-info">
              <span className="m-settings-title">{t('catMgmtTitle')}</span>
              <span className="m-settings-sub">{(tt[lang].catMgmtSub as (c:number,g:number)=>string)(categories.length, groups.length)}</span>
            </div>
            <svg className="m-settings-chevron-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="m-settings-row" onClick={() => setSettingsPage('balance')}>
            <span className="m-settings-icon-wrap" style={{background:'#F0FDF4'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </span>
            <div className="m-settings-info">
              <span className="m-settings-title">{t('balanceSettingsTitle')}</span>
              <span className="m-settings-sub">{openingBalance ? `${openingBalance.month}: ${openingBalance.amount.toLocaleString()} ₪` : t('notSetLabel')}</span>
            </div>
            <svg className="m-settings-chevron-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button className="m-settings-row" onClick={() => setSettingsPage('backup')}>
            <span className="m-settings-icon-wrap" style={{background:'#FFF7ED'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 15 21 19 3 19 3 15"/><polyline points="17 9 12 4 7 9"/><line x1="12" y1="4" x2="12" y2="15"/></svg>
            </span>
            <div className="m-settings-info">
              <span className="m-settings-title">{t('backupTitle')}</span>
              <span className="m-settings-sub">{t('backupSub')}</span>
            </div>
            <svg className="m-settings-chevron-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div style={{borderTop: '1px solid #E5E7EB', margin: '8px 0'}} />
          <button className="m-settings-row" onClick={async () => {
            if (isLocalMode) {
              localStorage.removeItem('bva_local_mode')
            } else {
              await flushAllSaves()
              await new Promise(r => setTimeout(r, 800))
              await signOutUser().catch(() => {})
            }
            window.location.reload()
          }} style={{color: '#DC2626'}}>
            <span className="m-settings-icon-wrap" style={{background:'#FEF2F2'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </span>
            <div className="m-settings-info">
              <span className="m-settings-title" style={{color: '#DC2626'}}>{isLocalMode ? t('leaveLocalModeTitle') : t('signOutTitle')}</span>
              <span className="m-settings-sub">{userEmail || t('systemExitSub')}</span>
            </div>
          </button>
        </div>
      </div>
    )

    /* ── MODULES PAGE ── */
    if (!drillGid && settingsPage === 'modules') {
      const ALL_MODULES: { id: AppModule; label: string; icon: string; desc: string; color: string }[] = [
        { id: 'family-budget', label: t('familyBudgetLabel'), icon: '💰', desc: t('familyBudgetDesc'), color: '#6366F1' },
        { id: 'time-tracking', label: t('timeTrackingLabel'), icon: '⏱', desc: t('timeTrackingDesc'), color: '#10B981' },
        { id: 'mortgage-calc', label: t('mortgageLabel'), icon: '🏠', desc: t('mortgageDesc'), color: '#764BA2' },
        { id: 'property-management', label: t('propertyLabel'), icon: '🏢', desc: t('propertyDesc'), color: '#F97316' },
      ]
      const toggleModule = (id: AppModule) => {
        const next = enabledModules.includes(id)
          ? enabledModules.filter(m => m !== id)
          : [...enabledModules, id]
        if (next.length === 0) return // must have at least one
        setEnabledModules(next)
        localStorage.setItem(lsKey('enabled_modules'), JSON.stringify(next))
        // if disabled module was default, reset default
        if (!next.includes(defaultModule)) {
          setDefaultModule(next[0])
          localStorage.setItem(lsKey('default_module'), next[0])
        }
      }
      const setHome = (id: AppModule) => {
        if (!enabledModules.includes(id)) return
        setDefaultModule(id)
        localStorage.setItem(lsKey('default_module'), id)
      }
      return (
        <div className="m-catmgmt-screen">
          <div className="m-catmgmt-topbar">
            <button className="m-catmgmt-back" onClick={() => setSettingsPage('main')}>‹ חזרה</button>
            <span className="m-catmgmt-topbar-title">{t('activeModulesTitle')}</span>
            <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); handleLogoClick() }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }}><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
          </div>
          <div style={{ padding: '16px', background: '#F9FAFB', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.5 }}>
              {t('modulesHint')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {ALL_MODULES.map(m => {
                const isEnabled = enabledModules.includes(m.id)
                const isHome = defaultModule === m.id
                return (
                  <div key={m.id} style={{ background: 'white', borderRadius: 14, border: `2px solid ${isEnabled ? m.color + '40' : '#E5E7EB'}`, padding: 16, opacity: isEnabled ? 1 : 0.6, transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{m.label}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{m.desc}</div>
                      </div>
                      {/* Toggle */}
                      <button onClick={() => toggleModule(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <div style={{ width: 44, height: 26, borderRadius: 13, background: isEnabled ? m.color : '#D1D5DB', transition: 'background 0.2s', display: 'flex', alignItems: 'center', padding: 3 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', transform: isEnabled ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                      </button>
                    </div>
                    {isEnabled && (
                      <button onClick={() => setHome(m.id)}
                        style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: `1.5px solid ${isHome ? m.color : '#E5E7EB'}`, background: isHome ? m.color + '15' : 'white', color: isHome ? m.color : '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {isHome ? t('currentHomeScreenBtn') : t('setAsHomeScreenBtn')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ background: '#FFF7ED', borderRadius: 12, padding: 14, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
              💡 טיפ: אם תגדיר עולם אחד כמסך בית, תיכנס ישירות אליו בכל פתיחה. ניתן לעבור לעולמות אחרים דרך כפתור "⬅" ◀ חזרה.
            </div>
          </div>
        </div>
      )
    }

    /* ── FABS PAGE ── */
    if (!drillGid && settingsPage === 'fabs') return (
      <div className="m-catmgmt-screen">
        <div className="m-catmgmt-topbar">
          <button className="m-catmgmt-back" onClick={() => setSettingsPage('main')}>‹ חזרה</button>
          <span className="m-catmgmt-topbar-title">{t('floatingButtons')}</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); handleLogoClick() }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }}><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>
        <div className="m-settings-menu">
          {[
            { label: t('fabBudgetLabel'), sub: t('fabBudgetSub'), val: showFabsBudget, set: setShowFabsBudget, color: '#6366F1' },
            { label: t('timeTrackingLabel'), sub: t('fabTimeSub'), val: showFabsTime, set: setShowFabsTime, color: '#D97706' },
            { label: 'Voice to Text', sub: t('voiceSub'), val: showFabsVoice, set: setShowFabsVoice, color: '#7C3AED' },
          ].map(({ label, sub, val, set, color }) => (
            <button key={label} className="m-settings-row" onClick={() => set((p: boolean) => !p)}>
              <div className="m-settings-info">
                <span className="m-settings-title">{label}</span>
                <span className="m-settings-sub">{sub}</span>
              </div>
              <div style={{marginRight:'auto', display:'flex', alignItems:'center'}}>
                <div style={{width:44,height:26,borderRadius:13,background: val ? color : '#D1D5DB',transition:'background 0.2s',display:'flex',alignItems:'center',padding:3,cursor:'pointer'}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:'white',transform: val ? 'translateX(18px)' : 'translateX(0)',transition:'transform 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )

    /* ── BALANCE PAGE ── */
    if (!drillGid && settingsPage === 'balance') return (
      <div className="m-catmgmt-screen">
        <div className="m-catmgmt-topbar">
          <button className="m-catmgmt-back" onClick={() => setSettingsPage('main')}>‹ חזרה</button>
          <span className="m-catmgmt-topbar-title">יתרת פתיחה / סגירה</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); handleLogoClick() }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>
        <OpeningBalanceSection />
      </div>
    )

    /* ── BACKUP PAGE ── */
    if (!drillGid && settingsPage === 'backup') return (
      <div className="m-catmgmt-screen">
        <div className="m-catmgmt-topbar">
          <button className="m-catmgmt-back" onClick={() => setSettingsPage('main')}>‹ חזרה</button>
          <span className="m-catmgmt-topbar-title">{t('backupTitle')}</span>
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); handleLogoClick() }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
        </div>
        <div style={{padding:'20px 16px',display:'flex',flexDirection:'column',gap:12}}>
          <p style={{margin:0,fontSize:13,color:'#6B7280',lineHeight:1.5}}>{t('backupHint')}</p>
          <button className="m-catmgmt-backup-btn" style={{width:'100%',padding:'14px'}} onClick={exportData}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {t('backupExport')}
          </button>
          <label className="m-catmgmt-backup-btn m-catmgmt-restore-btn" style={{width:'100%',padding:'14px',boxSizing:'border-box'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 5 17 10"/><line x1="12" y1="5" x2="12" y2="17"/></svg>
            {t('backupImport')}
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
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); handleLogoClick() }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
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
          <div className="m-logo-block" onClick={() => { setCatMgmtOpen(false); setCatMgmtDrillGid(null); setSettingsPage('main'); handleLogoClick() }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%' }} title="דף הבית"><img src="/Trn color.png" alt="Dexcel" style={{ height: 29, maxHeight: '85%' }} /></div>
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
          for (let i = startIdx; i <= endIdx; i++) {
            if (isAdd) {
              const existingForecast = next[cat.id]?.[months[i]] ?? (isIncome ? -Math.abs(cat.budget) : Math.abs(cat.budget))
              next[cat.id] = { ...(next[cat.id] || {}), [months[i]]: existingForecast + signedVal }
            } else {
              next[cat.id] = { ...(next[cat.id] || {}), [months[i]]: signedVal }
            }
          }
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
                  <span className="m-qi-big-label">{t('updateAction')}</span>
                  <span className="m-qi-big-hint">{t('replaceAmountHint')}</span>
                </button>
                <button className="m-qi-big-btn m-qi-big-add" disabled={!inlineSheetAmount} onClick={() => saveActual(true)}>
                  <span className="m-qi-big-icon">➕</span>
                  <span className="m-qi-big-label">{t('addAction')}</span>
                  <span className="m-qi-big-hint">{t('addToExistingHint')}</span>
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
          <DexcelLogo />
          <h1 className="m-title">{t('mortgageLabel')}</h1>
          <div style={{width:40}}></div>
        </div>

        <div className="m-mortgage-content">
          {/* Mode Tabs */}
          <div className="m-mortgage-tabs">
            <button 
              className={`m-mortgage-tab ${mode === 'calc-payment' ? 'active' : ''}`}
              onClick={() => { setMode('calc-payment'); setResult(null) }}
            >
              {t('calcMonthlyPayment')}
            </button>
            <button 
              className={`m-mortgage-tab ${mode === 'calc-loan' ? 'active' : ''}`}
              onClick={() => { setMode('calc-loan'); setResult(null) }}
            >
              {t('calcLoanAmount')}
            </button>
            <button 
              className={`m-mortgage-tab ${mode === 'calc-years' ? 'active' : ''}`}
              onClick={() => { setMode('calc-years'); setResult(null) }}
            >
              {t('calcYears')}
            </button>
          </div>

          {/* Interest Rate */}
          <div className="m-mortgage-field">
            <label>{t('annualInterest')} (%)</label>
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
                <label>{t('loanAmountLabel')} (₪)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                  placeholder="1000000"
                />
              </div>
              <div className="m-mortgage-field">
                <label>{t('mortgageYears')}</label>
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
                <label>{t('monthlyPaymentLabel')} (₪)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={monthlyPayment}
                  onChange={e => setMonthlyPayment(e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div className="m-mortgage-field">
                <label>{t('mortgageYears')}</label>
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
                <label>{t('loanAmountLabel')} (₪)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                  placeholder="1000000"
                />
              </div>
              <div className="m-mortgage-field">
                <label>{t('monthlyPaymentLabel')} (₪)</label>
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
            {t('calculate')}
          </button>

          {/* Result */}
          {result !== null && (
            <div className="m-mortgage-result">
              <div className="m-mortgage-result-label">
                {mode === 'calc-payment' && `${t('monthlyPaymentLabel')}:`}
                {mode === 'calc-loan' && `${t('loanAmountLabel')}:`}
                {mode === 'calc-years' && `${t('mortgageYears')}:`}
              </div>
              <div className="m-mortgage-result-value">
                {mode === 'calc-years' 
                  ? `${result.toFixed(1)} ${t('yearsUnit')}`
                  : `₪${result.toLocaleString('he-IL', {maximumFractionDigits: 0})}`
                }
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const openNewClientForm = () => {
    setClientFormName('')
    setClientFormRate('')
    setClientFormVat(defaultVat)
    setClientFormIncomeTax(defaultIncomeTax)
    setEditClientId(null)
    setAddClientOpen(true)
  }

  const openNewEmployeeForm = () => {
    setEmployeeFormName('')
    setEmployeeFormEmail('')
    setEmployeeFormClients([])
    setEditEmployeeId(null)
    setAddEmployeeOpen(true)
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
            <button className="m-back-btn" onClick={() => { setSelectedClientId(null) }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 className="m-title">{client.name}</h1>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
              {/* Add Hour Entry Button */}
              <button className="m-hbtn m-hbtn-menu" onClick={openEditClient}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span className="m-hbtn-label">עריכה</span>
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
              ▶ {t('startLabel')}
            </button>
            <button
              className="m-timer-btn m-timer-stop"
              onClick={stopTimer}
              disabled={!timerRunning}
            >
              ⏹ {t('endLabel')}
            </button>
          </div>

          {timerRunning && timerStart && (
            <div className="m-timer-display">
              ⏱ טיימר פועל מאז {timerStart.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})}
            </div>
          )}


          {/* Entries List - Time entries + Charges merged chronologically */}
          <div style={{flex: 1, overflowY: 'auto', paddingBottom: 100}}>
            {(() => {
              // Apply period filter
              let filteredEntries = clientEntries
              // Apply date range filter (takes precedence)
              if (clientFromDate && clientToDate) {
                filteredEntries = filteredEntries.filter(e => e.startDate >= clientFromDate && e.startDate <= clientToDate)
              } else if (clientPeriodFilter !== 'all') {
                const now = new Date()
                const startOf = (period: 'week' | 'month' | 'year') => {
                  const d = new Date(now)
                  if (period === 'week') { d.setDate(d.getDate() - 7); return d }
                  if (period === 'month') { d.setMonth(d.getMonth() - 1); return d }
                  if (period === 'year') { d.setFullYear(d.getFullYear() - 1); return d }
                  return d
                }
                const cutoff = startOf(clientPeriodFilter)
                filteredEntries = filteredEntries.filter(e => new Date(e.startDate) >= cutoff)
              }
              // Apply status filter
              if (clientStatusFilter !== 'all') {
                filteredEntries = filteredEntries.filter(e => (e.billingStatus || 'pending') === clientStatusFilter)
              }

              const charges = chargeEntries.filter(c => c.clientId === selectedClientId)
              const allItems = [
                ...filteredEntries.map(e => ({ type: 'entry' as const, data: e, date: e.startDate, sortKey: `${e.startDate}T${e.startTime}` })),
                ...charges.map(c => ({ type: 'charge' as const, data: c, date: c.date, sortKey: c.date }))
              ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

              if (allItems.length === 0) return <div className="m-empty-state">אין דיווחים עדיין</div>

              return (
                <div style={{display: 'flex', flexDirection: 'column', padding: '0 16px', background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', margin: '0 4px'}}>
                  {allItems.map((item, idx) => {
                    if (item.type === 'entry') {
                      const entry = item.data
                      const hours = calculateHours(entry)
                      const amount = hours * client.hourlyRate * (1 + client.vatPercent / 100)
                      const status = entry.billingStatus || 'pending'
                      const openEntryEdit = () => {
                        setEntryFormStartDate(entry.startDate)
                        setEntryFormEndDate(entry.endDate)
                        setEntryFormStartTime(entry.startTime)
                        setEntryFormEndTime(entry.endTime)
                        setEntryFormNotes(entry.notes || '')
                        setEntryFormEmployeeId(entry.employeeId || 'self')
                        setEntryFormClientId(entry.clientId)
                        setEditEntryId(entry.id)
                        setAddTimeEntryOpen(true)
                      }
                      return (
                        <div key={entry.id}
                          onTouchStart={() => startLongPress(openEntryEdit)}
                          onTouchEnd={cancelLongPress}
                          onTouchMove={cancelLongPress}
                          onTouchCancel={cancelLongPress}
                          onContextMenu={(e) => { e.preventDefault(); openEntryEdit() }}
                          onClick={() => { if (longPressFiredRef.current) { longPressFiredRef.current = false; return } openEntryEdit() }}
                          style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', cursor: 'pointer' }}>
                          <span style={{fontSize: 18, fontWeight: 800, color: '#111827'}}>
                            {new Date(entry.startDate).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit', year: '2-digit'})}
                          </span>
                          {entry.employeeId && entry.employeeId !== 'self' && (
                            <span style={{fontSize: 13, color: '#6B7280', fontWeight: 500}}>
                              {employees.find(e => e.id === entry.employeeId)?.name || 'עובד'}
                            </span>
                          )}
                          <div style={{textAlign: 'left', marginLeft: '12px', flexShrink: 0}}>
                            <div style={{fontSize: 15, fontWeight: 700, color: '#111827'}}>₪{amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
                            <div style={{fontSize: 14, color: '#6B7280', fontWeight: 600}}>{hours.toFixed(1)}h</div>
                          </div>
                        </div>
                      )
                    } else {
                      const charge = item.data
                      const tag = chargeTags.find(t => t.id === charge.tagId)
                      const status = charge.billingStatus || 'pending'
                      const openChargeEdit = () => {
                        setChargeFormClientId(charge.clientId); setChargeFormDate(charge.date); setChargeFormAmount(String(charge.amount)); setChargeFormTagId(charge.tagId); setChargeFormNotes(charge.notes || ''); setChargeFormEmployeeId(charge.employeeId || 'self'); setEditChargeId(charge.id); setAddChargeOpen(true)
                      }
                      return (
                        <div key={charge.id}
                          onTouchStart={() => startLongPress(openChargeEdit)}
                          onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress} onTouchCancel={cancelLongPress}
                          onContextMenu={e => { e.preventDefault(); openChargeEdit() }}
                          onClick={() => { if (longPressFiredRef.current) { longPressFiredRef.current = false; return } openChargeEdit() }}
                          style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', cursor: 'pointer', background: '#faf5ff' }}>
                          <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                            <span style={{fontSize: 18, fontWeight: 800, color: '#111827'}}>
                              {new Date(charge.date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', year: '2-digit'})}
                            </span>
                            <span style={{fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#ede9fe', color: '#7c3aed', fontWeight: 600}}>{tag?.name || charge.tagId}</span>
                            {charge.employeeId && (
                              <span style={{fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#f3e8ff', color: '#6b21a8', fontWeight: 600}}>
                                {employees.find(e => e.id === charge.employeeId)?.name || 'עובד'}
                              </span>
                            )}
                            <span style={{fontSize: 11, padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: status === 'paid' ? '#dcfce7' : status === 'invoiced' ? '#dbeafe' : '#fef3c7', color: status === 'paid' ? '#166534' : status === 'invoiced' ? '#1e40af' : '#92400e' }}>
                              {status === 'paid' ? t('statusPaid') : status === 'invoiced' ? t('statusInvoiced') : t('statusPending')}
                            </span>
                          </div>
                          <div style={{fontSize: 15, fontWeight: 700, color: '#7c3aed'}}>₪{charge.amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
                        </div>
                      )
                    }
                  })}
                </div>
              )
            })()}
          </div>

          {/* Client Date Picker */}
          {clientDatePickerOpen && (
            <DateRangePicker
              startDate={clientFromDate}
              endDate={clientToDate}
              onChange={(s, e) => { setClientFromDate(s); setClientToDate(e) }}
              onClose={() => setClientDatePickerOpen(false)}
            />
          )}

          {/* Client Share Popover */}
          {clientShareOpen && (
            <>
              <div style={{position:'fixed',inset:0,zIndex:199}} onClick={() => setClientShareOpen(false)} />
              <div style={{position:'fixed',bottom:70,right:8,zIndex:200,background:'white',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.18)',padding:8,display:'flex',gap:8}}>
                <button title="ייצוא לאקסל" onClick={() => {
                  let entries = clientEntries
                  if (clientFromDate && clientToDate) entries = entries.filter(e => e.startDate >= clientFromDate && e.startDate <= clientToDate)
                  if (clientStatusFilter !== 'all') entries = entries.filter(e => (e.billingStatus || 'pending') === clientStatusFilter)
                  if (entries.length === 0) { setClientShareOpen(false); return }
                  import('xlsx').then(XLSX => {
                    const data = entries.map(e => { const hours = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); const amount = hours * client.hourlyRate * (1 + client.vatPercent / 100); return { תאריך: e.startDate, שעות: hours.toFixed(2), סכום: amount.toFixed(2), הערות: e.notes || '' } })
                    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, client.name); XLSX.writeFile(wb, `${client.name}_${new Date().toISOString().split('T')[0]}.xlsx`)
                  })
                  setClientShareOpen(false)
                }} style={{width:44,height:44,borderRadius:8,border:'none',cursor:'pointer',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><polyline points="9 14 12 17 15 14"/></svg>
                </button>
                <button title="שלח במייל" onClick={() => {
                  let entries = clientEntries
                  if (clientFromDate && clientToDate) entries = entries.filter(e => e.startDate >= clientFromDate && e.startDate <= clientToDate)
                  if (clientStatusFilter !== 'all') entries = entries.filter(e => (e.billingStatus || 'pending') === clientStatusFilter)
                  if (entries.length === 0) { setClientShareOpen(false); return }
                  const totalHours = entries.reduce((sum, e) => sum + (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60), 0)
                  const totalAmount = entries.reduce((sum, e) => { const h = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); return sum + h * client.hourlyRate * (1 + client.vatPercent / 100) }, 0)
                  const subject = `דיווח שעות - ${client.name}`
                  let body = `דיווח שעות - ${client.name}\n\nסה"כ שעות: ${totalHours.toFixed(2)}\nסה"כ: ₪${totalAmount.toLocaleString('he-IL', {maximumFractionDigits:0})}\n\n`
                  entries.forEach(e => { const h = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); body += `${e.startDate} ${e.startTime}-${e.endTime} | ${h.toFixed(2)} שעות\n` })
                  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                  setClientShareOpen(false)
                }} style={{width:44,height:44,borderRadius:8,border:'none',cursor:'pointer',background:'#EEF2FF',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
                </button>
              </div>
            </>
          )}

          {/* Bottom Menu Bar */}
          <div style={{position:'fixed',bottom:0,left:0,right:0,height:'60px',backgroundColor:'white',borderTop:'1px solid #E5E7EB',display:'flex',justifyContent:'space-around',alignItems:'center',padding:'0 8px',zIndex:100}}>
            <button onClick={() => setClientDatePickerOpen(true)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color: clientFromDate ? '#1d4ed8' : '#374151'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span style={{fontSize:'11px',fontWeight:500}}>{clientFromDate ? '📅' : t('date')}</span>
            </button>
            <button onClick={() => { setTempClientStatus(clientStatusFilter); setClientFilterSheetOpen(true) }} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color: clientStatusFilter !== 'all' ? '#1d4ed8' : '#374151'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span style={{fontSize:'11px',fontWeight:500}}>{t('filter')}</span>
            </button>
            <button onClick={() => setClientShareOpen(true)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color:'#374151'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span style={{fontSize:'11px',fontWeight:500}}>{t('sendTo')}</span>
            </button>
            <button onClick={startVoiceRecognition} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color: voiceListening ? '#DC2626' : '#7c3aed'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              <span style={{fontSize:'11px',fontWeight:500}}>{voiceListening ? '●' : t('voice')}</span>
            </button>
          </div>

          {/* Client Filter Sheet */}
          {clientFilterSheetOpen && (
            <>
              <div className="m-overlay" onClick={() => setClientFilterSheetOpen(false)} />
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'white', borderRadius: '16px 16px 0 0',
                padding: '20px 16px 28px', zIndex: 500, maxHeight: '80vh', overflowY: 'auto'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                  <div style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>{t('filterTitle')}</div>
                  <button type="button" onClick={() => setTempClientStatus('all')}
                    style={{display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                      background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer'}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    איפוס
                  </button>
                </div>

                <div style={{marginBottom: 24}}>
                  <div style={{fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12}}>{t('billingStatusLabel')}</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
                    {[
                      {key: 'all', label: 'הכל', color: 'white', bg: '#374151'},
                      {key: 'pending', label: '⏳ ממתין', color: '#92400e', bg: '#fef3c7'},
                      {key: 'invoiced', label: '📄 חויב', color: '#1e40af', bg: '#dbeafe'},
                      {key: 'paid', label: '✅ שולם', color: '#166534', bg: '#dcfce7'}
                    ].map(s => (
                      <button key={s.key} type="button"
                        onClick={() => setTempClientStatus(s.key as any)}
                        style={{
                          width: '100%', padding: '12px 10px', borderRadius: 12, border: 'none',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                          background: tempClientStatus === s.key ? s.bg : '#f3f4f6',
                          color: tempClientStatus === s.key ? s.color : '#374151'
                        }}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{display: 'flex', gap: 8, marginTop: 4}}>
                  <button type="button" onClick={() => setClientFilterSheetOpen(false)}
                    style={{padding: '12px 16px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#6B7280'}}>
                    {t('cancel')}
                  </button>
                  <button type="button" onClick={() => { setClientStatusFilter(tempClientStatus); setClientFilterSheetOpen(false) }}
                    style={{flex: 1, padding: '12px', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: '#1d4ed8', color: 'white'}}>
                    {t('set')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )
    }

    // Show employee view when selectedEmployeeId is set (and no modal is open)
    if (selectedEmployeeId && !addTimeEntryOpen && !quickTimeEntryOpen && !bulkActionOpen) {
      const employee = employees.find(e => e.id === selectedEmployeeId)
      if (!employee) return null

      // Filter entries for this employee with period filter
      let employeeEntries = timeEntries.filter(e => e.employeeId === selectedEmployeeId)
      
      // Apply date range filter (takes precedence over period)
      if (employeeFromDate && employeeToDate) {
        employeeEntries = employeeEntries.filter(e => e.startDate >= employeeFromDate && e.startDate <= employeeToDate)
      } else {
        const now = new Date()
        if (employeePeriodFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          employeeEntries = employeeEntries.filter(e => new Date(e.startDate) >= weekAgo)
        } else if (employeePeriodFilter === 'month') {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          employeeEntries = employeeEntries.filter(e => new Date(e.startDate) >= monthAgo)
        } else if (employeePeriodFilter === 'year') {
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          employeeEntries = employeeEntries.filter(e => new Date(e.startDate) >= yearAgo)
        }
      }

      // Apply billing status filter
      if (employeeStatusFilter !== 'all') {
        employeeEntries = employeeEntries.filter(e => (e.billingStatus || 'pending') === employeeStatusFilter)
      }
      // Apply payment status filter
      if (employeePaymentStatusFilter !== 'all') {
        employeeEntries = employeeEntries.filter(e => (e.employeePaidStatus || 'pending') === employeePaymentStatusFilter)
      }

      // Sort by date desc
      employeeEntries.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      employeeVisibleIdsRef.current = employeeEntries.map(e => e.id)

      const clearEmpSelection = () => { setEmployeeSelectedIds([]); setEmployeeHeaderStatusOpen(false); setEmployeeHeaderAmountOpen(false); setEmployeeHeaderAmountInput('') }

      return (
        <div className="m-screen">
          <div className="m-header">
            {employeeSelectedIds.length > 0 ? (
              <>
                <button className="m-back-btn" onClick={clearEmpSelection}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <h1 className="m-title" style={{fontSize: 16}}>{employeeSelectedIds.length} נבחרו</h1>
                <div className="m-header-actions">
                  <button type="button" className="m-hbtn" title="בחר הכל"
                    onClick={() => setEmployeeSelectedIds(employeeVisibleIdsRef.current)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="9 12 11 14 15 10"/></svg>
                    <span className="m-hbtn-label">בחר הכל</span>
                  </button>
                  <button type="button" className="m-hbtn" title="איפוס בחירה" onClick={clearEmpSelection}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                    <span className="m-hbtn-label">איפוס</span>
                  </button>
                  <button className={`m-hbtn${employeeHeaderStatusOpen ? ' active' : ''}`} title="שנה סטטוס"
                    onClick={() => { setEmployeeHeaderStatusOpen(v => !v); setEmployeeHeaderAmountOpen(false) }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{transform:'rotate(-20deg)'}}>
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                    <span className="m-hbtn-label">סטטוס</span>
                  </button>
                  <button className={`m-hbtn${employeeHeaderAmountOpen ? ' active' : ''}`} title="סכום ששולם"
                    onClick={() => { setEmployeeHeaderAmountOpen(v => !v); setEmployeeHeaderAmountInput(''); setEmployeeHeaderStatusOpen(false) }}>
                    <span style={{fontSize: 18, fontWeight: 900, lineHeight: 1}}>₪</span>
                    <span className="m-hbtn-label">תשלום</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button className="m-back-btn" onClick={() => { setSelectedEmployeeId(null) }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <h1 className="m-title">{employee.name}</h1>
                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                  <button className="m-hbtn m-hbtn-menu" onClick={() => {
                    setEmployeeFormName(employee.name)
                    setEmployeeFormEmail(employee.email)
                    setEmployeeFormClients(employee.clientIds)
                    setEditEmployeeId(employee.id)
                    setAddEmployeeOpen(true)
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    <span className="m-hbtn-label">עריכה</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Employee amount input — floats below header */}
          {employeeHeaderAmountOpen && (
            <div style={{position: 'relative', height: 0, zIndex: 200}}>
              <div style={{position: 'absolute', top: 4, left: 8, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 200}}>
                <input autoFocus type="text" inputMode="decimal" placeholder="סכום ששולם (₪)..."
                  value={employeeHeaderAmountInput}
                  onChange={e => setEmployeeHeaderAmountInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') {
                    const amt = parseFloat(employeeHeaderAmountInput)
                    if (isNaN(amt)) return
                    const firstId = employeeSelectedIds[0]
                    setTimeEntries(prev => prev.map(e => {
                      if (!employeeSelectedIds.includes(e.id) || !e.employeeId) return e
                      if (e.id === firstId) return {...e, employeePaidStatus: 'paid', employeePaymentAmount: amt}
                      return {...e, employeePaidStatus: 'paid', employeePaymentAmount: undefined}
                    }))
                    clearEmpSelection()
                    setSuccessToast(`₪${amt.toLocaleString('he-IL')} נשמר`); setTimeout(() => setSuccessToast(null), 2000)
                  }}}
                  style={{padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', direction: 'ltr'}}
                />
                <button onClick={() => {
                  const amt = parseFloat(employeeHeaderAmountInput)
                  if (isNaN(amt)) return
                  const firstId = employeeSelectedIds[0]
                  setTimeEntries(prev => prev.map(e => {
                    if (!employeeSelectedIds.includes(e.id) || !e.employeeId) return e
                    if (e.id === firstId) return {...e, employeePaidStatus: 'paid', employeePaymentAmount: amt}
                    return {...e, employeePaidStatus: 'paid', employeePaymentAmount: undefined}
                  }))
                  clearEmpSelection()
                  setSuccessToast(`₪${amt.toLocaleString('he-IL')} נשמר`); setTimeout(() => setSuccessToast(null), 2000)
                }} style={{padding: '9px', border: 'none', borderRadius: 8, background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer'}}>✓ שמור</button>
              </div>
            </div>
          )}

          {/* Employee status dropdown — compact, floats below header, anchored left */}
          {employeeHeaderStatusOpen && (
            <div style={{position: 'relative', height: 0, zIndex: 200}}>
              <div style={{position: 'absolute', top: 4, left: 8, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '6px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 130}}>
                {([{s:'pending',label:'⏳ ממתין',bg:'#fef3c7',color:'#92400e'},{s:'paid',label:'✅ שולם',bg:'#dcfce7',color:'#166634'}] as {s:string,label:string,bg:string,color:string}[]).map(({s,label,bg,color}) => (
                  <button key={s} onClick={() => {
                    setTimeEntries(prev => prev.map(e => employeeSelectedIds.includes(e.id) && e.employeeId ? {...e, employeePaidStatus: s as any} : e))
                    setEmployeeSelectedIds([]); setEmployeeHeaderStatusOpen(false)
                    setSuccessToast(`סטטוס: ${label.replace(/[⏳✅] /,'')}`); setTimeout(() => setSuccessToast(null), 2000)
                  }} style={{width: '100%', padding: '7px 12px', fontSize: 13, border: 'none', borderRadius: 8, background: bg, color, fontWeight: 700, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap'}}>{label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Summary Card */}
          {employeeEntries.length > 0 && (() => {
            const displayEntries = employeeSelectedIds.length > 0
              ? employeeEntries.filter(e => employeeSelectedIds.includes(e.id))
              : employeeEntries
            const cardHours = displayEntries.reduce((s, e) => s + calculateHours(e), 0)
            let cardAmount = 0
            let cardPaid = 0
            displayEntries.forEach(e => {
              const c = clients.find(cl => cl.id === e.clientId)
              if (c) cardAmount += calculateHours(e) * c.hourlyRate * (1 + c.vatPercent / 100)
              if (e.employeePaymentAmount != null) cardPaid += e.employeePaymentAmount
            })
            const label = employeeSelectedIds.length > 0 ? `נבחרו ${employeeSelectedIds.length}` : `סה"כ ${employeeEntries.length}`
            return (
              <div style={{margin: '0 16px 8px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', borderRadius: 10, padding: '10px 12px', color: 'white'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: 18, fontWeight: 700}}>{cardHours.toFixed(1)}</div>
                    <div style={{fontSize: 10, opacity: 0.8}}>שעות</div>
                  </div>
                  <div>
                    <div style={{fontSize: 11, opacity: 0.9}}>{label} דיווחים</div>
                    <div style={{fontSize: 20, fontWeight: 700}}>₪{cardAmount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
                    {cardPaid > 0 && <div style={{fontSize: 10, opacity: 0.8}}>שולם: ₪{cardPaid.toLocaleString('he-IL', {maximumFractionDigits: 0})} | רווח: ₪{(cardAmount - cardPaid).toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Entries List */}
          <div 
            ref={employeeListRef} 
            onScroll={() => { if (employeeListRef.current) employeeListScrollPos.current = employeeListRef.current.scrollTop }}
            style={{flex: 1, overflowY: 'auto', paddingBottom: 80}}
          >
            {employeeEntries.length === 0 ? (
              <div className="m-empty-state">
                <div style={{fontSize: 48, marginBottom: 16}}>📋</div>
                <div>אין דיווחים לעובד זה בתקופה שנבחרה</div>
              </div>
            ) : (
              <>
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
                        padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '1px solid #E5E7EB', background: isSelected ? '#F5F3FF' : 'white', cursor: 'pointer'
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0}}>
                        <div onClick={(e) => { e.stopPropagation(); toggleSelect() }}
                          style={{width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                            border: isSelected ? 'none' : '2px solid #D1D5DB',
                            background: isSelected ? '#8b5cf6' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          {isSelected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                            <span style={{fontSize: 14, fontWeight: 600, color: '#111827'}}>{client.name}</span>
                            <span style={{fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                              background: empPaid ? '#f3e8ff' : '#fef3c7',
                              color: empPaid ? '#6b21a8' : '#92400e'}}>
                              {empPaid ? `✓ ${t('empPaid')}` : `⏳ ${t('empPending')}`}
                            </span>
                            {entry.employeeInvoiceNumber && <span style={{fontSize: 11, color: '#8b5cf6'}}>#{entry.employeeInvoiceNumber}</span>}
                            {entry.employeePaymentAmount != null && <span style={{fontSize: 11, color: '#a78bfa', fontWeight: 700}}>💰 ₪{entry.employeePaymentAmount.toLocaleString('he-IL', {maximumFractionDigits: 0})} סה"כ</span>}
                          </div>
                          <div style={{fontSize: 13, color: '#6B7280', marginTop: 4}}>
                            {new Date(entry.startDate).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit', year: '2-digit'})}
                          </div>
                        </div>
                      </div>
                      <div style={{textAlign: 'left', flexShrink: 0}}>
                        <div style={{fontSize: 15, fontWeight: 700, color: '#111827'}}>₪{amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
                        <div style={{fontSize: 14, color: '#6B7280', fontWeight: 600}}>{hours.toFixed(1)}h</div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Employee Date Picker */}
          {employeeDatePickerOpen && (
            <DateRangePicker
              startDate={employeeFromDate}
              endDate={employeeToDate}
              onChange={(s, e) => { setEmployeeFromDate(s); setEmployeeToDate(e) }}
              onClose={() => setEmployeeDatePickerOpen(false)}
            />
          )}

          {/* Employee Share Popover */}
          {employeeShareOpen && (
            <>
              <div style={{position:'fixed',inset:0,zIndex:199}} onClick={() => setEmployeeShareOpen(false)} />
              <div style={{position:'fixed',bottom:70,right:8,zIndex:200,background:'white',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.18)',padding:8,display:'flex',gap:8}}>
                <button title="ייצוא לאקסל" onClick={() => {
                  let entries = timeEntries.filter(e => e.employeeId === selectedEmployeeId)
                  if (employeeFromDate && employeeToDate) entries = entries.filter(e => e.startDate >= employeeFromDate && e.startDate <= employeeToDate)
                  if (employeeStatusFilter !== 'all') entries = entries.filter(e => (e.billingStatus || 'pending') === employeeStatusFilter)
                  if (entries.length === 0) { setEmployeeShareOpen(false); return }
                  import('xlsx').then(XLSX => {
                    const data = entries.map(e => { const c = clients.find(cl => cl.id === e.clientId); const hours = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); const amount = c ? hours * c.hourlyRate * (1 + c.vatPercent/100) : 0; return { תאריך: e.startDate, לקוח: c?.name||'', שעות: hours.toFixed(2), סכום: amount.toFixed(2), סטטוס: e.billingStatus||'pending' } })
                    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, employee.name); XLSX.writeFile(wb, `${employee.name}_${new Date().toISOString().split('T')[0]}.xlsx`)
                  })
                  setEmployeeShareOpen(false)
                }} style={{width:44,height:44,borderRadius:8,border:'none',cursor:'pointer',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><polyline points="9 14 12 17 15 14"/></svg>
                </button>
                <button title="שלח במייל" onClick={() => {
                  let entries = timeEntries.filter(e => e.employeeId === selectedEmployeeId)
                  if (employeeFromDate && employeeToDate) entries = entries.filter(e => e.startDate >= employeeFromDate && e.startDate <= employeeToDate)
                  if (employeeStatusFilter !== 'all') entries = entries.filter(e => (e.billingStatus || 'pending') === employeeStatusFilter)
                  if (entries.length === 0) { setEmployeeShareOpen(false); return }
                  const totalHours = entries.reduce((sum, e) => sum + (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60), 0)
                  let totalAmount = 0; entries.forEach(e => { const c = clients.find(cl => cl.id === e.clientId); if (c) { const h = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); totalAmount += h * c.hourlyRate * (1 + c.vatPercent/100) } })
                  const subject = `דיווח שעות - ${employee.name}`
                  let body = `דיווח שעות - ${employee.name}\n\nסה"כ שעות: ${totalHours.toFixed(2)}\nסה"כ: ₪${totalAmount.toLocaleString('he-IL', {maximumFractionDigits:0})}\n\n`
                  entries.forEach(e => { const c = clients.find(cl => cl.id === e.clientId); const h = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); body += `${e.startDate} | ${c?.name||''} | ${h.toFixed(2)} שעות\n` })
                  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                  setEmployeeShareOpen(false)
                }} style={{width:44,height:44,borderRadius:8,border:'none',cursor:'pointer',background:'#EEF2FF',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
                </button>
              </div>
            </>
          )}

          {/* Bottom Menu Bar */}
          {employeeSelectedIds.length === 0 && (
            <div style={{position:'fixed',bottom:0,left:0,right:0,height:'60px',backgroundColor:'white',borderTop:'1px solid #E5E7EB',display:'flex',justifyContent:'space-around',alignItems:'center',padding:'0 8px',zIndex:100}}>
              <button onClick={() => setEmployeeDatePickerOpen(true)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color: employeeFromDate ? '#1d4ed8' : '#374151'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span style={{fontSize:'11px',fontWeight:500}}>{employeeFromDate ? '📅' : t('date')}</span>
              </button>
              <button onClick={() => { setTempEmployeeStatus(employeeStatusFilter); setTempEmployeePaymentStatus(employeePaymentStatusFilter); setEmployeeFilterSheetOpen(true) }} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color: (employeeStatusFilter !== 'all' || employeePaymentStatusFilter !== 'all') ? '#1d4ed8' : '#374151'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                <span style={{fontSize:'11px',fontWeight:500}}>{t('filter')}</span>
              </button>
              <button onClick={() => setEmployeeShareOpen(true)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color:'#374151'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span style={{fontSize:'11px',fontWeight:500}}>{t('sendTo')}</span>
              </button>
              <button onClick={startVoiceRecognition} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color: voiceListening ? '#DC2626' : '#7c3aed'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <span style={{fontSize:'11px',fontWeight:500}}>{voiceListening ? '●' : t('voice')}</span>
              </button>
            </div>
          )}

          {/* Employee Status Picker Sheet */}
          {employeeStatusPickerOpen && (
            <>
              <div className="m-overlay" onClick={() => setEmployeeStatusPickerOpen(false)} />
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'white', borderRadius: '16px 16px 0 0',
                padding: '16px 0', zIndex: 500, maxHeight: '60vh'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: 12}}>
                  <span style={{fontSize: 18, fontWeight: 700, color: '#111827'}}>עדכון סטטוס ותשלום</span>
                  <button onClick={() => setEmployeeStatusPickerOpen(false)} style={{fontSize: 20, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer'}}>✕</button>
                </div>
                <div style={{overflowY: 'auto', maxHeight: 'calc(60vh - 60px)'}}>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <button onClick={() => { setTimeEntries(prev => prev.map(e => employeeSelectedIds.includes(e.id) ? {...e, employeePaidStatus: 'pending', employeePaymentAmount: undefined} : e)); setEmployeeSelectedIds([]); setEmployeeStatusFilter('all'); setEmployeeStatusPickerOpen(false) }}
                      style={{padding: '16px', fontSize: 16, border: 'none', background: 'white', borderBottom: '1px solid #E5E7EB', color: '#92400e', fontWeight: 600, cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12}}>
                      <span style={{fontSize: 24}}>⏳</span>
                      <span>ממתין לתשלום</span>
                    </button>
                    <button onClick={() => {
                      const amt = parseFloat(bulkEmployeePaymentAmount)
                      const firstId = employeeSelectedIds[0]
                      setTimeEntries(prev => prev.map(e => {
                        if (!employeeSelectedIds.includes(e.id)) return e
                        if (e.id === firstId) return {...e, employeePaidStatus: 'paid', ...(isNaN(amt) ? {} : {employeePaymentAmount: amt})}
                        return {...e, employeePaidStatus: 'paid', employeePaymentAmount: undefined}
                      }))
                      setBulkEmployeePaymentAmount('')
                      setEmployeeSelectedIds([])
                      setEmployeeStatusFilter('all')
                      setEmployeeStatusPickerOpen(false)
                    }}
                      style={{padding: '16px', fontSize: 16, border: 'none', background: 'white', color: '#166534', fontWeight: 600, cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12}}>
                      <span style={{fontSize: 24}}>✅</span>
                      <span>שולם</span>
                    </button>
                  </div>
                </div>
                <div style={{marginTop: 12, padding: '12px 16px', borderTop: '1px solid #E5E7EB'}}>
                  <div style={{fontSize: 13, color: '#6B7280', marginBottom: 8}}>סכום לתשלום (לדיווח ראשון):</div>
                  <div style={{display: 'flex', gap: 8}}>
                    <input type="number" inputMode="decimal" placeholder="הכנס סכום ₪"
                      key="emp-picker-amount" value={bulkEmployeePaymentAmount} onChange={e => setBulkEmployeePaymentAmount(e.target.value)}
                      style={{flex: 1, padding: '12px', fontSize: 16, border: '1px solid #E5E7EB', borderRadius: 8, background: 'white', outline: 'none'}} />
                    <button onClick={() => {
                      const amt = parseFloat(bulkEmployeePaymentAmount)
                      if (isNaN(amt)) return
                      const firstId = employeeSelectedIds[0]
                      setTimeEntries(prev => prev.map(e => {
                        if (!employeeSelectedIds.includes(e.id)) return e
                        if (e.id === firstId) return {...e, employeePaymentAmount: amt}
                        return e
                      }))
                      setBulkEmployeePaymentAmount('')
                      setEmployeeSelectedIds([])
                      setEmployeeStatusPickerOpen(false)
                    }} style={{padding: '12px 14px', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 8, background: '#1d4ed8', color: 'white', cursor: 'pointer', whiteSpace: 'nowrap'}}>
                      שמור סכום
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Employee Filter Sheet */}
          {employeeFilterSheetOpen && (
            <>
              <div className="m-overlay" onClick={() => setEmployeeFilterSheetOpen(false)} />
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'white', borderRadius: '16px 16px 0 0',
                padding: '20px 16px 28px', zIndex: 500, maxHeight: '80vh', overflowY: 'auto'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                  <div style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>{t('filterTitle')}</div>
                  <button type="button" onClick={() => { setTempEmployeeStatus('all'); setTempEmployeePaymentStatus('all') }}
                    style={{display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                      background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer'}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    {t('reset')}
                  </button>
                </div>

                <div style={{marginBottom: 20}}>
                  <div style={{fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10}}>סטטוס גביה</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
                    {[
                      {key: 'all', label: 'הכל', color: 'white', bg: '#374151'},
                      {key: 'pending', label: '⏳ ממתין', color: '#92400e', bg: '#fef3c7'},
                      {key: 'invoiced', label: '📄 חויב', color: '#1e40af', bg: '#dbeafe'},
                      {key: 'paid', label: '✅ שולם', color: '#166534', bg: '#dcfce7'}
                    ].map(s => (
                      <button key={s.key} type="button"
                        onClick={() => setTempEmployeeStatus(s.key as any)}
                        style={{
                          width: '100%', padding: '12px 10px', borderRadius: 12, border: 'none',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                          background: tempEmployeeStatus === s.key ? s.bg : '#f3f4f6',
                          color: tempEmployeeStatus === s.key ? s.color : '#374151'
                        }}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{marginBottom: 24}}>
                  <div style={{fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10}}>סטטוס תשלום</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8}}>
                    {[
                      {key: 'all', label: 'הכל', color: 'white', bg: '#374151'},
                      {key: 'pending', label: '⏳ ממתין', color: '#92400e', bg: '#fef3c7'},
                      {key: 'paid', label: '✅ שולם', color: '#166534', bg: '#dcfce7'}
                    ].map(s => (
                      <button key={s.key} type="button"
                        onClick={() => setTempEmployeePaymentStatus(s.key as any)}
                        style={{
                          width: '100%', padding: '12px 10px', borderRadius: 12, border: 'none',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                          background: tempEmployeePaymentStatus === s.key ? s.bg : '#f3f4f6',
                          color: tempEmployeePaymentStatus === s.key ? s.color : '#374151'
                        }}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{display: 'flex', gap: 8, marginTop: 4}}>
                  <button type="button" onClick={() => setEmployeeFilterSheetOpen(false)}
                    style={{padding: '12px 16px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#6B7280'}}>
                    {t('cancel')}
                  </button>
                  <button type="button" onClick={() => { setEmployeeStatusFilter(tempEmployeeStatus); setEmployeePaymentStatusFilter(tempEmployeePaymentStatus); setEmployeeFilterSheetOpen(false) }}
                    style={{flex: 1, padding: '12px', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: '#1d4ed8', color: 'white'}}>
                    {t('set')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )
    }

    // Main screen with tabs
    const renderHeaderNewBtn = (onClick: () => void, title: string) => (
      <button type="button" className="m-hbtn m-hbtn-menu" onClick={onClick} title={title}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <span className="m-hbtn-label">{t('newLabel')}</span>
      </button>
    )

    return (
      <div className="m-screen">
        <div className="m-header">
          {timeTrackingTab === 'summary' && (selectedEntryIds.length > 0 || selectedChargeIds.length > 0) ? (
            <>
              {/* Selection-mode header: ✕ | count/status/invoice | select-all | clear | status | # */}
              <button className="m-back-btn" onClick={() => { setSelectedEntryIds([]); setSelectedChargeIds([]); setStatusLabelOpen(false); setSummaryInvoiceOpen(false); setSummaryInvoiceInput('') }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h1 className="m-title" style={{fontSize: 16}}>{selectedEntryIds.length + selectedChargeIds.length} נבחרו</h1>
              <div className="m-header-actions">
                <button type="button" className="m-hbtn" title="בחר הכל"
                  onClick={() => { setSelectedEntryIds(summaryVisibleEntryIds.current); setSelectedChargeIds(summaryVisibleChargeIds.current) }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="9 12 11 14 15 10"/></svg>
                  <span className="m-hbtn-label">בחר הכל</span>
                </button>
                <button type="button" className="m-hbtn" title="איפוס בחירה"
                  onClick={() => { setSelectedEntryIds([]); setSelectedChargeIds([]); setStatusLabelOpen(false); setSummaryInvoiceOpen(false); setSummaryInvoiceInput('') }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                  <span className="m-hbtn-label">איפוס</span>
                </button>
                <button
                  onClick={() => { setStatusLabelOpen(v => !v); setSummaryInvoiceOpen(false) }}
                  className={`m-hbtn${statusLabelOpen ? ' active' : ''}`}
                  title="שנה סטטוס"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{transform: 'rotate(-20deg)'}}>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  <span className="m-hbtn-label">סטטוס</span>
                </button>
                <button
                  onClick={() => { setSummaryInvoiceOpen(v => !v); setSummaryInvoiceInput(''); setStatusLabelOpen(false) }}
                  className={`m-hbtn${summaryInvoiceOpen ? ' active' : ''}`}
                  title="מספר חשבונית"
                >
                  <span style={{fontSize: 20, fontWeight: 900, lineHeight: 1}}>#</span>
                  <span className="m-hbtn-label">חשבונית</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <DexcelLogo />
              <h1 className="m-title">{employeeMode ? `${t('hello')} ${employeeMode.name}` : t('title')}</h1>
              <div className="m-header-actions">
                {timeTrackingTab === 'clients' && !employeeMode && renderHeaderNewBtn(openNewClientForm, t('newClient'))}
                {timeTrackingTab === 'employees' && renderHeaderNewBtn(openNewEmployeeForm, t('newEmployee'))}
                {timeTrackingTab === 'summary' && !employeeMode && (
                  <button type="button" className="m-hbtn" title={t('selectAll')}
                    onClick={() => { setSelectedEntryIds(summaryVisibleEntryIds.current); setSelectedChargeIds(summaryVisibleChargeIds.current) }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="9 12 11 14 15 10"/></svg>
                    <span className="m-hbtn-label">{t('selectAll')}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Invoice input — floats below header */}
        {timeTrackingTab === 'summary' && summaryInvoiceOpen && (
          <div style={{position: 'relative', height: 0, zIndex: 200}}>
            <div style={{position: 'absolute', top: 4, left: 8, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 200}}>
              <input autoFocus type="text" inputMode="numeric" placeholder="מספר חשבונית..."
                value={summaryInvoiceInput}
                onChange={e => setSummaryInvoiceInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') {
                  const num = summaryInvoiceInput.trim()
                  if (!num) return
                  setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, invoiceNumber: num, billingStatus: e.billingStatus === 'paid' ? 'paid' : 'invoiced'} : e))
                  setChargeEntries(prev => prev.map(c => selectedChargeIds.includes(c.id) ? {...c, invoiceNumber: num} : c))
                  setSelectedEntryIds([]); setSelectedChargeIds([])
                  setSummaryInvoiceOpen(false); setSummaryInvoiceInput('')
                  setSuccessToast(`חשבונית ${num} נשמרה`); setTimeout(() => setSuccessToast(null), 2000)
                }}}
                style={{padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', direction: 'ltr'}}
              />
              <button onClick={() => {
                const num = summaryInvoiceInput.trim()
                if (!num) return
                setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, invoiceNumber: num, billingStatus: e.billingStatus === 'paid' ? 'paid' : 'invoiced'} : e))
                setChargeEntries(prev => prev.map(c => selectedChargeIds.includes(c.id) ? {...c, invoiceNumber: num} : c))
                setSelectedEntryIds([]); setSelectedChargeIds([])
                setSummaryInvoiceOpen(false); setSummaryInvoiceInput('')
                setSuccessToast(`חשבונית ${num} נשמרה`); setTimeout(() => setSuccessToast(null), 2000)
              }} style={{padding: '9px', border: 'none', borderRadius: 8, background: '#1d4ed8', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer'}}>✓ שמור</button>
            </div>
          </div>
        )}

        {/* Status dropdown — compact, floats below header, anchored left */}
        {timeTrackingTab === 'summary' && statusLabelOpen && (
          <div style={{position: 'relative', height: 0, zIndex: 200}}>
            <div style={{position: 'absolute', top: 4, left: 8, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '6px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 130}}>
              {([{s:'pending',label:'⏳ ממתין',bg:'#fef3c7',color:'#92400e'},{s:'invoiced',label:'📄 חויב',bg:'#dbeafe',color:'#1e40af'},{s:'paid',label:'✅ שולם',bg:'#dcfce7',color:'#166534'}] as {s:string,label:string,bg:string,color:string}[]).map(({s,label,bg,color}) => (
                <button key={s} onClick={() => {
                  setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, billingStatus: s as any} : e))
                  setChargeEntries(prev => prev.map(c => selectedChargeIds.includes(c.id) ? {...c, billingStatus: s as any} : c))
                  setSelectedEntryIds([]); setSelectedChargeIds([])
                  setStatusLabelOpen(false)
                  setSuccessToast(`סטטוס: ${label.replace(/[⏳📄✅] /,'')}`); setTimeout(() => setSuccessToast(null), 2000)
                }} style={{width: '100%', padding: '7px 12px', fontSize: 13, border: 'none', borderRadius: 8, background: bg, color, fontWeight: 700, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap'}}>{label}</button>
              ))}
            </div>
          </div>
        )}

        <TimerBanner />

        {/* Tabs */}
        <div className="m-time-tabs">
          <button
            className={`m-time-tab ${timeTrackingTab === 'clients' ? 'active' : ''}`}
            onClick={() => setTimeTrackingTab('clients')}
          >
            {t('tabClients')}
          </button>
          {!employeeMode && (
            <>
              <button
                className={`m-time-tab ${timeTrackingTab === 'reports' ? 'active' : ''}`}
                onClick={() => setTimeTrackingTab('reports')}
              >
                {t('tabDashboard')}
              </button>
              <button
                className={`m-time-tab ${timeTrackingTab === 'summary' ? 'active' : ''}`}
                onClick={() => setTimeTrackingTab('summary')}
              >
                {t('tabBilling')}
              </button>
              <button
                className={`m-time-tab ${timeTrackingTab === 'employees' ? 'active' : ''}`}
                onClick={() => setTimeTrackingTab('employees')}
              >
                {t('tabEmployees')}
              </button>
            </>
          )}
        </div>

        {/* Tab 1: Clients */}
        {timeTrackingTab === 'clients' && (
          <div className="m-clients-list" style={{overflowY: 'auto', maxHeight: 'calc(100vh - 180px)'}}>
          {/* Employee Mode Banner */}
          {employeeMode && (
            <div style={{padding: '12px 16px', background: '#DBEAFE', borderBottom: '1px solid #93C5FD', marginBottom: 8}}>
              <div style={{fontSize: 14, fontWeight: 600, color: '#1E40AF'}}>
                👋 {t('hello')} {employeeMode.name}!
              </div>
              <div style={{fontSize: 12, color: '#3B82F6', marginTop: 4}}>
                {t('employeeClients')}:
              </div>
            </div>
          )}
          {clients.length === 0 ? (
            <div className="m-empty-state">
              <div style={{fontSize: 48, marginBottom: 16}}>👥</div>
              <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>{t('noClientsYet')}</div>
              <div style={{fontSize: 14, color: '#999'}}>{t('addFirstClientHint')}</div>
            </div>
          ) : (
            [...clients]
              .filter(c => employeeMode ? employeeMode.clientIds.includes(c.id) : true)
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
                <div style={{fontSize: 14, color: '#999'}}>לחצו על &quot;חדש&quot; בכותרת (אייקון עיפרון ופלוס) כדי להוסיף עובד</div>
              </div>
            ) : (
              employees.map(employee => {
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
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Tab 3: Reports */}
        {timeTrackingTab === 'reports' && (
          <div style={{flex: 1, overflowY: 'auto', padding: '12px 0 100px'}}>
            {/* Period selector */}
            <div style={{padding: '0 16px 14px'}}>
              <select
                value={reportsPeriod}
                onChange={e => setReportsPeriod(e.target.value as 'week' | 'month' | 'year')}
                style={{width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12,
                  fontSize: 16, fontWeight: 600, color: '#111827', background: 'white', cursor: 'pointer'}}
              >
                <option value="week">{t('weekly')}</option>
                <option value="month">{t('monthly')}</option>
                <option value="year">{t('yearly')}</option>
              </select>
            </div>

            {/* Dashboard cards */}
            {(() => {
              const period = reportsPeriod
              const clientIds = new Set(clients.map(c => c.id))
              const validEntries = timeEntries.filter(e => clientIds.has(e.clientId))

              const getPeriodKey = (dateStr: string): string => {
                const d = new Date(dateStr)
                if (period === 'week') {
                  const weekStart = new Date(d)
                  if (lang === 'he') {
                    weekStart.setDate(d.getDate() - d.getDay()) // Sunday start
                  } else {
                    const day = d.getDay()
                    weekStart.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // Monday start
                  }
                  return weekStart.toISOString().split('T')[0]
                } else if (period === 'month') {
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                } else {
                  return `${d.getFullYear()}`
                }
              }

              const getPeriodLabel = (key: string): string => {
                if (period === 'week') {
                  const start = new Date(key)
                  const end = new Date(start); end.setDate(start.getDate() + 6)
                  const locale = lang === 'he' ? 'he-IL' : 'en-US'
                  return `${start.toLocaleDateString(locale, {day:'2-digit',month:'2-digit'})} – ${end.toLocaleDateString(locale, {day:'2-digit',month:'2-digit',year:'numeric'})}`
                } else if (period === 'month') {
                  const [y, m] = key.split('-')
                  const locale = lang === 'he' ? 'he-IL' : 'en-US'
                  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString(locale, {month: 'long', year: 'numeric'})
                } else {
                  return key
                }
              }

              const grouped: Record<string, TimeEntry[]> = {}
              validEntries.forEach(e => {
                const key = getPeriodKey(e.startDate)
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(e)
              })

              const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
              if (sortedKeys.length === 0) return <div className="m-empty-state">{t('noEntries')}</div>

              return (
                <div style={{display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px'}}>
                  {(() => {
                    const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1']

                    const buildPieSvg = (slices: {value: number, color: string}[], size: number) => {
                      const total = slices.reduce((s, d) => s + d.value, 0)
                      if (total === 0 || slices.length === 0) return null
                      if (slices.length === 1) {
                        return (
                          <svg width={size} height={size}>
                            <circle cx={size/2} cy={size/2} r={size/2 - 2} fill={slices[0].color} />
                          </svg>
                        )
                      }
                      const cx = size / 2, cy = size / 2, r = size / 2 - 2
                      let angle = -Math.PI / 2
                      return (
                        <svg width={size} height={size}>
                          {slices.map((s, i) => {
                            const sweep = (s.value / total) * 2 * Math.PI
                            const x1 = cx + r * Math.cos(angle)
                            const y1 = cy + r * Math.sin(angle)
                            angle += sweep
                            const x2 = cx + r * Math.cos(angle)
                            const y2 = cy + r * Math.sin(angle)
                            const large = sweep > Math.PI ? 1 : 0
                            return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={s.color} />
                          })}
                        </svg>
                      )
                    }

                    return sortedKeys.map(key => {
                    const periodEntries = grouped[key]
                    const totalHours = periodEntries.reduce((sum, e) => sum + calculateHours(e), 0)
                    let revenueBeforeVAT = 0
                    let revenueWithVAT = 0
                    let incomeTaxDeduction = 0
                    let employeePayments = 0

                    const clientMap: Record<string, {name: string, hours: number, revenue: number}> = {}
                    periodEntries.forEach(e => {
                      const client = clients.find(c => c.id === e.clientId)
                      if (!client) return
                      const h = calculateHours(e)
                      const rev = h * client.hourlyRate
                      revenueBeforeVAT += rev
                      revenueWithVAT += rev * (1 + client.vatPercent / 100)
                      incomeTaxDeduction += rev * (client.incomeTaxPercent / 100)
                      if (e.employeePaymentAmount != null) employeePayments += e.employeePaymentAmount
                      if (!clientMap[e.clientId]) clientMap[e.clientId] = {name: client.name, hours: 0, revenue: 0}
                      clientMap[e.clientId].hours += h
                      clientMap[e.clientId].revenue += rev
                    })

                    const netProfit = revenueBeforeVAT - incomeTaxDeduction - employeePayments
                    const clientList = Object.values(clientMap).sort((a, b) => b.hours - a.hours)

                    return (
                      <div key={key} style={{background: 'white', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.09)', overflow: 'hidden'}}>
                        <div style={{background: '#1e3a8a', padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{fontSize: 15, fontWeight: 700, color: 'white'}}>{getPeriodLabel(key)}</span>
                          <span style={{fontSize: 14, color: '#93c5fd', fontWeight: 700}}>{totalHours.toFixed(1)}h</span>
                        </div>
                        <div style={{padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 0}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F3F4F6'}}>
                            <span style={{fontSize: 13, color: '#6B7280'}}>{t('revenueBeforeVAT')}</span>
                            <span style={{fontSize: 16, fontWeight: 700, color: '#374151'}}>₪{revenueBeforeVAT.toLocaleString('he-IL', {maximumFractionDigits: 0})}</span>
                          </div>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F3F4F6'}}>
                            <span style={{fontSize: 13, color: '#6B7280'}}>{t('revenueWithVAT')}</span>
                            <span style={{fontSize: 16, fontWeight: 700, color: '#374151'}}>₪{revenueWithVAT.toLocaleString('he-IL', {maximumFractionDigits: 0})}</span>
                          </div>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0 4px'}}>
                            <div>
                              <div style={{fontSize: 14, fontWeight: 700, color: netProfit >= 0 ? '#065F46' : '#DC2626'}}>{t('netProfit')}</div>
                              {(incomeTaxDeduction > 0 || employeePayments > 0) && (
                                <div style={{fontSize: 11, color: '#9CA3AF', marginTop: 3}}>
                                  {incomeTaxDeduction > 0 && `${t('taxLabel')} ₪${incomeTaxDeduction.toLocaleString('he-IL',{maximumFractionDigits:0})}`}
                                  {incomeTaxDeduction > 0 && employeePayments > 0 && ' + '}
                                  {employeePayments > 0 && `${t('employeesLabel')} ₪${employeePayments.toLocaleString('he-IL',{maximumFractionDigits:0})}`}
                                </div>
                              )}
                            </div>
                            <span style={{fontSize: 22, fontWeight: 800, color: netProfit >= 0 ? '#065F46' : '#DC2626'}}>
                              ₪{netProfit.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                            </span>
                          </div>
                        </div>

                        {/* Pie chart by client */}
                        {clientList.length > 0 && (
                          <div style={{borderTop: '1px solid #F3F4F6', padding: '14px 16px'}}>
                            <div style={{fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 12}}>{t('clientBreakdown')}</div>
                            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                              {buildPieSvg(
                                clientList.map((c, i) => ({value: c.hours, color: PIE_COLORS[i % PIE_COLORS.length]})),
                                110
                              )}
                              <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 7}}>
                                {clientList.map((c, i) => (
                                  <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <div style={{width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0}} />
                                    <div style={{flex: 1, minWidth: 0}}>
                                      <div style={{fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{c.name}</div>
                                      <div style={{fontSize: 11, color: '#6B7280'}}>{c.hours.toFixed(1)}h · ₪{c.revenue.toLocaleString('he-IL',{maximumFractionDigits:0})}</div>
                                    </div>
                                    <div style={{fontSize: 12, fontWeight: 700, color: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0}}>
                                      {totalHours > 0 ? Math.round(c.hours / totalHours * 100) : 0}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                  })()}
                </div>
              )
            })()}
          </div>
        )}

        {false && timeTrackingTab === '_old_reports' && (
          <div className="m-time-summary-tab">
            {/* Reports Filter Sheet */}
            {reportsFilterSheetOpen && (() => {
              const applyAndClose = () => {
                setReportsClientFilter(tempReportsClient)
                setReportsStatusFilter(tempReportsStatuses)
                setReportsFilterSheetOpen(false)
              }
              const resetTemp = () => { setTempReportsClient('all'); setTempReportsStatuses(['all']) }
              const cancelAndClose = () => setReportsFilterSheetOpen(false)
              const toggleStatus = (key: string) => {
                if (key === 'all') { setTempReportsStatuses(['all']); return }
                setTempReportsStatuses(prev => {
                  const without = prev.filter(s => s !== 'all')
                  const toggled = without.includes(key) ? without.filter(s => s !== key) : [...without, key]
                  return toggled.length === 0 ? ['all'] : toggled
                })
              }
              return (
                <>
                  <div className="m-overlay" onClick={cancelAndClose} />
                  <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: 'white', borderRadius: '16px 16px 0 0',
                    padding: '20px 16px 28px', zIndex: 500, maxHeight: '80vh', overflowY: 'auto'
                  }}>
                    {/* Header */}
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                      <div style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>{t('filterTitle')}</div>
                      <button type="button" onClick={resetTemp}
                        style={{display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                          background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer'}}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        {t('reset')}
                      </button>
                    </div>

                    {/* Client Section */}
                    <div style={{marginBottom: 20}}>
                      <div style={{fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12}}>לקוח</div>
                      <select
                        value={tempReportsClient}
                        onChange={e => setTempReportsClient(e.target.value)}
                        style={{width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: 12, fontSize: 14}}
                      >
                        <option value="all">כל הלקוחות</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Section — multi-select */}
                    <div style={{marginBottom: 24}}>
                      <div style={{fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12}}>סטטוס <span style={{fontSize: 11, color: '#9CA3AF', fontWeight: 400}}>(ניתן לבחור כמה)</span></div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
                        {([
                          {key: 'all', label: 'הכל', color: 'white', bg: '#374151'},
                          {key: 'pending', label: '⏳ ממתין', color: '#92400e', bg: '#fef3c7'},
                          {key: 'invoiced', label: '📄 חויב', color: '#1e40af', bg: '#dbeafe'},
                          {key: 'paid', label: '✅ שולם', color: '#166534', bg: '#dcfce7'}
                        ] as {key:string,label:string,color:string,bg:string}[]).map(s => {
                          const isSelected = tempReportsStatuses.includes(s.key)
                          return (
                            <button key={s.key} type="button" onClick={() => toggleStatus(s.key)}
                              style={{
                                width: '100%', padding: '12px 10px', borderRadius: 12,
                                border: isSelected ? `2px solid ${s.key === 'all' ? '#374151' : s.bg}` : '2px solid transparent',
                                outline: 'none',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                                background: isSelected ? s.bg : '#f3f4f6',
                                color: isSelected ? s.color : '#374151'
                              }}
                            >
                              {s.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Bottom buttons */}
                    <div style={{display: 'flex', gap: 8, marginTop: 4}}>
                      <button type="button" onClick={cancelAndClose}
                        style={{padding: '12px 16px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#6B7280'}}>
                        {t('cancel')}
                      </button>
                      <button type="button" onClick={applyAndClose}
                        style={{flex: 1, padding: '12px', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: '#1d4ed8', color: 'white'}}>
                        {t('set')}
                      </button>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Date Picker for Reports */}
            {reportsDatePickerOpen && (
              <DateRangePicker
                startDate={reportsFromDate}
                endDate={reportsToDate}
                onChange={(s, e) => { setReportsFromDate(s); setReportsToDate(e); }}
                onClose={() => setReportsDatePickerOpen(false)}
                onReset={() => { setReportsFromDate(''); setReportsToDate('') }}
              />
            )}

            {/* Reports Share Popover */}
            {reportsShareOpen && (
              <>
                <div style={{position:'fixed',inset:0,zIndex:199}} onClick={() => setReportsShareOpen(false)} />
                <div style={{position:'fixed',bottom:70,left:8,zIndex:200,background:'white',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.18)',padding:8,display:'flex',gap:8}}>
                  <button title="ייצוא לאקסל" onClick={() => {
                    const filtered = timeEntries.filter(e => { if (reportsFromDate && reportsToDate) return e.startDate >= reportsFromDate && e.startDate <= reportsToDate; return true }).filter(e => reportsClientFilter === 'all' || e.clientId === reportsClientFilter)
                    if (filtered.length === 0) { setReportsShareOpen(false); return }
                    import('xlsx').then(XLSX => {
                      const data = filtered.map(e => { const client = clients.find(c => c.id === e.clientId); const hours = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); const amount = client ? hours * client.hourlyRate * (1 + client.vatPercent/100) : 0; return { תאריך: e.startDate, לקוח: client?.name||'', שעות: hours.toFixed(2), סכום: amount.toFixed(2), הערות: e.notes||'' } })
                      const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'דיווחים'); XLSX.writeFile(wb, `דיווחי_שעות_${new Date().toISOString().split('T')[0]}.xlsx`)
                    })
                    setReportsShareOpen(false)
                  }} style={{width:44,height:44,borderRadius:8,border:'none',cursor:'pointer',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><polyline points="9 14 12 17 15 14"/></svg>
                  </button>
                  <button title="שלח במייל" onClick={() => {
                    const filtered = timeEntries.filter(e => { if (reportsFromDate && reportsToDate) return e.startDate >= reportsFromDate && e.startDate <= reportsToDate; return true }).filter(e => reportsClientFilter === 'all' || e.clientId === reportsClientFilter)
                    if (filtered.length === 0) { setReportsShareOpen(false); return }
                    const totalHours = filtered.reduce((sum, e) => sum + (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60), 0)
                    let totalAmount = 0; filtered.forEach(e => { const client = clients.find(c => c.id === e.clientId); if (client) { const h = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); totalAmount += h * client.hourlyRate * (1 + client.vatPercent/100) } })
                    const subject = `דיווח שעות - ${filtered.length} דיווחים`
                    let body = `דיווח שעות\n\nסה"כ שעות: ${totalHours.toFixed(2)}\nסה"כ: ₪${totalAmount.toLocaleString('he-IL', {maximumFractionDigits:0})}\n\n`
                    filtered.forEach(e => { const client = clients.find(c => c.id === e.clientId); const h = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); body += `${e.startDate} ${e.startTime}-${e.endTime} | ${client?.name} | ${h.toFixed(2)} שעות\n` })
                    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                    setReportsShareOpen(false)
                  }} style={{width:44,height:44,borderRadius:8,border:'none',cursor:'pointer',background:'#EEF2FF',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
                  </button>
                </div>
              </>
            )}

            {(() => {
              // Filter entries by date range, client, and status
              const clientIds = new Set(clients.map(c => c.id))
              let filteredEntries = timeEntries.filter(e => clientIds.has(e.clientId))
              let filteredCharges = chargeEntries.filter(e => clientIds.has(e.clientId))

              // Date range filter (custom date picker only — period buttons only control grouping)
              if (reportsFromDate && reportsToDate) {
                filteredEntries = filteredEntries.filter(e => e.startDate >= reportsFromDate && e.startDate <= reportsToDate)
                filteredCharges = filteredCharges.filter(c => c.date >= reportsFromDate && c.date <= reportsToDate)
              }

              // Client filter
              if (reportsClientFilter !== 'all') {
                filteredEntries = filteredEntries.filter(e => e.clientId === reportsClientFilter)
                filteredCharges = filteredCharges.filter(c => c.clientId === reportsClientFilter)
              }

              // Status filter
              if (!(reportsStatusFilter.length === 1 && reportsStatusFilter[0] === 'all')) {
                filteredEntries = filteredEntries.filter(e => reportsStatusFilter.includes(e.billingStatus || 'pending'))
                filteredCharges = filteredCharges.filter(c => reportsStatusFilter.includes(c.billingStatus || 'pending'))
              }

              // Group ALL entries by period key
              const getPeriodKey = (dateStr: string) => {
                const d = new Date(dateStr)
                if (reportsPeriod === 'week') {
                  // Israeli week: Sun-Sat
                  const sun = new Date(d); sun.setDate(d.getDate() - d.getDay())
                  return sun.toISOString().split('T')[0]
                } else if (reportsPeriod === 'month') {
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                } else {
                  return `${d.getFullYear()}`
                }
              }

              const getPeriodLabel = (key: string) => {
                if (reportsPeriod === 'week') {
                  const sun = new Date(key)
                  const sat = new Date(sun); sat.setDate(sun.getDate() + 6)
                  return `${sun.toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit'})} – ${sat.toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'numeric'})}`
                } else if (reportsPeriod === 'month') {
                  const [y, m] = key.split('-')
                  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('he-IL', {month: 'long', year: 'numeric'})
                } else {
                  return key
                }
              }

              // Sort all entries by date desc
              const sorted = filteredEntries.sort((a, b) => b.startDate.localeCompare(a.startDate))

              // Group by period key
              const grouped: Record<string, TimeEntry[]> = {}
              sorted.forEach(e => {
                const key = getPeriodKey(e.startDate)
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(e)
              })

              // Also group charge entries by period
              const chargeGrouped: Record<string, ChargeEntry[]> = {}
              filteredCharges.forEach(e => {
                const key = getPeriodKey(e.date)
                if (!chargeGrouped[key]) chargeGrouped[key] = []
                chargeGrouped[key].push(e)
              })

              const allKeys = Array.from(new Set([...Object.keys(grouped), ...Object.keys(chargeGrouped)])).sort((a, b) => b.localeCompare(a))

              if (allKeys.length === 0) return <div className="m-empty-state">אין דיווחים</div>

              return (
                <>
                  {allKeys.map(key => {
                    const entries = grouped[key] || []
                    const charges = chargeGrouped[key] || []
                    const totalHours = entries.reduce((sum, e) => sum + calculateHours(e), 0)
                    let totalAmount = 0
                    entries.forEach(e => {
                      const client = clients.find(c => c.id === e.clientId)
                      if (client) totalAmount += calculateHours(e) * client.hourlyRate * (1 + client.vatPercent / 100)
                    })
                    charges.forEach(c => { totalAmount += c.amount })

                    return (
                      <div key={key}>
                        {/* Period subtotal header */}
                        <div style={{background: '#BBF7D0', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6}}>
                          <span style={{fontSize: 16, fontWeight: 700, color: '#065F46'}}>{getPeriodLabel(key)}</span>
                          <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
                            {totalHours > 0 && <span style={{fontSize: 15, color: '#047857', fontWeight: 600}}>{totalHours.toFixed(1)}h</span>}
                            <span style={{fontSize: 16, color: '#047857', fontWeight: 800}}>₪{totalAmount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</span>
                          </div>
                        </div>

                        {/* Entries + Charges merged in this period */}
                        <div style={{background: 'white'}}>
                          {(() => {
                            // Merge and sort chronologically within period
                            const merged = [
                              ...entries.map(e => ({ type: 'entry' as const, data: e, sortKey: `${e.startDate}T${e.startTime}` })),
                              ...charges.map(c => ({ type: 'charge' as const, data: c, sortKey: c.date }))
                            ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))
                            return merged.map(item => {
                              if (item.type === 'entry') {
                                const entry = item.data
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
                                    style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '2px solid #E5E7EB', cursor: 'pointer'}}
                                  >
                                    <div style={{minWidth: 0}}>
                                      <div style={{fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{client.name}</div>
                                      <div style={{fontSize: 12, color: '#6B7280', marginTop: 1}}>
                                        <span style={{fontSize: 16, fontWeight: 700, color: '#374151'}}>{new Date(entry.startDate).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', year:'2-digit'})}</span>
                                    <span style={{marginRight: 6, marginLeft: 8, fontSize: 11, padding: '1px 5px', borderRadius: 4, background: status === 'paid' ? '#dcfce7' : status === 'invoiced' ? '#dbeafe' : '#fef3c7', color: status === 'paid' ? '#166534' : status === 'invoiced' ? '#1e40af' : '#92400e'}}>
                                      {status === 'paid' ? 'שולם' : status === 'invoiced' ? 'חויב' : 'ממתין'}
                                    </span>
                                  </div>
                                </div>
                                <div style={{textAlign: 'left', flexShrink: 0}}>
                                  <div style={{fontSize: 14, fontWeight: 700, color: '#059669'}}>₪{amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
                                  <div style={{fontSize: 17, fontWeight: 700, color: '#6B7280'}}>{hours.toFixed(1)}h</div>
                                </div>
                              </div>
                            )
                          } else {
                            const charge = item.data
                            const client = clients.find(c => c.id === charge.clientId)
                            if (!client) return null
                            const tag = chargeTags.find(t => t.id === charge.tagId)
                            const status = charge.billingStatus || 'pending'
                            return (
                              <div key={charge.id}
                                onClick={() => {
                                  setChargeFormClientId(charge.clientId)
                                  setChargeFormDate(charge.date)
                                  setChargeFormAmount(String(charge.amount))
                                  setChargeFormTagId(charge.tagId)
                                  setChargeFormNotes(charge.notes || '')
                                  setEditChargeId(charge.id)
                                  setAddChargeOpen(true)
                                }}
                                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '2px solid #E5E7EB', cursor: 'pointer', background: '#faf5ff'}}
                              >
                                <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0}}>
                                  <div style={{minWidth: 0}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                      <span style={{fontSize: 14, fontWeight: 600, color: '#111827'}}>{client.name}</span>
                                      <span style={{fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#ede9fe', color: '#7c3aed', fontWeight: 600}}>{tag?.name || charge.tagId}</span>
                                    </div>
                                    <div style={{fontSize: 12, color: '#6B7280', marginTop: 1}}>
                                      <span style={{fontSize: 16, fontWeight: 700, color: '#374151'}}>{new Date(charge.date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', year:'2-digit'})}</span>
                                      <span style={{marginRight: 6, marginLeft: 8, fontSize: 11, padding: '1px 5px', borderRadius: 4, background: status === 'paid' ? '#dcfce7' : status === 'invoiced' ? '#dbeafe' : '#fef3c7', color: status === 'paid' ? '#166534' : status === 'invoiced' ? '#1e40af' : '#92400e'}}>
                                        {status === 'paid' ? 'שולם' : status === 'invoiced' ? 'חויב' : 'ממתין'}
                                      </span>
                                                                          </div>
                                  </div>
                                </div>
                                <div style={{textAlign: 'left', flexShrink: 0}}>
                                  <div style={{fontSize: 14, fontWeight: 700, color: '#7c3aed'}}>₪{charge.amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>
                                  <div style={{fontSize: 11, color: '#9CA3AF'}}>חיוב</div>
                                </div>
                              </div>
                            )
                          }
                        })
                      })()}
                    </div>
                  </div>
                )
              })}
            </>
          )})()}
        </div>
      )}

        {/* Bottom Menu Bar - tab-aware */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px',
          backgroundColor: 'white', borderTop: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '0 8px', zIndex: 100
        }}>
          <button onClick={() => { if (timeTrackingTab === 'summary') setSummaryDatePickerOpen(true) }}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',
              opacity: timeTrackingTab === 'summary' ? 1 : 0.3,
              color: summaryFromDate ? '#1d4ed8' : '#374151'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{fontSize:'11px',fontWeight:500}}>{t('date')}</span>
          </button>
          <button onClick={() => { if (timeTrackingTab === 'summary') { setTempSummaryClient(summaryClientFilter); setTempSummaryStatus(summaryStatusFilter); setSummaryFilterSheetOpen(true) } }}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',
              opacity: timeTrackingTab === 'summary' ? 1 : 0.3,
              color: summaryStatusFilter !== 'all' ? '#1d4ed8' : '#374151'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span style={{fontSize:'11px',fontWeight:500}}>{t('filter')}</span>
          </button>
          <button onClick={() => { if (timeTrackingTab === 'summary') setSummaryShareOpen(true) }}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',
              opacity: timeTrackingTab === 'summary' ? 1 : 0.3,
              color:'#374151'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span style={{fontSize:'11px',fontWeight:500}}>{t('sendTo')}</span>
          </button>
          <button onClick={startVoiceRecognition} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',background:'none',border:'none',cursor:'pointer',color: voiceListening ? '#DC2626' : '#7c3aed'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            <span style={{fontSize:'11px',fontWeight:500}}>{voiceListening ? '●' : t('voice')}</span>
          </button>
        </div>

        {/* Summary Share Popover */}
        {summaryShareOpen && (
          <>
            <div style={{position:'fixed',inset:0,zIndex:199}} onClick={() => setSummaryShareOpen(false)} />
            <div style={{position:'fixed',bottom:70,left:8,zIndex:200,background:'white',borderRadius:12,boxShadow:'0 4px 20px rgba(0,0,0,0.18)',padding:8,display:'flex',gap:8}}>
              <button title="ייצוא לאקסל" onClick={() => {
                const filtered = timeEntries.filter(e => { if (summaryFromDate && new Date(e.startDate) < new Date(summaryFromDate)) return false; if (summaryToDate && new Date(e.startDate) > new Date(summaryToDate)) return false; if (summaryClientFilter !== 'all' && e.clientId !== summaryClientFilter) return false; if (summaryStatusFilter !== 'all' && (e.billingStatus||'pending') !== summaryStatusFilter) return false; return true })
                if (filtered.length === 0) { setSummaryShareOpen(false); return }
                import('xlsx').then(XLSX => {
                  const data = filtered.map(e => { const client = clients.find(c => c.id === e.clientId); const hours = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); const amount = client ? hours * client.hourlyRate * (1 + client.vatPercent/100) : 0; return { תאריך: e.startDate, לקוח: client?.name||'', שעות: hours.toFixed(2), סכום: amount.toFixed(2), סטטוס: e.billingStatus||'pending', הערות: e.notes||'' } })
                  const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'חיובים'); XLSX.writeFile(wb, `חיובים_${new Date().toISOString().split('T')[0]}.xlsx`)
                })
                setSummaryShareOpen(false)
              }} style={{width:44,height:44,borderRadius:8,border:'none',cursor:'pointer',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><polyline points="9 14 12 17 15 14"/></svg>
              </button>
              <button title="שלח במייל" onClick={() => {
                const filtered = timeEntries.filter(e => { if (summaryFromDate && new Date(e.startDate) < new Date(summaryFromDate)) return false; if (summaryToDate && new Date(e.startDate) > new Date(summaryToDate)) return false; if (summaryClientFilter !== 'all' && e.clientId !== summaryClientFilter) return false; if (summaryStatusFilter !== 'all' && (e.billingStatus||'pending') !== summaryStatusFilter) return false; return true })
                if (filtered.length === 0) { setSummaryShareOpen(false); return }
                const totalHours = filtered.reduce((sum, e) => sum + (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60), 0)
                let totalAmount = 0; filtered.forEach(e => { const client = clients.find(c => c.id === e.clientId); if (client) { const h = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); totalAmount += h * client.hourlyRate * (1 + client.vatPercent/100) } })
                const subject = `חיובים - ${filtered.length} דיווחים`
                let body = `חיובים\n\nסה"כ שעות: ${totalHours.toFixed(2)}\nסה"כ: ₪${totalAmount.toLocaleString('he-IL', {maximumFractionDigits:0})}\n\n`
                filtered.forEach(e => { const client = clients.find(c => c.id === e.clientId); const h = (new Date(`${e.endDate}T${e.endTime}`).getTime() - new Date(`${e.startDate}T${e.startTime}`).getTime()) / (1000*60*60); body += `${e.startDate} | ${client?.name||''} | ${h.toFixed(2)} שעות\n` })
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                setSummaryShareOpen(false)
              }} style={{width:44,height:44,borderRadius:8,border:'none',cursor:'pointer',background:'#EEF2FF',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
              </button>
            </div>
          </>
        )}

        {/* Tab 3: Summary */}
        {timeTrackingTab === 'summary' && (
          <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>

            {/* Summary Filter Sheet */}
            {summaryFilterSheetOpen && (
              <>
                <div className="m-overlay" onClick={() => setSummaryFilterSheetOpen(false)} />
                <div style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0,
                  background: 'white', borderRadius: '16px 16px 0 0',
                  padding: '20px 16px 28px', zIndex: 500, maxHeight: '80vh', overflowY: 'auto'
                }}>
                  {/* Header */}
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#111827'}}>{t('filterTitle')}</div>
                    <button type="button"
                      onClick={() => { setTempSummaryClient('all'); setTempSummaryStatus('all') }}
                      style={{display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                        background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer'}}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      {t('reset')}
                    </button>
                  </div>

                  {/* Client Section */}
                  <div style={{marginBottom: 20}}>
                    <div style={{fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12}}>לקוח</div>
                    <select
                      value={tempSummaryClient}
                      onChange={e => setTempSummaryClient(e.target.value)}
                      style={{width: '100%', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: 12, fontSize: 14}}
                    >
                      <option value="all">כל הלקוחות</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Section */}
                  <div style={{marginBottom: 24}}>
                    <div style={{fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12}}>סטטוס חיוב</div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
                      {([
                        {key: 'all', label: 'הכל', color: 'white', bg: '#374151'},
                        {key: 'pending', label: '⏳ ממתין', color: '#92400e', bg: '#fef3c7'},
                        {key: 'invoiced', label: '📄 חויב', color: '#1e40af', bg: '#dbeafe'},
                        {key: 'paid', label: '✅ שולם', color: '#166534', bg: '#dcfce7'}
                      ] as {key:string,label:string,color:string,bg:string}[]).map(s => (
                        <button key={s.key} type="button"
                          onClick={() => setTempSummaryStatus(s.key)}
                          style={{
                            width: '100%', padding: '12px 10px', borderRadius: 12,
                            border: tempSummaryStatus === s.key ? `2px solid ${s.key === 'all' ? '#374151' : s.bg}` : '2px solid transparent',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                            background: tempSummaryStatus === s.key ? s.bg : '#f3f4f6',
                            color: tempSummaryStatus === s.key ? s.color : '#374151'
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bottom buttons */}
                  <div style={{display: 'flex', gap: 8}}>
                    <button type="button" onClick={() => setSummaryFilterSheetOpen(false)}
                      style={{padding: '12px 16px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer', color: '#6B7280'}}>
                      {t('cancel')}
                    </button>
                    <button type="button" onClick={() => { setSummaryClientFilter(tempSummaryClient); setSummaryStatusFilter(tempSummaryStatus); setSummaryFilterSheetOpen(false) }}
                      style={{flex: 1, padding: '12px', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: '#1d4ed8', color: 'white'}}>
                      {t('set')}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Date Picker - renders outside sheet */}
            {summaryDatePickerOpen && (
              <DateRangePicker
                startDate={summaryFromDate}
                endDate={summaryToDate}
                onChange={(s, e) => { setSummaryFromDate(s); setSummaryToDate(e); }}
                onClose={() => setSummaryDatePickerOpen(false)}
                onReset={() => { setSummaryFromDate(''); setSummaryToDate('') }}
              />
            )}
          {/* Bulk status bar - hidden, handled via label icon */}
          {false && (
            <div style={{
              position: 'sticky', bottom: 0, zIndex: 50,
              background: '#1e293b',
              borderTop: '2px solid #334155',
              padding: '10px 16px 16px',
              flexShrink: 0
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <span style={{fontSize: 13, fontWeight: 700, color: 'white'}}>
                  {selectedEntryIds.length + selectedChargeIds.length} דיווחים נבחרו
                  {selectedChargeIds.length > 0 && ` (${selectedChargeIds.length} חיובים)`}
                </span>
                <button type="button" onClick={() => { setSelectedEntryIds([]); setSelectedChargeIds([]); setBulkInvoiceNumber('') }} style={{fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer'}}>✕ בטל בחירה</button>
              </div>
              <div style={{display: 'flex', gap: 6, marginBottom: 10}}>
                <button type="button" onClick={() => {
                  setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, billingStatus: 'pending'} : e))
                  setChargeEntries(prev => prev.map(c => selectedChargeIds.includes(c.id) ? {...c, billingStatus: 'pending'} : c))
                  setSelectedEntryIds([])
                  setSelectedChargeIds([])
                  setSummaryStatusFilter('all')
                  setSuccessToast('סטטוס: ממתין לחיוב')
                  setTimeout(() => setSuccessToast(null), 2000)
                }}
                  style={{flex: 1, padding: '10px 8px', fontSize: 13, border: 'none', borderRadius: 10, background: '#451a03', color: '#fdba74', fontWeight: 700, cursor: 'pointer'}}>
                  ממתין
                </button>
                <button type="button" onClick={() => {
                  setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, billingStatus: 'invoiced'} : e))
                  setChargeEntries(prev => prev.map(c => selectedChargeIds.includes(c.id) ? {...c, billingStatus: 'invoiced'} : c))
                  setSelectedEntryIds([])
                  setSelectedChargeIds([])
                  setSummaryStatusFilter('all')
                  setSuccessToast('סטטוס: חויב')
                  setTimeout(() => setSuccessToast(null), 2000)
                }}
                  style={{flex: 1, padding: '10px 8px', fontSize: 13, border: 'none', borderRadius: 10, background: '#1e3a8a', color: '#bfdbfe', fontWeight: 700, cursor: 'pointer'}}>
                  חויב
                </button>
                <button type="button" onClick={() => {
                  setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, billingStatus: 'paid'} : e))
                  setChargeEntries(prev => prev.map(c => selectedChargeIds.includes(c.id) ? {...c, billingStatus: 'paid'} : c))
                  setSelectedEntryIds([])
                  setSelectedChargeIds([])
                  setSummaryStatusFilter('all')
                  setSuccessToast('סטטוס: שולם')
                  setTimeout(() => setSuccessToast(null), 2000)
                }}
                  style={{flex: 1, padding: '10px 8px', fontSize: 13, border: 'none', borderRadius: 10, background: '#14532d', color: '#bbf7d0', fontWeight: 700, cursor: 'pointer'}}>
                  שולם
                </button>
              </div>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6}}>מספר חשבונית (מרוכז)</label>
              <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="לדוגמה: 2026001"
                value={bulkInvoiceNumber}
                onChange={e => setBulkInvoiceNumber(e.target.value)}
                style={{width: '100%', padding: '10px 12px', fontSize: 14, border: 'none', borderRadius: 8, background: '#334155', color: 'white', outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const}} />
              <button type="button" onClick={() => {
                if (!bulkInvoiceNumber.trim()) return
                const n = selectedEntryIds.length + selectedChargeIds.length
                setTimeEntries(prev => prev.map(e => selectedEntryIds.includes(e.id) ? {...e, invoiceNumber: bulkInvoiceNumber.trim(), billingStatus: e.billingStatus === 'paid' ? 'paid' : 'invoiced'} : e))
                setChargeEntries(prev => prev.map(c => selectedChargeIds.includes(c.id) ? {...c, invoiceNumber: bulkInvoiceNumber.trim(), billingStatus: c.billingStatus === 'paid' ? 'paid' : 'invoiced'} : c))
                setBulkInvoiceNumber('')
                setSelectedEntryIds([])
                setSelectedChargeIds([])
                setSummaryStatusFilter('all')
                setSuccessToast(`נשמרה חשבונית ל-${n} דיווחים`)
                setTimeout(() => setSuccessToast(null), 2000)
              }}
                disabled={!bulkInvoiceNumber.trim()}
                style={{
                  width: '100%', padding: '12px 16px', fontSize: 15, border: 'none', borderRadius: 10,
                  background: bulkInvoiceNumber.trim() ? '#7c3aed' : '#475569', color: 'white', fontWeight: 700, cursor: bulkInvoiceNumber.trim() ? 'pointer' : 'not-allowed', opacity: bulkInvoiceNumber.trim() ? 1 : 0.7
                }}>
                שמור מספר חשבונית
              </button>
            </div>
          )}
          <div
            ref={summaryScrollRef}
            onScroll={() => { if (summaryScrollRef.current) summaryScrollPos.current = summaryScrollRef.current.scrollTop }}
            style={{flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: 100}}
          >
            {(() => {
              const clientIds = new Set(clients.map(c => c.id))
              // Filter time entries
              const filteredTimeEntries = timeEntries.filter(e => {
                if (!clientIds.has(e.clientId)) return false
                const entryDate = new Date(e.startDate)
                const from = summaryFromDate ? new Date(summaryFromDate) : null
                const to = summaryToDate ? new Date(summaryToDate) : null
                
                if (from && entryDate < from) return false
                if (to && entryDate > to) return false
                if (summaryClientFilter !== 'all' && e.clientId !== summaryClientFilter) return false
                if (summaryStatusFilter !== 'all' && (e.billingStatus || 'pending') !== summaryStatusFilter) return false
                
                return true
              })

              // Filter charge entries by same criteria
              const filteredChargeEntries = chargeEntries.filter(c => {
                if (!clientIds.has(c.clientId)) return false
                const chargeDate = new Date(c.date)
                const from = summaryFromDate ? new Date(summaryFromDate) : null
                const to = summaryToDate ? new Date(summaryToDate) : null
                
                if (from && chargeDate < from) return false
                if (to && chargeDate > to) return false
                if (summaryClientFilter !== 'all' && c.clientId !== summaryClientFilter) return false
                if (summaryStatusFilter !== 'all' && (c.billingStatus || 'pending') !== summaryStatusFilter) return false
                
                return true
              })

              // Calculate totals including charges
              const totalHours = filteredTimeEntries.reduce((sum, e) => sum + calculateHours(e), 0)
              let totalAmount = 0
              filteredTimeEntries.forEach(e => {
                const client = clients.find(c => c.id === e.clientId)
                if (client) totalAmount += calculateHours(e) * client.hourlyRate * (1 + client.vatPercent / 100)
              })
              // Add charge amounts
              filteredChargeEntries.forEach(c => { totalAmount += c.amount })

              // Selected entries totals (both time entries and charges can be selected)
              const selectedEntries = selectedEntryIds.length > 0 ? filteredTimeEntries.filter(e => selectedEntryIds.includes(e.id)) : []
              const selHours = selectedEntries.reduce((sum, e) => sum + calculateHours(e), 0)
              let selAmount = 0
              selectedEntries.forEach(e => {
                const client = clients.find(c => c.id === e.clientId)
                if (client) selAmount += calculateHours(e) * client.hourlyRate * (1 + client.vatPercent / 100)
              })

              const cardHours = (selectedEntryIds.length > 0 || selectedChargeIds.length > 0) ? selHours : totalHours
              const cardAmount = (selectedEntryIds.length > 0 || selectedChargeIds.length > 0) ? selAmount + selectedChargeIds.reduce((sum, id) => {
                const charge = filteredChargeEntries.find(c => c.id === id)
                return sum + (charge?.amount || 0)
              }, 0) : totalAmount
              const cardLabel = (selectedEntryIds.length > 0 || selectedChargeIds.length > 0) ? `נבחרו ${selectedEntryIds.length + selectedChargeIds.length}` : 'סה"כ'

              // Merge time entries and charges chronologically
              const mergedItems = [
                ...filteredTimeEntries.map(e => ({ type: 'entry' as const, data: e, sortKey: `${e.startDate}T${e.startTime}` })),
                ...filteredChargeEntries.map(c => ({ type: 'charge' as const, data: c, sortKey: c.date }))
              ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

              // Find first and last dates
              const allDates = [...filteredTimeEntries.map(e => e.startDate), ...filteredChargeEntries.map(c => c.date)]
              const sortedDates = allDates.sort()
              const firstDate = sortedDates[0]
              const lastDate = sortedDates[sortedDates.length - 1]

              // Keep refs updated for header select-all
              summaryVisibleEntryIds.current = filteredTimeEntries.map(e => e.id)
              summaryVisibleChargeIds.current = filteredChargeEntries.map(c => c.id)

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


                  {/* Compact Entries List */}
                  {mergedItems.length > 0 && (
                    <div style={{background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginTop: 8}}>
                      {mergedItems.map((item, idx, arr) => {
                        if (item.type === 'entry') {
                          const entry = item.data
                          const client = clients.find(c => c.id === entry.clientId)
                          if (!client) return null
                          const hours = calculateHours(entry)
                          const amount = hours * client.hourlyRate * (1 + client.vatPercent / 100)
                          const status = entry.billingStatus || 'pending'
                          const statusColor = status === 'paid' ? '#10b981' : status === 'invoiced' ? '#3b82f6' : '#f59e0b'
                          const isSelected = selectedEntryIds.includes(entry.id)
                          const inSelectMode = selectedEntryIds.length > 0 || selectedChargeIds.length > 0
                          const toggleSelect = () => setSelectedEntryIds(prev => prev.includes(entry.id) ? prev.filter(i => i !== entry.id) : [...prev, entry.id])
                          const openEdit = () => {
                            setEntryFormStartDate(entry.startDate)
                            setEntryFormEndDate(entry.endDate)
                            setEntryFormStartTime(entry.startTime)
                            setEntryFormEndTime(entry.endTime)
                            setEntryFormNotes(entry.notes || '')
                            setEntryFormEmployeeId(entry.employeeId || 'self')
                            setEntryFormClientId(entry.clientId)
                            setEditEntryId(entry.id)
                            setAddTimeEntryOpen(true)
                          }
                          const isSwiped = swipedEntryId === entry.id
                          return (
                            <div key={entry.id} style={{position: 'relative', overflow: 'hidden', borderBottom: '1px solid #E5E7EB'}}>
                            {/* Swipe action backdrop */}
                            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start'}}>
                              <button onClick={() => { setTimeEntries(prev => prev.map(e => e.id === entry.id ? {...e, billingStatus: 'pending'} : e)); setSwipedEntryId(null) }}
                                style={{width: 72, background: '#f59e0b', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2}}>
                                <span style={{fontSize: 18}}>⏳</span>ממתין
                              </button>
                              <button onClick={() => { setTimeEntries(prev => prev.map(e => e.id === entry.id ? {...e, billingStatus: 'invoiced'} : e)); setSwipedEntryId(null) }}
                                style={{width: 72, background: '#3b82f6', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2}}>
                                <span style={{fontSize: 18}}>📄</span>חויב
                              </button>
                              <button onClick={() => { setTimeEntries(prev => prev.map(e => e.id === entry.id ? {...e, billingStatus: 'paid'} : e)); setSwipedEntryId(null) }}
                                style={{width: 72, background: '#10b981', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2}}>
                                <span style={{fontSize: 18}}>✅</span>שולם
                              </button>
                            </div>
                            {/* Row */}
                            <div
                              onClick={() => {
                                if (isSwiped) { setSwipedEntryId(null); return }
                                if (longPressFiredRef.current) { longPressFiredRef.current = false; return }
                                toggleSelect()
                              }}
                              onTouchStart={(e) => {
                                swipeTouchStartX.current = e.touches[0].clientX
                                swipeTouchStartY.current = e.touches[0].clientY
                                if (!isSwiped) startLongPress(toggleSelect)
                              }}
                              onTouchMove={(e) => {
                                const dx = e.touches[0].clientX - swipeTouchStartX.current
                                const dy = e.touches[0].clientY - swipeTouchStartY.current
                                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                                  cancelLongPress()
                                  if (dx < -30) setSwipedEntryId(entry.id)
                                  else if (dx > 30 && isSwiped) setSwipedEntryId(null)
                                }
                              }}
                              onTouchEnd={cancelLongPress}
                              onTouchCancel={cancelLongPress}
                              onContextMenu={(e) => { e.preventDefault(); toggleSelect() }}
                              style={{
                                padding: '14px 16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: isSelected ? '#EFF6FF' : 'white',
                                cursor: 'pointer',
                                transform: isSwiped ? 'translateX(216px)' : 'translateX(0)',
                                transition: 'transform 0.2s ease',
                                position: 'relative', zIndex: 1
                              }}
                            >
                            <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
                              <div onClick={e => { e.stopPropagation(); toggleSelect() }} style={{width: 22, height: 22, borderRadius: '50%', border: isSelected ? 'none' : '2px solid #D1D5DB', background: isSelected ? '#1d4ed8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0}}>{isSelected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}</div>
                              <span style={{width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0}} />
                              {entry.employeeId && (
                                <span style={{width: 8, height: 8, borderRadius: '50%', background: entry.employeePaidStatus === 'paid' ? '#8b5cf6' : '#cbd5e1', flexShrink: 0, marginLeft: -2}} title="עובד" />
                              )}
                              <div style={{minWidth: 0}}>
                                <div style={{fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                  {client.name}
                                </div>
                                <div style={{fontSize: 13, color: '#374151', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4}}>
                                  <span style={{fontSize: 15, fontWeight: 700, color: '#374151'}}>{new Date(entry.startDate).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit', year: '2-digit'})}</span>
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
                              <div style={{fontSize: 14, color: '#6B7280', fontWeight: 600}}>{hours.toFixed(1)}h</div>
                            </div>
                          </div>
                          </div>
                          )
                        } else {
                          // Charge entry
                          const charge = item.data
                          const client = clients.find(c => c.id === charge.clientId)
                          if (!client) return null
                          const tag = chargeTags.find(t => t.id === charge.tagId)
                          const status = charge.billingStatus || 'pending'
                          const statusColor = status === 'paid' ? '#10b981' : status === 'invoiced' ? '#3b82f6' : '#f59e0b'
                          const isChargeSelected = selectedChargeIds.includes(charge.id)
                          const inSelectMode = selectedEntryIds.length > 0 || selectedChargeIds.length > 0
                          const toggleChargeSelect = () => setSelectedChargeIds(prev => prev.includes(charge.id) ? prev.filter(i => i !== charge.id) : [...prev, charge.id])
                          const openChargeEdit = () => {
                            setChargeFormClientId(charge.clientId)
                            setChargeFormDate(charge.date)
                            setChargeFormAmount(String(charge.amount))
                            setChargeFormTagId(charge.tagId)
                            setChargeFormNotes(charge.notes || '')
                            setChargeFormEmployeeId(charge.employeeId || 'self')
                            setEditChargeId(charge.id)
                            setAddChargeOpen(true)
                          }
                          return (
                            <div key={charge.id}
                              onClick={() => { toggleChargeSelect() }}
                              style={{
                                padding: '14px 16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #E5E7EB',
                                cursor: 'pointer',
                                background: isChargeSelected ? '#F5F3FF' : '#faf5ff'
                              }}
                            >
                              <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
                                <div onClick={e => { e.stopPropagation(); toggleChargeSelect() }} style={{width: 22, height: 22, borderRadius: '50%', border: isChargeSelected ? 'none' : '2px solid #D1D5DB', background: isChargeSelected ? '#8b5cf6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0}}>{isChargeSelected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}</div>
                                <span style={{width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0}} />
                                <div style={{minWidth: 0}}>
                                  <div style={{fontSize: 14, fontWeight: 600, color: '#7c3aed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                    {client.name} • {tag?.name || charge.tagId}
                                  </div>
                                  <div style={{fontSize: 13, color: '#6B7280', marginTop: 4}}>
                                    {new Date(charge.date).toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit', year: '2-digit'})}
                                    <span style={{marginRight: 8, padding: '2px 6px', borderRadius: 4, background: status === 'paid' ? '#dcfce7' : status === 'invoiced' ? '#dbeafe' : '#fef3c7', color: status === 'paid' ? '#166534' : status === 'invoiced' ? '#1e40af' : '#92400e', fontSize: 11, fontWeight: 600}}>
                                      {status === 'paid' ? 'שולם' : status === 'invoiced' ? 'חויב' : 'ממתין'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div style={{textAlign: 'left', marginLeft: 8}}>
                                <div style={{fontSize: 15, fontWeight: 700, color: '#7c3aed'}}>
                                  ₪{charge.amount.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                                </div>
                                <div style={{fontSize: 11, color: '#9CA3AF'}}>חיוב</div>
                              </div>
                            </div>
                          )
                        }
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
  const DateRangePicker = ({ startDate, endDate, onChange, onClose, onReset }: {
    startDate: string
    endDate: string
    onChange: (start: string, end: string) => void
    onClose: () => void
    onReset?: () => void
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
    const rawFirstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
    const firstDayOfWeek = lang === 'he' ? rawFirstDay : (rawFirstDay + 6) % 7 // Mon-first for English

    const monthNames = lang === 'he'
      ? ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
      : ['January','February','March','April','May','June','July','August','September','October','November','December']
    const dayNames = lang === 'he'
      ? ['א','ב','ג','ד','ה','ו','ש'] // Sun,Mon,...,Sat
      : ['Mo','Tu','We','Th','Fr','Sa','Su'] // Mon,...,Sun

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

    // Build calendar grid – always 42 cells (6 rows × 7 cols) so height is fixed
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length < 42) cells.push(null)

    return (
      <>
        <div className="m-overlay" onClick={onClose} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'white', borderRadius: '16px 16px 0 0',
          padding: '16px', zIndex: 500, maxHeight: '80vh', overflowY: 'auto'
        }}>
          {/* Header - Month and Year */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
            <button onClick={prevMonth} style={{border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 10px', color: '#374151'}}>‹</button>
            <div style={{fontWeight: 700, fontSize: 16}}>{monthNames[viewMonth]} {viewYear}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
              {onReset && (
                <button onClick={() => { onReset(); onClose() }} title="איפוס סינון תאריך"
                  style={{display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8,
                    background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer'}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  {t('reset')}
                </button>
              )}
              <button onClick={nextMonth} style={{border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 10px', color: '#374151'}}>›</button>
            </div>
          </div>

          {/* Quick period buttons */}
          <div style={{display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center'}}>
            <button onClick={() => { const today = new Date(); onChange(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()), toDateStr(today.getFullYear(), today.getMonth(), today.getDate())); onClose(); }} style={{padding: '6px 12px', borderRadius: 16, border: '1px solid #D1D5DB', background: '#F3F4F6', fontSize: 13, cursor: 'pointer'}}>{t('dpToday')}</button>
            <button onClick={() => { const today = new Date(); const start = new Date(today); const day = today.getDay(); start.setDate(today.getDate() - (lang === 'he' ? day : (day === 0 ? 6 : day - 1))); const end = new Date(start); end.setDate(start.getDate() + 6); onChange(toDateStr(start.getFullYear(), start.getMonth(), start.getDate()), toDateStr(end.getFullYear(), end.getMonth(), end.getDate())); onClose(); }} style={{padding: '6px 12px', borderRadius: 16, border: '1px solid #D1D5DB', background: '#F3F4F6', fontSize: 13, cursor: 'pointer'}}>{t('dpThisWeek')}</button>
            <button onClick={() => { const today = new Date(); onChange(toDateStr(today.getFullYear(), today.getMonth(), 1), toDateStr(today.getFullYear(), today.getMonth() + 1, 0)); onClose(); }} style={{padding: '6px 12px', borderRadius: 16, border: '1px solid #D1D5DB', background: '#F3F4F6', fontSize: 13, cursor: 'pointer'}}>{t('dpThisMonth')}</button>
            <button onClick={() => { const today = new Date(); onChange(toDateStr(today.getFullYear(), 0, 1), toDateStr(today.getFullYear(), 11, 31)); onClose(); }} style={{padding: '6px 12px', borderRadius: 16, border: '1px solid #D1D5DB', background: '#F3F4F6', fontSize: 13, cursor: 'pointer'}}>{t('dpThisYear')}</button>
          </div>

          {/* Instructions */}
          <div style={{textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 12}}>
            {picking === 'start'
              ? t('dpPickStart')
              : tempStart === tempEnd
                ? (tt[lang].dpSelectedSingle as (d:string)=>string)(new Date(tempStart).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {day:'2-digit',month:'2-digit',year:'numeric'}))
                : (tt[lang].dpRange as (s:string,e:string)=>string)(new Date(tempStart).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {day:'2-digit',month:'2-digit'}), new Date(tempEnd).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {day:'2-digit',month:'2-digit',year:'numeric'}))
            }
          </div>

          {/* Day names */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4}}>
            {dayNames.map(d => (
              <div key={d} style={{textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: 600, padding: '4px 0'}}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '40px', gap: 2}}>
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
                    padding: '0 4px',
                    border: start || end ? 'none' : toDateStr(viewYear, viewMonth, d) === todayStr ? '2px solid #9CA3AF' : 'none',
                    borderRadius: start || end ? '50%' : inRange ? '0' : '50%',
                    background: start || end ? '#1d4ed8' : inRange ? '#dbeafe' : 'transparent',
                    color: start || end ? 'white' : inRange ? '#1e40af' : '#111827',
                    fontWeight: start || end ? 700 : toDateStr(viewYear, viewMonth, d) === todayStr ? 600 : 400,
                    fontSize: 15,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%'
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
                ? t('set')
                : tempStart === tempEnd
                  ? `${t('set')} · ${new Date(tempStart).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {day:'2-digit', month:'2-digit'})}`
                  : `${t('set')} · ${new Date(tempStart).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {day:'2-digit', month:'2-digit'})} – ${new Date(tempEnd).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {day:'2-digit', month:'2-digit'})}`
              }
            </button>
          </div>
        </div>
      </>
    )
  }

  // Analog Clock Picker - 4 steps: start-hour → start-min → end-hour → end-min
  const TimeRangePicker = ({ startTime, endTime, onChange, onClose, initialStep, singleMode }: {
    startTime: string
    endTime: string
    onChange: (start: string, end: string) => void
    onClose: () => void
    initialStep?: 'startH' | 'startM' | 'endH' | 'endM'
    singleMode?: 'start' | 'end'
  }) => {
    // step: 'startH' | 'startM' | 'endH' | 'endM'
    const [step, setStep] = useState<'startH' | 'startM' | 'endH' | 'endM'>(singleMode === 'end' ? 'endH' : (initialStep || 'startH'))
    const [startH, setStartH] = useState<number | null>(null)
    const [startM, setStartM] = useState<number | null>(null)
    const [endH, setEndH] = useState<number | null>(null)
    const pad = (n: number) => String(n).padStart(2, '0')
    // Fix size once on mount — never recalculate on step change
    const clockSizeRef = useRef(Math.min(window.innerWidth - 32, 340))

    // Initialize from existing values
    useEffect(() => {
      if (startTime) {
        const [h, m] = startTime.split(':').map(Number)
        setStartH(h)
        setStartM(m)
      }
      if (endTime) {
        const [h, m] = endTime.split(':').map(Number)
        setEndH(h)
      }
    }, [startTime, endTime])

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
      else if (step === 'startM') {
        if (singleMode === 'start') {
          onChange(`${pad(startH!)}:${pad(val)}`, endTime)
          onClose()
        } else {
          setStartM(val); setStep('endH')
        }
      }
      else if (step === 'endH') { setEndH(val); setStep('endM') }
      else {
        const s = `${pad(startH!)}:${pad(startM!)}`
        const e = `${pad(endH!)}:${pad(val)}`
        onChange(s, e)
        onClose()
      }
    }

    const stepLabel = step === 'startH' ? 'שעת התחלה' : step === 'startM' ? `התחלה ${pad(startH!)} — דקות` : step === 'endH' ? (singleMode === 'end' ? 'שעת סיום' : `התחלה ${pad(startH!)}:${pad(startM!)} — שעת סיום`) : `סיום ${pad(endH!)} — דקות`

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

          {step !== 'startH' && !(singleMode === 'end' && step === 'endH') && (
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
    const nameRef = useRef<HTMLInputElement>(null)
    const rateRef = useRef<HTMLInputElement>(null)
    const vatRef = useRef<HTMLInputElement>(null)
    const taxRef = useRef<HTMLInputElement>(null)
    const [liveRate, setLiveRate] = useState(parseFloat(clientFormRate) || 0)
    const [liveVat, setLiveVat] = useState(parseFloat(clientFormVat) || 18)
    const [liveTax, setLiveTax] = useState(parseFloat(clientFormIncomeTax) || 30)

    const save = () => {
      const name = nameRef.current?.value?.trim() || ''
      const rate = rateRef.current?.value?.trim() || ''
      const vat = vatRef.current?.value?.trim() || '18'
      const tax = taxRef.current?.value?.trim() || '30'
      if (!name || !rate) {
        alert('נא למלא שם ותעריף')
        return
      }
      
      if (editClientId) {
        setClients(prev => prev.map(c => 
          c.id === editClientId 
            ? {
                ...c,
                name,
                hourlyRate: parseFloat(rate),
                vatPercent: parseFloat(vat),
                incomeTaxPercent: parseFloat(tax)
              }
            : c
        ))
      } else {
        const client: Client = {
          id: Date.now().toString(),
          name,
          hourlyRate: parseFloat(rate),
          vatPercent: parseFloat(vat),
          incomeTaxPercent: parseFloat(tax)
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
            <h2>{editClientId ? t('editClient') : t('newClient')}</h2>
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
            <label>{t('clientName')}</label>
            <input 
              ref={nameRef}
              type="text"
              defaultValue={clientFormName}
              onBlur={e => setClientFormName(e.target.value)}
              placeholder={t('clientNamePlaceholder')}
              autoFocus
            />
          </div>

          <div className="m-mortgage-field">
            <label>{t('hourlyRate')}</label>
            <input 
              ref={rateRef}
              type="number"
              inputMode="numeric"
              defaultValue={clientFormRate}
              onBlur={e => setClientFormRate(e.target.value)}
              placeholder="100"
            />
          </div>

          <div className="m-mortgage-field">
            <label>{t('vatPct')}</label>
            <input 
              ref={vatRef}
              type="number"
              inputMode="decimal"
              defaultValue={clientFormVat}
              onBlur={e => setClientFormVat(e.target.value)}
              placeholder="18"
            />
          </div>

          <div className="m-mortgage-field">
            <label>{t('incomeTaxPct')}</label>
            <input 
              ref={taxRef}
              type="number"
              inputMode="decimal"
              defaultValue={clientFormIncomeTax}
              onBlur={e => setClientFormIncomeTax(e.target.value)}
              placeholder="30"
            />
          </div>

          <div className="m-mortgage-field">
            <label>{t('netPerHour')}</label>
            <div style={{fontSize: 20, fontWeight: 600, color: '#15803D'}}>
              ₪{netPerHour.toFixed(2)}
            </div>
            <div style={{fontSize: 12, color: '#6B7280', marginTop: 1}}>
              {(tt[lang].calcBreakdown as (r:number,v:number,g:string,tax:number)=>string)(rate, vat, grossPerHour.toFixed(2), incomeTax)}
            </div>
          </div>

          <button type="button" className="m-mortgage-calc-btn" onMouseDown={e => e.preventDefault()} onClick={save}>
            {editClientId ? t('updateClient') : t('saveClient')}
          </button>
          
          {editClientId && (
            <button 
              onClick={() => {
                if (confirm(t('deleteClientConfirm'))) {
                  setClients(prev => prev.filter(c => c.id !== editClientId))
                  setTimeEntries(prev => prev.filter(e => e.clientId !== editClientId))
                  setChargeEntries(prev => prev.filter(e => e.clientId !== editClientId))
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

  // Add / Edit Charge Modal
  const AddChargeModal = () => {
    if (!addChargeOpen) return null
    const [newTagName, setNewTagName] = useState('')
    const [showNewTag, setShowNewTag] = useState(false)
    const [editingTagId, setEditingTagId] = useState<string | null>(null)
    const [editingTagName, setEditingTagName] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{client?: boolean, date?: boolean, amount?: boolean, tag?: boolean}>({})

    const save = () => {
      const errors: typeof fieldErrors = {}
      if (!chargeFormClientId) errors.client = true
      if (!chargeFormDate) errors.date = true
      if (!chargeFormAmount || isNaN(parseFloat(chargeFormAmount))) errors.amount = true
      if (!chargeFormTagId) errors.tag = true
      if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }

      const entry: ChargeEntry = {
        id: editChargeId || Date.now().toString(),
        clientId: chargeFormClientId,
        date: chargeFormDate,
        amount: parseFloat(chargeFormAmount),
        tagId: chargeFormTagId,
        notes: chargeFormNotes || undefined,
        billingStatus: 'pending',
        employeeId: chargeFormEmployeeId === 'self' ? undefined : chargeFormEmployeeId,
      }
      if (editChargeId) {
        setChargeEntries(prev => prev.map(e => e.id === editChargeId ? entry : e))
      } else {
        setChargeEntries(prev => [...prev, entry])
      }
      setAddChargeOpen(false); setEditChargeId(null)
      setChargeFormClientId(''); setChargeFormDate(''); setChargeFormAmount(''); setChargeFormTagId(''); setChargeFormNotes(''); setChargeFormEmployeeId('self')
    }

    const addTag = () => {
      const name = newTagName.trim()
      if (!name) return
      const id = Date.now().toString()
      setChargeTags(prev => [...prev, { id, name }])
      setChargeFormTagId(id)
      setNewTagName(''); setShowNewTag(false)
    }

    return (
      <>
        <div className="m-overlay" onClick={() => { setAddChargeOpen(false); setEditChargeId(null) }} />
        <div className="m-top-sheet" style={{maxHeight: '90vh', overflowY: 'auto'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <h2 style={{fontSize: 18, fontWeight: 700, margin: 0}}>{editChargeId ? 'עריכת חיוב' : 'חיוב חד-פעמי'}</h2>
            <button onClick={() => { setAddChargeOpen(false); setEditChargeId(null) }} style={{background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280'}}>✕</button>
          </div>

          {/* Client */}
          <div style={{marginBottom: 14}}>
            <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>לקוח {fieldErrors.client && <span style={{color: '#ef4444'}}>*</span>}</div>
            <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
              {clients.map(c => (
                <button key={c.id} onClick={() => setChargeFormClientId(c.id)}
                  style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: chargeFormClientId === c.id ? '#1d4ed8' : '#F3F4F6',
                    color: chargeFormClientId === c.id ? 'white' : '#374151'}}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Employee who made the expense */}
          <div style={{marginBottom: 14}}>
            <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>מי ביצע את ההוצאה</div>
            <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
              <button onClick={() => setChargeFormEmployeeId('self')}
                style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: chargeFormEmployeeId === 'self' ? '#8b5cf6' : '#F3F4F6',
                  color: chargeFormEmployeeId === 'self' ? 'white' : '#374151'}}>
                עצמי (בעלים)
              </button>
              {employees.map(emp => (
                <button key={emp.id} onClick={() => setChargeFormEmployeeId(emp.id)}
                  style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: chargeFormEmployeeId === emp.id ? '#8b5cf6' : '#F3F4F6',
                    color: chargeFormEmployeeId === emp.id ? 'white' : '#374151'}}>
                  {emp.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div style={{marginBottom: 14}}>
            <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>תאריך {fieldErrors.date && <span style={{color: '#ef4444'}}>*</span>}</div>
            <input type="date" defaultValue={chargeFormDate} onBlur={e => setChargeFormDate(e.target.value)}
              style={{width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, outline: 'none'}} />
          </div>

          {/* Amount */}
          <div style={{marginBottom: 14}}>
            <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>סכום ₪ {fieldErrors.amount && <span style={{color: '#ef4444'}}>*</span>}</div>
            <input type="number" inputMode="decimal" placeholder="0" defaultValue={chargeFormAmount} onBlur={e => setChargeFormAmount(e.target.value)}
              style={{width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, outline: 'none'}} />
          </div>

          {/* Tag */}
          <div style={{marginBottom: 14}}>
            <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>
              סוג חיוב {fieldErrors.tag && <span style={{color: '#ef4444'}}>*</span>}
            </div>
            <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6}}>
              {chargeTags.map(tag => (
                editingTagId === tag.id ? (
                  <div key={tag.id} style={{display: 'flex', gap: 4, alignItems: 'center'}}>
                    <input value={editingTagName} onChange={e => setEditingTagName(e.target.value)}
                      style={{padding: '4px 8px', border: '1px solid #c4b5fd', borderRadius: 8, fontSize: 13, outline: 'none', width: 90}} />
                    <button onClick={() => { if (editingTagName.trim()) { setChargeTags(prev => prev.map(t => t.id === tag.id ? {...t, name: editingTagName.trim()} : t)); setEditingTagId(null) } }}
                      style={{padding: '4px 8px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer'}}>✓</button>
                    <button onClick={() => { if (confirm('למחוק תיוג זה?')) { setChargeTags(prev => prev.filter(t => t.id !== tag.id)); if (chargeFormTagId === tag.id) setChargeFormTagId(''); setEditingTagId(null) } }}
                      style={{padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer'}}>✕</button>
                  </div>
                ) : (
                  <div key={tag.id} style={{display: 'flex', alignItems: 'center', gap: 2}}>
                    <button onClick={() => setChargeFormTagId(tag.id)}
                      style={{padding: '6px 10px', borderRadius: '16px 0 0 16px', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: chargeFormTagId === tag.id ? '#7c3aed' : '#F3F4F6',
                        color: chargeFormTagId === tag.id ? 'white' : '#374151'}}>
                      {tag.name}
                    </button>
                    <button onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name) }}
                      style={{padding: '6px 6px', borderRadius: '0 16px 16px 0', border: 'none', fontSize: 11, cursor: 'pointer',
                        background: chargeFormTagId === tag.id ? '#6d28d9' : '#e5e7eb',
                        color: chargeFormTagId === tag.id ? 'white' : '#6B7280'}}>✎</button>
                  </div>
                )
              ))}
              <button onClick={() => setShowNewTag(v => !v)}
                style={{padding: '6px 12px', borderRadius: 16, border: '1px dashed #c4b5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#7c3aed'}}>
                + חדש
              </button>
            </div>
            {showNewTag && (
              <div style={{display: 'flex', gap: 6}}>
                <input placeholder="שם תיוג חדש" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                  style={{flex: 1, padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none'}} />
                <button onClick={addTag}
                  style={{padding: '8px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'}}>הוסף</button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{marginBottom: 14}}>
            <input placeholder="הערה (אופציונלי)" defaultValue={chargeFormNotes} onBlur={e => setChargeFormNotes(e.target.value)}
              style={{width: '100%', border: 'none', borderBottom: '1px solid #E5E7EB', padding: '8px 0', fontSize: 15, background: 'none', outline: 'none'}} />
          </div>

          {editChargeId && (
            <button onClick={() => { if (confirm('למחוק חיוב זה?')) { setChargeEntries(prev => prev.filter(e => e.id !== editChargeId)); setAddChargeOpen(false); setEditChargeId(null) } }}
              style={{width: '100%', padding: '12px', marginBottom: 10, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer'}}>
              מחק חיוב
            </button>
          )}

          <div style={{display: 'flex', gap: 10}}>
            <button onClick={() => { setAddChargeOpen(false); setEditChargeId(null) }}
              style={{flex: 1, padding: '14px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#6B7280'}}>
              {t('cancel')}
            </button>
            <button type="button" className="m-mortgage-calc-btn" onClick={save} style={{flex: 2, margin: 0}}>
              {editChargeId ? t('update') : t('save')} ✓
            </button>
          </div>
        </div>
      </>
    )
  }

  // Quick Time Entry Modal (from main screen)
  const QuickTimeEntryModal = () => {
    if (!quickTimeEntryOpen) return null
    const [fieldErrors, setFieldErrors] = useState<{client?: boolean, date?: boolean, time?: boolean}>({})
    const [chargeErrors, setChargeErrors] = useState<{client?: boolean, date?: boolean, amount?: boolean, tag?: boolean}>({})
    const activeTab = quickEntryActiveTab
    const setActiveTab = setQuickEntryActiveTab
    const [localNewTagName, setLocalNewTagName] = useState('')
    const [localShowNewTag, setLocalShowNewTag] = useState(false)

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
    } catch (e) {}

    const closeModal = () => {
      setQuickTimeEntryOpen(false)
      setEntryFormStartDate(''); setEntryFormEndDate('')
      setEntryFormStartTime(''); setEntryFormEndTime('')
      setEntryFormNotes(''); setEntryFormEmployeeId('self')
      setQuickTimeClientId('')
    }

    const saveHourly = () => {
      const errors: {client?: boolean, date?: boolean, time?: boolean} = {}
      if (!quickTimeClientId) errors.client = true
      if (!entryFormStartDate || !entryFormEndDate) errors.date = true
      if (!entryFormStartTime || !entryFormEndTime) errors.time = true
      if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
      setFieldErrors({})
      const entry: TimeEntry = {
        id: Date.now().toString(),
        clientId: quickTimeClientId,
        employeeId: entryFormEmployeeId === 'self' ? undefined : entryFormEmployeeId,
        startDate: entryFormStartDate, endDate: entryFormEndDate,
        startTime: entryFormStartTime, endTime: entryFormEndTime,
        notes: entryFormNotes
      }
      setTimeEntries(prev => [...prev, entry])
      closeModal()
    }

    const saveCharge = () => {
      const errors: {client?: boolean, date?: boolean, amount?: boolean, tag?: boolean} = {}
      if (!chargeFormClientId) errors.client = true
      if (!chargeFormDate) errors.date = true
      if (!chargeFormAmount || isNaN(parseFloat(chargeFormAmount))) errors.amount = true
      if (!chargeFormTagId) errors.tag = true
      if (Object.keys(errors).length > 0) { setChargeErrors(errors); return }
      setChargeErrors({})
      const entry: ChargeEntry = {
        id: Date.now().toString(),
        clientId: chargeFormClientId, date: chargeFormDate,
        amount: parseFloat(chargeFormAmount), tagId: chargeFormTagId,
        notes: chargeFormNotes || undefined, billingStatus: 'pending',
        employeeId: chargeFormEmployeeId !== 'self' ? chargeFormEmployeeId : undefined
      }
      setChargeEntries(prev => [...prev, entry])
      setChargeFormClientId(''); setChargeFormDate(''); setChargeFormAmount('')
      setChargeFormTagId(''); setChargeFormNotes(''); setChargeFormEmployeeId('self')
      closeModal()
    }

    return (
      <>
        <div className="m-overlay" onClick={closeModal} />
        <div className="m-top-sheet">
          <div style={{display:'flex', justifyContent:'flex-end', marginBottom:4}}>
            <button className="m-close-btn" onClick={closeModal}>✕</button>
          </div>

          {/* Tab bar */}
          <div style={{display:'flex', marginBottom:16, borderBottom:'2px solid #E5E7EB'}}>
            <button onClick={() => setActiveTab('hourly')} style={{flex:1, padding:'10px 0', border:'none', background:'none', fontSize:15, fontWeight:activeTab==='hourly'?700:500, color:activeTab==='hourly'?'#1d4ed8':'#9CA3AF', borderBottom:activeTab==='hourly'?'3px solid #1d4ed8':'3px solid transparent', marginBottom:-2, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              שעתי
            </button>
            <button onClick={() => setActiveTab('charge')} style={{flex:1, padding:'10px 0', border:'none', background:'none', fontSize:15, fontWeight:activeTab==='charge'?700:500, color:activeTab==='charge'?'#10b981':'#9CA3AF', borderBottom:activeTab==='charge'?'3px solid #10b981':'3px solid transparent', marginBottom:-2, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              כספי
            </button>
          </div>

          {activeTab === 'hourly' && (
            <>
              {!selectedClientId && (
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
              )}
              <div style={{borderTop: '1px solid #F3F4F6', margin: '12px 0'}} />
              <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
                <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>{t('startLabel')}</div>
                <button onClick={() => setDatePickerOpen(true)} style={{flex: 1, textAlign: 'right', border: 'none', background: 'none', fontSize: 17, fontWeight: 700, color: entryFormStartDate ? '#111827' : '#9CA3AF', cursor: 'pointer'}}>{entryFormStartDate || 'בחר תאריך'}</button>
                <button onClick={() => { setTimePickerTarget('start'); setTimePickerOpen(true) }} style={{minWidth: 70, textAlign: 'left', border: 'none', background: 'none', fontSize: 17, fontWeight: 700, color: entryFormStartTime ? '#1d4ed8' : '#9CA3AF', cursor: 'pointer'}}>{entryFormStartTime || 'שעה'}</button>
              </div>
              <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
                <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>{t('endLabel')}</div>
                <button onClick={() => setDatePickerOpen(true)} style={{flex: 1, textAlign: 'right', border: 'none', background: 'none', fontSize: 17, fontWeight: 700, color: entryFormEndDate ? '#111827' : '#9CA3AF', cursor: 'pointer'}}>{entryFormEndDate || 'בחר תאריך'}</button>
                <button onClick={() => { setTimePickerTarget('end'); setTimePickerOpen(true) }} style={{minWidth: 70, textAlign: 'left', border: 'none', background: 'none', fontSize: 17, fontWeight: 700, color: entryFormEndTime ? '#1d4ed8' : '#9CA3AF', cursor: 'pointer'}}>{entryFormEndTime || 'שעה'}</button>
              </div>
              {datePickerOpen && <DateRangePicker startDate={entryFormStartDate} endDate={entryFormEndDate} onChange={(s, e) => { setEntryFormStartDate(s); setEntryFormEndDate(e) }} onClose={() => setDatePickerOpen(false)} />}
              {timePickerOpen && <TimeRangePicker startTime={entryFormStartTime} endTime={entryFormEndTime} singleMode={timePickerTarget === 'start' ? 'start' : timePickerTarget === 'end' ? 'end' : undefined} onChange={(s, e) => { if (timePickerTarget === 'start') { setEntryFormStartTime(s) } else if (timePickerTarget === 'end') { setEntryFormEndTime(e) } else { setEntryFormStartTime(s); setEntryFormEndTime(e) } }} onClose={() => { setTimePickerOpen(false); setTimePickerTarget(null) }} />}
              {calculatedHours > 0 && (
                <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
                  <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>משך</div>
                  <div style={{flex: 1, fontSize: 17, fontWeight: 700, color: '#111827'}}>{calculatedHours.toFixed(1)} שעות</div>
                  {calculatedAmount > 0 && <div style={{fontSize: 17, fontWeight: 700, color: '#10b981'}}>₪{calculatedAmount.toLocaleString('he-IL', {maximumFractionDigits: 0})}</div>}
                </div>
              )}
              {Array.isArray(employees) && employees.length > 0 && (
                <div style={{display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6'}}>
                  <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>עובד</div>
                  <div style={{flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                    <button onClick={() => setEntryFormEmployeeId('self')} style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, background: entryFormEmployeeId === 'self' ? '#1d4ed8' : '#F3F4F6', color: entryFormEmployeeId === 'self' ? 'white' : '#374151', cursor: 'pointer'}}>עצמי</button>
                    {employees.map(emp => emp && emp.id ? (<button key={emp.id} onClick={() => setEntryFormEmployeeId(emp.id)} style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, background: entryFormEmployeeId === emp.id ? '#1d4ed8' : '#F3F4F6', color: entryFormEmployeeId === emp.id ? 'white' : '#374151', cursor: 'pointer'}}>{emp.name}</button>) : null)}
                  </div>
                </div>
              )}
              <div style={{padding: '10px 0'}}>
                <input key="quick-notes" defaultValue={entryFormNotes} onBlur={e => setEntryFormNotes(e.target.value)} placeholder="הערה (אופציונלי)" style={{width: '100%', border: 'none', borderBottom: '1px solid #E5E7EB', padding: '8px 0', fontSize: 15, background: 'none', outline: 'none'}} />
              </div>
              <div style={{display: 'flex', gap: 10, marginTop: 8}}>
                <button onClick={closeModal} style={{flex: 1, padding: '14px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#6B7280'}}>{t('cancel')}</button>
                <button className="m-mortgage-calc-btn" onClick={saveHourly} style={{flex: 2, margin: 0}}>{t('save')} ✓</button>
              </div>
            </>
          )}

          {activeTab === 'charge' && (
            <>
              {!selectedClientId && (
                <div style={{marginBottom: 14}}>
                  <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>לקוח {chargeErrors.client && <span style={{color:'#ef4444'}}>*</span>}</div>
                  <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                    {clients.map(c => (
                      <button key={c.id} onClick={() => { setChargeFormClientId(c.id); setChargeErrors(prev => ({...prev, client: false})) }}
                        style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          background: chargeFormClientId === c.id ? '#1d4ed8' : '#F3F4F6',
                          color: chargeFormClientId === c.id ? 'white' : '#374151'}}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{marginBottom: 14}}>
                <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>תאריך {chargeErrors.date && <span style={{color:'#ef4444'}}>*</span>}</div>
                <input type="date" defaultValue={chargeFormDate} onBlur={e => setChargeFormDate(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, outline: 'none'}} />
              </div>
              <div style={{marginBottom: 14}}>
                <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>סכום ₪ {chargeErrors.amount && <span style={{color:'#ef4444'}}>*</span>}</div>
                <input type="number" inputMode="decimal" placeholder="0" defaultValue={chargeFormAmount} onBlur={e => setChargeFormAmount(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, outline: 'none'}} />
              </div>
              <div style={{marginBottom: 14}}>
                <div style={{fontSize: 11, color: '#9CA3AF', fontWeight: 700, marginBottom: 6}}>סוג חיוב {chargeErrors.tag && <span style={{color:'#ef4444'}}>*</span>}</div>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6}}>
                  {chargeTags.map(tag => (
                    <button key={tag.id} onClick={() => { setChargeFormTagId(tag.id); setChargeErrors(prev => ({...prev, tag: false})) }}
                      style={{padding: '6px 12px', borderRadius: 16, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: chargeFormTagId === tag.id ? '#7c3aed' : '#F3F4F6',
                        color: chargeFormTagId === tag.id ? 'white' : '#374151'}}>
                      {tag.name}
                    </button>
                  ))}
                  <button onClick={() => setLocalShowNewTag(v => !v)} style={{padding: '6px 12px', borderRadius: 16, border: '1px dashed #c4b5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#7c3aed'}}>+ חדש</button>
                </div>
                {localShowNewTag && (
                  <div style={{display: 'flex', gap: 6}}>
                    <input placeholder="שם תיוג חדש" value={localNewTagName} onChange={e => setLocalNewTagName(e.target.value)} style={{flex: 1, padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none'}} />
                    <button onClick={() => { if (localNewTagName.trim()) { const t = {id: Date.now().toString(), name: localNewTagName.trim()}; setChargeTags(prev => [...prev, t]); setChargeFormTagId(t.id); setLocalNewTagName(''); setLocalShowNewTag(false) } }} style={{padding: '8px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'}}>הוסף</button>
                  </div>
                )}
              </div>
              <div style={{marginBottom: 14}}>
                <input placeholder="הערה (אופציונלי)" defaultValue={chargeFormNotes} onBlur={e => setChargeFormNotes(e.target.value)} style={{width: '100%', border: 'none', borderBottom: '1px solid #E5E7EB', padding: '8px 0', fontSize: 15, background: 'none', outline: 'none'}} />
              </div>
              <div style={{display: 'flex', gap: 10, marginTop: 8}}>
                <button onClick={closeModal} style={{flex: 1, padding: '14px', background: '#F3F4F6', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#6B7280'}}>ביטול</button>
                <button style={{flex: 2, padding: '14px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer'}} onClick={saveCharge}>שמור ✓</button>
              </div>
            </>
          )}
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
            <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>{t('startLabel')}</div>
            <button onClick={() => { setDatePickerOpen(true); setFieldErrors(prev => ({...prev, date: false})) }}
              style={{flex: 1, textAlign: 'right', border: 'none', background: 'none', fontSize: 17, fontWeight: 700,
                color: fieldErrors.date ? '#DC2626' : entryFormStartDate ? '#111827' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormStartDate || 'בחר תאריך'}
            </button>
            <button onClick={() => { setTimePickerTarget('start'); setTimePickerOpen(true); setFieldErrors(prev => ({...prev, time: false})) }}
              style={{minWidth: 70, textAlign: 'left', border: 'none', background: 'none', fontSize: 17, fontWeight: 700,
                color: fieldErrors.time ? '#DC2626' : entryFormStartTime ? '#1d4ed8' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormStartTime || 'שעה'}
            </button>
          </div>

          {/* END row */}
          <div style={{display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6'}}>
            <div style={{width: 70, fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1}}>{t('endLabel')}</div>
            <button onClick={() => { setDatePickerOpen(true); setFieldErrors(prev => ({...prev, date: false})) }}
              style={{flex: 1, textAlign: 'right', border: 'none', background: 'none', fontSize: 17, fontWeight: 700,
                color: entryFormEndDate ? '#111827' : '#9CA3AF', cursor: 'pointer'}}>
              {entryFormEndDate || 'בחר תאריך'}
            </button>
            <button onClick={() => { setTimePickerTarget('end'); setTimePickerOpen(true); setFieldErrors(prev => ({...prev, time: false})) }}
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
              singleMode={timePickerTarget === 'start' ? 'start' : timePickerTarget === 'end' ? 'end' : undefined}
              onChange={(s, e) => {
                if (timePickerTarget === 'start') {
                  setEntryFormStartTime(s)
                } else if (timePickerTarget === 'end') {
                  setEntryFormEndTime(e)
                } else {
                  setEntryFormStartTime(s)
                  setEntryFormEndTime(e)
                }
              }}
              onClose={() => { setTimePickerOpen(false); setTimePickerTarget(null) }}
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
            <button type="button" className="m-mortgage-calc-btn" onClick={save} style={{flex: 2, margin: 0}}>
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
            <div style={{fontSize: 12, color: '#6B7280', marginTop: 1}}>
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
            <div style={{fontSize: 12, color: '#6B7280', marginTop: 1}}>
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

          <button type="button" className="m-mortgage-calc-btn" onClick={save}>
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
            <select
              onChange={(e) => { applyStatus(e.target.value as 'pending' | 'invoiced' | 'paid'); close() }}
              defaultValue="pending"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                fontWeight: 600,
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                backgroundColor: 'white',
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              <option value="pending">ממתין לחיוב</option>
              <option value="invoiced">חויב</option>
              <option value="paid">שולם</option>
            </select>
          </div>

          <div className="m-mortgage-field">
            <label>מספר חשבונית</label>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={bulkInvoiceNumber}
              onBlur={e => setBulkInvoiceNumber(e.target.value)}
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
    const nameRef = useRef<HTMLInputElement>(null)
    const emailRef = useRef<HTMLInputElement>(null)

    const closeModal = () => {
      setAddEmployeeOpen(false)
      setEditEmployeeId(null)
      setEmployeeFormName('')
      setEmployeeFormEmail('')
      setEmployeeFormClients([])
    }

    const save = () => {
      const name = nameRef.current?.value?.trim() || ''
      const email = emailRef.current?.value?.trim() || ''
      if (!name || !email) {
        alert('נא למלא שם ומייל')
        return
      }
      if (editEmployeeId) {
        setEmployees(prev => prev.map(emp =>
          emp.id === editEmployeeId
            ? { ...emp, name, email, clientIds: employeeFormClients }
            : emp
        ))
      } else {
        const employee: Employee = {
          id: Date.now().toString(),
          name,
          email,
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
      if (nameRef.current) setEmployeeFormName(nameRef.current.value)
      if (emailRef.current) setEmployeeFormEmail(emailRef.current.value)
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
            <h2>{editEmployeeId ? t('editEmployee') : t('newEmployee')}</h2>
            <button className="m-close-btn" onClick={closeModal}>✕</button>
          </div>

          <div className="m-mortgage-field">
            <label>{t('employeeName')}</label>
            <input 
              ref={nameRef}
              type="text"
              defaultValue={employeeFormName}
              onBlur={e => setEmployeeFormName(e.target.value)}
              placeholder={t('employeeName')}
            />
          </div>

          <div className="m-mortgage-field">
            <label>מייל</label>
            <input 
              ref={emailRef}
              type="email"
              inputMode="email"
              defaultValue={employeeFormEmail}
              onBlur={e => setEmployeeFormEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="m-mortgage-field">
            <label>{t('linkedClients')}</label>
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Send Invitation Button */}
          {employeeFormEmail && employeeFormClients.length > 0 && (
            <button
              onClick={() => {
                const name = nameRef.current?.value?.trim() || employeeFormName
                const email = emailRef.current?.value?.trim() || employeeFormEmail
                const assignedClients = clients.filter(c => employeeFormClients.includes(c.id))
                const clientList = assignedClients.map(c => `• ${c.name}`).join('\n')
                const subject = `הזמנה לדיווח שעות - ${name}`
                let body = `שלום ${name},\n\n`
                body += `הוזמנת להשתמש באפליקציית דיווחי השעות.\n\n`
                body += `הלקוחות המקושרים אליך:\n${clientList}\n\n`
                body += `קישור לאפליקציה:\n`
                body += `${window.location.origin}${window.location.pathname}?employee=${encodeURIComponent(email)}\n\n`
                body += `הוראות:\n`
                body += `1. לחץ על הקישור או העתק אותו לדפדפן\n`
                body += `2. הלקוחות שלך יוצגו באפליקציה\n`
                body += `3. תוכל לדווח שעות ללקוחות אלו\n\n`
                body += `בהצלחה!`
                window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
              }}
              style={{
                width: '100%', padding: '14px', marginBottom: '12px',
                background: '#3b82f6', color: 'white',
                border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              📧 שלח הזמנה למייל
            </button>
          )}

          <button type="button" className="m-mortgage-calc-btn" onClick={save}>
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
    setEntryFormClientId(selectedClientId || '')
    setQuickTimeClientId(selectedClientId || '')
    setEditEntryId(null)
    setChargeFormClientId(selectedClientId || '')
    setChargeFormDate(today)
    setChargeFormAmount('')
    setChargeFormTagId('')
    setChargeFormNotes('')
    setChargeFormEmployeeId('self')
    setQuickEntryActiveTab('hourly')
    setQuickTimeEntryOpen(true)
  }

  return (
    <div className="m-app" onClick={() => { if (menuCatId) setMenuCatId(null) }}>
      {screen === 'hub' && <HubScreen />}
      {screen === 'home' && <HomeScreen />}
      {screen === 'forecast' && <ForecastScreen />}
      {screen === 'budget' && <BudgetScreen />}
      {screen === 'detail' && <DetailScreen />}
      {screen === 'forecast-chart' && <ForecastChartScreen />}
      {screen === 'net-chart' && <NetChartScreen />}
      {screen === 'mortgage-calc' && <MortgageCalculator />}
      {screen === 'time-tracking' && <TimeTrackingScreen />}
      {screen === 'property-management' && <PropertyManagement uid={uid} lang={lang} onBack={() => setScreen('hub')} onLogoClick={handleLogoClick} backHandlerRef={pmBackHandlerRef} />}
      {renderCatMgmt()}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} userEmail={userEmail} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      <InlineSheet />
      <AddClientModal />
      <AddChargeModal />
      <QuickTimeEntryModal />
      <AddTimeEntryModal />
      {/* Global Floating Action Buttons */}
      {(screen === 'time-tracking' || (screen === 'hub' && showFabsTime)) && !quickTimeEntryOpen && !addTimeEntryOpen && !addClientOpen && !addEmployeeOpen && !bulkActionOpen && (
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
          <button
            className="m-fab-glass timer m-fab-with-label"
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
        <div className="m-delete-toast m-voice-error-toast" style={{background:'#FEF2F2',color:'#DC2626',border:'1px solid #FECACA'}}>
          ⚠️ {errorToast}
        </div>
      )}
      {/* Voice listening banner */}
      {voiceListening && (
        <div className="m-voice-listening-banner">
          <div className="m-voice-pulse-dot" />
          <span>🎙 מקשיב... דבר/י עכשיו</span>
          <div className="m-voice-pulse-dot" />
          <button
            onClick={() => { voiceRecogRef.current?.stop(); setVoiceListening(false) }}
            style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.25)',border:'none',borderRadius:'50%',width:28,height:28,color:'white',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}
          >✕</button>
        </div>
      )}

      {/* Voice mic floating button — hidden on time-tracking screen (mic is in bottom bar there) */}
      {showFabsVoice && screen !== 'time-tracking' && <button
        title="דיווח קולי"
        onClick={startVoiceRecognition}
        style={{
          position:'fixed', bottom:80, left:16, zIndex:400,
          width:52, height:52, borderRadius:'50%',
          background: voiceListening ? '#DC2626' : '#7c3aed',
          border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: voiceListening ? '0 0 0 6px rgba(220,38,38,0.3)' : '0 4px 14px rgba(124,58,237,0.45)',
          transition:'all 0.2s'
        }}
      >
        {voiceListening
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        }
      </button>}

      {showExitConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:'28px 24px',maxWidth:300,width:'100%',textAlign:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
            <div style={{fontSize:36,marginBottom:12}}>👋</div>
            <div style={{fontSize:17,fontWeight:600,color:'#1F2937',marginBottom:8}}>יציאה מהאפליקציה?</div>
            <div style={{fontSize:13,color:'#6B7280',marginBottom:20}}>בטוח/ה שרוצה לצאת?</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={() => setShowExitConfirm(false)} style={{flex:1,padding:'12px 0',borderRadius:10,border:'1px solid #E5E7EB',background:'#F9FAFB',color:'#374151',fontSize:15,fontWeight:500,cursor:'pointer'}}>להישאר</button>
              <button onClick={async () => {
                setShowExitConfirm(false)
                if (popStateHandlerRef.current) window.removeEventListener('popstate', popStateHandlerRef.current)
                // Perform logout
                if (isLocalMode) {
                  localStorage.removeItem('bva_local_mode')
                } else {
                  await flushAllSaves()
                  await new Promise(r => setTimeout(r, 500))
                  await signOutUser().catch(() => {})
                }
                window.location.reload()
              }} style={{flex:1,padding:'12px 0',borderRadius:10,border:'none',background:'#DC2626',color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer'}}>לצאת</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
