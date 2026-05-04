// Order Form Application - Hebrew Version

async function pbkdf2Hash(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode('nitank-order-form-v1'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

class OrderForm {
    constructor() {
        this.customers = [];
        this.productRowCount = 0;
        this.isAuthenticated = false;
        this.customerMode = false;
        this.prefilledCustomer = null;
        this.pendingOrderData = null;

        const params = new URLSearchParams(window.location.search);
        // Support both new short params (cid/cn) and old long params (customerId/customerName)
        const customerId   = params.get('cid') || params.get('customerId');
        const customerNameRaw = params.get('cn') || params.get('customerName');
        let customerName = null;
        if (customerNameRaw) {
            try {
                // cn is base64-encoded UTF-8; customerName (legacy) is plain URL-decoded
                customerName = params.get('cn')
                    ? decodeURIComponent(escape(atob(customerNameRaw)))
                    : customerNameRaw;
            } catch (e) {
                customerName = customerNameRaw;
            }
        }
        if (customerId && customerName) {
            this.customerMode = true;
            this.prefilledCustomer = { id: customerId, name: customerName };
        }

        // Employee who sent the link — resolve ID to name via CONFIG.employeeHashes
        this.linkedByEmployee = null;
        this.linkedByEmployeeId = null;
        const eid = params.get('eid');
        if (eid) {
            this.linkedByEmployeeId = eid;
            const emp = (CONFIG.employeeHashes || []).find(e => e.id === eid);
            if (emp) this.linkedByEmployee = emp.name;
        }

        // If the link contains an encoded customer password hash, load it into memory only
        // (not saved to localStorage - requires re-entry on every new browser session)
        const cph = params.get('h') || params.get('cph');
        if (cph) {
            try {
                CONFIG.customerPasswordHash = atob(cph);
            } catch (e) {
                console.error('Failed to decode customer password hash from link', e);
            }
        }

        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
    }

    // Authentication Methods
    checkAuthentication() {
        if (!this.customerMode) {
            // Form accessed without a valid customer link — show error
            document.getElementById('passwordOverlay').innerHTML = `
                <div class="password-modal text-center">
                    <h2><i class="fas fa-exclamation-triangle me-2 text-warning"></i>קישור לא תקין</h2>
                    <p class="text-muted mt-3">הטופס נגיש רק דרך קישור אישי שנשלח אליך.</p>
                    <p class="text-muted small">אם אין לך קישור, פנה לנציג נ.י.טנק שלך.</p>
                </div>`;
            document.getElementById('passwordOverlay').style.display = 'flex';
            return;
        }

        const authData = sessionStorage.getItem('orderFormAuth');
        if (authData) {
            try {
                const { timestamp, hash, customerId = null } = JSON.parse(authData);
                const customerMatches = String(customerId) === String(this.prefilledCustomer.id);
                if (Date.now() - timestamp < CONFIG.sessionTimeout &&
                    hash === CONFIG.customerPasswordHash &&
                    customerMatches) {
                    this.isAuthenticated = true;
                    this.showMainContent();
                    return;
                }
            } catch (e) { /* stale / corrupt — fall through to login */ }
        }

        document.getElementById('passwordInput').placeholder = 'הכנס את מספר הלקוח שלך';
        const overlayTitle = document.querySelector('#passwordOverlay h2');
        if (overlayTitle) overlayTitle.innerHTML = '<i class="fas fa-lock me-2"></i>זיהוי לקוח';
        document.getElementById('passwordOverlay').style.display = 'flex';
    }

    async verifyPassword(password) {
        const hash = await pbkdf2Hash(password);
        if (hash === CONFIG.customerPasswordHash) {
            sessionStorage.setItem('orderFormAuth', JSON.stringify({
                timestamp: Date.now(),
                hash,
                customerId: this.prefilledCustomer.id
            }));
            this.isAuthenticated = true;
            document.getElementById('passwordOverlay').style.display = 'none';
            this.showMainContent();
            return true;
        }
        return false;
    }

    showMainContent() {
        document.getElementById('mainContainer').classList.add('visible');

        document.getElementById('customerSelectWrapper').style.display = 'none';
        const fixed = document.getElementById('customerFixed');
        fixed.style.display = 'block';
        fixed.innerHTML = `
            <div class="p-2 border rounded bg-light">
                <i class="fas fa-building me-2 text-primary"></i>
                <strong>${this.prefilledCustomer.name}</strong>
                <small class="text-muted ms-2">
                    <i class="fas fa-hashtag me-1"></i>${this.prefilledCustomer.id}
                </small>
            </div>`;

        document.getElementById('logoutBtn').style.display = 'none';

        // Track link open: tells the manager which employee's link the customer opened
        if (this.linkedByEmployeeId && CONFIG.trackingWebhookUrl) {
            fetch(CONFIG.trackingWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'link_opened',
                    employeeId: this.linkedByEmployeeId,
                    employeeName: this.linkedByEmployee,
                    customerId: this.prefilledCustomer.id,
                    customerName: this.prefilledCustomer.name,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
        }

        this.loadCustomers();
        this.addProductRow();
    }

    // Customer Loading
    loadCustomers() {
        this.customers = [this.prefilledCustomer];
        // Auto-select in the hidden <select> so gatherOrderData() can read it
        const select = document.getElementById('customerSelect');
        select.innerHTML = `<option value="${this.prefilledCustomer.id}">${this.prefilledCustomer.name}</option>`;
        select.value = this.prefilledCustomer.id;
        this.hideLoading();
    }

    onCustomerChange() {}
    populateCustomerDropdown() {}

    // Product Row Management
    addProductRow() {
        this.productRowCount++;
        const rowId = `product-row-${this.productRowCount}`;
        const container = document.getElementById('productRows');

        // Hide empty state
        const emptyState = document.getElementById('emptyProducts');
        if (emptyState) emptyState.style.display = 'none';

        const row = document.createElement('div');
        row.className = 'product-row';
        row.id = rowId;

        row.innerHTML = `
            <select class="form-select product-select" onchange="orderForm.onProductChange('${rowId}')">
                <option value="">בחר מוצר...</option>
                ${CONFIG.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <input type="text" class="form-control custom-product-input"
                   placeholder="הזן שם מוצר..."
                   style="display: none;"
                   oninput="orderForm.updateOrderSummary()">
            <input type="number" class="form-control quantity-input"
                   min="1" value="1" placeholder="כמות"
                   onchange="orderForm.updateOrderSummary()"
                   oninput="orderForm.updateOrderSummary()">
            <button type="button" class="btn btn-outline-danger btn-remove"
                    onclick="orderForm.removeProductRow('${rowId}')"
                    title="הסר מוצר">
                <i class="fas fa-trash"></i>
            </button>
        `;

        container.appendChild(row);
        this.updateOrderSummary();
    }

    removeProductRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
        }

        // Show empty state if no rows
        const container = document.getElementById('productRows');
        if (container.children.length === 0) {
            const emptyState = document.getElementById('emptyProducts');
            if (emptyState) emptyState.style.display = 'block';
        }

        this.updateOrderSummary();
    }

    onProductChange(rowId) {
        const row = document.getElementById(rowId);
        const select = row.querySelector('.product-select');
        const customInput = row.querySelector('.custom-product-input');

        // Show custom input if "אחר" (OTHER) is selected
        if (select.value === 'OTHER') {
            customInput.style.display = 'block';
            customInput.focus();
        } else {
            customInput.style.display = 'none';
            customInput.value = '';
        }

        this.updateOrderSummary();
    }

    // Order Summary
    updateOrderSummary() {
        const rows = document.querySelectorAll('.product-row');
        const summaryContainer = document.getElementById('orderSummary');
        let itemCount = 0;
        const productLines = [];

        rows.forEach(row => {
            const select = row.querySelector('.product-select');
            const customInput = row.querySelector('.custom-product-input');
            const quantity = parseInt(row.querySelector('.quantity-input').value) || 0;

            if (select.value && quantity > 0) {
                let name;
                if (select.value === 'OTHER' && customInput.value.trim()) {
                    name = customInput.value.trim();
                } else {
                    const product = CONFIG.products.find(p => p.id === select.value);
                    name = product?.name || select.value;
                }
                productLines.push({ name, quantity });
                itemCount += quantity;
            }
        });

        const customerSelect = document.getElementById('customerSelect');
        const customerName = customerSelect.options[customerSelect.selectedIndex]?.text || '';

        const productRowsHtml = productLines.length
            ? productLines.map(p => `
                <div class="summary-row">
                    <span>${p.name}</span>
                    <span>${p.quantity}</span>
                </div>`).join('')
            : '<div class="summary-row"><span><em>לא נבחרו מוצרים</em></span><span></span></div>';

        summaryContainer.innerHTML = `
            <div class="summary-row">
                <span>לקוח:</span>
                <span>${customerSelect.value ? customerName : '<em>לא נבחר</em>'}</span>
            </div>
            ${productRowsHtml}
            <div class="summary-row total">
                <span>סה"כ פריטים:</span>
                <span>${itemCount}</span>
            </div>
        `;
    }

    // Form Validation
    validateForm() {
        const errors = [];

        // Check privacy consent checkbox
        const consent = document.getElementById('privacyConsent');
        if (consent && !consent.checked) {
            errors.push('אנא אשר את מדיניות הפרטיות לפני שליחת ההזמנה');
        }

        // Check employee name
        const employeeName = document.getElementById('employeeName').value.trim();
        if (!employeeName) {
            errors.push('אנא הזן את שם העובד');
        }

        // Check phone number (optional, but must be valid if provided)
        const employeePhone = document.getElementById('employeePhone').value.trim();
        if (employeePhone) {
            const digits = employeePhone.replace(/[\s\-]/g, '');
            if (!/^0\d{8,9}$/.test(digits)) {
                errors.push('מספר הטלפון אינו תקין');
            }
        }

        // Check customer selection
        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect.value) {
            errors.push('אנא בחר לקוח');
        }

        // Check products
        const rows = document.querySelectorAll('.product-row');
        let hasValidProduct = false;
        const selectedProducts = new Set();

        rows.forEach((row, index) => {
            const select = row.querySelector('.product-select');
            const customInput = row.querySelector('.custom-product-input');
            const quantity = parseInt(row.querySelector('.quantity-input').value) || 0;

            if (select.value) {
                // Check for custom product name if "אחר" selected
                if (select.value === 'OTHER' && !customInput.value.trim()) {
                    errors.push(`אנא הזן שם מוצר בשורה ${index + 1}`);
                }

                // Check for duplicates (except for OTHER which can have different custom names)
                if (select.value !== 'OTHER') {
                    if (selectedProducts.has(select.value)) {
                        errors.push(`מוצר כפול בשורה ${index + 1}`);
                    }
                    selectedProducts.add(select.value);
                }

                if (quantity < 1) {
                    errors.push(`כמות לא תקינה בשורה ${index + 1}`);
                } else {
                    hasValidProduct = true;
                }
            }
        });

        if (!hasValidProduct) {
            errors.push('אנא הוסף לפחות מוצר אחד עם כמות');
        }

        return errors;
    }

    // Webhook
    async triggerWebhook(orderData) {
        try {
            const response = await fetch('/.netlify/functions/submit-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            if (!response.ok) throw new Error(`Webhook responded with ${response.status}`);
        } catch (error) {
            console.error('Webhook error:', error);
            return error;
        }
    }

    // Form Submission
    async submitOrder() {
        const errors = this.validateForm();
        if (errors.length > 0) {
            this.showAlert(errors.join('<br>'), 'danger');
            return;
        }

        this.pendingOrderData = this.gatherOrderData();
        document.getElementById('confirmModalBody').innerHTML =
            this.buildConfirmationHtml(this.pendingOrderData);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmModal')).show();
    }

    buildConfirmationHtml(orderData) {
        const productRows = orderData.products.map(p =>
            `<tr><td>${p.productName}</td><td class="text-center fw-bold">${p.quantity}</td></tr>`
        ).join('');

        return `
            <table class="table table-sm mb-3">
                <tr><th class="text-muted" style="width:90px">לקוח</th><td class="fw-bold">${orderData.customerName}</td></tr>
                <tr><th class="text-muted">עובד</th><td>${orderData.employeeName}</td></tr>
                ${orderData.employeePhone ? `<tr><th class="text-muted">טלפון</th><td>${orderData.employeePhone}</td></tr>` : ''}
            </table>
            <table class="table table-sm table-bordered">
                <thead class="table-light">
                    <tr><th>מוצר</th><th class="text-center" style="width:70px">כמות</th></tr>
                </thead>
                <tbody>${productRows}</tbody>
                <tfoot class="table-light">
                    <tr><th>סה"כ פריטים</th><th class="text-center">${orderData.totalItems}</th></tr>
                </tfoot>
            </table>
            ${orderData.notes ? `<div class="alert alert-light py-2 small mb-0"><strong>הערות:</strong> ${orderData.notes}</div>` : ''}
        `;
    }

    async confirmAndSubmit() {
        const orderData = this.pendingOrderData;
        bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();

        this.showLoading('שולח הזמנה...');
        try {
            const webhookError = await this.triggerWebhook(orderData);
            if (webhookError) {
                this.showAlert('שליחת ההזמנה נכשלה. אנא נסה שוב.', 'danger');
            } else {
                this.showAlert('ההזמנה נשלחה בהצלחה!', 'success');
                this.resetForm();
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            this.showAlert('שליחת ההזמנה נכשלה. אנא נסה שוב.', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    gatherOrderData() {
        const employeeName = document.getElementById('employeeName').value.trim();
        const employeePhone = document.getElementById('employeePhone').value.trim();
        const customerSelect = document.getElementById('customerSelect');
        const customer = this.customers.find(c => c.id == customerSelect.value);

        const products = [];
        document.querySelectorAll('.product-row').forEach(row => {
            const select = row.querySelector('.product-select');
            const customInput = row.querySelector('.custom-product-input');
            const quantity = parseInt(row.querySelector('.quantity-input').value) || 0;

            if (select.value && quantity > 0) {
                let productName;
                if (select.value === 'OTHER' && customInput.value.trim()) {
                    productName = customInput.value.trim();
                } else {
                    const product = CONFIG.products.find(p => p.id === select.value);
                    productName = product?.name || select.value;
                }
                products.push({
                    productId: select.value,
                    productName: productName,
                    quantity: quantity
                });
            }
        });

        return {
            type: 'order',
            orderId: this.generateOrderId(),
            timestamp: new Date().toISOString(),
            employeeName: employeeName,
            employeePhone: employeePhone,
            linkedByEmployeeId: this.linkedByEmployeeId || null,
            linkedByEmployee: this.linkedByEmployee || null,
            customerId: customer?.id,
            customerName: customer?.name,
            customerContact: customer?.contact,
            customerEmail: customer?.email,
            products: products,
            notes: document.getElementById('orderNotes').value.trim(),
            totalItems: products.reduce((sum, p) => sum + p.quantity, 0)
        };
    }

    generateOrderId() {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `ORD-${dateStr}-${random}`;
    }

    resetForm() {
        // Customer selection is fixed — no reset needed

        // Clear product rows
        document.getElementById('productRows').innerHTML = '';

        // Show empty state then add one row
        const emptyState = document.getElementById('emptyProducts');
        if (emptyState) emptyState.style.display = 'block';

        // Add fresh row
        this.addProductRow();

        // Clear notes
        document.getElementById('orderNotes').value = '';

        // Reset privacy consent — must be re-confirmed for each new order
        const consent = document.getElementById('privacyConsent');
        if (consent) consent.checked = false;

        // Update summary
        this.updateOrderSummary();
    }

    // Utility Methods
    showLoading(message = 'טוען...') {
        const overlay = document.getElementById('loadingOverlay');
        overlay.querySelector('.loading-text').textContent = message;
        overlay.classList.add('visible');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('visible');
    }

    showAlert(message, type = 'info') {
        const container = document.getElementById('alertContainer');
        const alertId = `alert-${Date.now()}`;

        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(alert);

        // Success alerts stay until manually dismissed; others auto-dismiss after 5s
        if (type !== 'success') {
            setTimeout(() => {
                const alertEl = document.getElementById(alertId);
                if (alertEl) alertEl.remove();
            }, 5000);
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Password form
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('passwordInput').value;
            const errorEl = document.getElementById('passwordError');
            const submitBtn = e.target.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>מאמת...';

            const result = await this.verifyPassword(password);

            if (!result) {
                errorEl.style.display = 'block';
                document.getElementById('passwordInput').value = '';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>כניסה';
                document.getElementById('passwordInput').focus();
            }
        });

        // Order form
        document.getElementById('orderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder();
        });

        // Add product button
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.addProductRow();
        });

        // Confirmation modal submit button
        document.getElementById('confirmSubmitBtn').addEventListener('click', () => {
            this.confirmAndSubmit();
        });

        // Show "contact admin" button in the password overlay
        const section = document.getElementById('contactAdminSection');
        if (section) section.style.display = 'block';

        document.getElementById('contactAdminBtn')?.addEventListener('click', () => {
            this.contactAdmin();
        });
    }

    async contactAdmin() {
        const btn = document.getElementById('contactAdminBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>שולח...';

        try {
            await fetch('/.netlify/functions/submit-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'forgot_password',
                    customerId: this.prefilledCustomer.id,
                    customerName: this.prefilledCustomer.name,
                    timestamp: new Date().toISOString()
                })
            });
            document.getElementById('contactAdminSuccess').style.display = 'block';
            btn.style.display = 'none';
        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-envelope me-2"></i>שלח בקשה למנהל';
        }
    }
}

// Initialize the application
let orderForm;
document.addEventListener('DOMContentLoaded', () => {
    orderForm = new OrderForm();
});
