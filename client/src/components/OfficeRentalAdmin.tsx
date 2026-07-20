import React, { useState, useEffect, useRef } from 'react'
import { db, storage } from '../firebase'
import {
  collection, doc, addDoc, setDoc, deleteDoc, updateDoc,
  onSnapshot, query, orderBy, getDoc
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalizeImageUrl(url: string): string {
  const m = url.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{20,})/)
  if (m && url.includes('drive.google.com')) {
    return `https://lh3.googleusercontent.com/d/${m[1]}`
  }
  return url
}

// ─── Types ────────────────────────────────────────────────────────────────────
type OfficeColor = '#6366F1' | '#10B981' | '#F59E0B' | '#EF4444' | '#8B5CF6' | '#EC4899'
export type Office = {
  id: string; name: string; description: string; pricePerDay: number
  capacity: number; amenities: string; color: OfficeColor; isActive: boolean
  images?: string[]; videoUrl?: string
}
export type BookingStatus = 'pending_approval' | 'confirmed' | 'rejected' | 'cancelled'
export type Booking = {
  id: string; officeId: string; officeName: string; renterName: string
  renterEmail: string; renterPhone: string; startDate: string; endDate: string
  totalDays: number; totalAmount: number; status: BookingStatus; notes: string; createdAt: string
}
type Settings = { businessName: string; phone: string; paymentInfo: string; logoUrl?: string; slogan?: string; colorFrom?: string; colorTo?: string; colorAccent?: string }

interface Props { uid: string }

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS: OfficeColor[] = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
export const PALETTES = [
  { id: 'purple', label: 'סגול',   from: '#6366F1', to: '#8B5CF6', accent: '#6366F1' },
  { id: 'blue',   label: 'כחול',   from: '#0369A1', to: '#0EA5E9', accent: '#0369A1' },
  { id: 'green',  label: 'ירוק',   from: '#059669', to: '#10B981', accent: '#059669' },
  { id: 'amber',  label: 'זהב',    from: '#B45309', to: '#F59E0B', accent: '#B45309' },
  { id: 'dark',   label: 'כהה',   from: '#111827', to: '#374151', accent: '#4F46E5' },
  { id: 'rose',   label: 'ורוד',   from: '#BE185D', to: '#EC4899', accent: '#BE185D' },
]
const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_approval: '⏳ ממתין לאישור', confirmed: '✅ מאושר',
  rejected: '❌ נדחה', cancelled: '🚫 בוטל'
}
const STATUS_BG: Record<BookingStatus, string> = {
  pending_approval: '#FEF3C7', confirmed: '#D1FAE5', rejected: '#FEE2E2', cancelled: '#F3F4F6'
}

const btn = (bg: string, color = 'white'): React.CSSProperties => ({
  background: bg, color, border: 'none', borderRadius: 10, padding: '10px 18px',
  fontWeight: 700, fontSize: 14, cursor: 'pointer'
})
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB',
  fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box'
}
const card: React.CSSProperties = {
  background: 'white', borderRadius: 14, padding: '14px 16px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 12
}
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }

// ─── Component ────────────────────────────────────────────────────────────────
export function OfficeRentalAdmin({ uid }: Props) {
  const [tab, setTab] = useState<'offices' | 'bookings' | 'settings'>('offices')
  const [offices, setOffices] = useState<Office[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [settings, setSettings] = useState<Settings>({ businessName: '', phone: '', paymentInfo: '' })
  const [editOffice, setEditOffice] = useState<Partial<Office> | null>(null)
  const [bookingFilter, setBookingFilter] = useState<'all' | BookingStatus>('pending_approval')
  const [toast, setToast] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500) }

  const uploadImages = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)
    const urls: string[] = []
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const storageRef = ref(storage, `officeMedia/${uid}/${Date.now()}_${file.name}`)
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, file)
          task.on('state_changed',
            snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => { urls.push(await getDownloadURL(task.snapshot.ref)); resolve() }
          )
        })
      }
      setEditOffice(o => ({ ...o, images: [...(o?.images || []), ...urls] }))
      showToast(`✅ ${urls.length} קובץ/ים הועלו`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('שגיאה בהעלאה: ' + msg + '\n\nוודא שהפעלת Firebase Storage בקונסול ועדכנת את ה-Rules.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeImage = async (url: string) => {
    try { await deleteObject(ref(storage, url)) } catch { /* already deleted */ }
    setEditOffice(o => ({ ...o, images: (o?.images || []).filter(u => u !== url) }))
  }
  const officesRef = collection(db, 'officeSpaces', uid, 'offices')
  const bookingsRef = collection(db, 'officeSpaces', uid, 'bookings')
  const settingsDocRef = doc(db, 'officeSpaces', uid, 'meta', 'settings')

  useEffect(() => {
    const unsubO = onSnapshot(officesRef, s => setOffices(s.docs.map(d => ({ id: d.id, ...d.data() } as Office))))
    const unsubB = onSnapshot(query(bookingsRef, orderBy('createdAt', 'desc')), s =>
      setBookings(s.docs.map(d => ({ id: d.id, ...d.data() } as Booking))))
    getDoc(settingsDocRef).then(d => { if (d.exists()) setSettings(d.data() as Settings) })
    return () => { unsubO(); unsubB() }
  }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Office CRUD ──────────────────────────────────────────────────────────
  const saveOffice = async () => {
    if (!editOffice) return
    try {
      const { id, ...data } = editOffice as Office
      if (id) await updateDoc(doc(db, 'officeSpaces', uid, 'offices', id), data)
      else await addDoc(officesRef, { ...data, isActive: true })
      setEditOffice(null); showToast('✅ המשרד נשמר')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('שגיאה בשמירה: ' + msg)
    }
  }
  const deleteOffice = async (id: string) => {
    if (!confirm('למחוק את המשרד?')) return
    await deleteDoc(doc(db, 'officeSpaces', uid, 'offices', id))
    showToast('🗑️ המשרד נמחק')
  }
  const toggleOffice = async (o: Office) =>
    updateDoc(doc(db, 'officeSpaces', uid, 'offices', o.id), { isActive: !o.isActive })

  // ─── Booking actions ──────────────────────────────────────────────────────
  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    await updateDoc(doc(db, 'officeSpaces', uid, 'bookings', id), { status })
    showToast(status === 'confirmed' ? '✅ הזמנה אושרה' : '❌ הזמנה נדחתה')
  }

  // ─── Settings ─────────────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSavingSettings(true)
    await setDoc(settingsDocRef, settings)
    setSavingSettings(false); showToast('✅ הגדרות נשמרו')
  }

  const bookingLink = `${window.location.origin}/?book=${uid}`
  const filteredBookings = bookingFilter === 'all' ? bookings : bookings.filter(b => b.status === bookingFilter)
  const pendingCount = bookings.filter(b => b.status === 'pending_approval').length

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'offices', label: '🏢 משרדים' },
    { id: 'bookings', label: `📅 הזמנות${pendingCount ? ` (${pendingCount})` : ''}` },
    { id: 'settings', label: '⚙️ הגדרות' },
  ] as const

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F9FAFB', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', background: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1F2937', marginBottom: 12 }}>
          🏢 ניהול השכרות משרדים
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 14px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: tab === t.id ? '#6366F1' : '#F3F4F6',
              color: tab === t.id ? 'white' : '#6B7280'
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ── Offices Tab ── */}
        {tab === 'offices' && (
          <div>
            <button onClick={() => setEditOffice({ color: '#6366F1', isActive: true, pricePerDay: 0, capacity: 1 })}
              style={{ ...btn('#6366F1'), width: '100%', marginBottom: 16 }}>
              + הוספת משרד / חדר חדש
            </button>

            {offices.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
                <div>טרם הוספת משרדים</div>
              </div>
            )}

            {offices.map(o => (
              <div key={o.id} style={{ ...card, borderRight: `4px solid ${o.color}`, opacity: o.isActive ? 1 : 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1F2937' }}>{o.name}</div>
                    {o.description && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{o.description}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ background: '#EEF2FF', color: '#4338CA', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>
                        ₪{o.pricePerDay.toLocaleString('he-IL')} / יום
                      </span>
                      {o.capacity > 0 && <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 6, padding: '3px 8px', fontSize: 12 }}>
                        👥 {o.capacity} אנשים
                      </span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => toggleOffice(o)} style={{
                      ...btn(o.isActive ? '#FEF3C7' : '#D1FAE5', o.isActive ? '#92400E' : '#065F46'),
                      padding: '6px 10px', fontSize: 12
                    }}>{o.isActive ? 'השבת' : 'הפעל'}</button>
                    <button onClick={() => setEditOffice(o)} style={{ ...btn('#EEF2FF', '#4338CA'), padding: '6px 10px', fontSize: 12 }}>עריכה</button>
                    <button onClick={() => deleteOffice(o.id)} style={{ ...btn('#FEE2E2', '#DC2626'), padding: '6px 10px', fontSize: 12 }}>מחק</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Bookings Tab ── */}
        {tab === 'bookings' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {(['all', 'pending_approval', 'confirmed', 'rejected'] as const).map(f => (
                <button key={f} onClick={() => setBookingFilter(f)} style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12,
                  background: bookingFilter === f ? '#6366F1' : '#F3F4F6',
                  color: bookingFilter === f ? 'white' : '#6B7280'
                }}>
                  {f === 'all' ? `הכל (${bookings.length})` : STATUS_LABEL[f]}
                  {f === 'pending_approval' && pendingCount > 0 && <span style={{ background: '#EF4444', color: 'white', borderRadius: 99, padding: '1px 6px', fontSize: 11, marginRight: 4 }}>{pendingCount}</span>}
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                <div>אין הזמנות</div>
              </div>
            )}

            {filteredBookings.map(b => (
              <div key={b.id} style={{ ...card, borderRight: `4px solid ${b.status === 'confirmed' ? '#10B981' : b.status === 'rejected' ? '#EF4444' : '#F59E0B'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{b.renterName}</span>
                  <span style={{ background: STATUS_BG[b.status], color: '#1F2937', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>
                  <div>🏢 {b.officeName}</div>
                  <div>📅 {b.startDate} → {b.endDate} ({b.totalDays} ימים)</div>
                  <div>💰 ₪{b.totalAmount.toLocaleString('he-IL')}</div>
                  <div>📞 {b.renterPhone}</div>
                  {b.renterEmail && <div>✉️ {b.renterEmail}</div>}
                  {b.notes && <div>📝 {b.notes}</div>}
                </div>
                {b.status === 'pending_approval' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => updateBookingStatus(b.id, 'confirmed')}
                      style={{ ...btn('#10B981'), flex: 1 }}>✅ אשר הזמנה</button>
                    <button onClick={() => updateBookingStatus(b.id, 'rejected')}
                      style={{ ...btn('#EF4444'), flex: 1 }}>❌ דחה</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Settings Tab ── */}
        {tab === 'settings' && (
          <div>
            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: '#1F2937' }}>פרטי העסק</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>שם העסק</label>
                <input style={input} value={settings.businessName}
                  onChange={e => setSettings(s => ({ ...s, businessName: e.target.value }))}
                  placeholder="שם העסק שיוצג לשוכרים" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>טלפון ליצירת קשר</label>
                <input style={input} value={settings.phone}
                  onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))}
                  placeholder="050-0000000" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>לוגו (קישור לתמונה)</label>
                <input style={input} value={settings.logoUrl || ''}
                  onChange={e => setSettings(s => ({ ...s, logoUrl: e.target.value }))}
                  placeholder="https://... (קישור ישיר לתמונה)" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label}>סלוגן / תיאור (מופיע בכותרת)</label>
                <input style={input} value={settings.slogan || ''}
                  onChange={e => setSettings(s => ({ ...s, slogan: e.target.value }))}
                  placeholder="משרדים מאובזרים להשכרה יומית" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label}>פרטי תשלום (מספר ביט / פרטי בנק)</label>
                <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={settings.paymentInfo}
                  onChange={e => setSettings(s => ({ ...s, paymentInfo: e.target.value }))}
                  placeholder="לדוגמה: ביט 050-0000000 או העברה בנקאית..." />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={label}>🎨 צבעי האתר</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                  {[{ key: 'colorFrom' as const, label: 'כותרת (התחלה)', def: '#6366F1' },
                    { key: 'colorTo'   as const, label: 'כותרת (סיום)',   def: '#8B5CF6' },
                    { key: 'colorAccent' as const, label: 'כפתורים',        def: '#6366F1' }].map(({ key, label: lbl, def }) => (
                    <div key={key}>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4, textAlign: 'center' }}>{lbl}</div>
                      <input type="color" value={settings[key] || def}
                        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                        style={{ width: '100%', height: 44, borderRadius: 8, border: '1.5px solid #E5E7EB', cursor: 'pointer', padding: 2, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>קיצורי דרך מוכנים:</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PALETTES.map(p => (
                    <button key={p.id} type="button" title={p.label}
                      onClick={() => setSettings(s => ({ ...s, colorFrom: p.from, colorTo: p.to, colorAccent: p.accent }))}
                      style={{ background: `linear-gradient(135deg,${p.from},${p.to})`, border: 'none', borderRadius: 8, height: 36, width: 52, cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>💡 כותרת התחלה עד סיום = gradient בכותרת. כפתורים = צבע הדגשה.</div>
              </div>
              <button onClick={saveSettings} style={{ ...btn('#6366F1'), width: '100%' }}>
                {savingSettings ? 'שומר...' : '💾 שמירת הגדרות'}
              </button>
            </div>

            <div style={card}>
              <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: '#1F2937' }}>🔗 קישור הזמנה לשוכרים</h3>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, lineHeight: 1.6 }}>
                שתפו קישור זה עם שוכרים פוטנציאליים. הם יראו רק את המשרדים שלכם ויוכלו להזמין בקלות.
              </div>
              <div style={{ background: '#F3F4F6', borderRadius: 10, padding: '10px 12px', fontSize: 12, wordBreak: 'break-all', color: '#374151', marginBottom: 10 }}>
                {bookingLink}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(bookingLink); showToast('📋 הקישור הועתק!') }}
                style={{ ...btn('#6366F1'), width: '100%' }}>
                📋 העתק קישור
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Office Modal */}
      {editOffice !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '90dvh', overflowY: 'auto', direction: 'rtl' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>
              {editOffice.id ? 'עריכת משרד' : 'משרד / חדר חדש'}
            </h3>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>שם המשרד / החדר *</label>
              <input style={input} value={editOffice.name || ''} onChange={e => setEditOffice(o => ({ ...o, name: e.target.value }))} placeholder='למשל: "משרד A" / "חדר ישיבות"' />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>תיאור</label>
              <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }} value={editOffice.description || ''}
                onChange={e => setEditOffice(o => ({ ...o, description: e.target.value }))} placeholder="תיאור קצר..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={label}>מחיר ליום (₪)</label>
                <input style={input} type="number" min={0} value={editOffice.pricePerDay ?? ''} onChange={e => setEditOffice(o => ({ ...o, pricePerDay: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={label}>קיבולת (אנשים)</label>
                <input style={input} type="number" min={1} value={editOffice.capacity ?? ''} onChange={e => setEditOffice(o => ({ ...o, capacity: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={label}>פרטים / ציוד (מיזוג, מקרן, ...)</label>
              <input style={input} value={editOffice.amenities || ''} onChange={e => setEditOffice(o => ({ ...o, amenities: e.target.value }))} placeholder="מיזוג אוויר, מקרן, Wi-Fi..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>צבע</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setEditOffice(o => ({ ...o, color: c }))} style={{
                    width: 32, height: 32, borderRadius: '50%', background: c, border: editOffice.color === c ? '3px solid #1F2937' : '2px solid transparent', cursor: 'pointer'
                  }} />
                ))}
              </div>
            </div>

            {/* Images */}
            <div style={{ marginBottom: 14 }}>
              <label style={label}>📸 תמונות המשרד</label>

              {/* Option A: URL input (works without Blaze plan) */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input style={{ ...input, flex: 1 }} id="img-url-input"
                  placeholder="הדבק קישור לתמונה (Google Drive, Dropbox...)"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) { setEditOffice(o => ({ ...o, images: [...(o?.images || []), normalizeImageUrl(val)] }));(e.target as HTMLInputElement).value = '' }
                    }
                  }} />
                <button type="button" style={{ ...btn('#10B981'), whiteSpace: 'nowrap' }}
                  onClick={() => {
                    const el = document.getElementById('img-url-input') as HTMLInputElement
                    const val = el?.value.trim()
                    if (val) { setEditOffice(o => ({ ...o, images: [...(o?.images || []), normalizeImageUrl(val)] })); el.value = '' }
                  }}>+ הוסף</button>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>
                💡 Google Drive: שתפי → "כל מי שיש לו הקישור" → העתיקי והדביקי — הקישור ינורמל אוטומטית ✅
              </div>

              {/* Option B: File upload (requires Firebase Blaze plan) */}
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => e.target.files && uploadImages(e.target.files)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ ...btn(uploading ? '#9CA3AF' : '#F3F4F6', uploading ? 'white' : '#374151'), width: '100%', marginBottom: 4, fontSize: 13 }}>
                {uploading ? `⬆️ מעלה... ${uploadProgress}%` : '📁 העלה קובץ מהמכשיר (דורש שדרוג Blaze)'}
              </button>
              {uploading && (
                <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', background: '#6366F1', width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
                </div>
              )}

              {/* Image previews */}
              {(editOffice.images || []).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
                  {(editOffice.images || []).map((url, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#F3F4F6' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <button type="button" onClick={() => removeImage(url)} style={{
                        position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.65)',
                        color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22,
                        cursor: 'pointer', fontSize: 13, lineHeight: 1
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video URL */}
            <div style={{ marginBottom: 16 }}>
              <label style={label}>🎬 קישור לסרטון YouTube (אופציונלי)</label>
              <input style={input} value={editOffice.videoUrl || ''}
                onChange={e => setEditOffice(o => ({ ...o, videoUrl: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..." />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveOffice} disabled={!editOffice.name || uploading}
                style={{ ...btn(!editOffice.name || uploading ? '#9CA3AF' : '#6366F1'), flex: 2 }}>
                💾 שמור
              </button>
              <button onClick={() => setEditOffice(null)} style={{ ...btn('#F3F4F6', '#374151'), flex: 1 }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1F2937', color: 'white', padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 2000, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
