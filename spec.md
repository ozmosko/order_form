# Order Form - Technical Specification

## Project Overview
A responsive web-based order form for employees to record client orders. The form pulls customer data from SharePoint Excel via Power Automate and saves submitted orders back to SharePoint.

## User Requirements Summary
- **Customer Data Source**: SharePoint Excel file (updates frequently)
- **Product Data**: Hardcoded list (quantities only, no prices)
- **Order Storage**: SharePoint Excel file
- **Authentication**: Simple shared password
- **Access**: Desktop and mobile browsers

---

## Architecture

```
┌─────────────────┐      HTTP Request      ┌──────────────────┐
│   Web Form      │ ────────────────────▶  │  Power Automate  │
│  (HTML/JS/CSS)  │ ◀──────────────────────│    Flow #1       │
│                 │      Customer JSON     │  (Get Customers) │
└────────┬────────┘                        └────────┬─────────┘
         │                                          │
         │ Submit Order                             │ Read
         ▼                                          ▼
┌─────────────────┐      HTTP Request      ┌──────────────────┐
│  Power Automate │ ◀──────────────────────│   SharePoint     │
│    Flow #2      │                        │   Excel File     │
│  (Save Order)   │ ─────────────────────▶ │   (Customers)    │
└─────────────────┘      Append Row        └──────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `index.html` | Main form page with all UI elements |
| `styles.css` | Custom styling, mobile-responsive |
| `app.js` | Application logic, API calls, form handling |
| `config.js` | Products list, Power Automate URLs, password |
| `SETUP.md` | Power Automate setup instructions |

---

## Detailed Component Specifications

### 1. `index.html` - Main Form Page

#### Password Gate Modal
- Modal overlay blocking form access
- Password input field
- Submit button
- "Remember me" checkbox (stores auth in localStorage)
- Error message display for wrong password

#### Header Section
- Company/form title
- Logout button (clears localStorage)

#### Customer Selection Section
- Label: "Select Customer"
- Searchable dropdown (Select2 library)
- Search by customer name OR customer ID
- Shows: Customer ID - Customer Name
- Required field validation

#### Product Rows Section
- Header: "Order Items"
- "Add Product" button
- Each row contains:
  - Product dropdown (searchable)
  - Quantity input (number, min=1)
  - Remove row button (trash icon)
- Minimum 1 row required
- Dynamic add/remove functionality

#### Order Notes Section
- Optional textarea for special instructions
- Character limit: 500

#### Submit Section
- Submit Order button
- Loading spinner during submission
- Success/error message display

### 2. `styles.css` - Styling

#### Mobile-First Responsive Design
- Breakpoints: 576px, 768px, 992px
- Stack elements vertically on mobile
- Side-by-side layout on desktop

#### Form Elements
- Consistent input styling
- Clear focus states
- Error state highlighting (red border)
- Disabled state styling

#### Color Scheme
- Professional blue/gray palette
- Success: green
- Error: red
- Warning: yellow

### 3. `app.js` - Application Logic

#### Password Module
```javascript
// Functions:
- validatePassword(input) → boolean
- checkStoredAuth() → boolean
- storeAuth()
- clearAuth()
```

#### Customer Module
```javascript
// Functions:
- fetchCustomers() → Promise<Customer[]>
- filterCustomers(searchTerm) → Customer[]
- initCustomerDropdown()
- getSelectedCustomer() → Customer | null
```

#### Products Module
```javascript
// Functions:
- addProductRow()
- removeProductRow(rowId)
- getProductRows() → ProductRow[]
- validateProductRows() → boolean
```

#### Form Module
```javascript
// Functions:
- validateForm() → boolean
- collectFormData() → OrderData
- submitOrder(data) → Promise<Response>
- showSuccess(message)
- showError(message)
- resetForm()
```

### 4. `config.js` - Configuration

```javascript
// Configuration object
const CONFIG = {
    // Power Automate endpoints (user fills these in)
    endpoints: {
        getCustomers: "https://prod-xx.westus.logic.azure.com/...",
        saveOrder: "https://prod-xx.westus.logic.azure.com/..."
    },

    // Password (SHA-256 hash)
    passwordHash: "YOUR_HASHED_PASSWORD_HERE",

    // Product list (user customizes)
    products: [
        { id: "P001", name: "Product A" },
        { id: "P002", name: "Product B" },
        { id: "P003", name: "Product C" },
        { id: "P004", name: "Product D" },
        { id: "P005", name: "Product E" }
    ],

    // Form settings
    settings: {
        maxNotesLength: 500,
        minQuantity: 1,
        maxQuantity: 9999
    }
};
```

---

## Power Automate Flows

### Flow 1: Get Customers

#### Trigger
- Type: "When a HTTP request is received"
- Method: GET
- Response: JSON array

#### Actions
1. **List rows present in a table**
   - Location: [SharePoint Site]
   - Document Library: [Library Name]
   - File: [customers.xlsx]
   - Table: [CustomersTable]

2. **Response**
   - Status Code: 200
   - Body: `@{body('List_rows_present_in_a_table')?['value']}`

#### Expected Customer Excel Format
| CustomerID | CustomerName | ContactEmail | Phone |
|------------|--------------|--------------|-------|
| C001 | Acme Corp | john@acme.com | 555-0100 |
| C002 | Beta Inc | jane@beta.com | 555-0200 |

### Flow 2: Save Order

#### Trigger
- Type: "When a HTTP request is received"
- Method: POST
- Request Body JSON Schema:
```json
{
    "type": "object",
    "properties": {
        "customerId": { "type": "string" },
        "customerName": { "type": "string" },
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "productId": { "type": "string" },
                    "productName": { "type": "string" },
                    "quantity": { "type": "integer" }
                }
            }
        },
        "notes": { "type": "string" },
        "submittedAt": { "type": "string" },
        "submittedBy": { "type": "string" }
    }
}
```

#### Actions
1. **Add a row into a table**
   - Location: [SharePoint Site]
   - Document Library: [Library Name]
   - File: [orders.xlsx]
   - Table: [OrdersTable]
   - Columns mapped from trigger body

2. **Response**
   - Status Code: 200
   - Body: `{ "success": true, "orderId": "generated-id" }`

#### Expected Orders Excel Format
| OrderID | CustomerID | CustomerName | Items | Notes | SubmittedAt |
|---------|------------|--------------|-------|-------|-------------|
| ORD-001 | C001 | Acme Corp | P001:5,P003:10 | Rush order | 2024-01-15T10:30:00 |

---

## External Dependencies (CDN)

| Library | Version | Purpose |
|---------|---------|---------|
| Bootstrap | 5.3.x | Responsive layout, UI components |
| Select2 | 4.1.x | Searchable dropdown |
| jQuery | 3.7.x | Required by Select2 |
| Font Awesome | 6.x | Icons |
| CryptoJS | 4.x | Password hashing |

---

## Security Considerations

### Password Protection
- Password stored as SHA-256 hash (not plaintext)
- Auth state stored in localStorage with expiration
- Logout clears all stored auth data

### API Security
- Power Automate URLs should not be exposed publicly
- Consider adding API key validation in flows
- HTTPS only for all communications

### Data Validation
- Client-side validation for user experience
- Server-side validation in Power Automate flows
- Sanitize all inputs before saving

---

## Hosting Options

| Option | Pros | Cons |
|--------|------|------|
| SharePoint Document Library | Internal access, no extra setup | May have CORS issues |
| GitHub Pages | Free, easy deployment | Public URL (relies on password) |
| Azure Static Web Apps | Free tier, good performance | Requires Azure account |
| Internal Web Server | Full control | Requires infrastructure |

**Recommended**: SharePoint Document Library or Azure Static Web Apps

---

## Implementation Checklist

### Phase 1: Core Form (Files)
- [ ] Create `index.html` with all UI sections
- [ ] Create `styles.css` with responsive design
- [ ] Create `app.js` with core functionality
- [ ] Create `config.js` with placeholder values

### Phase 2: Power Automate
- [ ] Create "Get Customers" flow
- [ ] Test customer data retrieval
- [ ] Create "Save Order" flow
- [ ] Test order submission
- [ ] Update `config.js` with flow URLs

### Phase 3: Integration & Testing
- [ ] Test password protection
- [ ] Test customer search/selection
- [ ] Test product row add/remove
- [ ] Test form submission end-to-end
- [ ] Test on mobile devices

### Phase 4: Deployment
- [ ] Choose hosting option
- [ ] Deploy files
- [ ] Set actual password hash
- [ ] Configure actual product list
- [ ] User acceptance testing

---

## Testing Checklist

### Password Gate
- [ ] Correct password grants access
- [ ] Wrong password shows error
- [ ] "Remember me" persists across sessions
- [ ] Logout clears session

### Customer Selection
- [ ] Customers load from Power Automate
- [ ] Search by name works
- [ ] Search by ID works
- [ ] Selection is required

### Product Rows
- [ ] Can add new rows
- [ ] Can remove rows (except last)
- [ ] Quantity validation (min 1)
- [ ] Product selection required

### Form Submission
- [ ] Validates all required fields
- [ ] Shows loading state
- [ ] Shows success message
- [ ] Shows error message on failure
- [ ] Resets form after success

### Mobile Responsiveness
- [ ] Form usable on iPhone
- [ ] Form usable on Android
- [ ] Dropdowns work on touch
- [ ] Keyboard doesn't obscure inputs
