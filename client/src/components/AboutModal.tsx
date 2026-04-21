export function AboutModal({ onClose }: { onClose: () => void }) {
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
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>אודות</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        {/* BVA Budget */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>BVA Budget</h3>
          <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: 14 }}>
            אפליקציה חכמה לניהול תקציב משפחתי וניהול כסף.
          </p>
          <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: 13 }}>
            ✓ עקיבה הוצאות בזמן אמת<br/>
            ✓ תחזוקה תקציב חודשי<br/>
            ✓ תחזיות הוצאות<br/>
            ✓ סנכרון בענן<br/>
            ✓ עבודה offline
          </p>
          <p style={{ margin: 0, color: '#999', fontSize: 12 }}>
            גרסה 1.0 | בחינם לתמיד
          </p>
        </div>

        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 24, marginBottom: 24 }} />

        {/* Dexcel */}
        <div style={{ marginBottom: 24 }}>
          <img src="/Trn color.png" alt="Dexcel Logo" style={{ height: 80, marginBottom: 16, objectFit: 'contain' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>Dexcel</h3>
          <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: 14, fontWeight: 600 }}>
            טרנספורמציה דיגיטלית
          </p>
          <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: 13 }}>
            ✓ התמעת מערכות ERP<br/>
            ✓ התמעת מערכות CRM<br/>
            ✓ ייעוץ דיגיטלי<br/>
            ✓ פיתוח מערכות מותאמות
          </p>
          <a
            href="https://www.dexcel.co.il"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              background: '#667eea',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            בקרו באתר שלנו →
          </a>
          <p style={{ margin: 0, color: '#999', fontSize: 12 }}>
            www.dexcel.co.il
          </p>
        </div>

        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 24 }} />

        {/* Footer */}
        <p style={{ margin: '16px 0 0 0', color: '#999', fontSize: 12, textAlign: 'center' }}>
          © 2026 Dexcel. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  )
}
