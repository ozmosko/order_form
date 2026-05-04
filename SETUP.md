# Order Form - הגדרת Make.com ו-Excel

מדריך זה מסביר כיצד להגדיר את תרחישי Make.com ואת קבצי ה-Excel.

---

## קבצי Excel ב-SharePoint

### Customers.xlsx
טבלה בשם `Customers` עם העמודות:

| AccountKey | FullName |
|------------|----------|
| 1001 | חברת אקמה בע"מ |
| 1002 | תעשיות בטא |

> `AccountKey` = מזהה הלקוח (גם משמש כסיסמה לכניסה לטופס)

### Orders.xlsx
טבלה בשם `Orders` עם העמודות:

| orderId | timestamp | employeeName | employeePhone | linkedByEmployee | customerId | customerName | products | notes | totalItems |
|---------|-----------|--------------|---------------|------------------|------------|--------------|----------|-------|------------|

### Activity.xlsx
טבלה בשם `Activity` עם העמודות:

| timestamp | type | employeeId | employeeName | customerId | customerName |
|-----------|------|------------|--------------|------------|--------------|

---

## תרחיש 1 - טעינת לקוחות (Get Customers)

**טריגר:** Custom Webhook (POST)

**צעדים:**
1. `Excel 365 > Search Rows` — קרא את כל השורות מטבלת `Customers`
2. `Webhook Response` — החזר את המערך:
   - Status: `200`
   - Body: `{{array of rows}}`
   - Headers: `Content-Type: application/json`

**כתובת ה-Webhook** נשמרת בממשק הניהול תחת הגדרות → "Webhook לטעינת לקוחות".

---

## תרחיש 2 - שמירת הזמנה (Save Order)

**טריגר:** Custom Webhook (POST)

גוף הבקשה מכיל:
```json
{
  "type": "order",
  "orderId": "ORD-20250501-ABC123",
  "timestamp": "2025-05-01T10:00:00.000Z",
  "employeeName": "שם העובד",
  "employeePhone": "050-0000000",
  "linkedByEmployee": "יעקב קוץ",
  "customerId": "1001",
  "customerName": "חברת אקמה בע\"מ",
  "products": [
    { "productId": "soap_big", "productName": "סבון למדיח 24 ק\"ג", "quantity": 2 }
  ],
  "notes": "הערה כלשהי",
  "totalItems": 2
}
```

**צעדים:**
1. `Excel 365 > Add a Row` — הוסף שורה לטבלת `Orders`
2. `Webhook Response` — החזר:
   - Status: `200`
   - Body: `{"success": true}`

> הטופס נשלח דרך Netlify Function (`/netlify/functions/submit-order`) שמוסיפה את ה-Webhook URL מ-Environment Variables.

---

## תרחיש 3 - רישום פעילות עובדים (Activity Tracking)

**טריגר:** Custom Webhook (POST)

גוף הבקשה מכיל שדות לפי סוג האירוע:

| type | שדות |
|------|------|
| `link_copied` | employeeId, employeeName, customerId, customerName, timestamp |
| `link_opened` | employeeId, employeeName, customerId, customerName, timestamp |

**צעדים:**
1. `Excel 365 > Add a Row` — הוסף שורה לטבלת `Activity`
2. `Webhook Response` — החזר status 200

**כתובת ה-Webhook** נשמרת בממשק הניהול תחת הגדרות → "Webhook למעקב עובדים".

---

## תרחיש 4 - קריאת פעילות (Get Activity Log)

**טריגר:** Custom Webhook (POST)

**צעדים:**
1. `Excel 365 > Search Rows` — קרא את כל השורות מטבלת `Activity`
2. `Webhook Response` — החזר את המערך

> כתובת זו משמשת את ממשק הניהול לטאב **פעילות**. יש להזינה ידנית בקוד `admin/admin.html` (משתנה `ACTIVITY_WEBHOOK_URL`).

---

## הגדרת Netlify Function

קובץ `deploy/netlify/functions/submit-order.js` מקבל את ההזמנה מהטופס ומעביר אותה ל-Make.com.

משתנה סביבה נדרש ב-Netlify:

| Key | Value |
|-----|-------|
| `MAKE_WEBHOOK_URL` | כתובת תרחיש 2 (שמירת הזמנה) |

---

## פתרון בעיות נפוצות

**"Accepted" במקום JSON בטעינת לקוחות**
Make.com Custom Webhook מחזיר "Accepted" לבקשות GET. הממשק שולח POST — ודא שהתרחיש פעיל.

**תאי Excel מחזירים אובייקט מקונן**
Excel 365 מחזיר כל תא כאובייקט `{Value, Formula, ...}`. הממשק מטפל בזה אוטומטית דרך `activityVal()`.

**קישור לקוח לא עובד**
- ודא שה-`AccountKey` בטבלת Customers תואם למה שמוצג בממשק הניהול
- הסיסמה של הלקוח = ה-`AccountKey` שלו בדיוק
