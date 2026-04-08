// קובץ הגדרות בסיסי - ערכי ברירת מחדל

const CONFIG = {
    // כתובת לטעינת רשימת לקוחות - מוגדרת דרך ממשק המנהל ונשמרת ב-localStorage
    endpoints: {
        getCustomers: ''
    },

    // האש סיסמת עובדים (SHA-256) - ליצירת האש: פתח את admin.html ← שכחת סיסמה?
    passwordHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',

    // האש סיסמת לקוחות - נטען אוטומטית מתוך קישור הלקוח (פרמטר cph)
    customerPasswordHash: '',

    // זמן פקיעת הפעלה (ברירת מחדל: 8 שעות)
    sessionTimeout: 8 * 60 * 60 * 1000,

    // רשימת מוצרים
    products: [
        { id: 'soap_big',     name: 'is st000 - סבון למדיח פורמולה 40 - 24 ק"ג' },
        { id: 'polish_big',   name: 'is st001 - מבריק למדיח שיינר 20 ליטר' },
        { id: 'soap_small',   name: 'is st000/s - סבון למדיח פורמולה קטן 12 ק"ג' },
        { id: 'polish_small', name: 'is st001/s - מבריק למדיח שיינר -קטן 10 ליטר' },
        { id: 'softener',     name: '9914040015 - טבליות מלח שק 25 ק"ג' },
        { id: 'OTHER',        name: 'אחר' }
    ],

    // הפעל מצב הדגמה
    demoMode: true
};

// נתוני לקוחות לדוגמה (משמשים רק כאשר demoMode = true)
const DEMO_CUSTOMERS = [
    { id: 1, name: 'חברת אקמה בע"מ',      contact: 'יוסי כהן',   email: 'yossi@acme.co.il' },
    { id: 2, name: 'תעשיות בטא',           contact: 'מירי לוי',   email: 'miri@beta.co.il' },
    { id: 3, name: 'פתרונות גמא',          contact: 'דני אברהם',  email: 'dani@gamma.co.il' },
    { id: 4, name: 'מערכות דלתא',          contact: 'רונית שמעון', email: 'ronit@delta.co.il' },
    { id: 5, name: 'טכנולוגיות אפסילון',   contact: 'אבי דוד',    email: 'avi@epsilon.co.il' },
    { id: 6, name: 'ייצור זטא',            contact: 'שרה יעקב',   email: 'sara@zeta.co.il' },
    { id: 7, name: 'לוגיסטיקה אטא',        contact: 'משה חיים',   email: 'moshe@eta.co.il' },
    { id: 8, name: 'קמעונאות תטא',         contact: 'נעמי רחל',   email: 'naomi@theta.co.il' }
];
