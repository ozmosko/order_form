// קובץ הגדרות לטופס הזמנה
// עדכן ערכים אלו לפני פריסה

const CONFIG = {
    // כתובות Power Automate - החלף בכתובות האמיתיות שלך
    endpoints: {
        getCustomers: 'YOUR_POWER_AUTOMATE_GET_CUSTOMERS_URL_HERE',
        saveOrder: 'YOUR_POWER_AUTOMATE_SAVE_ORDER_URL_HERE'
    },

    // האש סיסמת עובדים (SHA-256)
    // סיסמת ברירת מחדל היא "123" - שנה זאת בייצור!
    // ליצירת האש חדש: console.log(CryptoJS.SHA256('הסיסמה-שלך').toString())
    passwordHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',

    // האש סיסמת לקוחות (SHA-256) - משמשת לטפסים האישיים של הלקוחות
    // סיסמת ברירת מחדל היא "123" - שנה זאת לפני שיתוף עם לקוחות!
    customerPasswordHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',

    // רשימת מוצרים
    products: [
        { id: 'SOAP', name: 'סבון' },
        { id: 'POLISH', name: 'מבריק' },
        { id: 'SOFTENER', name: 'מרכך' },
        { id: 'OTHER', name: 'אחר' }
    ],

    // זמן פקיעת הפעלה במילישניות (ברירת מחדל: 8 שעות)
    sessionTimeout: 8 * 60 * 60 * 1000,

    // כתובת webhook שתופעל לאחר כל שליחת הזמנה מוצלחת
    // מוגדר דרך admin.html ונשמר ב-localStorage - אין להכניס כאן את הכתובת
    webhookUrl: '',

    // הפעל מצב הדגמה (משתמש בנתונים מדומים במקום Power Automate)
    demoMode: true
};

// נתוני לקוחות לדוגמה למצב הדגמה
const DEMO_CUSTOMERS = [
    { id: 1, name: 'חברת אקמה בע"מ', contact: 'יוסי כהן', email: 'yossi@acme.co.il' },
    { id: 2, name: 'תעשיות בטא', contact: 'מירי לוי', email: 'miri@beta.co.il' },
    { id: 3, name: 'פתרונות גמא', contact: 'דני אברהם', email: 'dani@gamma.co.il' },
    { id: 4, name: 'מערכות דלתא', contact: 'רונית שמעון', email: 'ronit@delta.co.il' },
    { id: 5, name: 'טכנולוגיות אפסילון', contact: 'אבי דוד', email: 'avi@epsilon.co.il' },
    { id: 6, name: 'ייצור זטא', contact: 'שרה יעקב', email: 'sara@zeta.co.il' },
    { id: 7, name: 'לוגיסטיקה אטא', contact: 'משה חיים', email: 'moshe@eta.co.il' },
    { id: 8, name: 'קמעונאות תטא', contact: 'נעמי רחל', email: 'naomi@theta.co.il' }
];
