import { useMemo, useState } from 'react'
import './MonthlyOverview.css'

type Tx = {
  id: string
  categoryId: string
  month: string
  amount: number
  date: string
}

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
  { id: 'g1', name: 'רכב', color: '#FF6B6B' },
  { id: 'g2', name: 'דירה', color: '#4ECDC4' },
  { id: 'g3', name: 'מזון', color: '#45B7D1' },
  { id: 'g4', name: 'בילוי', color: '#96CEB4' },
  { id: 'g5', name: 'הכנסות', color: '#2ECC71' },
]

const initialCategories: Category[] = [
  { id: 'c1', groupId: 'g1', name: 'דלק', budget: 800 },
  { id: 'c2', groupId: 'g1', name: 'טיפולים', budget: 500 },
  { id: 'c3', groupId: 'g1', name: 'ביטוח', budget: 1200 },
  { id: 'c4', groupId: 'g2', name: 'שכירות', budget: 3500 },
  { id: 'c5', groupId: 'g2', name: 'חשמל', budget: 350 },
  { id: 'c6', groupId: 'g2', name: 'ארנונה', budget: 400 },
  { id: 'c7', groupId: 'g3', name: 'מכולת', budget: 1500 },
  { id: 'c8', groupId: 'g3', name: 'ירקות', budget: 400 },
  { id: 'c9', groupId: 'g4', name: 'מסעדות', budget: 500 },
  { id: 'c10', groupId: 'g4', name: 'קולנוע', budget: 200 },
  { id: 'c11', groupId: 'g5', name: 'משכורת', budget: 15000 },
]

const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']

export default function MonthlyOverview() {
  const [currentMonth, setCurrentMonth] = useState('2024-01')
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [transactions, setTransactions] = useState<Tx[]>([
    { id: 't1', categoryId: 'c1', month: '2024-01', amount: 450, date: '2024-01-05' },
    { id: 't2', categoryId: 'c1', month: '2024-01', amount: 280, date: '2024-01-20' },
    { id: 't3', categoryId: 'c4', month: '2024-01', amount: 3500, date: '2024-01-01' },
    { id: 't4', categoryId: 'c5', month: '2024-01', amount: 320, date: '2024-01-15' },
    { id: 't5', categoryId: 'c11', month: '2024-01', amount: 15000, date: '2024-01-01' },
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState<'group' | 'category' | 'amount'>('group')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [newAmount, setNewAmount] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)

  const openingBalance = 5000

  const monthTxs = useMemo(
    () => transactions.filter((t) => t.month === currentMonth),
    [transactions, currentMonth],
  )

  const actualByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of monthTxs) {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount
    }
    return map
  }, [monthTxs])

  const rows = useMemo(() => {
    return groups
      .filter((g) => g.name !== 'הכנסות')
      .map((group) => {
        const cats = categories.filter((c) => c.groupId === group.id)
        return {
          group,
          categories: cats.map((cat) => ({
            ...cat,
            actual: actualByCategory[cat.id] || 0,
            hasActual: !!actualByCategory[cat.id],
          })),
        }
      })
  }, [groups, categories, actualByCategory])

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.groupId === 'g5'),
    [categories],
  )

  const totalIncome = useMemo(
    () => incomeCategories.reduce((sum, c) => sum + (actualByCategory[c.id] || 0), 0),
    [incomeCategories, actualByCategory],
  )

  const totalExpenses = useMemo(
    () => rows.reduce((sum, r) => sum + r.categories.reduce((s, c) => s + c.actual, 0), 0),
    [rows],
  )

  const remaining = openingBalance + totalIncome - totalExpenses

  const openAddModal = () => {
    setIsModalOpen(true)
    setModalStep('group')
    setSelectedGroup(null)
    setSelectedCategory(null)
    setNewAmount('')
    setIsAddingGroup(false)
    setIsAddingCategory(false)
    setNewGroupName('')
    setNewCategoryName('')
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

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
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
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

  const submitTransaction = () => {
    if (!selectedCategory || !newAmount) return
    const tx: Tx = {
      id: `t${Date.now()}`,
      categoryId: selectedCategory.id,
      month: currentMonth,
      amount: Number(newAmount),
      date: new Date().toISOString(),
    }
    setTransactions((prev) => [...prev, tx])
    closeModal()
  }

  return (
    <div className="mo">
      <div className="mo-header-bar">
        <h1>מאזן חכם</h1>
        <button className="btn-primary" onClick={openAddModal}>
          + הוסף תנועה
        </button>
      </div>

      <div className="mo-months">
        {months.map((m) => (
          <button
            key={m}
            className={m === currentMonth ? 'mo-month active' : 'mo-month'}
            onClick={() => setCurrentMonth(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mo-summary">
        <div className="summary-card">
          <span className="label">יתרת פתיחה</span>
          <span className="value">₪{openingBalance.toLocaleString()}</span>
        </div>
        <div className="summary-card income">
          <span className="label">הכנסות</span>
          <span className="value">₪{totalIncome.toLocaleString()}</span>
        </div>
        <div className="summary-card expense">
          <span className="label">הוצאות</span>
          <span className="value">₪{totalExpenses.toLocaleString()}</span>
        </div>
        <div className={`summary-card ${remaining >= 0 ? 'positive' : 'negative'}`}>
          <span className="label">יתרה</span>
          <span className="value">₪{remaining.toLocaleString()}</span>
        </div>
      </div>

      <div className="mo-table-container">
        <table className="mo-table">
          <thead>
            <tr>
              <th>קבוצה</th>
              <th>קטגוריה</th>
              <th>תקציב</th>
              <th>בפועל</th>
              <th>הפרש</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.categories.map((cat, idx) => {
                const variance = cat.budget - cat.actual
                const isPast = cat.hasActual

                return (
                  <tr
                    key={cat.id}
                    className={isPast ? 'past' : 'future'}
                    style={{ backgroundColor: `${row.group.color}15` }}
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={row.categories.length}
                        className="group-cell"
                        style={{ backgroundColor: row.group.color }}
                      >
                        {row.group.name}
                      </td>
                    )}
                    <td className="cat-name">{cat.name}</td>
                    <td className="budget">₪{cat.budget.toLocaleString()}</td>
                    <td className={isPast ? 'actual confirmed' : 'actual projected'}>
                      ₪{cat.actual.toLocaleString()}
                    </td>
                    <td className={variance >= 0 ? 'variance pos' : 'variance neg'}>
                      ₪{variance.toLocaleString()}
                    </td>
                  </tr>
                )
              }),
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modalStep === 'group' && (
              <>
                <h3>בחר קבוצת הוצאות</h3>
                <div className="modal-grid">
                  {groups
                    .filter((g) => g.name !== 'הכנסות')
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
                    + קבוצה חדשה
                  </button>
                </div>
                {isAddingGroup && (
                  <div className="add-form">
                    <input
                      placeholder="שם הקבוצה החדשה"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                    <button onClick={addNewGroup}>צור</button>
                  </div>
                )}
              </>
            )}

            {modalStep === 'category' && selectedGroup && (
              <>
                <h3>
                  {selectedGroup.name} - בחר קטגוריה
                  <button className="back-btn" onClick={() => setModalStep('group')}>
                    ← חזור
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
                    + קטגוריה חדשה
                  </button>
                </div>
                {isAddingCategory && (
                  <div className="add-form">
                    <input
                      placeholder="שם הקטגוריה החדשה"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button onClick={addNewCategory}>צור</button>
                  </div>
                )}
              </>
            )}

            {modalStep === 'amount' && selectedCategory && (
              <>
                <h3>
                  {selectedCategory.name} - סכום
                  <button className="back-btn" onClick={() => setModalStep('category')}>
                    ← חזור
                  </button>
                </h3>
                <div className="amount-form">
                  <input
                    type="number"
                    placeholder="סכום"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    autoFocus
                  />
                  <button className="btn-primary" onClick={submitTransaction}>
                    שמור
                  </button>
                </div>
              </>
            )}

            <button className="close-btn" onClick={closeModal}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
