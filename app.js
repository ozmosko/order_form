// Order Form Application - Hebrew Version

class OrderForm {
    constructor() {
        this.customers = [];
        this.productRowCount = 0;
        this.isAuthenticated = false;
        this.customerMode = false;
        this.prefilledCustomer = null;

        const params = new URLSearchParams(window.location.search);
        const customerId = params.get('customerId');
        const customerName = params.get('customerName');
        if (customerId && customerName) {
            this.customerMode = true;
            this.prefilledCustomer = { id: customerId, name: customerName };
        }

        // If the link contains an encoded webhook URL, save it to localStorage
        const wh = params.get('wh');
        if (wh) {
            try {
                const webhookUrl = atob(wh);
                const stored = localStorage.getItem('orderFormEndpoints');
                const endpoints = stored ? JSON.parse(stored) : {};
                endpoints.webhookUrl = webhookUrl;
                localStorage.setItem('orderFormEndpoints', JSON.stringify(endpoints));
            } catch (e) {
                console.error('Failed to decode webhook URL from link', e);
            }
        }

        this.init();
    }

    init() {
        this.loadEndpointsFromStorage();
        this.checkAuthentication();
        this.setupEventListeners();

        // Only show demo banner in employee mode
        if (CONFIG.demoMode && !this.customerMode) {
            document.getElementById('demoBanner').classList.add('visible');
        }
    }

    loadEndpointsFromStorage() {
        const stored = localStorage.getItem('orderFormEndpoints');
        if (!stored) return;
        try {
            const endpoints = JSON.parse(stored);
            if (endpoints.getCustomers) {
                CONFIG.endpoints.getCustomers = endpoints.getCustomers;
                CONFIG.demoMode = false;
            }
            if (endpoints.webhookUrl) {
                CONFIG.webhookUrl = endpoints.webhookUrl;
            }
        } catch (e) {
            console.error('Failed to parse stored endpoints', e);
        }
    }

    // Authentication Methods
    checkAuthentication() {
        const authData = localStorage.getItem('orderFormAuth');
        if (authData) {
            const { timestamp, hash, mode = 'employee', customerId = null } = JSON.parse(authData);
            const now = Date.now();
            const expectedHash = this.customerMode ? CONFIG.customerPasswordHash : CONFIG.passwordHash;
            const expectedMode = this.customerMode ? 'customer' : 'employee';
            const customerMatches = !this.customerMode ||
                String(customerId) === String(this.prefilledCustomer.id);

            if (now - timestamp < CONFIG.sessionTimeout &&
                hash === expectedHash &&
                mode === expectedMode &&
                customerMatches) {
                this.isAuthenticated = true;
                this.showMainContent();
                return;
            }
        }

        document.getElementById('passwordOverlay').style.display = 'flex';
    }

    verifyPassword(password) {
        const hash = CryptoJS.SHA256(password).toString();
        const expectedHash = this.customerMode ? CONFIG.customerPasswordHash : CONFIG.passwordHash;

        if (hash === expectedHash) {
            localStorage.setItem('orderFormAuth', JSON.stringify({
                timestamp: Date.now(),
                hash: hash,
                mode: this.customerMode ? 'customer' : 'employee',
                customerId: this.customerMode ? this.prefilledCustomer.id : null
            }));

            this.isAuthenticated = true;
            document.getElementById('passwordOverlay').style.display = 'none';
            this.showMainContent();
            return true;
        }

        return false;
    }

    logout() {
        localStorage.removeItem('orderFormAuth');
        this.isAuthenticated = false;
        location.reload();
    }

    showMainContent() {
        document.getElementById('mainContainer').classList.add('visible');

        if (this.customerMode) {
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
        }

        this.loadCustomers();
        this.addProductRow();
    }

    // Customer Loading
    async loadCustomers() {
        this.showLoading('טוען לקוחות...');

        try {
            if (this.customerMode) {
                this.customers = [this.prefilledCustomer];
            } else if (CONFIG.demoMode) {
                await this.simulateDelay(500);
                this.customers = DEMO_CUSTOMERS;
            } else {
                const response = await fetch(CONFIG.endpoints.getCustomers, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                if (!response.ok) throw new Error('Failed to load customers');
                const raw = await response.json();
                this.customers = raw.map(c => ({
                    id:      c.AccountKey  ?? c.id,
                    name:    c.FullName    ?? c.name,
                    contact: c.contact     || '',
                    email:   c.email       || ''
                }));
            }

            this.populateCustomerDropdown();
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showAlert('טעינת הלקוחות נכשלה. אנא רענן את הדף.', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    populateCustomerDropdown() {
        const select = document.getElementById('customerSelect');

        select.innerHTML = '<option value="">בחר לקוח...</option>';

        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            option.dataset.contact = customer.contact || '';
            option.dataset.email = customer.email || '';
            select.appendChild(option);
        });

        // In customer mode: auto-select and skip Select2
        if (this.customerMode) {
            select.value = this.prefilledCustomer.id;
            return;
        }

        // Initialize Select2 with RTL support
        $(select).select2({
            theme: 'bootstrap-5',
            placeholder: 'חפש לקוח...',
            allowClear: true,
            width: '100%',
            dir: 'rtl',
            language: {
                noResults: function() {
                    return 'לא נמצאו תוצאות';
                },
                searching: function() {
                    return 'מחפש...';
                }
            }
        });

        // Handle selection change
        $(select).on('change', (e) => this.onCustomerChange(e));
    }

    onCustomerChange(e) {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const customerInfo = document.getElementById('customerInfo');

        if (selectedOption && selectedOption.value) {
            const contact = selectedOption.dataset.contact;
            const email = selectedOption.dataset.email;

            const id = selectedOption.value;
            const parts = [
                `<i class="fas fa-hashtag me-1"></i>${id}`,
                contact ? `<i class="fas fa-user me-1"></i>${contact}` : '',
                email   ? `<i class="fas fa-envelope me-1"></i>${email}` : ''
            ].filter(Boolean).join(' | ');

            customerInfo.innerHTML = `<small class="text-muted">${parts}</small>`;
            customerInfo.style.display = 'block';
        } else {
            customerInfo.style.display = 'none';
        }

        this.updateOrderSummary();
    }

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
        let productCount = 0;

        rows.forEach(row => {
            const select = row.querySelector('.product-select');
            const quantity = parseInt(row.querySelector('.quantity-input').value) || 0;

            if (select.value && quantity > 0) {
                productCount++;
                itemCount += quantity;
            }
        });

        const customerSelect = document.getElementById('customerSelect');
        const customerName = customerSelect.options[customerSelect.selectedIndex]?.text || 'ללא';

        summaryContainer.innerHTML = `
            <div class="summary-row">
                <span>לקוח:</span>
                <span>${customerSelect.value ? customerName : '<em>לא נבחר</em>'}</span>
            </div>
            <div class="summary-row">
                <span>מוצרים:</span>
                <span>${productCount} סוגים</span>
            </div>
            <div class="summary-row total">
                <span>סה"כ פריטים:</span>
                <span>${itemCount}</span>
            </div>
        `;
    }

    // Form Validation
    validateForm() {
        const errors = [];

        // Check employee name
        const employeeName = document.getElementById('employeeName').value.trim();
        if (!employeeName) {
            errors.push('אנא הזן את שם העובד');
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
        if (!CONFIG.webhookUrl) return;

        try {
            const response = await fetch(CONFIG.webhookUrl, {
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
        // Validate form
        const errors = this.validateForm();
        if (errors.length > 0) {
            this.showAlert(errors.join('<br>'), 'danger');
            return;
        }

        // Confirm submission
        if (!confirm('האם אתה בטוח שברצונך לשלוח את ההזמנה?')) {
            return;
        }

        this.showLoading('שולח הזמנה...');

        try {
            // Gather order data
            const orderData = this.gatherOrderData();

            const hasSaveUrl = CONFIG.endpoints.saveOrder &&
                CONFIG.endpoints.saveOrder.startsWith('http');

            if (!CONFIG.demoMode && hasSaveUrl) {
                const response = await fetch(CONFIG.endpoints.saveOrder, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                if (!response.ok) throw new Error('Failed to submit order');
            }

            const webhookError = await this.triggerWebhook(orderData);
            if (webhookError) {
                this.showAlert('ההזמנה נשלחה בהצלחה, אך שליחת ה-webhook נכשלה', 'warning');
            } else {
                this.showAlert('ההזמנה נשלחה בהצלחה!', 'success');
            }
            this.resetForm();
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
            orderId: this.generateOrderId(),
            timestamp: new Date().toISOString(),
            employeeName: employeeName,
            employeePhone: employeePhone,
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
        // Reset employee name
        document.getElementById('employeeName').value = '';
        document.getElementById('employeePhone').value = '';

        // Reset customer selection
        $('#customerSelect').val('').trigger('change');
        document.getElementById('customerInfo').style.display = 'none';

        // Clear product rows
        document.getElementById('productRows').innerHTML = '';

        // Show empty state then add one row
        const emptyState = document.getElementById('emptyProducts');
        if (emptyState) emptyState.style.display = 'block';

        // Add fresh row
        this.addProductRow();

        // Clear notes
        document.getElementById('orderNotes').value = '';

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

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alertEl = document.getElementById(alertId);
            if (alertEl) {
                alertEl.remove();
            }
        }, 5000);
    }

    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Password form
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('passwordInput').value;
            const errorEl = document.getElementById('passwordError');

            if (!this.verifyPassword(password)) {
                errorEl.style.display = 'block';
                document.getElementById('passwordInput').value = '';
                document.getElementById('passwordInput').focus();
            }
        });

        // Order form
        document.getElementById('orderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('האם אתה בטוח שברצונך לצאת?')) {
                this.logout();
            }
        });

        // Add product button
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.addProductRow();
        });
    }
}

// Initialize the application
let orderForm;
document.addEventListener('DOMContentLoaded', () => {
    orderForm = new OrderForm();
});
