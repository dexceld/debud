import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const WA_PHONE = '972587087090'
const WA_APIKEY = '' // TODO: paste CallMeBot API key here after activation

export function FeedbackModal({ onClose, userEmail }: { onClose: () => void; userEmail: string }) {
  const [feedback, setFeedback] = useState('')
  const [rating, setRating] = useState(5)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!feedback.trim()) return
    setLoading(true)
    try {
      // Race between Firestore write and a timeout (offline persistence may hang)
      const writePromise = addDoc(collection(db, 'feedback'), {
        message: feedback,
        rating,
        userEmail,
        timestamp: serverTimestamp(),
      })
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      await Promise.race([writePromise, timeout])
    } catch (err) {
      // Even on timeout, the write is queued locally and will sync when online
      console.log('Feedback queued or sent:', err)
    }
    // Send WhatsApp notification via CallMeBot
    if (WA_APIKEY) {
      try {
        const text = encodeURIComponent(`📲 פידבק BVA\n⭐ דירוג: ${rating}/5\n👤 משתמש: ${userEmail}\n📝 ${feedback}`)
        await fetch(`https://api.callmebot.com/whatsapp.php?phone=${WA_PHONE}&text=${text}&apikey=${WA_APIKEY}`)
      } catch {
        // best-effort
      }
    }
    setLoading(false)
    setSent(true)
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'white',
        width: '100%',
        borderRadius: '16px 16px 0 0',
        padding: '24px',
        maxHeight: '80dvh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>הערות והצעות</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#10B981' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>תודה על ההערה!</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                דירוג: {rating} ⭐
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="כתבי הערה, בעיה, או הצעה לשיפור..."
              style={{
                width: '100%',
                minHeight: 120,
                padding: 12,
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: 16,
              }}
            />

            <button
              onClick={handleSend}
              disabled={loading || !feedback.trim()}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: feedback.trim() ? '#667eea' : '#D1D5DB',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: feedback.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? '⏳ שולח...' : '✓ שלח'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
