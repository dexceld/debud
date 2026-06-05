const MODULE_CARD = {
  borderRadius: 14,
  padding: '16px',
  marginBottom: 16,
  border: '1px solid #F3F4F6',
}

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 9999 }}>
      <div style={{ background: '#F9FAFB', width: '100%', borderRadius: '20px 20px 0 0', maxHeight: '88dvh', overflowY: 'auto', direction: 'rtl' }}>

        {/* Header */}
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/Trn color.png" alt="Dexcel" style={{ height: 28, objectFit: 'contain' }} />
            <span style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>אודות Dexcel</span>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 10, width: 32, height: 32, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>×</button>
        </div>

        <div style={{ padding: '16px 16px 32px' }}>

          {/* Tagline */}
          <div style={{ background: 'linear-gradient(135deg,#6366F1,#7C3AED)', borderRadius: 16, padding: '18px 16px', marginBottom: 20, textAlign: 'center' }}>
            <img src="/Trn color.png" alt="Dexcel" style={{ height: 32, objectFit: 'contain', marginBottom: 10, filter: 'brightness(0) invert(1)' }} />
            <div style={{ color: 'white', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>חבילת הכלים העסקיים של Dexcel</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>ניהול חכם · סנכרון ענן · עבודה offline</div>
          </div>

          {/* Property Management — FIRST */}
          <div style={{ ...MODULE_CARD, background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', borderColor: '#FDE68A' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 32 }}>🏢</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#92400E' }}>ניהול נכסים — RP & CRM</div>
                <div style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }}>Real Property · Client Relationship Management</div>
              </div>
            </div>
            <p style={{ margin: '0 0 10px', color: '#78350F', fontSize: 13, lineHeight: 1.6 }}>
              מערכת מקצועית לניהול תיק נכסים — שוכרים, חוזים, תשלומים ומסמכים — הכל במקום אחד.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['📋 חוזי שכירות', '💰 מעקב תשלומים', '📄 מסמכים', '✅ משימות', '📊 דשבורד נכסים'].map(f => (
                <span key={f} style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '3px 8px', fontSize: 11, color: '#92400E', fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Time Tracking */}
          <div style={{ ...MODULE_CARD, background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', borderColor: '#BBF7D0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 32 }}>⏱</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#14532D' }}>דיווחי שעות ולקוחות</div>
                <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Time Tracking · Billing · CRM</div>
              </div>
            </div>
            <p style={{ margin: '0 0 10px', color: '#166534', fontSize: 13, lineHeight: 1.6 }}>
              ניהול שעות עבודה, לקוחות ועובדים — עם חשבוניות, דוחות וסיכומי חיוב בלחיצה.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['⏱ שעות', '👥 לקוחות', '👤 עובדים', '📑 חשבוניות', '📊 דוחות'].map(f => (
                <span key={f} style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 8, padding: '3px 8px', fontSize: 11, color: '#14532D', fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Family Budget */}
          <div style={{ ...MODULE_CARD, background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)', borderColor: '#C7D2FE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 32 }}>💰</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1E1B4B' }}>תקציב משפחתי</div>
                <div style={{ fontSize: 12, color: '#3730A3', fontWeight: 600 }}>Budget · Forecast · Analytics</div>
              </div>
            </div>
            <p style={{ margin: '0 0 10px', color: '#3730A3', fontSize: 13, lineHeight: 1.6 }}>
              ניהול תקציב חודשי חכם — מעקב הוצאות בזמן אמת, תחזיות וגרפים.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['📅 חודשי', '📉 תחזית', '📊 גרפים', '☁️ ענן', '📴 Offline'].map(f => (
                <span key={f} style={{ background: '#E0E7FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '3px 8px', fontSize: 11, color: '#1E1B4B', fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Dexcel */}
          <div style={{ background: 'white', borderRadius: 14, padding: '16px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <img src="/Trn color.png" alt="Dexcel" style={{ height: 28, objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Dexcel</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>טרנספורמציה דיגיטלית</div>
              </div>
            </div>
            <p style={{ margin: '0 0 12px', color: '#6B7280', fontSize: 13, lineHeight: 1.6 }}>
              פיתוח מערכות ERP, CRM וכלים עסקיים מותאמים אישית לעסקים וארגונים.
            </p>
            <a href="https://www.dexcel.co.il" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#6366F1', color: 'white', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              www.dexcel.co.il ←
            </a>
          </div>

          <p style={{ margin: '16px 0 0', color: '#9CA3AF', fontSize: 11, textAlign: 'center' }}>© 2026 Dexcel · כל הזכויות שמורות</p>
        </div>
      </div>
    </div>
  )
}
