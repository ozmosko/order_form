# Order Form Setup Guide

This guide will help you set up the Order Form application with Power Automate and SharePoint.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [SharePoint Excel Setup](#sharepoint-excel-setup)
3. [Power Automate Flow 1: Get Customers](#power-automate-flow-1-get-customers)
4. [Power Automate Flow 2: Save Order](#power-automate-flow-2-save-order)
5. [Configuration](#configuration)
6. [Hosting Options](#hosting-options)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Microsoft 365 account with access to:
  - SharePoint Online
  - Power Automate (Flow)
  - Excel Online
- Web hosting location (SharePoint, GitHub Pages, or any web server)

---

## SharePoint Excel Setup

### Step 1: Create the Customers Excel File

1. Go to your SharePoint site
2. Navigate to a document library (e.g., "Documents")
3. Create a new Excel file named `Customers.xlsx`
4. Create a table with the following columns:

| id | name | contact | email |
|----|------|---------|-------|
| 1 | Acme Corporation | John Smith | john@acme.com |
| 2 | Beta Industries | Jane Doe | jane@beta.com |

5. **Important**: Format this data as an Excel Table
   - Select all data including headers
   - Go to Insert > Table
   - Name the table `Customers` (Table Design > Table Name)

### Step 2: Create the Orders Excel File

1. In the same SharePoint library, create `Orders.xlsx`
2. Create a table with the following columns:

| orderId | timestamp | customerId | customerName | customerContact | customerEmail | products | notes | totalItems |
|---------|-----------|------------|--------------|-----------------|---------------|----------|-------|------------|

3. Format as an Excel Table named `Orders`

---

## Power Automate Flow 1: Get Customers

This flow returns the list of customers from SharePoint Excel.

### Step 1: Create the Flow

1. Go to [Power Automate](https://make.powerautomate.com)
2. Click **Create** > **Instant cloud flow**
3. Name it: "Order Form - Get Customers"
4. Select trigger: **When a HTTP request is received**
5. Click **Create**

### Step 2: Configure the HTTP Trigger

1. Click on the trigger
2. For **Request Body JSON Schema**, leave it empty (GET request)
3. Under **Settings** > **Allowed Methods**, add: `GET`

### Step 3: Add Excel Action

1. Click **+ New step**
2. Search for "Excel Online (Business)"
3. Select **List rows present in a table**
4. Configure:
   - **Location**: Your SharePoint site
   - **Document Library**: Documents (or your library)
   - **File**: /Customers.xlsx
   - **Table**: Customers

### Step 4: Add Response Action

1. Click **+ New step**
2. Search for "Response"
3. Select **Response** (from Request connector)
4. Configure:
   - **Status Code**: 200
   - **Headers**:
     ```
     Content-Type: application/json
     Access-Control-Allow-Origin: *
     ```
   - **Body**: Select the `value` from the Excel action (dynamic content)

### Step 5: Save and Get URL

1. Click **Save**
2. Go back to the HTTP trigger
3. Copy the **HTTP POST URL** - you'll need this for config.js

---

## Power Automate Flow 2: Save Order

This flow saves new orders to SharePoint Excel.

### Step 1: Create the Flow

1. Go to Power Automate
2. Click **Create** > **Instant cloud flow**
3. Name it: "Order Form - Save Order"
4. Select trigger: **When a HTTP request is received**
5. Click **Create**

### Step 2: Configure the HTTP Trigger

1. Click on the trigger
2. For **Request Body JSON Schema**, paste:

```json
{
    "type": "object",
    "properties": {
        "orderId": { "type": "string" },
        "timestamp": { "type": "string" },
        "customerId": { "type": "integer" },
        "customerName": { "type": "string" },
        "customerContact": { "type": "string" },
        "customerEmail": { "type": "string" },
        "products": { "type": "array" },
        "notes": { "type": "string" },
        "totalItems": { "type": "integer" }
    }
}
```

### Step 3: Add Excel Action

1. Click **+ New step**
2. Search for "Excel Online (Business)"
3. Select **Add a row into a table**
4. Configure:
   - **Location**: Your SharePoint site
   - **Document Library**: Documents
   - **File**: /Orders.xlsx
   - **Table**: Orders
   - Map each column to the corresponding trigger output:
     - orderId: `@{triggerBody()?['orderId']}`
     - timestamp: `@{triggerBody()?['timestamp']}`
     - customerId: `@{triggerBody()?['customerId']}`
     - customerName: `@{triggerBody()?['customerName']}`
     - customerContact: `@{triggerBody()?['customerContact']}`
     - customerEmail: `@{triggerBody()?['customerEmail']}`
     - products: `@{string(triggerBody()?['products'])}`
     - notes: `@{triggerBody()?['notes']}`
     - totalItems: `@{triggerBody()?['totalItems']}`

### Step 4: Add Response Action

1. Click **+ New step**
2. Select **Response**
3. Configure:
   - **Status Code**: 200
   - **Headers**:
     ```
     Content-Type: application/json
     Access-Control-Allow-Origin: *
     ```
   - **Body**:
     ```json
     {
       "success": true,
       "orderId": "@{triggerBody()?['orderId']}"
     }
     ```

### Step 5: Save and Get URL

1. Click **Save**
2. Copy the **HTTP POST URL**

---

## Configuration

### Update config.js

Open `config.js` and update the following:

```javascript
const CONFIG = {
    endpoints: {
        // Paste your Power Automate URLs here
        getCustomers: 'https://prod-XX.westus.logic.azure.com/workflows/...',
        saveOrder: 'https://prod-XX.westus.logic.azure.com/workflows/...'
    },

    // Change the password (generate new hash)
    // Run in browser console: CryptoJS.SHA256('your-new-password').toString()
    passwordHash: 'your-new-hash-here',

    // Customize your products
    products: [
        { id: 'P001', name: 'Your Product 1' },
        { id: 'P002', name: 'Your Product 2' },
        // ... add more products
    ],

    // IMPORTANT: Set to false for production
    demoMode: false
};
```

### Generate Password Hash

To generate a new password hash:

1. Open browser developer console (F12)
2. Load the page with CryptoJS available
3. Run: `CryptoJS.SHA256('your-password').toString()`
4. Copy the result to `passwordHash` in config.js

---

## Hosting Options

### Option 1: SharePoint Document Library (Recommended)

1. Upload all files to a SharePoint document library:
   - index.html
   - styles.css
   - app.js
   - config.js

2. Get the direct link to index.html
3. Share with your team

### Option 2: GitHub Pages (Free)

1. Create a GitHub repository
2. Upload all files
3. Go to Settings > Pages
4. Enable GitHub Pages from main branch
5. Access at: `https://yourusername.github.io/repo-name/`

### Option 3: Azure Static Web Apps (Free Tier)

1. Create an Azure Static Web App
2. Connect to your GitHub repo
3. Deploy automatically

---

## Testing

### Test in Demo Mode First

1. Keep `demoMode: true` in config.js
2. Open index.html in a browser
3. Enter password: `123` (default)
4. Verify:
   - Customer dropdown loads with demo data
   - Can add/remove product rows
   - Order summary updates correctly
   - Form submission shows success (logged to console)

### Test with Power Automate

1. Set `demoMode: false` in config.js
2. Update endpoint URLs
3. Test customer loading
4. Submit a test order
5. Verify order appears in SharePoint Excel

---

## Troubleshooting

### "Failed to load customers"
- Check Power Automate URL is correct
- Verify the flow is turned on
- Check CORS headers in flow response
- Test flow manually in Power Automate

### "CORS error"
- Ensure `Access-Control-Allow-Origin: *` header is in both flows
- If hosting on SharePoint, the same-origin policy may apply

### "Incorrect password"
- Default password in demo is `123`
- Verify password hash in config.js matches your password
- Clear browser localStorage and try again

### Products not saving correctly
- Check Excel table column names match exactly
- Verify JSON schema in Power Automate trigger
- Check for special characters in product names

### Mobile Issues
- Ensure you're using HTTPS (required for some features)
- Clear browser cache
- Try in different browser

---

## Security Notes

1. **Password Protection**: The password is a basic deterrent, not enterprise security. For sensitive data, use Azure AD authentication.

2. **Power Automate URLs**: These URLs are "security through obscurity". Anyone with the URL can call the endpoints. For production:
   - Add API key validation in Power Automate
   - Use Azure AD authentication
   - Restrict IP addresses if possible

3. **HTTPS**: Always use HTTPS in production to encrypt data in transit.

---

## Support

For issues or questions:
1. Check the browser console (F12) for errors
2. Test Power Automate flows independently
3. Verify SharePoint permissions
