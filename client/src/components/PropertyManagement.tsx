import React, { useState, useEffect } from 'react'
import { useFirebaseSync } from '../hooks/useFirebaseSync'

/* ─── Types ─────────────────────────────────────────────────── */
export type Property = {
  id: string
  name: string         // e.g. "דירה ת"א"
  address: string
  tenantName: string
  tenantPhone: string
  tenantEmail: string
  contractStart: string  // YYYY-MM-DD
  contractEnd: string    // YYYY-MM-DD
  monthlyRent: number
  deposit: number
  notes: string
  payments: Record<string, 'paid' | 'pending' | 'late'>  // key: YYYY-MM
}

type View = 'list' | 'detail' | 'edit'

const EMPTY_PROPERTY: Omit<Property, 'id'> = {
  name: '', address: '', tenantName: '', tenantPhone: '', tenantEmail: '',
  contractStart: '', contractEnd: '', monthlyRent: 0, deposit: 0, notes: '', payments: {}
}

/* ─── Helpers ────────────────────────────────────────────────── */
const currentYM = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const ymLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  return `${months[m - 1]} ${y}`
}

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)

const getLast12Months = (): string[] => {
  const result: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

const getNext6Months = (): string[] => {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

const contractDaysLeft = (contractEnd: string): number =>
  daysBetween(new Date().toISOString().slice(0, 10), contractEnd)

/* ─── Component ──────────────────────────────────────────────── */
type Props = {
  uid: string | null
  onBack: () => void
}

export function PropertyManagement({ uid, onBack }: Props) {
  const lsKey = (k: string) => uid ? `bva_${uid.slice(0,8)}_pm_${k}` : `bva_local_pm_${k}`

  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem(lsKey('properties'))
    return saved ? JSON.parse(saved) : []
  })
  const [view, setView] = useState<View>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Omit<Property, 'id'>>(EMPTY_PROPERTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [paymentMonthOpen, setPaymentMonthOpen] = useState<string | null>(null) // property id
  const [toast, setToast] = useState<string | null>(null)
  const [sendMenuOpen, setSendMenuOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewEndDate, setRenewEndDate] = useState('')
  const [renewRent, setRenewRent] = useState('')

  // Firebase sync
  useFirebaseSync(uid, 'pm_properties', properties, v => setProperties(v as Property[]))

  // Persist locally too
  useEffect(() => {
    localStorage.setItem(lsKey('properties'), JSON.stringify(properties))
  }, [properties])

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 3000)
  }

  const selectedProp = properties.find(p => p.id === selectedId) ?? null

  /* ── CRUD ── */
  const openAdd = () => {
    setEditingId(null)
    setEditForm(EMPTY_PROPERTY)
    setView('edit')
  }

  const openEdit = (p: Property) => {
    setEditingId(p.id)
    setEditForm({ ...p, payments: { ...p.payments } })
    setView('edit')
  }

  const saveForm = () => {
    if (!editForm.tenantName.trim() && !editForm.address.trim()) return
    if (editingId) {
      setProperties(prev => prev.map(p => p.id === editingId ? { ...editForm, id: editingId } : p))
    } else {
      const id = Date.now().toString()
      setProperties(prev => [...prev, { ...editForm, id }])
    }
    setView(editingId ? 'detail' : 'list')
    showToast('✓ נשמר בהצלחה')
  }

  const deleteProperty = (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id))
    setView('list'); setSelectedId(null); setDeleteConfirm(null)
    showToast('נמחק')
  }

  const markPayment = (propId: string, ym: string, status: 'paid' | 'pending' | 'late') => {
    setProperties(prev => prev.map(p =>
      p.id === propId ? { ...p, payments: { ...p.payments, [ym]: status } } : p
    ))
    setPaymentMonthOpen(null)
    showToast(status === 'paid' ? '✓ סומן כשולם' : status === 'late' ? 'סומן כמאחר' : 'סומן כממתין')
  }

  const sendWhatsApp = (phone: string, propName: string, month: string, amount: number) => {
    const msg = encodeURIComponent(`שלום, תזכורת לתשלום שכר דירה - ${propName}\nחודש: ${ymLabel(month)}\nסכום: ₪${amount.toLocaleString()}\nתודה 🙏`)
    const clean = phone.replace(/\D/g, '').replace(/^0/, '972')
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
    setSendMenuOpen(false)
  }

  const sendEmail = (email: string, propName: string, month: string, amount: number) => {
    const subject = encodeURIComponent(`תזכורת תשלום שכר דירה - ${propName}`)
    const body = encodeURIComponent(`שלום,\n\nתזכורת לתשלום שכר דירה עבור ${propName}.\n\nחודש: ${ymLabel(month)}\nסכום לתשלום: ₪${amount.toLocaleString()}\n\nתודה`)
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
    setSendMenuOpen(false)
  }

  const renewContract = () => {
    if (!selectedProp || !renewEndDate) return
    setProperties(prev => prev.map(p =>
      p.id === selectedProp.id
        ? { ...p, contractEnd: renewEndDate, monthlyRent: renewRent ? Number(renewRent) : p.monthlyRent }
        : p
    ))
    setRenewOpen(false); setRenewEndDate(''); setRenewRent('')
    showToast('✓ חוזה חודש בהצלחה')
  }

  /* ── STATUS COLORS ── */
  const statusColor = (s?: 'paid' | 'pending' | 'late') =>
    s === 'paid' ? '#22C55E' : s === 'late' ? '#EF4444' : '#F59E0B'

  const statusLabel = (s?: 'paid' | 'pending' | 'late') =>
    s === 'paid' ? '✓ שולם' : s === 'late' ? '⚠ מאחר' : '⏳ ממתין'

  const contractStatus = (p: Property) => {
    const days = contractDaysLeft(p.contractEnd)
    if (days < 0) return { color: '#EF4444', label: 'פג תוקף' }
    if (days <= 60) return { color: '#F59E0B', label: `${days} ימים לפקיעה` }
    return { color: '#22C55E', label: `${days} ימים לפקיעה` }
  }

  const currMonth = currentYM()
  const last12 = getLast12Months()
  const next6 = getNext6Months()

  /* ─────────────── RENDER ─────────────────────────────────── */

  /* ── EDIT FORM ── */
  if (view === 'edit') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F9FAFB' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => setView(editingId ? 'detail' : 'list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6B7280', padding: '0 4px' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>{editingId ? 'עריכת נכס' : 'נכס חדש'}</span>
        <button onClick={saveForm} style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: 10, padding: '8px 20px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>שמור</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {([
          { label: 'שם קצר לנכס', field: 'name', placeholder: 'דירה ת"א', type: 'text' },
          { label: 'כתובת מלאה', field: 'address', placeholder: 'רחוב הרצל 5, תל אביב', type: 'text' },
        ] as const).map(({ label, field, placeholder }) => (
          <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>{label}</span>
            <input value={(editForm as any)[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder} style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 15 }} />
          </label>
        ))}

        <div style={{ borderRadius: 12, background: 'white', padding: 14, border: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>👤 פרטי שוכר</div>
          {([
            { label: 'שם שוכר', field: 'tenantName', placeholder: 'ישראל ישראלי', type: 'text' },
            { label: 'טלפון', field: 'tenantPhone', placeholder: '050-1234567', type: 'tel' },
            { label: 'דוא"ל', field: 'tenantEmail', placeholder: 'email@example.com', type: 'email' },
          ] as const).map(({ label, field, placeholder, type }) => (
            <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>{label}</span>
              <input value={(editForm as any)[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={placeholder} type={type} style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 15 }} />
            </label>
          ))}
        </div>

        <div style={{ borderRadius: 12, background: 'white', padding: 14, border: '1px solid #E5E7EB' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>📋 פרטי חוזה</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>תחילת חוזה</span>
              <input type="date" value={editForm.contractStart} onChange={e => setEditForm(f => ({ ...f, contractStart: e.target.value }))}
                style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 10px', fontSize: 14 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>סוף חוזה</span>
              <input type="date" value={editForm.contractEnd} onChange={e => setEditForm(f => ({ ...f, contractEnd: e.target.value }))}
                style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 10px', fontSize: 14 }} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>שכ"ד חודשי (₪)</span>
              <input type="number" value={editForm.monthlyRent || ''} onChange={e => setEditForm(f => ({ ...f, monthlyRent: Number(e.target.value) }))}
                placeholder="5000" style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 10px', fontSize: 15 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>פיקדון (₪)</span>
              <input type="number" value={editForm.deposit || ''} onChange={e => setEditForm(f => ({ ...f, deposit: Number(e.target.value) }))}
                placeholder="10000" style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 10px', fontSize: 15 }} />
            </label>
          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>הערות</span>
          <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="הערות נוספות..." rows={3}
            style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 15, resize: 'none' }} />
        </label>

        {editingId && (
          <button onClick={() => setDeleteConfirm(editingId)}
            style={{ marginTop: 8, padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontWeight: 600, cursor: 'pointer' }}>
            🗑 מחק נכס
          </button>
        )}
      </div>

      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', padding: 24, zIndex: 101 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>מחק נכס?</div>
            <div style={{ color: '#6B7280', marginBottom: 20 }}>פעולה זו אינה ניתנת לשחזור.</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 14, borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
              <button onClick={() => deleteProperty(deleteConfirm)} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, cursor: 'pointer' }}>מחק</button>
            </div>
          </div>
        </>
      )}
    </div>
  )

  /* ── DETAIL VIEW ── */
  if (view === 'detail' && selectedProp) {
    const p = selectedProp
    const cStatus = contractStatus(p)
    const allMonths = [...new Set([...last12, ...next6])]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F9FAFB' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6B7280', padding: '0 4px' }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>{p.name || p.address.split(',')[0]}</span>
          <button onClick={() => openEdit(p)} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>ערוך</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Address + Status */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>📍 {p.address}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 12, background: cStatus.color + '20', color: cStatus.color, borderRadius: 20, padding: '3px 10px', fontWeight: 700 }}>{cStatus.label}</span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {p.contractStart && p.contractEnd ? `${p.contractStart.slice(0,7)} → ${p.contractEnd.slice(0,7)}` : ''}
              </span>
            </div>
          </div>

          {/* Tenant Info */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>👤 שוכר</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{p.tenantName}</div>
            {p.tenantPhone && <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 2 }}>📞 {p.tenantPhone}</div>}
            {p.tenantEmail && <div style={{ color: '#6B7280', fontSize: 14 }}>✉ {p.tenantEmail}</div>}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, position: 'relative' }}>
              <button onClick={() => setSendMenuOpen(v => !v)}
                style={{ flex: 1, padding: '10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, color: '#1D4ED8', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                📤 שלח הודעה
              </button>
              <button onClick={() => { setRenewEndDate(p.contractEnd); setRenewRent(String(p.monthlyRent)); setRenewOpen(true) }}
                style={{ flex: 1, padding: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, color: '#15803D', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                🔄 חדש חוזה
              </button>

              {sendMenuOpen && (
                <>
                  <div onClick={() => setSendMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                  <div style={{ position: 'absolute', top: '110%', right: 0, left: 0, background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: 8, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => sendWhatsApp(p.tenantPhone, p.name || p.address, currMonth, p.monthlyRent)}
                      style={{ padding: '12px 14px', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', borderRadius: 8, fontWeight: 600, fontSize: 14, color: '#059669' }}>
                      💬 WhatsApp — תזכורת תשלום
                    </button>
                    {p.tenantEmail && <button onClick={() => sendEmail(p.tenantEmail, p.name || p.address, currMonth, p.monthlyRent)}
                      style={{ padding: '12px 14px', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', borderRadius: 8, fontWeight: 600, fontSize: 14, color: '#4F46E5' }}>
                      📧 מייל — תזכורת תשלום
                    </button>}
                    {p.tenantPhone && <button onClick={() => { window.location.href = `tel:${p.tenantPhone}`; setSendMenuOpen(false) }}
                      style={{ padding: '12px 14px', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer', borderRadius: 8, fontWeight: 600, fontSize: 14, color: '#374151' }}>
                      📞 התקשר
                    </button>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contract */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>📋 חוזה</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'שכ"ד חודשי', val: `₪${p.monthlyRent.toLocaleString()}`, big: true },
                { label: 'פיקדון', val: `₪${p.deposit.toLocaleString()}` },
                { label: 'תחילת חוזה', val: p.contractStart ? new Date(p.contractStart).toLocaleDateString('he-IL') : '—' },
                { label: 'סוף חוזה', val: p.contractEnd ? new Date(p.contractEnd).toLocaleDateString('he-IL') : '—' },
              ].map(({ label, val, big }) => (
                <div key={label} style={{ background: '#F9FAFB', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: big ? 18 : 15, color: '#111827' }}>{val}</div>
                </div>
              ))}
            </div>
            {p.notes && <div style={{ marginTop: 12, padding: 10, background: '#FFF7ED', borderRadius: 10, fontSize: 13, color: '#92400E' }}>📝 {p.notes}</div>}
          </div>

          {/* Payment Tracking */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>💳 מעקב תשלומים</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allMonths.map(ym => {
                const status = p.payments[ym]
                const isCurr = ym === currMonth
                const isFuture = ym > currMonth
                return (
                  <div key={ym} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: isCurr ? '#EFF6FF' : '#F9FAFB', border: isCurr ? '1px solid #BFDBFE' : '1px solid transparent' }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: isCurr ? 700 : 500, color: isCurr ? '#1D4ED8' : '#374151' }}>{ymLabel(ym)}</span>
                    {!isFuture ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['paid', 'pending', 'late'] as const).map(s => (
                          <button key={s} onClick={() => markPayment(p.id, ym, s)}
                            style={{
                              padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                              background: status === s ? statusColor(s) : '#E5E7EB',
                              color: status === s ? 'white' : '#6B7280',
                            }}>
                            {s === 'paid' ? '✓' : s === 'late' ? '⚠' : '⏳'}
                          </button>
                        ))}
                        {status && <span style={{ fontSize: 12, color: statusColor(status), fontWeight: 700, padding: '5px 4px' }}>{statusLabel(status)}</span>}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>טרם הגיע</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Renew Contract Sheet */}
        {renewOpen && (
          <>
            <div onClick={() => setRenewOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', padding: 24, zIndex: 101 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>🔄 חידוש חוזה</div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>תאריך סיום חוזה חדש</span>
                <input type="date" value={renewEndDate} onChange={e => setRenewEndDate(e.target.value)}
                  style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 15 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>שכ"ד חדש (השאר ריק להשאיר כפי שהוא)</span>
                <input type="number" value={renewRent} onChange={e => setRenewRent(e.target.value)}
                  placeholder={`כרגע ₪${p.monthlyRent.toLocaleString()}`}
                  style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 15 }} />
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setRenewOpen(false)} style={{ flex: 1, padding: 14, borderRadius: 10, border: '1px solid #E5E7EB', background: 'white', fontWeight: 600, cursor: 'pointer' }}>ביטול</button>
                <button onClick={renewContract} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: '#6366F1', color: 'white', fontWeight: 700, cursor: 'pointer' }}>עדכן חוזה</button>
              </div>
            </div>
          </>
        )}

        {toast && <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#1F2937', color: 'white', padding: '10px 20px', borderRadius: 20, fontWeight: 600, zIndex: 200, whiteSpace: 'nowrap' }}>{toast}</div>}
      </div>
    )
  }

  /* ── LIST VIEW ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F9FAFB' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6B7280', padding: '0 4px' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>🏢 ניהול נכסים</span>
        <button onClick={openAdd} style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>+ נכס</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#374151' }}>אין נכסים עדיין</div>
            <div style={{ fontSize: 14 }}>לחץ "נכס +" להוספת נכס ראשון</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {properties.map(p => {
              const currStatus = p.payments[currMonth]
              const cStatus = contractStatus(p)
              const unpaidCount = last12.filter(m => m <= currMonth && p.payments[m] !== 'paid').length
              return (
                <button key={p.id} onClick={() => { setSelectedId(p.id); setView('detail') }}
                  style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, textAlign: 'right', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{p.name || p.address.split(',')[0]}</span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{p.address}</span>
                    </div>
                    <span style={{ fontSize: 12, background: statusColor(currStatus) + '20', color: statusColor(currStatus), borderRadius: 20, padding: '3px 10px', fontWeight: 700, marginRight: 8, whiteSpace: 'nowrap' }}>
                      {statusLabel(currStatus)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, background: cStatus.color + '20', color: cStatus.color, borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>{cStatus.label}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>₪{p.monthlyRent.toLocaleString()}/חודש</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{p.tenantName}</span>
                    </div>
                  </div>
                  {unpaidCount > 0 && (
                    <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                      ⚠ {unpaidCount} חודשים לא שולמו ב-12 חודשים האחרונים
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {properties.length > 0 && (
        <div style={{ background: 'white', borderTop: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{properties.length}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>נכסים</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#22C55E' }}>₪{properties.reduce((s, p) => s + p.monthlyRent, 0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>סה"כ שכ"ד חודשי</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: properties.filter(p => p.payments[currMonth] === 'paid').length === properties.length ? '#22C55E' : '#F59E0B' }}>
              {properties.filter(p => p.payments[currMonth] === 'paid').length}/{properties.length}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>שילמו החודש</div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1F2937', color: 'white', padding: '10px 20px', borderRadius: 20, fontWeight: 600, zIndex: 200, whiteSpace: 'nowrap' }}>{toast}</div>}
    </div>
  )
}
