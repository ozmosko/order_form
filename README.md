# Nitank Order Form — מדריך פריסה

## מה יש כאן

| תיקייה | שימוש |
|--------|-------|
| `deploy/` | הקבצים שמועלים ל-Netlify (הטופס הציבורי) |
| `admin/` | ממשק הניהול — רץ מקומית על המחשב שלך |

---

## פריסה ל-Netlify (העלאה ראשונה)

### שלב 1 — צור חשבון Netlify
היכנס ל-[netlify.com](https://netlify.com) וצור חשבון חינמי.

### שלב 2 — צור אתר חדש
- לחץ **Add new site → Deploy manually**
- גרור את תיקיית `deploy/` לאזור הירוק
- המתן לסיום הפריסה

### שלב 3 — הגדר את ה-Webhook של Make.com
- לך ל: **Site configuration → Environment variables → Add variable**
- מלא:
  - **Key:** `MAKE_WEBHOOK_URL`
  - **Value:** כתובת ה-Webhook של Make.com
- לחץ **Create variable**

### שלב 4 — פרוס מחדש
לאחר הוספת משתנה הסביבה יש לפרוס שוב:
- לך ל-**Deploys**
- גרור שוב את תיקיית `deploy/` לאזור הירוק

האתר מוכן. תקבל כתובת בסגנון `https://your-site-name.netlify.app`.

---

## עדכון לאחר שינויים

### עדכון קובץ בלבד (ללא שינוי מוצרים)
גרור שוב את תיקיית `deploy/` לאזור ה-Deploys ב-Netlify.

### עדכון רשימת מוצרים
1. פתח את `admin/admin.html` (לחץ פעמיים על `launch_admin.command` במק או `launch_admin.bat` בחלונות)
2. עבור לטאב **מוצרים**
3. ערוך את הרשימה
4. לחץ **הורד config.js**
5. החלף את `deploy/config.js` בקובץ שהורדת
6. הרץ את `sync_config.command` (מק) או `sync_config.bat` (חלונות) — זה מעדכן גם את `admin/config.js`
7. גרור שוב את תיקיית `deploy/` ל-Netlify

### עדכון סיסמת עובדים
1. פתח את `admin/admin.html`
2. במסך הכניסה לחץ **שכחת סיסמה?**
3. הזן את הסיסמה החדשה ולחץ **צור האש**
4. העתק את הערך שמתקבל
5. פתח את `deploy/config.js` ו-`admin/config.js`
6. מצא את השורה `passwordHash:` והחלף את הערך שבין הגרשיים
7. הרץ `sync_config` ועלה שוב ל-Netlify

---

## הגדרות ממשק הניהול (admin)

בפתיחה ראשונה של `admin.html` תתבקש להגדיר:
- **כתובת הטופס הציבורי** — הכתובת שקיבלת מ-Netlify (לדוגמה: `https://your-site.netlify.app`)
- **Webhook לטעינת לקוחות** — כתובת ה-Webhook מ-Make.com שמחזיר את רשימת הלקוחות
- **סיסמת לקוחות** — סיסמה שתוטמע בקישורים שתשלח ללקוחות

ההגדרות נשמרות בדפדפן ואינן נשמרות בקבצים.

---

## הערות חשובות

- **אל תשנה מזהי מוצרים קיימים** — שינוי מזהה (לא שם) ישבש הזמנות ישנות ב-Make
- **לאחר שינוי סיסמת לקוחות** — יש לצור מחדש את כל הקישורים ולשלוח ללקוחות
- **ה-Webhook של Make לא נשמר בקבצים** — הוא נמצא רק ב-Netlify תחת Environment Variables
