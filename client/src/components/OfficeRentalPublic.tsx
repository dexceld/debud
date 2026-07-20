import React, { useState, useEffect, useLayoutEffect } from 'react'
import { db } from '../firebase'
import { collection, doc, addDoc, onSnapshot, getDoc } from 'firebase/firestore'
import type { Office, Booking } from './OfficeRentalAdmin'
import { PALETTES } from './OfficeRentalAdmin'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  useLayoutEffect(() => {
    const h = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return isDesktop
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeImageUrl(url: string): string {
  const m = url.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{20,})/)
  if (m && url.includes('drive.google.com')) {
    return `https://lh3.googleusercontent.com/d/${m[1]}`
  }
  return url
}

const fmt = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: string, n: number) => fmt(new Date(new Date(d).getTime() + n * 86400000))
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  let cur = start
  while (cur <= end) { dates.push(cur); cur = addDays(cur, 1) }
  return dates
}

function buildBookedSet(bookings: Booking[], officeId: string): Set<string> {
  const set = new Set<string>()
  bookings.filter(b => b.officeId === officeId && (b.status === 'confirmed' || b.status === 'pending_approval'))
    .forEach(b => getDatesInRange(b.startDate, b.endDate).forEach(d => set.add(d)))
  return set
}

// ─── Image Gallery ────────────────────────────────────────────────────────────
function OfficeImageGallery({ images, videoUrl }: { images: string[]; videoUrl?: string }) {
  const [idx, setIdx] = useState(0)
  const items = [...images.map(normalizeImageUrl)]
  if (videoUrl) items.push('__video__' + videoUrl)
  if (!items.length) return null
  const current = items[idx]
  const isVideo = current.startsWith('__video__')
  const isYouTube = isVideo && current.includes('youtube')
  const videoSrc = isVideo ? current.replace('__video__', '') : ''
  const ytId = isYouTube ? videoSrc.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] : null

  return (
    <div style={{ position: 'relative', background: '#F3F4F6', width: '100%' }} onClick={e => e.stopPropagation()}>
      <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
        {isYouTube && ytId
          ? <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
          : isVideo
            ? <video src={videoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
            : <img src={current} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        }
      </div>
      {items.length > 1 && (
        <>
          <button onClick={() => setIdx(i => (i - 1 + items.length) % items.length)} style={{
            position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>›</button>
          <button onClick={() => setIdx(i => (i + 1) % items.length)} style={{
            position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>‹</button>
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
            {items.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{
                width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
                background: i === idx ? 'white' : 'rgba(255,255,255,0.5)'
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function Calendar({
  bookedDates, selectedStart, selectedEnd, onSelect, color
}: {
  bookedDates: Set<string>; selectedStart: string | null; selectedEnd: string | null
  onSelect: (d: string) => void; color: string
}) {
  const [monthOffset, setMonthOffset] = useState(0)
  const today = fmt(new Date())
  const baseDate = new Date()
  baseDate.setDate(1)
  baseDate.setMonth(baseDate.getMonth() + monthOffset)
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const monthLabel = baseDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

  const getStyle = (dateStr: string): React.CSSProperties => {
    const isBooked = bookedDates.has(dateStr)
    const isPast = dateStr < today
    const isStart = dateStr === selectedStart
    const isEnd = dateStr === selectedEnd
    const inRange = selectedStart && selectedEnd && dateStr > selectedStart && dateStr < selectedEnd
    if (isPast || isBooked) return {
      background: isBooked ? '#FEE2E2' : '#F3F4F6',
      color: isBooked ? '#DC2626' : '#D1D5DB',
      cursor: 'not-allowed', fontWeight: isBooked ? 700 : 400
    }
    if (isStart || isEnd) return { background: color, color: 'white', fontWeight: 800 }
    if (inRange) return { background: color + '30', color: '#1F2937', fontWeight: 600 }
    return { background: 'white', color: '#1F2937', cursor: 'pointer' }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={() => setMonthOffset(m => m - 1)} disabled={monthOffset <= 0}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: monthOffset <= 0 ? 'not-allowed' : 'pointer', color: monthOffset <= 0 ? '#D1D5DB' : '#374151' }}>‹</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{monthLabel}</span>
        <button onClick={() => setMonthOffset(m => m + 1)} disabled={monthOffset >= 5}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#374151' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, textAlign: 'center' }}>
        {days.map(d => <div key={d} style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '4px 0' }}>{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isBooked = bookedDates.has(dateStr)
          const isPast = dateStr < today
          const s = getStyle(dateStr)
          return (
            <div key={day} onClick={() => !isPast && !isBooked && onSelect(dateStr)}
              style={{ padding: '7px 2px', borderRadius: 8, fontSize: 13, transition: 'all 0.1s', ...s }}>
              {day}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: '#6B7280' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#FEE2E2', marginLeft: 4 }} />תפוס</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: color, marginLeft: 4 }} />בחור</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: 'white', border: '1px solid #E5E7EB', marginLeft: 4 }} />פנוי</span>
      </div>
    </div>
  )
}

// ─── Main Public Component ────────────────────────────────────────────────────
type Step = 'offices' | 'calendar' | 'form' | 'confirm'

export function OfficeRentalPublic({ ownerId }: { ownerId: string }) {
  const isDesktop = useIsDesktop()
  const [offices, setOffices] = useState<Office[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [settings, setSettings] = useState<{ businessName: string; phone: string; paymentInfo: string; logoUrl?: string; slogan?: string; colorFrom?: string; colorTo?: string; colorAccent?: string }>({ businessName: '', phone: '', paymentInfo: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null)
  const [step, setStep] = useState<Step>('offices')
  const [selStart, setSelStart] = useState<string | null>(null)
  const [selEnd, setSelEnd] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [filterType, setFilterType] = useState<string>('הכל')
  const [bookingId, setBookingId] = useState<string | null>(null)

  useEffect(() => {
    if (!ownerId) return
    Promise.all([
      new Promise<void>(res => {
        const unsubO = onSnapshot(collection(db, 'officeSpaces', ownerId, 'offices'), s => {
          setOffices(s.docs.map(d => ({ id: d.id, ...d.data() } as Office)).filter(o => o.isActive))
          setLoading(false); res()
        }, () => { setError('לא נמצאו משרדים'); setLoading(false); res() })
        return unsubO
      }),
      new Promise<void>(res => {
        const unsubB = onSnapshot(collection(db, 'officeSpaces', ownerId, 'bookings'), s => {
          setBookings(s.docs.map(d => ({ id: d.id, ...d.data() } as Booking))); res()
        })
        return unsubB
      }),
      getDoc(doc(db, 'officeSpaces', ownerId, 'meta', 'settings')).then(d => {
        if (d.exists()) setSettings(d.data() as typeof settings)
      }).catch(() => {})
    ])
  }, [ownerId])

  const handleDateSelect = (date: string) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(date); setSelEnd(null)
    } else {
      if (date < selStart) { setSelStart(date); setSelEnd(null) }
      else {
        const bookedDates = buildBookedSet(bookings, selectedOffice!.id)
        const range = getDatesInRange(selStart, date)
        if (range.some(d => bookedDates.has(d))) {
          alert('חלק מהתאריכים שבחרת כבר תפוסים. אנא בחר טווח אחר.')
          return
        }
        setSelEnd(date)
      }
    }
  }

  const totalDays = selStart && selEnd ? daysBetween(selStart, selEnd) : (selStart ? 1 : 0)
  const totalAmount = selectedOffice ? totalDays * selectedOffice.pricePerDay : 0

  const submitBooking = async () => {
    if (!selectedOffice || !selStart) return
    if (!form.name || !form.phone) { alert('נא למלא שם וטלפון'); return }
    setSubmitting(true)
    try {
      const docRef = await addDoc(collection(db, 'officeSpaces', ownerId, 'bookings'), {
        officeId: selectedOffice.id,
        officeName: selectedOffice.name,
        renterName: form.name,
        renterPhone: form.phone,
        renterEmail: form.email,
        startDate: selStart,
        endDate: selEnd || selStart,
        totalDays,
        totalAmount,
        notes: form.notes,
        status: 'pending_approval',
        createdAt: new Date().toISOString()
      })
      setBookingId(docRef.id)
      setStep('confirm')
    } catch {
      alert('שגיאה בשמירת ההזמנה. אנא נסה שנית.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E5E7EB',
    fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', direction: 'rtl'
  }
  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: 16, padding: '16px 18px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 14
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
      <div style={{ fontSize: 36 }}>🏢</div>
    </div>
  )
  if (error || offices.length === 0) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', color: '#6B7280', gap: 12 }}>
      <div style={{ fontSize: 48 }}>🏢</div>
      <div style={{ fontWeight: 700 }}>לא נמצאו משרדים זמינים</div>
    </div>
  )

  const headerFrom  = settings.colorFrom   || PALETTES[0].from
  const headerTo    = settings.colorTo     || PALETTES[0].to
  const accentColor = settings.colorAccent || PALETTES[0].accent

  return (
    <div style={{ background: '#F3F4F6', direction: 'rtl', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${headerFrom},${headerTo})`, color: 'white', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Left: back button */}
          <div style={{ minWidth: 72 }}>
            {step !== 'offices' && step !== 'confirm' && (
              <button onClick={() => {
                if (step === 'form') setStep('calendar')
                else if (step === 'calendar') { setStep('offices'); setSelectedOffice(null); setSelStart(null); setSelEnd(null) }
              }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                ← חזור
              </button>
            )}
          </div>
          {/* Center: slogan + business name */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {settings.slogan && <div style={{ fontSize: isDesktop ? 18 : 15, fontWeight: 800, lineHeight: 1.2 }}>{settings.slogan}</div>}
            <div style={{ fontSize: isDesktop ? 13 : 12, opacity: 0.8, marginTop: 2 }}>
              {settings.businessName || 'השכרת משרדים'}{settings.phone ? ` · 📞 ${settings.phone}` : ''}
            </div>
          </div>
          {/* Right: logo */}
          <div style={{ minWidth: 72, display: 'flex', justifyContent: 'flex-end' }}>
            {settings.logoUrl
              ? <img src={normalizeImageUrl(settings.logoUrl)} alt="logo" style={{ height: 48, maxWidth: 80, objectFit: 'contain', borderRadius: 8, background: 'rgba(255,255,255,0.15)', padding: 4 }} />
              : <div style={{ fontSize: 36 }}>🏢</div>
            }
          </div>
        </div>
      </div>

      <div style={{ padding: isDesktop ? '24px 40px 40px' : '16px 16px 40px', maxWidth: isDesktop ? 1200 : 480, margin: '0 auto' }}>

        {/* Step 1: Choose office */}
        {step === 'offices' && (
          <>
            <h2 style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 800, color: '#1F2937', margin: '0 0 16px' }}>בחרו משרד</h2>
            {/* Type filter chips */}
            {(() => {
              const types = Array.from(new Set(offices.filter(o => o.officeType).map(o => o.officeType!)))
              return types.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {['הכל', ...types].map(t => (
                    <button key={t} onClick={() => setFilterType(t)} style={{
                      padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 13,
                      background: filterType === t ? accentColor : 'white',
                      color: filterType === t ? 'white' : '#374151',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)', transition: 'all 0.15s'
                    }}>{t}</button>
                  ))}
                </div>
              ) : null
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill,minmax(380px,1fr))' : '1fr', gap: 20 }}>
              {offices.filter(o => filterType === 'הכל' || o.officeType === filterType).map(o => (
                <div key={o.id} onClick={() => { setSelectedOffice(o); setStep('calendar') }}
                  style={{ ...cardStyle, borderRight: `4px solid ${o.color}`, cursor: 'pointer', padding: 0, overflow: 'hidden',
                    display: isDesktop && (o.images||[]).length > 0 ? 'flex' : 'block', marginBottom: 0 }}>
                  {/* Images: side-by-side on desktop when images exist */}
                  {(o.images || []).length > 0 && (
                    <div style={{ width: isDesktop ? '45%' : '100%', flexShrink: 0 }}>
                      <OfficeImageGallery images={o.images || []} videoUrl={o.videoUrl} />
                    </div>
                  )}
                  <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {o.officeType && (
                        <div style={{ display: 'inline-block', background: o.color + '22', color: o.color, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{o.officeType}</div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: isDesktop ? 18 : 17, color: '#1F2937', marginBottom: 6 }}>{o.name}</div>
                      {o.description && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 1.5 }}>{o.description}</div>}
                      {o.amenities && <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>✓ {o.amenities}</div>}
                      {o.capacity > 0 && <div style={{ fontSize: 12, color: '#9CA3AF' }}>👥 עד {o.capacity} אנשים</div>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                      <div style={{ background: o.color, color: 'white', borderRadius: 10, padding: '8px 16px', fontWeight: 800, fontSize: isDesktop ? 18 : 16 }}>
                        ₪{o.pricePerDay.toLocaleString('he-IL')} <span style={{ fontSize: 12, fontWeight: 500 }}>/ יום</span>
                      </div>
                      <span style={{ fontSize: 13, color: '#6366F1', fontWeight: 700 }}>להזמנה ←</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Calendar */}
        {step === 'calendar' && selectedOffice && (
          <div style={{ display: isDesktop ? 'grid' : 'block', gridTemplateColumns: isDesktop ? '1fr 1fr' : undefined, gap: 24, alignItems: 'start' }}>
            {/* Left: office info + images */}
            <div>
              {(selectedOffice.images || []).length > 0 && (
                <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <OfficeImageGallery images={selectedOffice.images || []} videoUrl={selectedOffice.videoUrl} />
                </div>
              )}
              <div style={{ ...cardStyle, borderRight: `4px solid ${selectedOffice.color}` }}>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{selectedOffice.name}</div>
                {selectedOffice.description && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 1.5 }}>{selectedOffice.description}</div>}
                {selectedOffice.amenities && <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>✓ {selectedOffice.amenities}</div>}
                {selectedOffice.capacity > 0 && <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>👥 עד {selectedOffice.capacity} אנשים</div>}
                <div style={{ color: '#6366F1', fontWeight: 800, fontSize: 18 }}>₪{selectedOffice.pricePerDay.toLocaleString('he-IL')} / יום</div>
              </div>
            </div>
            {/* Right: calendar */}
            <div>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: '#1F2937' }}>
                  {!selStart ? 'בחרו תאריך התחלה' : !selEnd ? 'בחרו תאריך סיום' : `${selStart} → ${selEnd}`}
                </h3>
                <Calendar
                  bookedDates={buildBookedSet(bookings, selectedOffice.id)}
                  selectedStart={selStart} selectedEnd={selEnd}
                  onSelect={handleDateSelect} color={selectedOffice.color}
                />
              </div>
              {selStart && (
                <div style={{ ...cardStyle, background: '#EEF2FF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#1F2937' }}>{totalDays} {totalDays === 1 ? 'יום' : 'ימים'}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{selStart}{selEnd && selEnd !== selStart ? ` → ${selEnd}` : ''}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#4338CA' }}>₪{totalAmount.toLocaleString('he-IL')}</div>
                  </div>
                </div>
              )}
              {selStart && (
                <button onClick={() => setStep('form')} style={{
                  width: '100%', padding: '14px', borderRadius: 12, background: '#6366F1',
                  color: 'white', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer'
                }}>
                  המשך להזמנה →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Booking form */}
        {step === 'form' && selectedOffice && (
          <div style={{ display: isDesktop ? 'grid' : 'block', gridTemplateColumns: isDesktop ? '1fr 1fr' : undefined, gap: 24, alignItems: 'start' }}>
            {/* Left on desktop: summary */}
            <div>
              {(selectedOffice.images || []).length > 0 && (
                <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <OfficeImageGallery images={selectedOffice.images || []} videoUrl={selectedOffice.videoUrl} />
                </div>
              )}
              <div style={{ ...cardStyle, borderRight: `4px solid ${selectedOffice.color}` }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{selectedOffice.name}</div>
                <div style={{ fontSize: 14, lineHeight: 2, color: '#1F2937' }}>
                  <div>📅 {selStart} → {selEnd || selStart} ({totalDays} {totalDays === 1 ? 'יום' : 'ימים'})</div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: accentColor }}>💰 ₪{totalAmount.toLocaleString('he-IL')}</div>
                </div>
              </div>
              {settings.paymentInfo && (
                <div style={{ ...cardStyle, background: '#FFFBEB', borderRight: '3px solid #F59E0B' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: '#92400E' }}>💳 פרטי תשלום</div>
                  <div style={{ fontSize: 13, color: '#78350F', whiteSpace: 'pre-line' }}>{settings.paymentInfo}</div>
                </div>
              )}
            </div>
            {/* Right on desktop: form */}
            <div>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#1F2937' }}>פרטי המזמין</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>שם מלא *</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="שם ושם משפחה" />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>טלפון *</label>
                  <input style={inputStyle} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="050-0000000" />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>אימייל</label>
                  <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>הערות</label>
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות נוספות..." />
                </div>
                <button onClick={submitBooking} disabled={submitting || !form.name || !form.phone} style={{
                  width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                  cursor: submitting || !form.name || !form.phone ? 'not-allowed' : 'pointer',
                  background: submitting || !form.name || !form.phone ? '#9CA3AF' : accentColor,
                  color: 'white', fontWeight: 800, fontSize: 17
                }}>
                  {submitting ? '⏳ שולח...' : '📨 שליחת בקשת הזמנה'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1F2937', marginBottom: 8 }}>הבקשה נשלחה!</h2>
            <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              בקשת ההזמנה שלך התקבלה ותטופל בהקדם.<br />
              תקבל אישור סופי לאחר אישור בעל המשרד.
            </p>
            {settings.paymentInfo && (
              <div style={{ ...cardStyle, background: '#FFFBEB', textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: '#92400E' }}>💳 לתשלום</div>
                <div style={{ fontSize: 13, color: '#78350F', whiteSpace: 'pre-line' }}>{settings.paymentInfo}</div>
                <div style={{ fontWeight: 800, color: '#1F2937', marginTop: 8 }}>סכום: ₪{totalAmount.toLocaleString('he-IL')}</div>
              </div>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`} style={{
                display: 'block', background: '#10B981', color: 'white', borderRadius: 12,
                padding: '14px', fontWeight: 800, fontSize: 15, textDecoration: 'none', marginTop: 16
              }}>
                📞 התקשר אלינו
              </a>
            )}
            <button onClick={() => { setStep('offices'); setSelectedOffice(null); setSelStart(null); setSelEnd(null); setForm({ name: '', phone: '', email: '', notes: '' }) }}
              style={{ background: '#F3F4F6', border: 'none', color: '#374151', borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', marginTop: 12, width: '100%' }}>
              הזמן משרד נוסף
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
