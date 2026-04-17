import { useMemo, useState } from 'react'
import './MonthlyOverview.css'

type Tx = {
  id: string
  category: string
  amount: number
}

type Category = {
  id: string
  name: string
  budget: number
}

type Group = {
  id: string
  name: string
  color: string
  categories: Category[]
}

const months = ['2024-01', '2024-02', '2024-03']

const groups: Group[] = [
  {
    id: 'g1',
    name: 'הוצאות רכב',
    color: '#FF6B6B',
    categories: [
      { id: 'c1', name: 'דלק', budget: 800 },
      { id: 'c2', name: 'טיפולים', budget: 500 },
    ],
  },
  {
    id: 'g2',
    name: 'הוצאות דירה',
    color: '#4ECDC4',
    categories: [
      { id: 'c3', name: 'שכירות', budget: 3500 },
      { id: 'c4', name: 'חשמל', budget: 350 },
    ],
  },
]

export default function MonthlyOverview() {
  const [month, setMonth] = useState(months[0])
  const [txs, setTxs] = useState<Record<string, Tx[]>>({
    '2024-01': [
      { id: 't1', category: 'c1', amount: 450 },
      { id: 't2', category: 'c3', amount: 3500 },
    ],
  })

  const openingBalance = 5000

  const monthTxs = txs[month] ?? []

  const totalsByCategory = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of monthTxs) m[t.category] = (m[t.category] ?? 0) + t.amount
    return m
  }, [monthTxs])

  const totalActual = useMemo(
    () => monthTxs.reduce((sum, t) => sum + t.amount, 0),
    [monthTxs],
  )

  const totalBudget = useMemo(() => {
    return groups.reduce(
      (sum, g) => sum + g.categories.reduce((s, c) => s + c.budget, 0),
      0,
    )
  }, [])

  const remaining = openingBalance - totalActual

  const addTx = (categoryId: string) => {
    const raw = window.prompt('סכום להוספה')
    if (!raw) return
    const amount = Number(raw)
    if (!Number.isFinite(amount)) return

    const next: Tx = { id: String(Date.now()), category: categoryId, amount }
    setTxs((prev) => {
      const prevMonth = prev[month] ?? []
      return { ...prev, [month]: [...prevMonth, next] }
    })
  }

  return (
    <div className="mo">
      <div className="mo-months">
        {months.map((m) => (
          <button
            key={m}
            className={m === month ? 'mo-month active' : 'mo-month'}
            onClick={() => setMonth(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mo-header">
        <div className="mo-metric">
          <div className="label">יתרת פתיחה</div>
          <div className="value">₪{openingBalance.toLocaleString()}</div>
        </div>
        <div className="mo-metric">
          <div className="label">תקציב</div>
          <div className="value">₪{totalBudget.toLocaleString()}</div>
        </div>
        <div className="mo-metric">
          <div className="label">בפועל</div>
          <div className="value">₪{totalActual.toLocaleString()}</div>
        </div>
        <div className={remaining >= 0 ? 'mo-metric ok' : 'mo-metric bad'}>
          <div className="label">יתרה</div>
          <div className="value">₪{remaining.toLocaleString()}</div>
        </div>
      </div>

      <div className="mo-groups">
        {groups.map((g) => (
          <section key={g.id} className="mo-group">
            <div className="mo-groupTitle" style={{ background: g.color }}>
              {g.name}
            </div>
            <div className="mo-cats">
              {g.categories.map((c) => {
                const actual = totalsByCategory[c.id] ?? 0
                const variance = c.budget - actual
                const status = actual > c.budget ? 'danger' : actual > c.budget * 0.8 ? 'warn' : 'good'

                return (
                  <div key={c.id} className={`mo-cat ${status}`}>
                    <div className="mo-catTop">
                      <div className="name">{c.name}</div>
                      <button className="add" onClick={() => addTx(c.id)}>
                        +
                      </button>
                    </div>
                    <div className="mo-row">
                      <span className="k">תקציב</span>
                      <span className="v">₪{c.budget.toLocaleString()}</span>
                    </div>
                    <div className="mo-row">
                      <span className="k">בפועל</span>
                      <span className="v">₪{actual.toLocaleString()}</span>
                    </div>
                    <div className="mo-row">
                      <span className="k">הפרש</span>
                      <span className={variance >= 0 ? 'v pos' : 'v neg'}>
                        ₪{variance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
