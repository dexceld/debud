import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.home': 'Home',
      'nav.budget': 'Budget',
      'nav.timeTracking': 'Time Tracking',
      'nav.settings': 'Settings',
      'nav.clients': 'Clients',
      'nav.employees': 'Employees',
      'nav.charges': 'Charges',
      'nav.reports': 'Reports',
      'nav.periodic': 'Periodic',
      
      // Groups
      'group.housing': 'Housing',
      'group.car': 'Car',
      'group.general': 'General',
      'group.health': 'Health',
      'group.income': 'Income',
      
      // Categories
      'cat.mortgage': 'Mortgage',
      'cat.rent': 'Rent',
      'cat.water': 'Water',
      'cat.arnona': 'Arnona',
      'cat.electricity': 'Electricity',
      'cat.gas': 'Gas',
      'cat.internet': 'Internet',
      'cat.disney': 'Disney Plus',
      'cat.cellcom': 'Cellcom',
      'cat.fuel': 'Fuel',
      'cat.maintenance': 'Maintenance',
      'cat.food': 'Food',
      'cat.loans': 'Loans',
      'cat.healthInsurance': 'Health Insurance',
      'cat.hmo': 'HMO',
      'cat.salary': 'Salary',
      
      // Buttons
      'btn.add': 'Add',
      'btn.save': 'Save',
      'btn.cancel': 'Cancel',
      'btn.delete': 'Delete',
      'btn.edit': 'Edit',
      'btn.close': 'Close',
      'btn.send': 'Send',
      'btn.export': 'Export',
      'btn.new': 'New',
      'btn.newClient': 'New Client',
      'btn.newEmployee': 'New Employee',
      'btn.selectAll': 'Select All',
      'btn.clear': 'Clear',
      
      // Labels
      'label.date': 'Date',
      'label.filter': 'Filter',
      'label.sendTo': 'Send To',
      'label.voice': 'Voice',
      'label.status': 'Status',
      'label.invoice': 'Invoice',
      'label.client': 'Client',
      'label.employee': 'Employee',
      'label.hours': 'Hours',
      'label.amount': 'Amount',
      'label.notes': 'Notes',
      'label.rate': 'Rate',
      'label.vat': 'VAT',
      'label.incomeTax': 'Income Tax',
      
      // Status
      'status.pending': 'Pending',
      'status.invoiced': 'Invoiced',
      'status.paid': 'Paid',
      
      // Time Tracking
      'timeTracking.timerRunning': 'Timer Running',
      'timeTracking.startTimer': 'Start Timer',
      'timeTracking.stopTimer': 'Stop Timer',
      'timeTracking.addEntry': 'Add Entry',
      'timeTracking.listening': 'Listening... Speak now',
      
      // Settings
      'settings.floatingButtons': 'Floating Buttons',
      'settings.budgetFabs': 'Budget FABs',
      'settings.timeFabs': 'Time Tracking FABs',
      'settings.voiceFabs': 'Voice FABs',
      
      // Common
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.confirm': 'Confirm',
      'common.search': 'Search',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
    }
  },
  he: {
    translation: {
      // Navigation
      'nav.home': 'בית',
      'nav.budget': 'תקציב',
      'nav.timeTracking': 'דיווחי שעות',
      'nav.settings': 'הגדרות',
      'nav.clients': 'לקוחות',
      'nav.employees': 'עובדים',
      'nav.charges': 'חיובים',
      'nav.reports': 'תקופתי',
      
      // Groups
      'group.housing': 'דיור',
      'group.car': 'רכב',
      'group.general': 'עלויות כלליות',
      'group.health': 'בריאות',
      'group.income': 'הכנסות',
      
      // Categories
      'cat.mortgage': 'משכנתא',
      'cat.rent': 'שכ"ד',
      'cat.water': 'מים',
      'cat.arnona': 'ארנונה',
      'cat.electricity': 'חשמל',
      'cat.gas': 'גז',
      'cat.internet': 'אינטרנט',
      'cat.disney': 'דיסני פלוס',
      'cat.cellcom': 'סלקום',
      'cat.fuel': 'דלק',
      'cat.maintenance': 'טיפולים',
      'cat.food': 'מזון',
      'cat.loans': 'הלוואות',
      'cat.healthInsurance': 'ביטוח בריאות',
      'cat.hmo': 'קופ"ח',
      'cat.salary': 'משכורת',
      
      // Buttons
      'btn.add': 'הוסף',
      'btn.save': 'שמור',
      'btn.cancel': 'ביטול',
      'btn.delete': 'מחק',
      'btn.edit': 'ערוך',
      'btn.close': 'סגור',
      'btn.send': 'שלח',
      'btn.export': 'ייצוא',
      'btn.new': 'חדש',
      'btn.newClient': 'לקוח חדש',
      'btn.newEmployee': 'עובד חדש',
      'btn.selectAll': 'בחר הכל',
      'btn.clear': 'נקה',
      
      // Labels
      'label.date': 'תאריך',
      'label.filter': 'סינון',
      'label.sendTo': 'שלח אל',
      'label.voice': 'קול',
      'label.status': 'סטטוס',
      'label.invoice': 'חשבונית',
      'label.client': 'לקוח',
      'label.employee': 'עובד',
      'label.hours': 'שעות',
      'label.amount': 'סכום',
      'label.notes': 'הערות',
      'label.rate': 'תעריף',
      'label.vat': 'מע"מ',
      'label.incomeTax': 'מס הכנסה',
      
      // Status
      'status.pending': '⏳ ממתין',
      'status.invoiced': '📄 חויב',
      'status.paid': '✅ שולם',
      
      // Time Tracking
      'timeTracking.timerRunning': 'טיימר פעיל',
      'timeTracking.startTimer': 'התחל טיימר',
      'timeTracking.stopTimer': 'עצור טיימר',
      'timeTracking.addEntry': 'הוסף דיווח',
      'timeTracking.listening': '🎙 מקשיב... דבר/י עכשיו',
      
      // Settings
      'settings.floatingButtons': 'כפתורים צפים',
      'settings.budgetFabs': 'כפתורי תקציב',
      'settings.timeFabs': 'כפתורי דיווח שעות',
      'settings.voiceFabs': 'כפתור קול',
      
      // Common
      'common.yes': 'כן',
      'common.no': 'לא',
      'common.confirm': 'אישור',
      'common.search': 'חיפוש',
      'common.loading': 'טוען...',
      'common.error': 'שגיאה',
      'common.success': 'הצלחה',
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'he',
    detection: {
      order: ['navigator', 'htmlTag'],
      caches: [],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
