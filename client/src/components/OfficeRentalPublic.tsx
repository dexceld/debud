import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
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

  const accentColor = settings.colorAccent || PALETTES[0].accent

  const spaceTypes = Array.from(new Set(offices.filter(o => o.officeType).map(o => o.officeType!)))
  const sp = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const il = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const TYPE_SVGS: Record<string, React.ReactElement> = {
    '\u05d4\u05db\u05dc': <svg {...sp}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,

    '\u05de\u05e9\u05e8\u05d3 \u05e4\u05e8\u05d8\u05d9': (
      <svg width="48" height="38" viewBox="0 0 96 76" {...il}>
        <rect x="2" y="2" width="78" height="62" rx="2"/>
        <line x1="2" y1="26" x2="26" y2="26"/>
        <rect x="5" y="4" width="5" height="22" rx="0.5"/>
        <rect x="11" y="6" width="5" height="20" rx="0.5"/>
        <rect x="17" y="4" width="6" height="22" rx="0.5"/>
        <rect x="50" y="5" width="26" height="24" rx="1"/>
        <line x1="63" y1="5" x2="63" y2="29"/>
        <line x1="50" y1="17" x2="76" y2="17"/>
        <path d="M50 5 C54 11 52 18 50 24"/>
        <path d="M76 5 C72 11 74 18 76 24"/>
        <rect x="20" y="46" width="50" height="4" rx="1"/>
        <line x1="25" y1="50" x2="25" y2="62"/>
        <line x1="65" y1="50" x2="65" y2="62"/>
        <rect x="28" y="39" width="30" height="7" rx="1"/>
        <line x1="26" y1="46" x2="58" y2="46"/>
        <ellipse cx="45" cy="56" rx="9" ry="3.5"/>
        <line x1="45" y1="59.5" x2="45" y2="67"/>
        <line x1="38" y1="67" x2="52" y2="67"/>
        <circle cx="36" cy="69" r="2"/>
        <circle cx="45" cy="69" r="2"/>
        <circle cx="54" cy="69" r="2"/>
        <rect x="6" y="52" width="10" height="12" rx="2"/>
        <path d="M11 52 C9 47 4 44 5 49"/>
        <path d="M11 52 C13 47 18 44 17 49"/>
        <path d="M11 52 C7 48 3 45 5 42"/>
        <rect x="39" y="67" width="12" height="9" rx="2"/>
        <path d="M41 67 C41 64 49 64 49 67"/>
        <circle cx="45" cy="72" r="1.8"/>
      </svg>
    ),

    '\u05e2\u05de\u05d3\u05ea \u05e2\u05d1\u05d5\u05d3\u05d4': (
      <svg width="48" height="38" viewBox="0 0 96 76" {...il}>
        <line x1="2" y1="8" x2="54" y2="8"/>
        <line x1="62" y1="4" x2="88" y2="4"/>
        <line x1="75" y1="4" x2="75" y2="16"/>
        <line x1="18" y1="8" x2="18" y2="18"/>
        <line x1="40" y1="8" x2="40" y2="15"/>
        <polygon points="75,16 77,21 82,21 78,24.5 79.5,29.5 75,26.5 70.5,29.5 72,24.5 68,21 73,21"/>
        <rect x="8" y="42" width="80" height="5" rx="1.5"/>
        <line x1="16" y1="47" x2="16" y2="61"/>
        <line x1="11" y1="61" x2="21" y2="61"/>
        <line x1="80" y1="47" x2="80" y2="61"/>
        <line x1="75" y1="61" x2="85" y2="61"/>
        <rect x="12" y="34" width="22" height="8" rx="1.5"/>
        <line x1="15" y1="37.5" x2="31" y2="37.5"/>
        <line x1="15" y1="40" x2="27" y2="40"/>
        <rect x="38" y="30" width="28" height="12" rx="1.5"/>
        <path d="M36 42 L68 42"/>
        <rect x="70" y="35" width="9" height="7" rx="1"/>
        <path d="M79 37.5 C83 37.5 83 42 79 42"/>
        <path d="M72 33.5 C72.5 31 76 31 76.5 33.5"/>
        <ellipse cx="48" cy="56" rx="9" ry="3.5"/>
        <line x1="48" y1="59.5" x2="48" y2="67"/>
        <line x1="40" y1="67" x2="56" y2="67"/>
        <circle cx="38" cy="69" r="2"/>
        <circle cx="44" cy="70" r="2"/>
        <circle cx="52" cy="70" r="2"/>
        <circle cx="58" cy="69" r="2"/>
        <circle cx="48" cy="69.5" r="2"/>
      </svg>
    ),

    '\u05d7\u05d3\u05e8 \u05d9\u05e9\u05d9\u05d1\u05d5\u05ea': (
      <svg width="48" height="38" viewBox="0 0 96 76" {...il}>
        <rect x="2" y="2" width="92" height="40" rx="2"/>
        <circle cx="14" cy="19" r="9"/>
        <line x1="14" y1="12" x2="14" y2="19"/>
        <line x1="14" y1="19" x2="20" y2="19"/>
        <rect x="28" y="8" width="38" height="24" rx="2"/>
        <rect x="30" y="10" width="34" height="20" rx="1"/>
        <circle cx="47" cy="6" r="1.5"/>
        <rect x="72" y="8" width="18" height="24" rx="1.5"/>
        <line x1="74" y1="13" x2="88" y2="13"/>
        <line x1="74" y1="17" x2="86" y2="17"/>
        <line x1="74" y1="21" x2="87" y2="21"/>
        <ellipse cx="48" cy="59" rx="38" ry="13"/>
        <rect x="17" y="42" width="10" height="6" rx="2.5"/>
        <rect x="32" y="41" width="10" height="6" rx="2.5"/>
        <rect x="47" y="40" width="10" height="6" rx="2.5"/>
        <rect x="62" y="41" width="10" height="6" rx="2.5"/>
        <rect x="17" y="67" width="10" height="6" rx="2.5"/>
        <rect x="32" y="68" width="10" height="6" rx="2.5"/>
        <rect x="47" y="68" width="10" height="6" rx="2.5"/>
        <rect x="62" y="67" width="10" height="6" rx="2.5"/>
        <rect x="4" y="54" width="6" height="10" rx="2.5"/>
        <rect x="86" y="54" width="6" height="10" rx="2.5"/>
      </svg>
    ),

    '\u05d7\u05dc\u05dc \u05e2\u05d1\u05d5\u05d3\u05d4 \u05de\u05e9\u05d5\u05ea\u05e3': <svg {...sp}><rect x="1" y="4" width="14" height="16" rx="2"/><path d="M15 9h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4M8 8v2M8 12v2M8 16v2"/></svg>,
    '\u05e1\u05d8\u05d5\u05d3\u05d9\u05d5':        <svg {...sp}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    '\u05d7\u05d3\u05e8 \u05d4\u05d3\u05e8\u05db\u05d4':   <svg {...sp}><path d="M2 3h20v13H2z"/><path d="M8 21h8M12 16v5"/></svg>,
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F8FA', direction: 'rtl', fontFamily: "Tahoma, 'Segoe UI', sans-serif" }}>

      {/* \u2500\u2500 Minimal White Header \u2500\u2500 */}
      <header style={{ background: 'white', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Use direction:ltr so logo is physically LEFT and nav is physically RIGHT */}
        <div style={{ direction: 'ltr', maxWidth: 1200, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo — LEFT */}
          <div>
            {settings.logoUrl
              ? <img src={normalizeImageUrl(settings.logoUrl)} alt="logo" style={{ height: 42, maxWidth: 180, objectFit: 'contain' }} />
              : <span style={{ fontWeight: 800, fontSize: 19, color: '#111827', letterSpacing: -0.3 }}>{settings.businessName || '\u05d4\u05e9\u05db\u05e8\u05ea \u05de\u05e9\u05e8\u05d3\u05d9\u05dd'}</span>
            }
          </div>

          {/* Nav — RIGHT: filter + phone + back */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {/* Space Types dropdown — clean nav-link */}
            {spaceTypes.length > 0 && step === 'offices' && (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button onClick={() => setDropdownOpen(d => !d)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 15, color: dropdownOpen ? accentColor : '#374151',
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0',
                  fontFamily: 'inherit', direction: 'rtl'
                }}>
                  {'סוגי משרדים'}
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#9CA3AF' }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {dropdownOpen && (() => {
                  const items = ['\u05d4\u05db\u05dc', ...spaceTypes]
                  const TYPE_DESC: Record<string, string> = {
                    '\u05d4\u05db\u05dc': '\u05db\u05dc \u05e1\u05d5\u05d2\u05d9 \u05d4\u05de\u05e9\u05e8\u05d3\u05d9\u05dd \u05d4\u05d6\u05de\u05d9\u05e0\u05d9\u05dd',
                    '\u05de\u05e9\u05e8\u05d3 \u05e4\u05e8\u05d8\u05d9': '\u05d4\u05e9\u05db\u05e8\u05ea \u05de\u05e9\u05e8\u05d3 \u05d1\u05dc\u05e2\u05d3\u05d9 \u05dc\u05d9\u05d5\u05dd \u05d0\u05d5 \u05e9\u05d1\u05d5\u05e2',
                    '\u05e2\u05de\u05d3\u05ea \u05e2\u05d1\u05d5\u05d3\u05d4': '\u05d2\u05d9\u05e9\u05d4 \u05dc\u05e2\u05de\u05d3\u05d4 \u05d1\u05d7\u05dc\u05dc \u05e2\u05d1\u05d5\u05d3\u05d4 \u05de\u05e9\u05d5\u05ea\u05e3',
                    '\u05d7\u05d3\u05e8 \u05d9\u05e9\u05d9\u05d1\u05d5\u05ea': '\u05d7\u05d3\u05e8 \u05dc\u05d9\u05e9\u05d9\u05d1\u05d5\u05ea \u05e6\u05d5\u05d5\u05ea \u05d5\u05e4\u05d2\u05d9\u05e9\u05d5\u05ea',
                    '\u05d7\u05dc\u05dc \u05e2\u05d1\u05d5\u05d3\u05d4 \u05de\u05e9\u05d5\u05ea\u05e3': '\u05de\u05e8\u05d7\u05d1 \u05e2\u05d1\u05d5\u05d3\u05d4 \u05e4\u05ea\u05d5\u05d7 \u05d5\u05d2\u05de\u05d9\u05e9',
                    '\u05e1\u05d8\u05d5\u05d3\u05d9\u05d5': '\u05de\u05e8\u05d7\u05d1 \u05d9\u05e6\u05d9\u05e8\u05ea\u05d9 \u05dc\u05e1\u05d8\u05d5\u05d3\u05d9\u05d5',
                    '\u05d7\u05d3\u05e8 \u05d4\u05d3\u05e8\u05db\u05d4': '\u05d0\u05d5\u05dc\u05dd \u05dc\u05d4\u05d3\u05e8\u05db\u05d5\u05ea \u05d5\u05d4\u05e8\u05e6\u05d0\u05d5\u05ea',
                  }
                  return (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      background: 'white', borderRadius: 16, zIndex: 200, minWidth: 290,
                      boxShadow: '0 8px 40px rgba(0,0,0,0.12)', overflow: 'hidden',
                      direction: 'rtl'
                    }}>
                      {items.map((t, i) => (
                        <button key={t} onClick={() => { setFilterType(t); setDropdownOpen(false) }}
                          style={{
                            width: '100%', padding: '16px 20px', background: 'white',
                            border: 'none', borderBottom: i < items.length - 1 ? '1px solid #F3F4F6' : 'none',
                            cursor: 'pointer', textAlign: 'right',
                            display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'inherit'
                          }}>
                          <span style={{ color: '#BFC8D4', flexShrink: 0 }}>
                            {TYPE_SVGS[t] || TYPE_SVGS['\u05d4\u05db\u05dc']}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 2 }}>{t}</div>
                            <div style={{ fontSize: 12, color: filterType === t ? accentColor : '#9CA3AF' }}>
                              {TYPE_DESC[t] || ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
            {step !== 'offices' && step !== 'confirm' && (
              <button onClick={() => {
                if (step === 'form') setStep('calendar')
                else if (step === 'calendar') { setStep('offices'); setSelectedOffice(null); setSelStart(null); setSelEnd(null) }
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#6B7280', fontFamily: 'inherit', direction: 'rtl' }}>
                {'← חזור'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isDesktop ? '36px 24px 60px' : '20px 16px 40px' }}>

        {/* Step 1: Choose office */}
        {step === 'offices' && (
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3,1fr)' : '1fr', gap: 28 }}>
            {offices.filter(o => filterType === 'הכל' || o.officeType === filterType).map(o => (
              <div key={o.id}
                onClick={() => { setSelectedOffice(o); setStep('calendar') }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.13)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)')}
                style={{ background: 'white', borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.07)', transition: 'box-shadow 0.2s' }}>
                {/* Image */}
                {(o.images||[]).length > 0
                  ? <div style={{ height: 220, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                      <OfficeImageGallery images={o.images||[]} videoUrl={o.videoUrl} />
                    </div>
                  : <div style={{ height: 200, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, color: '#D1D5DB' }}>🏢</div>
                }
                {/* Details */}
                <div style={{ padding: '20px 22px 24px' }}>
                  {o.officeType && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{o.officeType}</div>
                  )}
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#111827', marginBottom: 6 }}>{o.name}</div>
                  {o.description && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10, lineHeight: 1.65 }}>{o.description}</div>}
                  {o.amenities && <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>✓ {o.amenities}</div>}
                  {o.capacity > 0 && <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>👥 עד {o.capacity} אנשים</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 22, color: '#111827' }}>
                      ₪{o.pricePerDay.toLocaleString('he-IL')} <span style={{ fontSize: 13, fontWeight: 400, color: '#9CA3AF' }}>/ יום</span>
                    </div>
                    <button style={{ background: accentColor, color: 'white', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      הזמן →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

      {/* Floating WhatsApp Button */}
      {settings.phone && (
        <a
          href={`https://wa.me/972${settings.phone.replace(/^0/, '').replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          title="שלח לנו הודעה בווצאפ"
          style={{
            position: 'fixed', bottom: 24, left: 24, zIndex: 999,
            width: 58, height: 58, borderRadius: '50%',
            background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,211,102,0.45)', textDecoration: 'none',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)' }}
        >
          <svg width="30" height="30" viewBox="0 0 32 32" fill="white">
            <path d="M16 2C8.268 2 2 8.268 2 16c0 2.469.67 4.785 1.832 6.77L2 30l7.438-1.805A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.6a11.57 11.57 0 0 1-5.902-1.615l-.422-.251-4.413 1.072 1.113-4.297-.275-.44A11.564 11.564 0 0 1 4.4 16C4.4 9.59 9.59 4.4 16 4.4S27.6 9.59 27.6 16 22.41 27.6 16 27.6zm6.34-8.67c-.347-.174-2.055-1.012-2.374-1.128-.319-.116-.551-.174-.784.174-.232.347-.9 1.128-1.103 1.36-.203.232-.406.26-.753.087-.347-.174-1.465-.54-2.79-1.72-1.031-.918-1.727-2.052-1.93-2.399-.203-.347-.022-.535.153-.707.157-.155.347-.406.52-.61.174-.203.232-.347.347-.58.116-.232.058-.435-.029-.61-.087-.174-.784-1.89-1.074-2.59-.283-.68-.57-.588-.784-.598l-.667-.012c-.232 0-.61.087-.928.435-.319.347-1.218 1.19-1.218 2.9s1.247 3.364 1.42 3.597c.174.232 2.452 3.744 5.942 5.25.83.358 1.48.572 1.984.732.834.265 1.594.228 2.194.138.669-.1 2.055-.84 2.346-1.652.29-.812.29-1.508.203-1.652-.087-.145-.319-.232-.667-.406z"/>
          </svg>
        </a>
      )}
    </div>
  )
}
