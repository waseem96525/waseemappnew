// Retail POS Application
class RetailPOS {
    constructor() {
        this.products = [];
        this.cart = [];
        this.sales = [];
        this.currentEditId = null;
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.charts = {};
        this.discount = { type: 'percentage', value: 0, code: '' };
        this.settings = {
            shop: {
                name: '',
                address: '',
                phone: '',
                email: '',
                gst: '',
                logo: ''
            },
            invoice: {
                prefix: 'INV',
                footer: 'Thank you for your business!',
                showLogo: true,
                showGST: true
            },
            appearance: {
                primaryColor: '#667eea',
                secondaryColor: '#764ba2',
                enableAnimations: true,
                compactMode: false
            }
        };
        this.currentFilter = {
            search: '',
            dateRange: 'all',
            startDate: null,
            endDate: null
        };
        this.selectedTransactions = new Set();
        this.customers = {};
        this.currentUser = null;
        this.users = [];
        this.isLoggedIn = false;
        this.inventoryForecast = {};
        this.externalServices = {
            emailEnabled: false,
            smsEnabled: false,
            cloudBackupEnabled: false,
            barcodeScannerEnabled: false
        };
        this.init();
    }

    init() {
        this.loadUsers();
        this.checkLoginStatus();
        
        // Setup login event listener before checking login status
        this.setupLoginEventListener();
        
        if (!this.isLoggedIn) {
            this.showLoginModal();
            return;
        }
        
        this.loadData();
        this.setupEventListeners();
        this.renderProducts();
        this.renderInventory();
        this.updateCart();
        this.addSampleProducts();
        this.applyTheme();
        this.initCharts();
        this.updateDashboard();
        this.updateReports();
        this.loadSettings();
        this.populateSettingsForm();
        this.initializeExternalServices();
        this.initializeForecast();
        this.updateCustomers();
        
        // Start auto-save interval (save every 30 seconds)
        this.startAutoSave();
    }

    // Theme Management
    applyTheme() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    toggleTheme() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.applyTheme();
    }

    // Dashboard
    updateDashboard() {
        const today = new Date().toDateString();
        const todaySales = this.sales.filter(sale => 
            new Date(sale.date).toDateString() === today
        );

        const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
        const transactionCount = todaySales.length;
        const totalProducts = this.products.length;
        const lowStockCount = this.products.filter(p => p.stock < 10).length;

        document.getElementById('dashboardTodaySales').textContent = `₹${todayTotal.toFixed(2)}`;
        document.getElementById('dashboardTransactionCount').textContent = transactionCount;
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('lowStockCount').textContent = lowStockCount;

        // Update notification badge
        this.updateNotificationBadge();

        this.updateCharts();
    }

    initCharts() {
        this.charts.salesChart = new Chart(document.getElementById('salesChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Sales',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        this.charts.categoryChart = new Chart(document.getElementById('categoryChart'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#28a745',
                        '#dc3545',
                        '#ffc107'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Data Management
    loadData() {
        try {
            const savedProducts = localStorage.getItem('products');
            const savedSales = localStorage.getItem('sales');
            
            if (savedProducts) {
                this.products = JSON.parse(savedProducts);
            }
            
            if (savedSales) {
                this.sales = JSON.parse(savedSales);
            }
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            this.showToast('Error loading saved data', 'error');
        }
    }

    saveData() {
        try {
            localStorage.setItem('products', JSON.stringify(this.products));
            localStorage.setItem('sales', JSON.stringify(this.sales));
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    // Force save all persistent data
    saveAllData() {
        this.saveData();
        this.saveUsers();
        this.saveSettings();
        localStorage.setItem('externalServices', JSON.stringify(this.externalServices));
        localStorage.setItem('darkMode', this.darkMode);
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('loginTime', Date.now().toString());
        }
    }

    // Auto-save functionality
    startAutoSave() {
        // Save data every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveAllData();
        }, 30000);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.error('Error loading settings from localStorage:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving settings to localStorage:', error);
        }
    }

    updateCharts() {
        if (!this.charts.salesChart || !this.charts.categoryChart) {
            return; // Charts not initialized yet
        }

        // Sales chart - last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toDateString());
        }

        const salesData = last7Days.map(date => {
            return this.sales
                .filter(sale => new Date(sale.date).toDateString() === date)
                .reduce((sum, sale) => sum + sale.total, 0);
        });

        this.charts.salesChart.data.labels = last7Days.map(date => 
            new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        this.charts.salesChart.data.datasets[0].data = salesData;
        this.charts.salesChart.update();

        // Category chart
        const categoryData = {};
        this.sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = this.products.find(p => p.id === item.id);
                if (product) {
                    categoryData[product.category] = (categoryData[product.category] || 0) + item.quantity;
                }
            });
        });

        this.charts.categoryChart.data.labels = Object.keys(categoryData);
        this.charts.categoryChart.data.datasets[0].data = Object.values(categoryData);
        this.charts.categoryChart.update();
    }

    addSampleProducts() {
        if (this.products.length === 0) {
            const sampleProducts = [
                { id: 1, name: 'Laptop', category: 'Electronics', price: 74999, stock: 10, description: 'High-performance laptop' },
                { id: 2, name: 'Mouse', category: 'Electronics', price: 2249, stock: 50, description: 'Wireless optical mouse' },
                { id: 3, name: 'Keyboard', category: 'Electronics', price: 5999, stock: 30, description: 'Mechanical keyboard' },
                { id: 4, name: 'T-Shirt', category: 'Clothing', price: 1499, stock: 100, description: 'Cotton t-shirt' },
                { id: 5, name: 'Jeans', category: 'Clothing', price: 3749, stock: 40, description: 'Denim jeans' },
                { id: 6, name: 'Coffee', category: 'Food', price: 299, stock: 200, description: 'Premium coffee beans' },
                { id: 7, name: 'Sandwich', category: 'Food', price: 449, stock: 50, description: 'Fresh sandwich' },
                { id: 8, name: 'Notebook', category: 'Other', price: 224, stock: 150, description: 'Spiral notebook' }
            ];
            
            this.products = sampleProducts;
            this.saveData();
            this.renderProducts();
            this.renderInventory();
        }
    }

    // Setup login event listener (called before login check)
    setupLoginEventListener() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            this.login(username, password);
        });
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target.closest('.nav-btn').dataset.section));
        });

        // Notification Button
        document.getElementById('notificationBtn').addEventListener('click', () => {
            this.showNotifications();
        });

        // Product Search
        document.getElementById('productSearch').addEventListener('input', (e) => {
            this.filterProducts(e.target.value);
        });

        // Category Filter
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filterProducts(document.getElementById('productSearch').value, e.target.value);
        });

        // Product Item Clicks (event delegation)
        document.getElementById('productList').addEventListener('click', (e) => {
            const productItem = e.target.closest('.product-item');
            if (productItem && productItem.dataset.productId) {
                this.addToCart(parseInt(productItem.dataset.productId));
            }
        });

        // Barcode Input
        document.getElementById('barcodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.scanBarcode(e.target.value);
                e.target.value = '';
            }
        });

        // Tax Checkbox
        document.getElementById('taxEnabled').addEventListener('change', () => {
            this.updateCartSummary();
        });

        // Discount Type Radio Buttons
        document.querySelectorAll('input[name="discountType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateDiscountInput(e.target.value);
            });
        });

        // Apply Discount Button
        document.getElementById('applyDiscountBtn').addEventListener('click', () => {
            this.applyDiscount();
        });

        // Add Product
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.openProductModal();
        });

        // Product Form
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Cancel Button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeProductModal();
        });

        // Checkout
        document.getElementById('checkoutBtn').addEventListener('click', () => {
            this.checkout();
        });

        // Cart Action Buttons (event delegation)
        document.getElementById('cartItems').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) {
                const productId = parseInt(button.dataset.productId);
                const action = button.dataset.action;
                
                if (action === 'increase') {
                    this.updateQuantity(productId, 1);
                } else if (action === 'decrease') {
                    this.updateQuantity(productId, -1);
                } else if (action === 'remove') {
                    this.removeFromCart(productId);
                }
            }
        });

        // Modal Close Buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Print Invoice
        document.getElementById('printInvoice').addEventListener('click', () => {
            window.print();
        });

        // Close Invoice Modal
        document.getElementById('closeInvoice').addEventListener('click', () => {
            document.getElementById('invoiceModal').style.display = 'none';
        });

        // Export CSV
        document.getElementById('exportCSV').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Inventory Action Buttons (event delegation)
        document.getElementById('inventoryBody').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) {
                const productId = parseInt(button.dataset.productId);
                const action = button.dataset.action;
                
                if (action === 'edit') {
                    this.editProduct(productId);
                } else if (action === 'delete') {
                    this.deleteProduct(productId);
                }
            }
        });

        // Settings Forms
        document.getElementById('shopSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveShopSettings();
        });

        document.getElementById('invoiceSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInvoiceSettings();
        });

        document.getElementById('appearanceSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAppearanceSettings();
        });

        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        document.getElementById('resetAppearance').addEventListener('click', () => {
            this.resetAppearance();
        });

        // Transaction search and filtering
        document.getElementById('transactionSearch').addEventListener('input', (e) => {
            this.currentFilter.search = e.target.value;
            this.updateReports();
        });

        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.currentFilter.dateRange = e.target.value;
            const dateRangePicker = document.getElementById('dateRangePicker');
            
            if (e.target.value === 'custom') {
                dateRangePicker.style.display = 'flex';
            } else {
                dateRangePicker.style.display = 'none';
                this.updateReports();
            }
        });

        document.getElementById('applyDateFilter').addEventListener('click', () => {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            if (startDate && endDate) {
                this.currentFilter.startDate = startDate;
                this.currentFilter.endDate = endDate;
                this.updateReports();
            } else {
                this.showToast('Please select both start and end dates', 'warning');
            }
        });

        // Select all transactions checkbox
        document.getElementById('selectAllTransactions').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.transaction-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                const saleId = parseInt(checkbox.dataset.saleId);
                if (e.target.checked) {
                    this.selectedTransactions.add(saleId);
                } else {
                    this.selectedTransactions.delete(saleId);
                }
            });
        });

        // Individual transaction checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('transaction-checkbox')) {
                const saleId = parseInt(e.target.dataset.saleId);
                if (e.target.checked) {
                    this.selectedTransactions.add(saleId);
                } else {
                    this.selectedTransactions.delete(saleId);
                }
                this.updateSelectAllCheckbox();
            }
        });

        // Bulk actions
        document.getElementById('exportFiltered').addEventListener('click', () => {
            this.exportFilteredTransactions();
        });

        document.getElementById('printSelected').addEventListener('click', () => {
            this.printSelectedTransactions();
        });

        // Customer search and management
        document.getElementById('customerSearch').addEventListener('input', (e) => {
            this.updateCustomersTable(e.target.value);
        });

        document.getElementById('exportCustomers').addEventListener('click', () => {
            this.exportCustomers();
        });

        // Customer view buttons (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-customer') || e.target.closest('.view-customer')) {
                const button = e.target.classList.contains('view-customer') ? e.target : e.target.closest('.view-customer');
                const customerKey = button.dataset.customerKey;
                this.viewCustomerHistory(customerKey);
            }
        });

        // Print and View buttons (event delegation for dynamically created buttons)
        document.addEventListener('click', (e) => {
            const button = e.target.classList.contains('print-btn') || e.target.classList.contains('view-btn') 
                ? e.target 
                : e.target.closest('.print-btn') || e.target.closest('.view-btn');
            
            if (button) {
                const saleId = parseInt(button.dataset.saleId);
                if (button.classList.contains('print-btn') || button.closest('.print-btn')) {
                    this.printSale(saleId);
                } else if (button.classList.contains('view-btn') || button.closest('.view-btn')) {
                    this.viewSale(saleId);
                }
            }
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Save data before page unload
        window.addEventListener('beforeunload', () => {
            this.saveAllData();
        });

        // User Management Events
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('addUserBtn').addEventListener('click', () => {
            document.getElementById('userModal').style.display = 'block';
            document.getElementById('userForm').reset();
            document.getElementById('userId').value = '';
            document.getElementById('userModalTitle').textContent = 'Add New User';
        });

        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const userData = {
                name: document.getElementById('userName').value,
                username: document.getElementById('userUsername').value,
                password: document.getElementById('userPassword').value,
                role: document.getElementById('userRole').value,
                email: document.getElementById('userEmail').value
            };

            const userId = document.getElementById('userId').value;
            if (userId) {
                this.updateUser(parseInt(userId), userData);
            } else {
                this.addUser(userData);
            }

            document.getElementById('userModal').style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-user')) {
                const userId = parseInt(e.target.dataset.userId);
                const user = this.users.find(u => u.id === userId);
                if (user) {
                    document.getElementById('userId').value = user.id;
                    document.getElementById('userName').value = user.name;
                    document.getElementById('userUsername').value = user.username;
                    document.getElementById('userPassword').value = user.password;
                    document.getElementById('userRole').value = user.role;
                    document.getElementById('userEmail').value = user.email;
                    document.getElementById('userModalTitle').textContent = 'Edit User';
                    document.getElementById('userModal').style.display = 'block';
                }
            }

            if (e.target.classList.contains('delete-user')) {
                const userId = parseInt(e.target.dataset.userId);
                if (confirm('Are you sure you want to delete this user?')) {
                    this.deleteUser(userId);
                }
            }
        });

        // Forecast Events
        document.getElementById('runForecastBtn').addEventListener('click', () => {
            this.calculateInventoryForecast();
            this.updateForecastDisplay();
            this.showToast('Forecast updated', 'success');
        });

        document.getElementById('exportForecastBtn').addEventListener('click', () => {
            this.exportForecastReport();
        });

        // Forecast Reorder Buttons (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.matches('button[data-action="reorder"]')) {
                const productId = parseInt(e.target.dataset.productId);
                const quantity = parseInt(e.target.dataset.quantity);
                this.reorderProduct(productId, quantity);
            }
        });

        // External Services Events
        document.getElementById('externalServicesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const servicesData = {
                emailEnabled: document.getElementById('emailEnabled').checked,
                smsEnabled: document.getElementById('smsEnabled').checked,
                cloudBackupEnabled: document.getElementById('cloudBackupEnabled').checked,
                barcodeScannerEnabled: document.getElementById('barcodeScannerEnabled').checked,
                emailAddress: document.getElementById('emailAddress').value
            };
            this.saveExternalServices(servicesData);
        });

        document.getElementById('backupNowBtn').addEventListener('click', () => {
            this.performCloudBackup();
        });
    }

    // Navigation
    switchSection(sectionName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Refresh data when switching to reports or dashboard
        if (sectionName === 'reports') {
            this.updateReports();
        } else if (sectionName === 'dashboard') {
            this.updateDashboard();
        } else if (sectionName === 'customers') {
            this.updateCustomers();
        } else if (sectionName === 'forecast') {
            this.updateForecastDisplay();
        } else if (sectionName === 'users') {
            this.updateUsersTable();
        }
    }

    // Product Management
    renderProducts(searchTerm = '', category = '') {
        const productList = document.getElementById('productList');
        const filteredProducts = this.getFilteredProducts(searchTerm, category);

        if (filteredProducts.length === 0) {
            productList.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No products found</p></div>';
            return;
        }

        productList.innerHTML = filteredProducts.map(product => `
            <div class="product-item" data-product-id="${product.id}">
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p><i class="fas fa-tag"></i> ${product.category} | <i class="fas fa-boxes"></i> Stock: ${product.stock}</p>
                </div>
                <div class="product-price">₹${product.price.toFixed(2)}</div>
            </div>
        `).join('');
    }

    renderInventory(searchTerm = '', category = '') {
        const inventoryBody = document.getElementById('inventoryBody');
        const filteredProducts = this.getFilteredInventory(searchTerm, category);

        if (filteredProducts.length === 0) {
            inventoryBody.innerHTML = '<tr><td colspan="6" class="empty-state">No products found</td></tr>';
            return;
        }

        inventoryBody.innerHTML = filteredProducts.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>₹${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" data-action="edit" data-product-id="${product.id}">Edit</button>
                        <button class="btn-delete" data-action="delete" data-product-id="${product.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getFilteredProducts(searchTerm, category) {
        let filtered = this.products.filter(p => p.stock > 0);
        
        if (searchTerm) {
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (category) {
            filtered = filtered.filter(product => product.category === category);
        }
        
        return filtered;
    }

    getFilteredInventory(searchTerm, category) {
        let filtered = this.products;
        
        if (searchTerm) {
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (category) {
            filtered = filtered.filter(product => product.category === category);
        }
        
        return filtered;
    }

    filterProducts(searchTerm, category = '') {
        this.renderProducts(searchTerm, category);
    }

    filterInventory(searchTerm, category) {
        this.renderInventory(searchTerm, category);
    }

    // Cart Management
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || product.stock === 0) {
            this.showToast('Product not available', 'error');
            return;
        }

        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                this.showToast('Insufficient stock', 'warning');
                return;
            }
            existingItem.quantity++;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
            });
        }

        this.updateCart();
        this.showToast('Added to cart', 'success');
    }

    updateCart() {
        const cartItems = document.getElementById('cartItems');
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-state"><p>Cart is empty</p></div>';
            this.updateCartSummary();
            return;
        }

        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>₹${item.price.toFixed(2)} each</p>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn" data-action="decrease" data-product-id="${item.id}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" data-action="increase" data-product-id="${item.id}">+</button>
                    </div>
                    <button class="remove-btn" data-action="remove" data-product-id="${item.id}">Remove</button>
                </div>
            </div>
        `).join('');

        this.updateCartSummary();
    }

    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        const product = this.products.find(p => p.id === productId);
        
        if (!item) return;

        const newQuantity = item.quantity + change;
        
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }
        
        if (newQuantity > product.stock) {
            this.showToast('Insufficient stock', 'warning');
            return;
        }

        item.quantity = newQuantity;
        this.updateCart();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCart();
    }

    updateCartSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Calculate discount
        let discountAmount = 0;
        if (this.discount.value > 0) {
            if (this.discount.type === 'percentage') {
                discountAmount = subtotal * (this.discount.value / 100);
            } else {
                discountAmount = Math.min(this.discount.value, subtotal); // Don't allow discount > subtotal
            }
        }
        
        const discountedSubtotal = subtotal - discountAmount;
        const taxEnabled = document.getElementById('taxEnabled').checked;
        const tax = taxEnabled ? discountedSubtotal * 0.1 : 0;
        const total = discountedSubtotal + tax;

        document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('discount').textContent = `₹${discountAmount.toFixed(2)}`;
        document.getElementById('tax').textContent = `₹${tax.toFixed(2)}`;
        document.getElementById('total').textContent = `₹${total.toFixed(2)}`;
    }

    // Discount Methods
    updateDiscountInput(type) {
        const discountValueInput = document.getElementById('discountValue');
        if (type === 'percentage') {
            discountValueInput.placeholder = '%';
            discountValueInput.max = '100';
            discountValueInput.min = '0';
        } else {
            discountValueInput.placeholder = '₹';
            discountValueInput.max = '';
            discountValueInput.min = '0';
        }
        discountValueInput.value = '';
    }

    applyDiscount() {
        const discountCode = document.getElementById('discountCode').value.trim();
        const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
        const discountType = document.querySelector('input[name="discountType"]:checked').value;

        if (discountValue <= 0) {
            this.showToast('Please enter a valid discount value', 'warning');
            return;
        }

        if (discountType === 'percentage' && discountValue > 100) {
            this.showToast('Percentage discount cannot exceed 100%', 'warning');
            return;
        }

        // Apply discount
        this.discount = {
            type: discountType,
            value: discountValue,
            code: discountCode
        };

        this.updateCartSummary();
        this.showToast(`Discount applied: ${discountValue}${discountType === 'percentage' ? '%' : '₹'}`, 'success');
    }

    // Checkout
    checkout() {
        if (this.cart.length === 0) {
            this.showToast('Cart is empty', 'warning');
            return;
        }

        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;

        // Create sale record
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Calculate discount
        let discountAmount = 0;
        if (this.discount.value > 0) {
            if (this.discount.type === 'percentage') {
                discountAmount = subtotal * (this.discount.value / 100);
            } else {
                discountAmount = Math.min(this.discount.value, subtotal);
            }
        }
        
        const discountedSubtotal = subtotal - discountAmount;
        const taxEnabled = document.getElementById('taxEnabled').checked;
        const tax = taxEnabled ? discountedSubtotal * 0.1 : 0;
        const total = discountedSubtotal + tax;

        const sale = {
            id: Date.now(),
            date: new Date().toISOString(),
            customer: {
                name: customerName,
                phone: customerPhone
            },
            items: [...this.cart],
            subtotal: subtotal,
            discount: discountAmount,
            discountType: this.discount.type,
            discountValue: this.discount.value,
            tax: tax,
            total: total
        };

        // Update stock
        this.cart.forEach(cartItem => {
            const product = this.products.find(p => p.id === cartItem.id);
            if (product) {
                product.stock -= cartItem.quantity;
            }
        });

        // Save sale
        this.sales.push(sale);
        this.saveData();

        // Show invoice
        this.showInvoice(sale);

        // Clear cart
        this.cart = [];
        this.discount = { type: 'percentage', value: 0, code: '' };
        this.updateCart();

        // Clear customer info
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('discountCode').value = '';
        document.getElementById('discountValue').value = '';

        // Refresh displays
        this.renderProducts();
        this.renderInventory();
        this.updateReports();
        this.updateDashboard();

        this.showToast('Sale completed successfully', 'success');
    }

    // Product Modal
    openProductModal(productId = null) {
        const modal = document.getElementById('productModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('productForm');

        if (productId) {
            const product = this.products.find(p => p.id === productId);
            modalTitle.textContent = 'Edit Product';
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productBarcode').value = product.barcode || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productQuickKey').value = product.quickKey || '';
            this.currentEditId = productId;
        } else {
            modalTitle.textContent = 'Add Product';
            form.reset();
            this.currentEditId = null;
        }

        modal.style.display = 'block';
    }

    closeProductModal() {
        document.getElementById('productModal').style.display = 'none';
        document.getElementById('productForm').reset();
        this.currentEditId = null;
    }

    saveProduct() {
        const name = document.getElementById('productName').value;
        const category = document.getElementById('productCategory').value;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const barcode = document.getElementById('productBarcode').value;
        const description = document.getElementById('productDescription').value;
        const quickKey = parseInt(document.getElementById('productQuickKey').value) || null;

        if (!name || !category || isNaN(price) || isNaN(stock)) {
            this.showToast('Please fill all required fields', 'warning');
            return;
        }

        if (this.currentEditId) {
            // Edit existing product
            const product = this.products.find(p => p.id === this.currentEditId);
            product.name = name;
            product.category = category;
            product.price = price;
            product.stock = stock;
            product.barcode = barcode;
            product.description = description;
            product.quickKey = quickKey;
            this.showToast('Product updated successfully', 'success');
        } else {
            // Add new product
            const newProduct = {
                id: Date.now(),
                name,
                category,
                price,
                stock,
                barcode,
                description,
                quickKey
            };
            this.products.push(newProduct);
            this.showToast('Product added successfully', 'success');
        }

        this.saveData();
        this.renderProducts();
        this.renderInventory();
        this.closeProductModal();
    }

    editProduct(productId) {
        this.openProductModal(productId);
    }

    deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        this.products = this.products.filter(p => p.id !== productId);
        this.cart = this.cart.filter(item => item.id !== productId);
        
        this.saveData();
        this.renderProducts();
        this.renderInventory();
        this.updateCart();
        
        this.showToast('Product deleted successfully', 'success');
    }

    // Invoice
    showInvoice(sale) {
        const invoiceContent = document.getElementById('invoiceContent');
        const date = new Date(sale.date).toLocaleDateString();
        const time = new Date(sale.date).toLocaleTimeString();

        const shopInfo = this.settings.shop;
        const invoiceSettings = this.settings.invoice;

        invoiceContent.innerHTML = `
            <div class="invoice-header">
                ${invoiceSettings.showLogo && shopInfo.logo ? `<img src="${shopInfo.logo}" alt="Logo" style="max-width: 100px; margin-bottom: 10px;">` : ''}
                <h2>${shopInfo.name || '🛍️ Retail POS'}</h2>
                ${shopInfo.address ? `<p>${shopInfo.address}</p>` : ''}
                ${shopInfo.phone ? `<p>Phone: ${shopInfo.phone}</p>` : ''}
                ${shopInfo.email ? `<p>Email: ${shopInfo.email}</p>` : ''}
                ${invoiceSettings.showGST && shopInfo.gst ? `<p>GST: ${shopInfo.gst}</p>` : ''}
                <p>Invoice #${invoiceSettings.prefix}${sale.id}</p>
            </div>
            
            <div class="invoice-details">
                <div>
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${sale.customer.name}</p>
                    <p><strong>Phone:</strong> ${sale.customer.phone || 'N/A'}</p>
                </div>
                <div>
                    <h4>Invoice Details</h4>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Time:</strong> ${time}</p>
                </div>
            </div>
            
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${sale.items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>₹${item.price.toFixed(2)}</td>
                            <td>₹${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="invoice-totals">
                <div>Subtotal: ₹${sale.subtotal.toFixed(2)}</div>
                ${sale.discount ? `<div>Discount${sale.discountType === 'percentage' ? ` (${sale.discountValue}%)` : ''}: ₹${sale.discount.toFixed(2)}</div>` : ''}
                <div>Tax (10%): ₹${sale.tax.toFixed(2)}</div>
                <div class="total">Total: ₹${sale.total.toFixed(2)}</div>
            </div>
            
            <div style="text-align: center; margin-top: 2rem; color: #666;">
                <p>${invoiceSettings.footer || 'Thank you for your business!'}</p>
            </div>
        `;

        document.getElementById('invoiceModal').style.display = 'block';
    }

    printSale(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (sale) {
            this.showInvoice(sale);
            // Small delay to ensure modal is rendered before printing
            setTimeout(() => {
                window.print();
            }, 100);
        } else {
            this.showToast('Sale not found', 'error');
        }
    }

    viewSale(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (sale) {
            this.showInvoice(sale);
        } else {
            this.showToast('Sale not found', 'error');
        }
    }

    updateSelectAllCheckbox() {
        const checkboxes = document.querySelectorAll('.transaction-checkbox');
        const selectAllCheckbox = document.getElementById('selectAllTransactions');
        
        if (checkboxes.length === 0) {
            selectAllCheckbox.checked = false;
            return;
        }

        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAllCheckbox.checked = checkedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }

    exportFilteredTransactions() {
        const filteredSales = this.getFilteredSales();
        
        if (filteredSales.length === 0) {
            this.showToast('No transactions to export', 'warning');
            return;
        }

        // Create CSV content
        const csvHeaders = ['Invoice ID', 'Date', 'Time', 'Customer Name', 'Customer Phone', 'Items Count', 'Subtotal', 'Discount', 'Tax', 'Total'];
        const csvRows = filteredSales.map(sale => {
            const date = new Date(sale.date);
            return [
                `${this.settings.invoice.prefix}${sale.id}`,
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                sale.customer.name,
                sale.customer.phone || '',
                sale.items.length,
                sale.subtotal.toFixed(2),
                (sale.discount || 0).toFixed(2),
                sale.tax.toFixed(2),
                sale.total.toFixed(2)
            ];
        });

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast(`Exported ${filteredSales.length} transactions`, 'success');
    }

    printSelectedTransactions() {
        if (this.selectedTransactions.size === 0) {
            this.showToast('No transactions selected', 'warning');
            return;
        }

        const selectedSales = Array.from(this.selectedTransactions)
            .map(id => this.sales.find(s => s.id === id))
            .filter(sale => sale);

        if (selectedSales.length === 0) {
            this.showToast('Selected transactions not found', 'error');
            return;
        }

        // For multiple invoices, print them one by one with user confirmation
        let currentIndex = 0;

        const printNext = () => {
            if (currentIndex >= selectedSales.length) {
                this.showToast(`Printed ${selectedSales.length} invoices successfully`, 'success');
                return;
            }

            const sale = selectedSales[currentIndex];
            this.showInvoice(sale);

            setTimeout(() => {
                // Use a print dialog that allows user to cancel
                const printConfirmed = confirm(`Print invoice ${currentIndex + 1} of ${selectedSales.length}?\n\nInvoice #${this.settings.invoice.prefix}${sale.id}\nCustomer: ${sale.customer.name}\nTotal: ₹${sale.total.toFixed(2)}\n\nClick OK to print, Cancel to skip.`);

                if (printConfirmed) {
                    window.print();
                }

                // Close the modal after printing attempt
                document.getElementById('invoiceModal').style.display = 'none';

                currentIndex++;
                // Small delay before showing next invoice
                setTimeout(printNext, 500);
            }, 200);
        };

        this.showToast(`Starting to print ${selectedSales.length} invoices...`, 'info');
        printNext();
    }

    // Customer Management
    updateCustomers() {
        this.processCustomerData();
        this.updateCustomerStats();
        this.updateCustomersTable();
    }

    processCustomerData() {
        this.customers = {};
        
        this.sales.forEach(sale => {
            const customerKey = `${sale.customer.name}_${sale.customer.phone || ''}`;
            
            if (!this.customers[customerKey]) {
                this.customers[customerKey] = {
                    name: sale.customer.name,
                    phone: sale.customer.phone || '',
                    email: sale.customer.email || '',
                    totalOrders: 0,
                    totalSpent: 0,
                    lastVisit: null,
                    firstVisit: null,
                    orders: []
                };
            }
            
            const customer = this.customers[customerKey];
            customer.totalOrders += 1;
            customer.totalSpent += sale.total;
            customer.orders.push({
                id: sale.id,
                date: sale.date,
                total: sale.total,
                items: sale.items.length
            });
            
            const saleDate = new Date(sale.date);
            if (!customer.lastVisit || saleDate > new Date(customer.lastVisit)) {
                customer.lastVisit = sale.date;
            }
            if (!customer.firstVisit || saleDate < new Date(customer.firstVisit)) {
                customer.firstVisit = sale.date;
            }
        });
    }

    updateCustomerStats() {
        const customerList = Object.values(this.customers);
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        document.getElementById('totalCustomers').textContent = customerList.length;
        
        const newCustomersThisMonth = customerList.filter(customer => 
            new Date(customer.firstVisit) >= thisMonth
        ).length;
        document.getElementById('newCustomersThisMonth').textContent = newCustomersThisMonth;
        
        const topCustomer = customerList.reduce((top, customer) => 
            customer.totalSpent > (top?.totalSpent || 0) ? customer : top, null
        );
        document.getElementById('topCustomer').textContent = topCustomer ? topCustomer.name : 'None';
    }

    updateCustomersTable(searchTerm = '') {
        const customersBody = document.getElementById('customersBody');
        let customerList = Object.values(this.customers);
        
        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            customerList = customerList.filter(customer => 
                customer.name.toLowerCase().includes(term) ||
                customer.phone.includes(term) ||
                customer.email.toLowerCase().includes(term)
            );
        }
        
        // Sort by total spent (highest first)
        customerList.sort((a, b) => b.totalSpent - a.totalSpent);
        
        if (customerList.length === 0) {
            customersBody.innerHTML = '<tr><td colspan="7" class="empty-state">No customers found</td></tr>';
            return;
        }
        
        customersBody.innerHTML = customerList.map(customer => `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.totalOrders}</td>
                <td>₹${customer.totalSpent.toFixed(2)}</td>
                <td>${customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="btn-small btn-secondary view-customer" data-customer-key="${customer.name}_${customer.phone || ''}">
                        <i class="fas fa-eye"></i> View History
                    </button>
                </td>
            </tr>
        `).join('');
    }

    viewCustomerHistory(customerKey) {
        const customer = this.customers[customerKey];
        if (!customer) {
            this.showToast('Customer not found', 'error');
            return;
        }
        
        // Create customer history modal content
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <span class="close">&times;</span>
                <div class="customer-history">
                    <h3>${customer.name}'s Purchase History</h3>
                    <div class="customer-info">
                        <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                        <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
                        <p><strong>Total Orders:</strong> ${customer.totalOrders}</p>
                        <p><strong>Total Spent:</strong> ₹${customer.totalSpent.toFixed(2)}</p>
                        <p><strong>First Visit:</strong> ${new Date(customer.firstVisit).toLocaleDateString()}</p>
                        <p><strong>Last Visit:</strong> ${new Date(customer.lastVisit).toLocaleDateString()}</p>
                    </div>
                    <div class="customer-orders">
                        <h4>Order History</h4>
                        <table class="orders-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${customer.orders.sort((a, b) => new Date(b.date) - new Date(a.date)).map(order => `
                                    <tr>
                                        <td>${this.settings.invoice.prefix}${order.id}</td>
                                        <td>${new Date(order.date).toLocaleDateString()}</td>
                                        <td>${order.items} items</td>
                                        <td>₹${order.total.toFixed(2)}</td>
                                        <td>
                                            <button class="btn-small btn-primary view-order" data-sale-id="${order.id}">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Add event listeners
        modal.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.removeChild(modal);
        });
        
        modal.querySelectorAll('.view-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const saleId = parseInt(e.target.closest('.view-order').dataset.saleId);
                this.viewSale(saleId);
            });
        });
    }

    exportCustomers() {
        const customerList = Object.values(this.customers);
        
        if (customerList.length === 0) {
            this.showToast('No customers to export', 'warning');
            return;
        }
        
        const csvHeaders = ['Name', 'Phone', 'Email', 'Total Orders', 'Total Spent', 'First Visit', 'Last Visit'];
        const csvRows = customerList.map(customer => [
            customer.name,
            customer.phone || '',
            customer.email || '',
            customer.totalOrders,
            customer.totalSpent.toFixed(2),
            customer.firstVisit ? new Date(customer.firstVisit).toLocaleDateString() : '',
            customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : ''
        ]);
        
        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast(`Exported ${customerList.length} customers`, 'success');
    }

    // User Management
    loadUsers() {
        try {
            const savedUsers = localStorage.getItem('users');
            if (savedUsers) {
                this.users = JSON.parse(savedUsers);
            } else {
                // Create default admin user
                this.users = [{
                    id: 1,
                    name: 'Administrator',
                    username: 'admin',
                    password: 'admin123',
                    role: 'admin',
                    email: '',
                    lastLogin: null,
                    isActive: true,
                    createdAt: new Date().toISOString()
                }];
                this.saveUsers();
            }
        } catch (error) {
            console.error('Error loading users from localStorage:', error);
            // Reset to default admin user
            this.users = [{
                id: 1,
                name: 'Administrator',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                email: '',
                lastLogin: null,
                isActive: true,
                createdAt: new Date().toISOString()
            }];
        }
    }

    saveUsers() {
        try {
            localStorage.setItem('users', JSON.stringify(this.users));
        } catch (error) {
            console.error('Error saving users to localStorage:', error);
        }
    }

    checkLoginStatus() {
        try {
            const savedUser = localStorage.getItem('currentUser');
            const loginTime = localStorage.getItem('loginTime');
            
            if (savedUser && loginTime) {
                const timeDiff = Date.now() - parseInt(loginTime);
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                
                // Auto logout after 8 hours
                if (hoursDiff < 8) {
                    this.currentUser = JSON.parse(savedUser);
                    this.isLoggedIn = true;
                    this.updateUserInterface();
                    return;
                }
            }
            
            this.logout();
        } catch (error) {
            console.error('Error checking login status:', error);
            this.logout();
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
    }

    login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password && u.isActive);
        
        if (user) {
            this.currentUser = user;
            this.isLoggedIn = true;
            this.currentUser.lastLogin = new Date().toISOString();
            
            // Update user in users array
            const userIndex = this.users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                this.users[userIndex] = this.currentUser;
                this.saveUsers();
            }
            
            // Save login session
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('loginTime', Date.now().toString());
            
            this.updateUserInterface();
            document.getElementById('loginModal').style.display = 'none';
            this.showToast(`Welcome back, ${user.name}!`, 'success');
            
            // Re-initialize the app
            this.init();
        } else {
            document.getElementById('loginMessage').textContent = 'Invalid username or password';
            document.getElementById('loginMessage').className = 'message error';
        }
    }

    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        this.updateUserInterface();
        this.showLoginModal();
    }

    updateUserInterface() {
        const userInfo = document.getElementById('userInfo');
        const currentUserDisplay = document.getElementById('currentUserDisplay');
        const usersNavBtn = document.getElementById('usersNavBtn');
        
        if (this.isLoggedIn && this.currentUser) {
            userInfo.style.display = 'flex';
            currentUserDisplay.textContent = `${this.currentUser.name} (${this.currentUser.role})`;
            
            // Show users management for admin
            if (this.currentUser.role === 'admin') {
                usersNavBtn.style.display = 'inline-block';
            } else {
                usersNavBtn.style.display = 'none';
            }
        } else {
            userInfo.style.display = 'none';
            usersNavBtn.style.display = 'none';
        }
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        switch (permission) {
            case 'admin':
                return this.currentUser.role === 'admin';
            case 'manager':
                return ['admin', 'manager'].includes(this.currentUser.role);
            case 'cashier':
                return ['admin', 'manager', 'cashier'].includes(this.currentUser.role);
            default:
                return false;
        }
    }

    // User CRUD operations
    addUser(userData) {
        if (!this.hasPermission('admin')) {
            this.showToast('Insufficient permissions', 'error');
            return false;
        }

        // Check if username already exists
        if (this.users.some(u => u.username === userData.username)) {
            this.showToast('Username already exists', 'error');
            return false;
        }

        const newUser = {
            id: Date.now(),
            name: userData.name,
            username: userData.username,
            password: userData.password,
            role: userData.role,
            email: userData.email || '',
            lastLogin: null,
            isActive: true,
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        this.updateUsersTable();
        this.showToast('User added successfully', 'success');
        return true;
    }

    updateUser(userId, userData) {
        if (!this.hasPermission('admin')) {
            this.showToast('Insufficient permissions', 'error');
            return false;
        }

        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            this.showToast('User not found', 'error');
            return false;
        }

        // Check if username conflicts with other users
        if (this.users.some(u => u.id !== userId && u.username === userData.username)) {
            this.showToast('Username already exists', 'error');
            return false;
        }

        this.users[userIndex] = { ...this.users[userIndex], ...userData };
        this.saveUsers();
        this.updateUsersTable();
        this.showToast('User updated successfully', 'success');
        return true;
    }

    deleteUser(userId) {
        if (!this.hasPermission('admin')) {
            this.showToast('Insufficient permissions', 'error');
            return false;
        }

        if (this.currentUser.id === userId) {
            this.showToast('Cannot delete your own account', 'error');
            return false;
        }

        this.users = this.users.filter(u => u.id !== userId);
        this.saveUsers();
        this.updateUsersTable();
        this.showToast('User deleted successfully', 'success');
        return true;
    }

    updateUsersTable() {
        const usersBody = document.getElementById('usersBody');
        const activeUsers = this.users.filter(u => u.isActive);
        
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('activeUsers').textContent = activeUsers.length;
        document.getElementById('adminUsers').textContent = this.users.filter(u => u.role === 'admin').length;

        usersBody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                <td><span class="status-badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-small btn-secondary edit-user" data-user-id="${user.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${user.id !== this.currentUser?.id ? `
                            <button class="btn-small btn-danger delete-user" data-user-id="${user.id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Inventory Forecasting
    initializeForecast() {
        this.calculateInventoryForecast();
    }

    calculateInventoryForecast() {
        this.inventoryForecast = {
            lowStockAlerts: [],
            reorderSuggestions: [],
            demandPredictions: {},
            salesTrends: this.calculateSalesTrends()
        };

        // Calculate low stock alerts (items with stock < 10)
        this.inventoryForecast.lowStockAlerts = this.products
            .filter(product => product.stock < 10)
            .map(product => ({
                id: product.id,
                name: product.name,
                currentStock: product.stock,
                suggestedReorder: Math.max(50 - product.stock, 20)
            }));

        // Calculate reorder suggestions based on sales velocity
        this.inventoryForecast.reorderSuggestions = this.products
            .filter(product => this.getProductSalesVelocity(product.id) > 0)
            .map(product => {
                const velocity = this.getProductSalesVelocity(product.id);
                const suggestedStock = Math.ceil(velocity * 30); // 30 days coverage
                const reorderAmount = Math.max(suggestedStock - product.stock, 0);
                
                return {
                    id: product.id,
                    name: product.name,
                    currentStock: product.stock,
                    suggestedStock: suggestedStock,
                    reorderAmount: reorderAmount,
                    velocity: velocity
                };
            })
            .filter(item => item.reorderAmount > 0)
            .sort((a, b) => b.reorderAmount - a.reorderAmount);

        // Calculate demand predictions
        this.inventoryForecast.demandPredictions = this.calculateDemandPredictions();
    }

    getProductSalesVelocity(productId) {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const recentSales = this.sales.filter(sale => 
            new Date(sale.date) >= last30Days &&
            sale.items.some(item => item.id === productId)
        );

        const totalSold = recentSales.reduce((sum, sale) => {
            const item = sale.items.find(i => i.id === productId);
            return sum + (item ? item.quantity : 0);
        }, 0);

        return totalSold / 30; // Daily sales velocity
    }

    calculateSalesTrends() {
        const trends = {};
        const last90Days = new Date();
        last90Days.setDate(last90Days.getDate() - 90);

        // Group sales by week
        this.sales.filter(sale => new Date(sale.date) >= last90Days)
            .forEach(sale => {
                const weekStart = new Date(sale.date);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekKey = weekStart.toISOString().split('T')[0];

                if (!trends[weekKey]) {
                    trends[weekKey] = { total: 0, transactions: 0 };
                }
                trends[weekKey].total += sale.total;
                trends[weekKey].transactions += 1;
            });

        return trends;
    }

    calculateDemandPredictions() {
        const predictions = {};
        
        this.products.forEach(product => {
            const velocity = this.getProductSalesVelocity(product.id);
            const trend = this.calculateProductTrend(product.id);
            
            predictions[product.id] = {
                name: product.name,
                currentVelocity: velocity,
                predictedVelocity: velocity * (1 + trend),
                confidence: Math.min(Math.abs(trend) * 100, 90), // Confidence based on trend strength
                recommendedStock: Math.ceil((velocity * (1 + trend)) * 45) // 45 days coverage
            };
        });

        return predictions;
    }

    calculateProductTrend(productId) {
        // Simple trend calculation based on last 60 vs previous 60 days
        const now = new Date();
        const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const prev60Days = new Date(last60Days.getTime() - 60 * 24 * 60 * 60 * 1000);

        const recentSales = this.sales.filter(sale => 
            new Date(sale.date) >= last60Days &&
            sale.items.some(item => item.id === productId)
        );

        const oldSales = this.sales.filter(sale => 
            new Date(sale.date) >= prev60Days && new Date(sale.date) < last60Days &&
            sale.items.some(item => item.id === productId)
        );

        const recentTotal = recentSales.reduce((sum, sale) => {
            const item = sale.items.find(i => i.id === productId);
            return sum + (item ? item.quantity : 0);
        }, 0);

        const oldTotal = oldSales.reduce((sum, sale) => {
            const item = sale.items.find(i => i.id === productId);
            return sum + (item ? item.quantity : 0);
        }, 0);

        if (oldTotal === 0) return recentTotal > 0 ? 0.5 : 0;
        
        return (recentTotal - oldTotal) / oldTotal;
    }

    updateForecastDisplay() {
        // Update low stock alerts
        const alertsList = document.getElementById('stockAlertsList');
        if (this.inventoryForecast.lowStockAlerts.length > 0) {
            alertsList.innerHTML = this.inventoryForecast.lowStockAlerts.map(alert => `
                <div class="alert-item warning">
                    <div class="alert-content">
                        <strong>${alert.name}</strong>
                        <p>Current stock: ${alert.currentStock} | Suggested reorder: ${alert.suggestedReorder}</p>
                    </div>
                    <button class="btn-small btn-primary" data-action="reorder" data-product-id="${alert.id}" data-quantity="${alert.suggestedReorder}">
                        Reorder
                    </button>
                </div>
            `).join('');
        } else {
            alertsList.innerHTML = '<p class="empty-state">No stock alerts</p>';
        }

        // Update reorder suggestions
        const reorderList = document.getElementById('reorderList');
        if (this.inventoryForecast.reorderSuggestions.length > 0) {
            reorderList.innerHTML = this.inventoryForecast.reorderSuggestions.slice(0, 5).map(item => `
                <div class="alert-item info">
                    <div class="alert-content">
                        <strong>${item.name}</strong>
                        <p>Current: ${item.currentStock} | Suggested: ${item.suggestedStock} | Reorder: ${item.reorderAmount}</p>
                    </div>
                    <button class="btn-small btn-primary" data-action="reorder" data-product-id="${item.id}" data-quantity="${item.reorderAmount}">
                        Reorder
                    </button>
                </div>
            `).join('');
        } else {
            reorderList.innerHTML = '<p class="empty-state">No reorder recommendations</p>';
        }

        // Update demand predictions
        const demandDiv = document.getElementById('demandPrediction');
        const predictions = Object.values(this.inventoryForecast.demandPredictions).slice(0, 5);
        if (predictions.length > 0) {
            demandDiv.innerHTML = predictions.map(pred => `
                <div class="prediction-item">
                    <strong>${pred.name}</strong>
                    <p>Current daily sales: ${pred.currentVelocity.toFixed(1)}</p>
                    <p>Predicted: ${pred.predictedVelocity.toFixed(1)} (${pred.confidence.toFixed(0)}% confidence)</p>
                    <p>Recommended stock: ${pred.recommendedStock}</p>
                </div>
            `).join('');
        } else {
            demandDiv.innerHTML = '<p class="empty-state">No demand predictions available</p>';
        }
    }

    reorderProduct(productId, quantity) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            product.stock += quantity;
            this.saveData();
            this.renderInventory();
            this.calculateInventoryForecast();
            this.updateForecastDisplay();
            this.showToast(`Reordered ${quantity} units of ${product.name}`, 'success');
        }
    }

    exportForecastReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            lowStockAlerts: this.inventoryForecast.lowStockAlerts,
            reorderSuggestions: this.inventoryForecast.reorderSuggestions,
            demandPredictions: this.inventoryForecast.demandPredictions,
            salesTrends: this.inventoryForecast.salesTrends
        };

        const jsonContent = JSON.stringify(report, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `forecast_report_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('Forecast report exported', 'success');
    }

    // External Services Integration
    initializeExternalServices() {
        try {
            const savedServices = localStorage.getItem('externalServices');
            if (savedServices) {
                this.externalServices = { ...this.externalServices, ...JSON.parse(savedServices) };
            }
            this.updateServicesUI();
        } catch (error) {
            console.error('Error loading external services from localStorage:', error);
        }
    }

    updateServicesUI() {
        // Update checkboxes
        document.getElementById('emailEnabled').checked = this.externalServices.emailEnabled;
        document.getElementById('smsEnabled').checked = this.externalServices.smsEnabled;
        document.getElementById('cloudBackupEnabled').checked = this.externalServices.cloudBackupEnabled;
        document.getElementById('barcodeScannerEnabled').checked = this.externalServices.barcodeScannerEnabled;

        // Update other fields if they exist
        const emailAddress = document.getElementById('emailAddress');
        if (emailAddress && this.externalServices.emailAddress) {
            emailAddress.value = this.externalServices.emailAddress;
        }
    }

    saveExternalServices(servicesData) {
        this.externalServices = { ...this.externalServices, ...servicesData };
        localStorage.setItem('externalServices', JSON.stringify(this.externalServices));
        this.showToast('External services settings saved', 'success');
    }

    sendLowStockNotification(product) {
        if (this.externalServices.emailEnabled && this.externalServices.emailAddress) {
            // Simulate email sending
            console.log(`Email sent to ${this.externalServices.emailAddress}: Low stock alert for ${product.name}`);
            this.showToast('Low stock notification sent via email', 'info');
        }

        if (this.externalServices.smsEnabled) {
            // Simulate SMS sending
            console.log(`SMS sent: Low stock alert for ${product.name}`);
            this.showToast('Low stock notification sent via SMS', 'info');
        }
    }

    performCloudBackup() {
        const backupData = {
            timestamp: new Date().toISOString(),
            products: this.products,
            sales: this.sales,
            customers: this.customers,
            users: this.users,
            settings: this.settings
        };

        // Simulate cloud backup
        localStorage.setItem('cloudBackup', JSON.stringify(backupData));
        console.log('Cloud backup completed');
        this.showToast('Cloud backup completed successfully', 'success');
    }

    initializeBarcodeScanner() {
        if (this.externalServices.barcodeScannerEnabled && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Initialize camera for barcode scanning
            this.showToast('Barcode scanner initialized', 'success');
        } else {
            this.showToast('Barcode scanner not supported on this device', 'warning');
        }
    }

    scanBarcode(barcode) {
        if (!this.externalServices.barcodeScannerEnabled) {
            this.showToast('Barcode scanner is not enabled', 'warning');
            return;
        }

        // Use provided barcode or simulate scanning
        const scannedBarcode = barcode || Math.random().toString(36).substring(2, 15);
        this.findProductByBarcode(scannedBarcode);
    }

    findProductByBarcode(barcode) {
        // In a real implementation, this would search by barcode
        const product = this.products.find(p => p.name.toLowerCase().includes(barcode.toLowerCase()));
        if (product) {
            this.addToCart(product.id, 1);
            this.showToast(`Added ${product.name} to cart`, 'success');
        } else {
            this.showToast('Product not found', 'warning');
        }
    }

    // Reports
    updateReports() {
        // Update summary metrics
        this.updateSummaryMetrics();

        // Update top products
        this.updateTopProducts();

        // Update filtered sales table
        this.updateSalesTable();
    }

    updateSummaryMetrics() {
        const filteredSales = this.getFilteredSales();
        const today = new Date().toDateString();
        const todaySales = this.sales.filter(sale => 
            new Date(sale.date).toDateString() === today
        );

        const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
        const filteredTotal = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
        const transactionCount = filteredSales.length;

        document.getElementById('todaySales').textContent = `₹${todayTotal.toFixed(2)}`;
        document.getElementById('transactionCount').textContent = transactionCount;
    }

    updateTopProducts() {
        const filteredSales = this.getFilteredSales();
        const productSales = {};

        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productSales[item.name]) {
                    productSales[item.name] = 0;
                }
                productSales[item.name] += item.quantity;
            });
        });

        const topProducts = Object.entries(productSales)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        document.getElementById('topProducts').innerHTML = topProducts.map(([name, quantity]) => 
            `<p>${name}: ${quantity} sold</p>`
        ).join('') || '<p>No sales data</p>';
    }

    updateSalesTable() {
        const salesBody = document.getElementById('salesBody');
        const filteredSales = this.getFilteredSales();

        if (filteredSales.length === 0) {
            salesBody.innerHTML = '<tr><td colspan="7" class="empty-state">No transactions found</td></tr>';
            return;
        }

        salesBody.innerHTML = filteredSales.map(sale => {
            const date = new Date(sale.date);
            const isSelected = this.selectedTransactions.has(sale.id);
            return `
                <tr>
                    <td><input type="checkbox" class="transaction-checkbox" data-sale-id="${sale.id}" ${isSelected ? 'checked' : ''}></td>
                    <td>${date.toLocaleDateString()}</td>
                    <td>${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td>${sale.customer.name}</td>
                    <td>${sale.items.length} items</td>
                    <td>₹${sale.total.toFixed(2)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-small btn-secondary view-btn" data-sale-id="${sale.id}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn-small btn-primary print-btn" data-sale-id="${sale.id}">
                                <i class="fas fa-print"></i> Print
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getFilteredSales() {
        let filteredSales = [...this.sales];

        // Apply search filter
        if (this.currentFilter.search) {
            const searchTerm = this.currentFilter.search.toLowerCase();
            filteredSales = filteredSales.filter(sale => 
                sale.customer.name.toLowerCase().includes(searchTerm) ||
                sale.id.toString().includes(searchTerm)
            );
        }

        // Apply date filter
        if (this.currentFilter.dateRange !== 'all') {
            const now = new Date();
            let startDate, endDate;

            switch (this.currentFilter.dateRange) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                    break;
                case 'week':
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - now.getDay());
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    break;
                case 'custom':
                    if (this.currentFilter.startDate && this.currentFilter.endDate) {
                        startDate = new Date(this.currentFilter.startDate);
                        endDate = new Date(this.currentFilter.endDate);
                        endDate.setHours(23, 59, 59, 999);
                    }
                    break;
            }

            if (startDate && endDate) {
                filteredSales = filteredSales.filter(sale => {
                    const saleDate = new Date(sale.date);
                    return saleDate >= startDate && saleDate <= endDate;
                });
            }
        }

        // Sort by date (newest first)
        filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date));

        return filteredSales;
    }

    updateNotificationBadge() {
        const lowStockCount = this.products.filter(p => p.stock < 10).length;
        const notificationBtn = document.getElementById('notificationBtn');
        
        // Remove existing badge
        const existingBadge = notificationBtn.querySelector('.notification-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        if (lowStockCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = lowStockCount;
            notificationBtn.appendChild(badge);
        }
    }

    // Settings Management
    populateSettingsForm() {
        // Shop settings
        document.getElementById('shopName').value = this.settings.shop.name;
        document.getElementById('shopAddress').value = this.settings.shop.address;
        document.getElementById('shopPhone').value = this.settings.shop.phone;
        document.getElementById('shopEmail').value = this.settings.shop.email;
        document.getElementById('shopGST').value = this.settings.shop.gst;
        document.getElementById('shopLogo').value = this.settings.shop.logo;

        // Invoice settings
        document.getElementById('invoicePrefix').value = this.settings.invoice.prefix;
        document.getElementById('invoiceFooter').value = this.settings.invoice.footer;
        document.getElementById('showLogoOnInvoice').checked = this.settings.invoice.showLogo;
        document.getElementById('showGSTOnInvoice').checked = this.settings.invoice.showGST;

        // Appearance settings
        document.getElementById('primaryColor').value = this.settings.appearance.primaryColor;
        document.getElementById('secondaryColor').value = this.settings.appearance.secondaryColor;
        document.getElementById('enableAnimations').checked = this.settings.appearance.enableAnimations;
        document.getElementById('compactMode').checked = this.settings.appearance.compactMode;
    }

    saveShopSettings() {
        this.settings.shop = {
            name: document.getElementById('shopName').value.trim(),
            address: document.getElementById('shopAddress').value.trim(),
            phone: document.getElementById('shopPhone').value.trim(),
            email: document.getElementById('shopEmail').value.trim(),
            gst: document.getElementById('shopGST').value.trim(),
            logo: document.getElementById('shopLogo').value.trim()
        };

        if (!this.settings.shop.name) {
            this.showToast('Shop name is required', 'warning');
            return false;
        }

        this.saveSettings();
        this.showToast('Shop settings saved successfully', 'success');
        return true;
    }

    saveInvoiceSettings() {
        this.settings.invoice = {
            prefix: document.getElementById('invoicePrefix').value.trim() || 'INV',
            footer: document.getElementById('invoiceFooter').value.trim(),
            showLogo: document.getElementById('showLogoOnInvoice').checked,
            showGST: document.getElementById('showGSTOnInvoice').checked
        };

        this.saveSettings();
        this.showToast('Invoice settings saved successfully', 'success');
    }

    saveAppearanceSettings() {
        this.settings.appearance = {
            primaryColor: document.getElementById('primaryColor').value,
            secondaryColor: document.getElementById('secondaryColor').value,
            enableAnimations: document.getElementById('enableAnimations').checked,
            compactMode: document.getElementById('compactMode').checked
        };

        // Update CSS variables
        document.documentElement.style.setProperty('--primary-color', this.settings.appearance.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', this.settings.appearance.secondaryColor);

        this.saveSettings();
        this.showToast('Appearance settings saved successfully', 'success');
    }

    resetSettings() {
        this.settings = {
            shop: {
                name: '',
                address: '',
                phone: '',
                email: '',
                gst: '',
                logo: ''
            },
            invoice: {
                prefix: 'INV',
                footer: 'Thank you for your business!',
                showLogo: true,
                showGST: true
            },
            appearance: {
                primaryColor: '#667eea',
                secondaryColor: '#764ba2',
                enableAnimations: true,
                compactMode: false
            }
        };

        this.populateSettingsForm();
        this.saveSettings();
        this.showToast('Settings reset to default', 'info');
    }

    resetAppearance() {
        this.settings.appearance = {
            primaryColor: '#667eea',
            secondaryColor: '#764ba2',
            enableAnimations: true,
            compactMode: false
        };

        this.populateSettingsForm();
        this.saveAppearanceSettings();
    }

    // Toast Notifications
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Initialize the application
const pos = new RetailPOS();