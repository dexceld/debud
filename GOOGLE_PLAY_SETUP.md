# הוראות העלאה ל-Google Play

## שלב 1: צור Google Play Developer Account
1. לכי ל-[play.google.com/console](https://play.google.com/console)
2. לחצי "Create account"
3. שלמי $25 (חד-פעמי)
4. מלאי את הפרטים שלך

## שלב 2: צור אפליקציה חדשה
1. בקונסול, לחצי "Create app"
2. שם: `BVA Budget`
3. בחרי "App"
4. בחרי "Free"

## שלב 3: מלא את פרטי האפליקציה
### App details
- **שם:** BVA Budget
- **תיאור קצר:** ניהול תזרים מזומנים חכם
- **תיאור מלא:** 
```
BVA Budget היא אפליקציה לניהול תקציב וניהול תזרים מזומנים.
- עקוב אחרי הוצאות שלך
- תחזוקה תקציב חודשי
- תחזיות הוצאות
- סנכרון בענן (עם Google account)
- עבודה offline
```

### Screenshots (צילומי מסך)
צריך 2-8 צילומי מסך של האפליקציה:
1. דף הבית
2. הוספת הוצאה
3. תחזוקה תקציב
4. תחזיות

### Icon
- גודל: 512x512 PNG
- קובץ: `icon-512.png` (כבר יש לך)

### Featured graphic
- גודל: 1024x500 PNG
- (אפשר להשתמש בתמונה מעוצבת)

## שלב 4: בחר קטגוריה
- **Category:** Finance
- **Content rating:** Everyone

## שלב 5: בחר מדינות
- בחרי את המדינות שאתה רוצה (ישראל, וכו')

## שלב 6: צור Trusted Web Activity (TWA)
1. בקונסול Google Play, לחצי "Release" → "Testing"
2. בחרי "Internal testing"
3. בחרי "Create release"
4. בחרי "Android App Bundle" או "APK"

### עבור TWA (Trusted Web Activity):
אתה צריך לבנות APK שמריץ את ה-PWA שלך.

**אפשרות קלה:** השתמש ב-[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://debud.onrender.com/manifest.json
bubblewrap build
```

זה יוצור APK שאתה יכול להעלות ל-Google Play.

## שלב 7: העלה את ה-APK
1. בקונסול, בחרי "App releases"
2. בחרי "Production"
3. לחצי "Create release"
4. העלה את ה-APK
5. מלא את Release notes
6. לחצי "Review release"
7. לחצי "Start rollout to Production"

## שלב 8: המתן לאישור
- Google בדוק את האפליקציה (24-48 שעות)
- אם הכל בסדר → ✅ האפליקציה חיה בחנות!

---

## דברים חשובים:
- ✅ manifest.json מוגדר נכון
- ✅ HTTPS (debud.onrender.com)
- ✅ Service Worker (sw.js)
- ✅ אייקונים (192x192 ו-512x512)
- ✅ Privacy Policy (צריך להוסיף)
- ✅ Terms of Service (צריך להוסיף)

---

## צעדים הבאים:
1. צור Google Play Developer Account
2. צור אפליקציה חדשה
3. מלא את הפרטים
4. בנה APK עם Bubblewrap
5. העלה ל-Google Play
6. המתן לאישור
