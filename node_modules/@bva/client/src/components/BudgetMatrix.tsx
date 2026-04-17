import { useMemo, useState, useEffect, useRef } from 'react'
import './BudgetMatrix.css'

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
}

const initialGroups: Group[] = [
  { id: 'g1', name: 'דיור', color: '#E8F4F8' },
  { id: 'g2', name: 'רכב', color: '#E8F8F0' },
  { id: 'g3', name: 'משרד', color: '#FFF8E8' },
  { id: 'g4', name: 'עלויות כלליות', color: '#FFE8E8' },
  { id: 'g5', name: 'הכנסות', color: '#E8FFE8' },
]

const initialCategories: Category[] = [
  { id: 'c1', groupId: 'g1', name: 'שכ"ד + מים', budget: 1800 },
  { id: 'c2', groupId: 'g1', name: 'ארנונה', budget: 450 },
  { id: 'c3', groupId: 'g1', name: 'חשמל', budget: 450 },
  { id: 'c4', groupId: 'g2', name: 'דלק', budget: 2750 },
  { id: 'c5', groupId: 'g2', name: 'טיפולים', budget: 112 },
  { id: 'c6', groupId: 'g3', name: 'GMAIL', budget: 48 },
  { id: 'c7', groupId: 'g3', name: 'שמוליק', budget: 295 },
  { id: 'c8', groupId: 'g3', name: 'AI', budget: 65 },
  { id: 'c9', groupId: 'g3', name: 'AIRTABLE', budget: 23 },
  { id: 'c10', groupId: 'g3', name: 'פתרונות דיגיטליים', budget: 144 },
  { id: 'c11', groupId: 'g3', name: 'כל לוגו', budget: 100 },
  { id: 'c12', groupId: 'g3', name: 'פיס', budget: 60 },
  { id: 'c13', groupId: 'g3', name: 'כללית', budget: 80 },
  { id: 'c14', groupId: 'g3', name: 'סלולרי', budget: 60 },
  { id: 'c15', groupId: 'g3', name: 'אקונומיקה', budget: 165 },
  { id: 'c16', groupId: 'g3', name: 'מייב', budget: 66 },
  { id: 'c17', groupId: 'g3', name: 'שואב', budget: 105 },
  { id: 'c18', groupId: 'g3', name: 'חופשות', budget: 554 },
  { id: 'c19', groupId: 'g4', name: 'חד פעמי', budget: 3000 },
  { id: 'c20', groupId: 'g4', name: 'מזון', budget: 4000 },
  { id: 'c21', groupId: 'g4', name: 'הלוואות', budget: 364 },
  { id: 'c22', groupId: 'g4', name: 'רכב', budget: 128 },
  { id: 'c23', groupId: 'g5', name: 'ס.ש.', budget: -9374 },
]

// Generate 48 months from 01/26 to 12/29 (starting from January 2026, covering 4 years)
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

// Get current month in format MM/YY
const getCurrentMonth = (): string => {
  const now = new Date()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const year = now.getFullYear().toString().slice(-2)
  return `${month}/${year}`
}

// Use months in simple chronological order, starting from March 2026
const months = allMonths.slice(2)

export default function BudgetMatrix() {
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState<'group' | 'category' | 'amount'>('group')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [defaultMonth, setDefaultMonth] = useState<string>(getCurrentMonth())
  const [updateForward, setUpdateForward] = useState(false)
  const [endMonth, setEndMonth] = useState<string>('')
  const [newAmount, setNewAmount] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{catId: string, month: string} | null>(null)
  const [editValue, setEditValue] = useState('')

  // Name editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')

  // Scroll container ref
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track if modal was opened via right-click
  const [isRightClickOpen, setIsRightClickOpen] = useState(false)

  // Row action menu state
  const [openMenuCatId, setOpenMenuCatId] = useState<string | null>(null)

  // Close action bubble on outside click
  useEffect(() => {
    if (!openMenuCatId) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.action-bubble') && !target.closest('.category-name')) {
        setOpenMenuCatId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuCatId])

  // Store month-specific forecasts for forward updates
  const [forecasts, setForecasts] = useState<Record<string, Record<string, number>>>({})

  // Forecast history - saved snapshots of forecasts with dates
  const [forecastHistory, setForecastHistory] = useState<Array<{
    id: string
    date: string
    label: string
    balances: Record<string, number>
  }>>([])

  const [actuals, setActuals] = useState<Record<string, Record<string, number>>>(() => {
    const saved = localStorage.getItem('budget_actuals')
    return saved ? JSON.parse(saved) : {
      'c1': { '01/26': 1800, '02/26': 1800, '03/26': 1800 },
      'c4': { '01/26': 4845, '02/26': 2750 },
      'c19': { '01/26': 700, '02/26': 3000 },
      'c20': { '01/26': 7815 },
      'c23': { '01/26': 19017, '02/26': 1017 },
    }
  })

  const [viewMode] = useState<'budget' | 'actual'>('actual')

  const getForecastValue = (cat: Category, month: string): number => {
    // Check if there's a month-specific forecast, otherwise use category budget
    const monthForecast = forecasts[cat.id]?.[month]
    if (monthForecast !== undefined) {
      return Math.abs(monthForecast)
    }
    return Math.abs(cat.budget)
  }

  const getActualValue = (catId: string, month: string): number | null => {
    const val = actuals[catId]?.[month]
    if (val === undefined || val === null) return null
    return Math.abs(val)
  }

  const hasActual = (catId: string, month: string): boolean => {
    return actuals[catId]?.[month] !== undefined
  }

  const getVariance = (cat: Category, month: string): number => {
    const forecast = getForecastValue(cat, month)
    const actual = getActualValue(cat.id, month)
    if (actual === null) return 0
    return Math.abs(actual) - Math.abs(forecast)
  }

  const isOverForecast = (cat: Category, month: string): boolean => {
    if (cat.groupId === 'g5') return false
    const variance = getVariance(cat, month)
    return variance > 0
  }

  const isUnderForecast = (cat: Category, month: string): boolean => {
    if (cat.groupId === 'g5') return false
    const variance = getVariance(cat, month)
    return variance < 0
  }

  const monthTotals = useMemo(() => {
    let runningBalance = 0
    return months.map((month) => {
      let income = 0
      let expense = 0
      for (const cat of categories) {
        // Use actual value if exists, otherwise use forecast
        const actualVal = getActualValue(cat.id, month)
        const forecastVal = getForecastValue(cat, month)
        const val = actualVal !== null ? actualVal : forecastVal
        if (cat.groupId === 'g5') income += Math.abs(val)
        else expense += Math.abs(val)
      }
      // Calculate net (income - expenses) for this specific month
      const net = income - expense
      // Add to running balance for cumulative forecast
      runningBalance += net
      return { month, income, expense, net, runningBalance }
    })
  }, [categories, actuals])

  const openAddModal = (month?: string, category?: Category, isRightClick = false) => {
    setIsModalOpen(true)
    setModalStep(category ? 'amount' : 'group')
    setSelectedGroup(null)
    setSelectedCategory(category || null)
    setIsRightClickOpen(isRightClick)
    setNewAmount('')
    setIsAddingGroup(false)
    setIsAddingCategory(false)
    setNewGroupName('')
    setNewCategoryName('')
    setEndMonth('')
    // If opened via right-click, force updateForward to true; otherwise false
    setUpdateForward(isRightClick)
    // Use provided month, or previously selected month, or default
    const targetMonth = month || selectedMonth || defaultMonth
    setSelectedMonth(targetMonth)
  }

  const closeModal = () => setIsModalOpen(false)

  const selectGroup = (group: Group) => {
    setSelectedGroup(group)
    setModalStep('category')
    setIsAddingGroup(false)
  }

  const selectCategory = (cat: Category) => {
    setSelectedCategory(cat)
    setModalStep('amount')
    setIsAddingCategory(false)
  }

  const addNewGroup = () => {
    if (!newGroupName.trim()) return
    const newGroup: Group = {
      id: `g${Date.now()}`,
      name: newGroupName.trim(),
      color: `hsl(${Math.random() * 360}, 70%, 85%)`,
    }
    setGroups((prev) => [...prev, newGroup])
    setSelectedGroup(newGroup)
    setIsAddingGroup(false)
    setModalStep('category')
  }

  const addNewCategory = () => {
    if (!newCategoryName.trim() || !selectedGroup) return
    const newCat: Category = {
      id: `c${Date.now()}`,
      groupId: selectedGroup.id,
      name: newCategoryName.trim(),
      budget: 0,
    }
    setCategories((prev) => [...prev, newCat])
    setSelectedCategory(newCat)
    setIsAddingCategory(false)
    setModalStep('amount')
  }

  const submitActual = () => {
    if (!selectedCategory || !newAmount || !selectedMonth) return
    const amount = Number(newAmount)
    const cat = selectedCategory
    const startIdx = months.indexOf(selectedMonth)
    
    // Save the selected month as the new default
    setDefaultMonth(selectedMonth)
    
    if (updateForward) {
      // Update forecast forward - set month-specific forecasts from selected month onwards
      // This is a forecast update, NOT an actual - stays black color
      setForecasts((prev) => {
        const catForecasts = { ...(prev[cat.id] || {}) }
        
        // Determine end index
        const endIdx = endMonth ? months.indexOf(endMonth) : (months.length - 1)
        
        // Set forecast for all months in range (from startIdx to endIdx)
        for (let i = startIdx; i <= endIdx && i < months.length; i++) {
          catForecasts[months[i]] = amount
        }
        
        return {
          ...prev,
          [cat.id]: catForecasts,
        }
      })
    } else {
      // Update actual for current month only - mark as actual-only
      setActuals((prev) => {
        const catActuals = { ...(prev[cat.id] || {}) }
        catActuals[selectedMonth] = amount
        
        return {
          ...prev,
          [cat.id]: catActuals,
        }
      })
    }
    
    setNewAmount('')
    setUpdateForward(false)
    setEndMonth('')
    closeModal()
  }

  // Name editing functions
  const startEditingGroup = (group: Group) => {
    setEditingGroupId(group.id)
    setEditNameValue(group.name)
  }

  const saveGroupName = () => {
    if (!editingGroupId || !editNameValue.trim()) {
      setEditingGroupId(null)
      return
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.id === editingGroupId ? { ...g, name: editNameValue.trim() } : g
      )
    )
    setEditingGroupId(null)
    setEditNameValue('')
  }

  const cancelEditingGroup = () => {
    setEditingGroupId(null)
    setEditNameValue('')
  }

  const startEditingCategory = (category: Category) => {
    setEditingCategoryId(category.id)
    setEditNameValue(category.name)
  }

  const saveCategoryName = () => {
    if (!editingCategoryId || !editNameValue.trim()) {
      setEditingCategoryId(null)
      return
    }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingCategoryId ? { ...c, name: editNameValue.trim() } : c
      )
    )
    setEditingCategoryId(null)
    setEditNameValue('')
  }

  const cancelEditingCategory = () => {
    setEditingCategoryId(null)
    setEditNameValue('')
  }

  // Delete a category
  const deleteCategory = (catId: string, catName: string) => {
    if (confirm(`האם אתה בטוח שאתה רוצה למחוק את ההוצאה "${catName}"?`)) {
      setCategories((prev) => prev.filter((c) => c.id !== catId))
      // Also remove actuals for this category
      setActuals((prev) => {
        const newActuals = { ...prev }
        delete newActuals[catId]
        return newActuals
      })
    }
  }

  // Check if category has any values (actuals or budget)
  const categoryHasValues = (cat: Category): boolean => {
    // Check if has budget/forecast
    if (cat.budget > 0) return true
    // Check if has any actuals
    const catActuals = actuals[cat.id]
    if (!catActuals) return false
    return Object.values(catActuals).some((val) => val !== undefined && val !== null && val !== 0)
  }

  // Save to localStorage whenever actuals change
  useEffect(() => {
    localStorage.setItem('budget_actuals', JSON.stringify(actuals))
  }, [actuals])

  // Save categories to localStorage when they change
  useEffect(() => {
    localStorage.setItem('budget_categories', JSON.stringify(categories))
  }, [categories])

  // Save groups to localStorage when they change
  useEffect(() => {
    localStorage.setItem('budget_groups', JSON.stringify(groups))
  }, [groups])

  // Load from localStorage on initial mount
  useEffect(() => {
    const savedCategories = localStorage.getItem('budget_categories')
    const savedGroups = localStorage.getItem('budget_groups')
    
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories))
      } catch (e) {
        console.error('Failed to load categories from localStorage')
      }
    }
    
    if (savedGroups) {
      try {
        setGroups(JSON.parse(savedGroups))
      } catch (e) {
        console.error('Failed to load groups from localStorage')
      }
    }
  }, [])

  // Save current forecast snapshot
  const saveForecastSnapshot = () => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('he-IL')
    const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    
    // Save the running balance values from the forecast row directly
    const balances: Record<string, number> = {}
    monthTotals.forEach((mt) => {
      balances[mt.month] = mt.runningBalance
    })
    
    const newHistoryItem = {
      id: `hist-${Date.now()}`,
      date: `${dateStr} ${timeStr}`,
      label: `תחזית נכון ל-${dateStr}`,
      balances,
    }
    
    setForecastHistory((prev) => [newHistoryItem, ...prev])
  }

  // Inline editing functions
  const startInlineEdit = (catId: string, month: string, currentValue: number | null) => {
    setEditingCell({catId, month})
    setEditValue(currentValue !== null ? String(Math.abs(currentValue)) : '')
  }

  const cancelInlineEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveInlineEdit = () => {
    if (!editingCell || !editValue) {
      cancelInlineEdit()
      return
    }
    
    const amount = Number(editValue)
    const {catId, month} = editingCell
    
    setActuals((prev) => ({
      ...prev,
      [catId]: {
        ...(prev[catId] || {}),
        [month]: amount,
      },
    }))
    
    setEditingCell(null)
    setEditValue('')
  }

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveInlineEdit()
      return
    }
    if (e.key === 'Escape') {
      cancelInlineEdit()
      return
    }
    
    // Arrow key navigation
    if (!editingCell) return
    
    const {catId, month} = editingCell
    const catIndex = categories.findIndex((c) => c.id === catId)
    const monthIndex = months.indexOf(month)
    
    let nextCatId = catId
    let nextMonth = month
    let shouldMove = false
    
    switch (e.key) {
      case 'ArrowLeft':
        // Move to next month (left arrow in RTL goes to next/past months)
        if (monthIndex < months.length - 1) {
          nextMonth = months[monthIndex + 1]
          shouldMove = true
        }
        break
      case 'ArrowRight':
        // Move to previous month (right arrow in RTL goes to previous/future months)
        if (monthIndex > 0) {
          nextMonth = months[monthIndex - 1]
          shouldMove = true
        }
        break
      case 'ArrowDown':
        // Move to next category (if not at end)
        if (catIndex < categories.length - 1) {
          nextCatId = categories[catIndex + 1].id
          shouldMove = true
        }
        break
      case 'ArrowUp':
        // Move to previous category (if not at start)
        if (catIndex > 0) {
          nextCatId = categories[catIndex - 1].id
          shouldMove = true
        }
        break
      default:
        return
    }
    
    if (!shouldMove) return
    
    // Save current and move to next
    e.preventDefault()
    saveInlineEdit()
    
    // Small delay to allow save to complete, then start editing next cell
    setTimeout(() => {
      const nextValue = getActualValue(nextCatId, nextMonth)
      startInlineEdit(nextCatId, nextMonth, nextValue)
      
      // Scroll to keep the cell in view like Excel
      const cellElement = document.querySelector(`[data-cell="${nextCatId}-${nextMonth}"]`)
      if (cellElement && scrollRef.current) {
        cellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      }
    }, 50)
  }

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.groupId === 'g5' && categoryHasValues(c)),
    [categories, actuals],
  )

  return (
    <div className="matrix">
      <div className="matrix-header">
        <div className="brand-section">
          <div className="logo-full">
            <span className="logo-dx">DX</span>
            <span className="logo-dexcel">DEXCEL</span>
          </div>
        </div>
        <div className="title-section-center">
          <h1>תחזית תזרימית</h1>
        </div>
        <div className="header-controls">
          <button className="btn-primary" onClick={() => openAddModal()} title="הוסף עדכון">
            +
          </button>
          <button className="btn-secondary" onClick={saveForecastSnapshot}>
            📸 שמור תחזית
          </button>
        </div>
      </div>

      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="corner-cell">קטגוריית הוצאות</th>
              <th className="category-header">הוצאה</th>
              {months.map((m) => (
                <th key={m} className="month-header">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Income categories first */}
            {incomeCategories.map((cat) => (
              <tr key={cat.id} className="income-row" style={{ backgroundColor: '#E8FFE8' }}>
                <td className="group-cell" style={{ backgroundColor: '#E8FFE8', fontWeight: 'bold' }}>
                  הכנסות
                </td>
                <td className="category-name">{cat.name}</td>
                {months.map((month) => {
                  const forecastVal = getForecastValue(cat, month)
                  const actualVal = getActualValue(cat.id, month)
                  const displayVal = viewMode === 'budget' ? forecastVal : (actualVal ?? forecastVal)
                  const isEditing = editingCell?.catId === cat.id && editingCell?.month === month
                  
                  if (isEditing) {
                    return (
                      <td key={month} className="data-cell editing">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveInlineEdit}
                          onKeyDown={handleInlineKeyDown}
                          autoFocus
                          className="inline-input"
                        />
                      </td>
                    )
                  }
                  
                  return (
                    <td
                      key={month}
                      className="data-cell income"
                      onClick={() => startInlineEdit(cat.id, month, viewMode === 'budget' ? forecastVal : (actualVal ?? forecastVal))}
                      onDoubleClick={() => openAddModal(month, cat)}
                      title={'לחיצה = עריכה | לחיצה כפולה = עדכון קדימה'}
                    >
                      {displayVal.toLocaleString()}
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Expense groups */}
            {groups
              .filter((g) => g.id !== 'g5')
              .map((group) => {
                const cats = categories.filter((c) => c.groupId === group.id && categoryHasValues(c))
                if (cats.length === 0) return null
                return cats.map((cat, idx) => {
                  const isFirst = idx === 0
                  return (
                    <tr key={cat.id} style={{ backgroundColor: group.color }}>
                      {isFirst && (
                        <td
                          className="group-cell"
                          rowSpan={cats.length}
                          style={{ backgroundColor: group.color, fontWeight: 'bold' }}
                        >
                          {editingGroupId === group.id ? (
                            <div className="name-edit-inline">
                              <input
                                type="text"
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                onBlur={saveGroupName}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveGroupName()
                                  if (e.key === 'Escape') cancelEditingGroup()
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="name-with-edit">
                              <span>{group.name}</span>
                              <button
                                className="edit-name-btn"
                                onClick={() => startEditingGroup(group)}
                                title="עריכת שם קבוצה"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="category-name">
                        {editingCategoryId === cat.id ? (
                          <div className="name-edit-inline">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onBlur={saveCategoryName}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCategoryName()
                                if (e.key === 'Escape') cancelEditingCategory()
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className="name-with-edit"
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setOpenMenuCatId(openMenuCatId === cat.id ? null : cat.id)
                            }}
                          >
                            <span>{cat.name}</span>
                            {openMenuCatId === cat.id && (
                              <div className="action-bubble">
                                <div className="action-bubble-arrow" />
                                <button
                                  className="menu-item edit"
                                  onClick={() => {
                                    startEditingCategory(cat)
                                    setOpenMenuCatId(null)
                                  }}
                                >
                                  ✏️ עדכון תיאור
                                </button>
                                <button
                                  className="menu-item delete"
                                  onClick={() => {
                                    deleteCategory(cat.id, cat.name)
                                    setOpenMenuCatId(null)
                                  }}
                                >
                                  🗑️ מחיקת שורה
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      {months.map((month) => {
                        const forecastVal = getForecastValue(cat, month)
                        const actualVal = getActualValue(cat.id, month)
                        const displayVal = viewMode === 'budget' ? forecastVal : (actualVal ?? forecastVal)
                        const over = isOverForecast(cat, month)
                        const under = isUnderForecast(cat, month)
                        const hasAct = hasActual(cat.id, month)
                        const showAlert = viewMode === 'actual' && over
                        const showUnderAlert = viewMode === 'actual' && under
                        const isEditing = editingCell?.catId === cat.id && editingCell?.month === month
                        
                        if (isEditing) {
                          return (
                            <td key={month} className="data-cell editing" data-cell={`${cat.id}-${month}`}>
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveInlineEdit}
                                onKeyDown={handleInlineKeyDown}
                                autoFocus
                                className="inline-input"
                              />
                            </td>
                          )
                        }
                        
                        return (
                          <td
                            key={month}
                            data-cell={`${cat.id}-${month}`}
                            className={`data-cell expense ${showAlert ? 'alert' : ''} ${showUnderAlert ? 'under-budget' : ''} ${hasAct ? 'has-actual' : ''}`}
                            onClick={() => startInlineEdit(cat.id, month, viewMode === 'budget' ? forecastVal : (actualVal ?? forecastVal))}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              openAddModal(month, cat, true)
                            }}
                            title={'לחיצה = עריכה | קליק ימני = עדכון קדימה'}
                          >
                            <span className="value">{displayVal.toLocaleString()}</span>
                            {showAlert && <span className="alert-icon">▲</span>}
                            {showUnderAlert && <span className="alert-icon under">▼</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              })}

            {/* Forecast History Rows */}
            {forecastHistory.map((historyItem) => (
              <tr key={historyItem.id} className="history-row">
                <td className="history-label" colSpan={2}>{historyItem.label}</td>
                {months.map((month) => {
                  const balance = historyItem.balances[month] ?? 0
                  return (
                    <td key={month} className={`history-cell ${balance >= 0 ? 'positive' : 'negative'}`}>
                      {Math.abs(balance).toLocaleString()}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="net-monthly-row">
              <td className="net-label" colSpan={2}>נטו לחודש</td>
              {monthTotals.map((mt) => (
                <td
                  key={mt.month}
                  className={`net-cell ${mt.income - mt.expense >= 0 ? 'positive' : 'negative'}`}
                >
                  {Math.abs(mt.income - mt.expense).toLocaleString()}
                </td>
              ))}
            </tr>
            <tr className="totals-row">
              <td className="total-label" colSpan={2}>תחזית</td>
              {monthTotals.map((mt) => (
                <td
                  key={mt.month}
                  className={`total-cell ${mt.runningBalance >= 0 ? 'positive' : 'negative'}`}
                >
                  {Math.abs(mt.runningBalance).toLocaleString()}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modalStep === 'group' && (
              <>
                <h3>בחר קטגוריית הוצאות</h3>
                <div className="modal-grid">
                  {groups
                    .filter((g) => g.id !== 'g5')
                    .map((g) => (
                      <button
                        key={g.id}
                        className="modal-item"
                        style={{ backgroundColor: g.color }}
                        onClick={() => selectGroup(g)}
                      >
                        {g.name}
                      </button>
                    ))}
                  <button
                    className="modal-item add-new"
                    onClick={() => setIsAddingGroup(true)}
                  >
                    + קטגוריית הוצאות חדשה
                  </button>
                </div>
                {isAddingGroup && (
                  <div className="add-form">
                    <input
                      placeholder="שם קטגוריית ההוצאות החדשה"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      autoFocus
                    />
                    <button onClick={addNewGroup}>צור</button>
                  </div>
                )}
              </>
            )}

            {modalStep === 'category' && selectedGroup && (
              <>
                <h3>
                  {selectedGroup.name} - בחר הוצאה
                  <button className="back-btn" onClick={() => setModalStep('group')}>
                    ←
                  </button>
                </h3>
                <div className="modal-grid">
                  {categories
                    .filter((c) => c.groupId === selectedGroup.id)
                    .map((c) => (
                      <button
                        key={c.id}
                        className="modal-item"
                        onClick={() => selectCategory(c)}
                      >
                        {c.name}
                      </button>
                    ))}
                  <button
                    className="modal-item add-new"
                    onClick={() => setIsAddingCategory(true)}
                  >
                    + הוצאה חדשה
                  </button>
                </div>
                {isAddingCategory && (
                  <div className="add-form">
                    <input
                      placeholder="שם ההוצאה החדשה"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    <button onClick={addNewCategory}>צור</button>
                  </div>
                )}
              </>
            )}

            {modalStep === 'amount' && selectedCategory && (
              <>
                <h3>
                  {selectedCategory.name} - עדכן סכום
                  <button className="back-btn" onClick={() => setModalStep('category')}>
                    ←
                  </button>
                </h3>
                <div className="compact-form">
                  <div className="compact-current">
                    תחזית נוכחית: <strong>{getForecastValue(selectedCategory, selectedMonth || months[0]).toLocaleString()}</strong>
                  </div>

                  <div className="compact-fields">
                    <div className="compact-field">
                      <label>סכום</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        autoFocus
                        className="compact-input"
                      />
                    </div>
                    <div className="compact-field">
                      <label>מ-חודש</label>
                      <select
                        value={selectedMonth || defaultMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="compact-select"
                      >
                        {months.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    {!isRightClickOpen && (
                      <div className="compact-field">
                        <label>סוג</label>
                        <select
                          value={updateForward ? 'forward' : 'single'}
                          onChange={(e) => setUpdateForward(e.target.value === 'forward')}
                          className="compact-select"
                        >
                          <option value="single">חודש זה בלבד</option>
                          <option value="forward">תחזית קדימה</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {(updateForward || isRightClickOpen) && (
                    <div className="compact-until">
                      <label>עד:</label>
                      <label className="compact-radio">
                        <input type="radio" name="duration" checked={!endMonth} onChange={() => setEndMonth('')} />
                        <span>לנצח</span>
                      </label>
                      <label className="compact-radio">
                        <input
                          type="radio"
                          name="duration"
                          checked={!!endMonth}
                          onChange={() => setEndMonth(months[months.indexOf(selectedMonth || defaultMonth) + 6] || months[months.length - 1])}
                        />
                        <span>חודש ספציפי</span>
                      </label>
                      {endMonth && (
                        <select
                          value={endMonth}
                          onChange={(e) => setEndMonth(e.target.value)}
                          className="compact-select"
                        >
                          {months.filter((m) => months.indexOf(m) > months.indexOf(selectedMonth || defaultMonth)).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
                <div className="compact-actions">
                  <button className="compact-btn-primary" onClick={submitActual} disabled={!newAmount}>
                    ✅ עדכון
                  </button>
                  <button className="compact-btn-cancel" onClick={() => setIsModalOpen(false)}>
                    ✕
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
