// Admin Dashboard JavaScript

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('adminSession');
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    const sessionData = JSON.parse(session);
    if (sessionData.expiry < Date.now()) {
        localStorage.removeItem('adminSession');
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize dashboard
    initDashboard();
});

// Initialize dashboard
function initDashboard() {
    // Navigation
    initNavigation();
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Load dashboard data
    loadDashboardStats();
    loadRecentProducts();
    loadCategoryDistribution();
    
    // Load all products
    loadAllProducts();
    
    // Initialize forms
    initAddProductForm();
    initEditProductForm();
    
    // Initialize search
    initProductSearch();
}

// Navigation
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'products': 'All Products',
        'add-product': 'Add New Product',
        'edit-product': 'Edit Product'
    };
    
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = titles[sectionName] || 'Dashboard';
    }
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.section === sectionName);
    });
}

// Logout
function logout() {
    localStorage.removeItem('adminSession');
    if (appwriteDB && appwriteDB.clearProductsCache) {
        appwriteDB.clearProductsCache();
    }
    window.location.href = 'index.html';
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const products = await appwriteDB.getAllProducts({ limit: 1000 });
        
        // Total products
        const totalProductsEl = document.getElementById('total-products');
        if (totalProductsEl) totalProductsEl.textContent = products.length;
        
        // Total categories
        const categories = new Set(products.map(p => p.category).filter(Boolean));
        const totalCategoriesEl = document.getElementById('total-categories');
        if (totalCategoriesEl) totalCategoriesEl.textContent = categories.size;
        
        // Featured products
        const featured = products.filter(p => p.featured).length;
        const featuredEl = document.getElementById('featured-products');
        if (featuredEl) featuredEl.textContent = featured;
        
        // Low stock (less than 10)
        const lowStock = products.filter(p => (p.stock_quantity || 0) < 10).length;
        const lowStockEl = document.getElementById('low-stock');
        if (lowStockEl) lowStockEl.textContent = lowStock;
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Failed to load dashboard statistics', 'error');
    }
}

// Load category distribution
async function loadCategoryDistribution() {
    try {
        const counts = await appwriteDB.getCategoryCounts();
        const container = document.getElementById('category-distribution');
        
        if (!container) return;
        
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            container.innerHTML = '<p class="empty-state">No products yet</p>';
            return;
        }
        
        const categoryNames = {
            'watches': 'Watches',
            'perfumes': 'Perfumes',
            'sunglasses': 'Sunglasses',
            'couple-accessories': 'Couple Accessories',
            'lifestyle': 'Lifestyle'
        };
        
        container.innerHTML = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([category, count]) => {
                const percentage = (count / total * 100).toFixed(1);
                return `
                    <div class="category-bar">
                        <span class="category-bar-label">${categoryNames[category] || category}</span>
                        <div class="category-bar-track">
                            <div class="category-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="category-bar-value">${count}</span>
                    </div>
                `;
            }).join('');
            
    } catch (error) {
        console.error('Error loading category distribution:', error);
    }
}

// Load recent products
async function loadRecentProducts() {
    try {
        const products = await appwriteDB.getAllProducts({ limit: 5 });
        const tbody = document.getElementById('recent-products-table');
        
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No products yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <div class="product-cell">
                        <img src="${product.product_image_url || '../assets/images/placeholder.jpg'}" 
                             alt="${product.product_name}"
                             onerror="this.src='../assets/images/placeholder.jpg'">
                        <span class="product-name">${product.product_name}</span>
                    </div>
                </td>
                <td>${product.category || '-'}</td>
                <td>₹${(product.main_price || 0).toLocaleString()}</td>
                <td>
                    <span class="badge ${getStockBadgeClass(product.stock_quantity)}">
                        ${product.stock_quantity || 0}
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-outline btn-icon" onclick="editProduct('${product.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteProduct('${product.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent products:', error);
    }
}

// Load all products
let allProducts = [];
let currentPage = 1;
const productsPerPage = 10;

async function loadAllProducts() {
    try {
        const products = await appwriteDB.getAllProducts({ limit: 1000 });
        allProducts = products;
        renderProductsTable();
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Failed to load products', 'error');
    }
}

// Render products table
function renderProductsTable() {
    const tbody = document.getElementById('all-products-table');
    if (!tbody) return;
    
    const searchInput = document.getElementById('product-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Filter products
    let filtered = allProducts;
    if (searchTerm) {
        filtered = allProducts.filter(p => 
            (p.product_name && p.product_name.toLowerCase().includes(searchTerm)) ||
            (p.category && p.category.toLowerCase().includes(searchTerm))
        );
    }
    
    // Pagination
    const totalPages = Math.ceil(filtered.length / productsPerPage);
    const start = (currentPage - 1) * productsPerPage;
    const paginated = filtered.slice(start, start + productsPerPage);
    
    if (paginated.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No products found</td></tr>';
    } else {
        tbody.innerHTML = paginated.map(product => `
            <tr>
                <td>
                    <div class="product-cell">
                        <img src="${product.product_image_url || '../assets/images/placeholder.jpg'}" 
                             alt="${product.product_name}"
                             onerror="this.src='../assets/images/placeholder.jpg'">
                        <span class="product-name">${product.product_name}</span>
                    </div>
                </td>
                <td>${product.category || '-'}</td>
                <td>₹${(product.main_price || 0).toLocaleString()}</td>
                <td>
                    <span class="badge ${getStockBadgeClass(product.stock_quantity)}">
                        ${product.stock_quantity || 0}
                    </span>
                </td>
                <td>
                    ${product.featured ? '<span class="badge badge-info">Yes</span>' : '-'}
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-sm btn-outline btn-icon" onclick="editProduct('${product.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteProduct('${product.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Render pagination
    renderPagination(totalPages);
}

// Render pagination
function renderPagination(totalPages) {
    const container = document.getElementById('products-pagination');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">←</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span>...</span>`;
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">→</button>`;
    
    container.innerHTML = html;
}

// Change page
function changePage(page) {
    currentPage = page;
    renderProductsTable();
}

// Get stock badge class
function getStockBadgeClass(stock) {
    if (stock <= 0) return 'badge-danger';
    if (stock < 10) return 'badge-warning';
    return 'badge-success';
}

// Initialize product search
function initProductSearch() {
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1;
            renderProductsTable();
        }, 300));
    }
}

// Initialize add product form
function initAddProductForm() {
    const form = document.getElementById('add-product-form');
    if (!form) return;
    
    const imageInput = document.getElementById('product-image');
    const imagePreview = document.getElementById('image-preview');
    
    // Image preview
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const productData = {
            product_name: formData.get('product_name'),
            category: formData.get('category'),
            main_price: parseFloat(formData.get('main_price')),
            discount_price: formData.get('discount_price') ? parseFloat(formData.get('discount_price')) : null,
            stock_quantity: parseInt(formData.get('stock_quantity')),
            short_description: formData.get('short_description'),
            badge: formData.get('badge') || null,
            featured: formData.get('featured') === 'on'
        };
        
        try {
            showToast('Adding product...', 'info');
            
            // Upload image if selected
            const imageFile = imageInput ? imageInput.files[0] : null;
            if (imageFile) {
                const imageUrl = await appwriteDB.uploadImage(imageFile);
                productData.product_image_url = imageUrl;
            }
            
            // Add product
            await appwriteDB.addProduct(productData);
            
            showToast('Product added successfully!', 'success');
            form.reset();
            if (imagePreview) imagePreview.innerHTML = '';
            
            // Reload data
            loadDashboardStats();
            loadRecentProducts();
            loadAllProducts();
            loadCategoryDistribution();
            
            // Switch to products section
            showSection('products');
            
        } catch (error) {
            console.error('Error adding product:', error);
            showToast('Failed to add product: ' + error.message, 'error');
        }
    });
}

// Initialize edit product form
function initEditProductForm() {
    const form = document.getElementById('edit-product-form');
    if (!form) return;
    
    const imageInput = document.getElementById('edit-product-image');
    const imagePreview = document.getElementById('edit-image-preview');
    
    // Image preview
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const productId = formData.get('id');
        const productData = {
            product_name: formData.get('product_name'),
            category: formData.get('category'),
            main_price: parseFloat(formData.get('main_price')),
            discount_price: formData.get('discount_price') ? parseFloat(formData.get('discount_price')) : null,
            stock_quantity: parseInt(formData.get('stock_quantity')),
            short_description: formData.get('short_description'),
            badge: formData.get('badge') || null,
            featured: formData.get('featured') === 'on'
        };
        
        try {
            showToast('Updating product...', 'info');
            
            // Upload new image if selected
            const imageFile = imageInput ? imageInput.files[0] : null;
            if (imageFile) {
                const imageUrl = await appwriteDB.uploadImage(imageFile);
                productData.product_image_url = imageUrl;
            }
            
            // Update product
            await appwriteDB.updateProduct(productId, productData);
            
            showToast('Product updated successfully!', 'success');
            if (imagePreview) imagePreview.innerHTML = '';
            
            // Reload data
            loadDashboardStats();
            loadRecentProducts();
            loadAllProducts();
            loadCategoryDistribution();
            
            // Switch to products section
            showSection('products');
            
        } catch (error) {
            console.error('Error updating product:', error);
            showToast('Failed to update product: ' + error.message, 'error');
        }
    });
}

// Edit product
async function editProduct(id) {
    try {
        const product = await appwriteDB.getProductById(id);
        if (!product) {
            showToast('Product not found', 'error');
            return;
        }
        
        // Populate form
        const idField = document.getElementById('edit-product-id');
        const nameField = document.getElementById('edit-product-name');
        const categoryField = document.getElementById('edit-product-category');
        const priceField = document.getElementById('edit-main-price');
        const discountField = document.getElementById('edit-discount-price');
        const stockField = document.getElementById('edit-stock-quantity');
        const descField = document.getElementById('edit-short-description');
        const badgeField = document.getElementById('edit-product-badge');
        const featuredField = document.getElementById('edit-featured');
        
        if (idField) idField.value = product.id;
        if (nameField) nameField.value = product.product_name || '';
        if (categoryField) categoryField.value = product.category || '';
        if (priceField) priceField.value = product.main_price || '';
        if (discountField) discountField.value = product.discount_price || '';
        if (stockField) stockField.value = product.stock_quantity || '';
        if (descField) descField.value = product.short_description || '';
        if (badgeField) badgeField.value = product.badge || '';
        if (featuredField) featuredField.checked = product.featured || false;
        
        // Show current image
        const currentImageDiv = document.getElementById('edit-current-image');
        if (currentImageDiv) {
            if (product.product_image_url) {
                currentImageDiv.innerHTML = `<img src="${product.product_image_url}" alt="Current">`;
            } else {
                currentImageDiv.innerHTML = '<p>No image</p>';
            }
        }
        
        // Show edit section
        showSection('edit-product');
        
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Failed to load product', 'error');
    }
}

// Delete product
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        showToast('Deleting product...', 'info');
        await appwriteDB.deleteProduct(id);
        
        showToast('Product deleted successfully!', 'success');
        
        // Reload data
        loadDashboardStats();
        loadRecentProducts();
        loadAllProducts();
        loadCategoryDistribution();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Failed to delete product: ' + error.message, 'error');
    }
}

// Toast notifications
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    toast.innerHTML = `
        <span style="font-size: 1.25rem; font-weight: bold; margin-right: 8px;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}