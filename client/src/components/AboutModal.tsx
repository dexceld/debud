import React from 'react'

const S = {
  h2: { fontSize: 15, fontWeight: 800, color: '#1E1B4B', margin: '0 0 6px 0' } as React.CSSProperties,
  h3: { fontSize: 13, fontWeight: 700, color: '#374151', margin: '14px 0 4px 0' } as React.CSSProperties,
  p: { margin: '0 0 10px 0', color: '#4B5563', fontSize: 13, lineHeight: 1.7 } as React.CSSProperties,
  li: { color: '#4B5563', fontSize: 13, lineHeight: 1.7, marginBottom: 2 } as React.CSSProperties,
  section: { marginBottom: 18 } as React.CSSProperties,
  divider: { borderTop: '1px solid #E5E7EB', margin: '20px 0' } as React.CSSProperties,
}

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 9999 }}>
      <div style={{ background: '#FAFAFA', width: '100%', borderRadius: '20px 20px 0 0', maxHeight: '92dvh', overflowY: 'auto', direction: 'rtl' }}>

        {/* Sticky header */}
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/Trn color.png" alt="Dexcel" style={{ height: 26, objectFit: 'contain' }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>אודות DEXCEL</span>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 10, width: 32, height: 32, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 18px 36px' }}>

          {/* ── DEXCEL Company Profile ── */}
          <div style={{ background: 'white', borderRadius: 16, padding: '18px 16px', marginBottom: 20, border: '1px solid #E5E7EB' }}>

            <p style={S.p}>
              DEXCEL מספקת פתרונות עסקיים וטכנולוגיים לארגונים המעוניינים לייעל תהליכי עבודה, לשפר את זרימת המידע וליצור סביבת עבודה דיגיטלית מתקדמת, יעילה ומחוברת.
            </p>
            <p style={{ ...S.p, marginBottom: 0 }}>
              החברה מתמחה באפיון, יישום, פיתוח והטמעת מערכות מידע בהתאמה לצורכי הארגון, תוך שילוב בין הבנה עסקית מעמיקה לבין טכנולוגיות חדשניות. פעילות החברה מתמקדת ביצירת פתרונות המאפשרים לארגונים לעבוד בצורה חכמה יותר, להפחית עבודה ידנית, לשפר את איכות הנתונים ולקבל תמונה מלאה ועדכנית של פעילותם.
            </p>
          </div>

          {/* ── תחומי פעילות ── */}
          <div style={{ background: 'white', borderRadius: 16, padding: '18px 16px', marginBottom: 20, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#6366F1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🏗</span> תחומי פעילות
            </div>

            <div style={S.section}>
              <div style={S.h2}>מערכות ERP ו-CRM</div>
              <p style={S.p}>DEXCEL מספקת שירותי אפיון, יישום והתאמה של מערכות ERP ו-CRM לניהול תהליכים ארגוניים, קשרי לקוחות, מכירות, שירות, מלאי, פרויקטים ותפעול שוטף.</p>
            </div>

            <div style={S.divider} />

            <div style={S.section}>
              <div style={S.h2}>אינטגרציות וממשקים</div>
              <p style={S.p}>החברה מתכננת ומפתחת ממשקים בין מערכות ארגוניות שונות במטרה ליצור זרימת מידע רציפה ואמינה בין כלל המערכות בארגון.</p>
              <div style={S.h3}>הפתרונות כוללים חיבור בין:</div>
              <ul style={{ margin: '4px 0 0 0', paddingRight: 18 }}>
                {['מערכות ERP', 'מערכות CRM', 'פלטפורמות מסחר אלקטרוני', 'Shopify', 'Airtable', 'אתרי אינטרנט ופורטלים', 'מערכות צד שלישי באמצעות API'].map(i => (
                  <li key={i} style={S.li}>{i}</li>
                ))}
              </ul>
            </div>

            <div style={S.divider} />

            <div style={S.section}>
              <div style={S.h2}>אוטומציה של תהליכים עסקיים</div>
              <p style={S.p}>DEXCEL מפתחת תהליכי אוטומציה המאפשרים לצמצם פעולות ידניות, לקצר זמני טיפול ולשפר את היעילות הארגונית.</p>
              <p style={{ ...S.p, marginBottom: 0 }}>הפתרונות כוללים אוטומציה של תהליכי שירות, מכירות, ניהול משימות, ניהול מסמכים, אישורים, דיווחים ותהליכים חוצי ארגון.</p>
            </div>

            <div style={S.divider} />

            <div style={S.section}>
              <div style={S.h2}>פיתוח תוכנה ופתרונות מותאמים אישית</div>
              <p style={S.p}>החברה מפתחת מערכות עסקיות בהתאמה מלאה לצורכי הלקוח, לרבות:</p>
              <ul style={{ margin: '4px 0 0 0', paddingRight: 18 }}>
                {['אפליקציות עסקיות', 'פורטלים ללקוחות', 'פורטלים לעובדים', 'מערכות ניהול מידע', 'טפסים דיגיטליים', 'מערכות שירות ותמיכה', 'לוחות בקרה ודוחות ניהוליים'].map(i => (
                  <li key={i} style={S.li}>{i}</li>
                ))}
              </ul>
            </div>

            <div style={S.divider} />

            <div style={S.section}>
              <div style={S.h2}>פתרונות לניהול פרויקטים</div>
              <p style={{ ...S.p, marginBottom: 0 }}>DEXCEL מספקת פתרונות לניהול ובקרת פרויקטים, המאפשרים ריכוז מידע, מעקב אחר משימות, ניהול מסמכים, בקרה תקציבית ותיאום בין כלל הגורמים המעורבים בפרויקט.</p>
            </div>

            <div style={S.divider} />

            <div style={{ ...S.section, marginBottom: 0 }}>
              <div style={S.h2}>פתרונות לענפי הבנייה, החינוך והשירותים</div>
              <p style={{ ...S.p, marginBottom: 0 }}>החברה מפתחת ומטמיעה פתרונות המותאמים לדרישות הייחודיות של ענפים שונים, תוך התאמת המערכת לתהליכי העבודה, מבנה הארגון וצרכיו העסקיים.</p>
            </div>
          </div>

          {/* ── שיטת העבודה ── */}
          <div style={{ background: 'white', borderRadius: 16, padding: '18px 16px', marginBottom: 20, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🤝</span> שיטת העבודה
            </div>
            <p style={S.p}>כל פרויקט מתחיל בלמידת הארגון, הבנת תהליכי העבודה הקיימים וזיהוי הצרכים העסקיים. על בסיס מידע זה מבוצעים אפיון, תכנון והטמעה של פתרון המותאם לארגון ולמטרותיו.</p>
            <p style={{ ...S.p, marginBottom: 0 }}>החברה מלווה את לקוחותיה לאורך כל שלבי הפרויקט – החל משלב הייעוץ והאפיון, דרך הפיתוח והיישום, ועד להטמעה וליווי שוטף.</p>
          </div>

          {/* ── החזון ── */}
          <div style={{ background: 'linear-gradient(135deg,#EEF2FF,#F5F3FF)', borderRadius: 16, padding: '18px 16px', marginBottom: 20, border: '1px solid #C7D2FE' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#4F46E5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🎯</span> החזון
            </div>
            <p style={S.p}>ב־DEXCEL פועלים מתוך תפיסה שלפיה מערכות מידע צריכות לתמוך בצמיחת הארגון ולהעניק למשתמשים כלים יעילים, פשוטים ונגישים לעבודה היומיומית.</p>
            <p style={{ ...S.p, marginBottom: 0 }}>מטרת החברה היא לספק פתרונות המשלבים בין תהליכים עסקיים, אנשים וטכנולוגיה, תוך יצירת ערך עסקי אמיתי ושיפור מתמשך של יכולות הארגון.</p>
          </div>

          {/* ── Website link ── */}
          <div style={{ background: '#6366F1', borderRadius: 14, padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>DEXCEL – אפיון, יישום ופיתוח פתרונות עסקיים וטכנולוגיים לארגונים.</span>
            <a href="https://www.dexcel.co.il" target="_blank" rel="noopener noreferrer"
              style={{ color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '5px 10px', flexShrink: 0, marginRight: 10 }}>
              האתר ←
            </a>
          </div>

          {/* ── Apps section ── */}
          <div style={{ fontSize: 13, fontWeight: 800, color: '#6B7280', marginBottom: 12, textAlign: 'center', letterSpacing: 0.5 }}>
            הכלים שלנו
          </div>

          {/* Property Management */}
          <div style={{ background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', borderRadius: 14, padding: '14px', marginBottom: 12, border: '1px solid #FDE68A' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>🏢</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>ניהול נכסים — RP & CRM</div>
                <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>Real Property · Client Relationship Management</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['📋 חוזים', '� תשלומים', '� מסמכים', '✅ משימות', '📊 דשבורד'].map(f => (
                <span key={f} style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6, padding: '2px 7px', fontSize: 11, color: '#92400E', fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Time Tracking */}
          <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', borderRadius: 14, padding: '14px', marginBottom: 12, border: '1px solid #BBF7D0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>⏱</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#14532D' }}>דיווחי שעות ולקוחות</div>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Time Tracking · Billing · CRM</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['⏱ שעות', '� לקוחות', '� עובדים', '📑 חשבוניות', '� דוחות'].map(f => (
                <span key={f} style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 6, padding: '2px 7px', fontSize: 11, color: '#14532D', fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Family Budget */}
          <div style={{ background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)', borderRadius: 14, padding: '14px', marginBottom: 16, border: '1px solid #C7D2FE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>💰</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1E1B4B' }}>תקציב משפחתי</div>
                <div style={{ fontSize: 11, color: '#3730A3', fontWeight: 600 }}>Budget · Forecast · Analytics</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['📅 חודשי', '📉 תחזית', '📊 גרפים', '☁️ ענן', '📴 Offline'].map(f => (
                <span key={f} style={{ background: '#E0E7FF', border: '1px solid #C7D2FE', borderRadius: 6, padding: '2px 7px', fontSize: 11, color: '#1E1B4B', fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          <p style={{ margin: 0, color: '#9CA3AF', fontSize: 11, textAlign: 'center' }}>© 2026 DEXCEL · כל הזכויות שמורות</p>
        </div>
      </div>
    </div>
  )
}
