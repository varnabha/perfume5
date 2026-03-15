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

    // Keep admin data fresh when tab regains focus or another tab updates products
    initLiveRefresh();
}

function initLiveRefresh() {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshAdminData(true);
        }
    });

    window.addEventListener('focus', () => refreshAdminData(true));

    window.addEventListener('storage', (event) => {
        if (event.key === 'products_data_version') {
            refreshAdminData(true);
        }
    });
}

function refreshAdminData(forceRefresh = false) {
    loadDashboardStats(forceRefresh);
    loadRecentProducts(forceRefresh);
    loadAllProducts(forceRefresh);
    loadCategoryDistribution(forceRefresh);
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
async function loadDashboardStats(forceRefresh = false) {
    try {
        const products = await appwriteDB.getAllProducts({ limit: 1000, forceRefresh });
        
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
async function loadCategoryDistribution(forceRefresh = false) {
    try {
        const counts = forceRefresh
            ? await appwriteDB.getCategoryCounts(true)
            : await appwriteDB.getCategoryCounts();
        const container = document.getElementById('category-distribution');
        
        if (!container) return;
        
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            container.innerHTML = '<p class="empty-state">No products yet</p>';
            return;
        }
        
        const categoryNames = {
            'watches': 'All Watches',
            'mens-watches': "Men's Watches",
            'female-watches': 'Female Watches',
            'unisex-watches': 'Unisex Watches',
            'sunglasses': 'Sunglasses',
            'couple-accessories': 'Couple Watches'
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
async function loadRecentProducts(forceRefresh = false) {
    try {
        const products = await appwriteDB.getAllProducts({ limit: 5, forceRefresh });
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
                        <img src="${getPrimaryProductImage(product)}" 
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

async function loadAllProducts(forceRefresh = false) {
    try {
        const products = await appwriteDB.getAllProducts({ limit: 1000, forceRefresh });
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
                        <img src="${getPrimaryProductImage(product)}" 
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


function getProductImages(product) {
    if (Array.isArray(product?.product_image_urls) && product.product_image_urls.length > 0) {
        return product.product_image_urls.filter(Boolean);
    }
    if (product?.product_image_url) return [product.product_image_url];
    return [];
}

function getPrimaryProductImage(product) {
    return getProductImages(product)[0] || '../assets/images/placeholder.jpg';
}

function renderImagePreviewFiles(previewEl, files = []) {
    if (!previewEl) return;
    if (!files.length) {
        previewEl.innerHTML = '';
        return;
    }

    previewEl.innerHTML = files.map((file) => {
        const url = URL.createObjectURL(file);
        return `<img src="${url}" alt="Preview" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 8px;">`;
    }).join('');
}

async function uploadProductImages(imageFiles = []) {
    const files = Array.from(imageFiles || []).slice(0, 5);
    if (files.length === 0) return { imageUrls: [], skipped: false };

    const uploaded = [];
    let skipped = false;

    for (const file of files) {
        const uploadResult = await tryUploadProductImage(file);
        if (uploadResult.imageUrl) uploaded.push(uploadResult.imageUrl);
        if (uploadResult.skipped) skipped = true;
    }

    return { imageUrls: uploaded, skipped };
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

function isAuthorizationError(error) {
    if (!error) return false;
    const message = String(error.message || error).toLowerCase();
    return message.includes('not authorized') ||
           message.includes('unauthorized') ||
           message.includes('forbidden') ||
           message.includes('permission');
}

async function tryUploadProductImage(imageFile) {
    if (!imageFile) return { imageUrl: null, skipped: false };

    try {
        const imageUrl = await appwriteDB.uploadImage(imageFile);
        return { imageUrl, skipped: false };
    } catch (error) {
        if (isAuthorizationError(error)) {
            showToast('Image upload is not authorized in Appwrite bucket settings. Product details will still be saved.', 'warning', 5000);
            return { imageUrl: null, skipped: true };
        }
        throw error;
    }
}

// Initialize add product form

function normalizeHexColor(value) {
    return String(value || '').trim().toLowerCase();
}

function readColorOptions(hiddenInput) {
    if (!hiddenInput) return [];
    try {
        const parsed = JSON.parse(hiddenInput.value || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeHexColor).filter(Boolean);
    } catch (error) {
        return [];
    }
}

function writeColorOptions(hiddenInput, colors) {
    if (!hiddenInput) return;
    hiddenInput.value = JSON.stringify(colors);
}

function renderColorPreview(previewEl, hiddenInput, colors) {
    if (!previewEl || !hiddenInput) return;

    writeColorOptions(hiddenInput, colors);

    if (colors.length === 0) {
        previewEl.innerHTML = '<span style="font-size: 0.85rem; color: #6b7280;">No colours added</span>';
        return;
    }

    previewEl.innerHTML = colors.map((color, index) => `
        <div style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.45rem; border: 1px solid #e5e7eb; border-radius: 999px; background: #fff;">
            <span style="display: inline-block; width: 18px; height: 18px; border-radius: 999px; border: 1px solid #d1d5db; background: ${color};"></span>
            <span style="font-size: 0.75rem; color: #374151;">${color}</span>
            <button type="button" data-remove-color="${index}" style="border: none; background: transparent; cursor: pointer; color: #ef4444; font-weight: 700;">×</button>
        </div>
    `).join('');
}

function setupColorPicker({ addButtonId, pickerId, hiddenInputId, previewId }) {
    const addBtn = document.getElementById(addButtonId);
    const picker = document.getElementById(pickerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const preview = document.getElementById(previewId);

    if (!addBtn || !picker || !hiddenInput || !preview) return null;

    let colors = readColorOptions(hiddenInput);
    renderColorPreview(preview, hiddenInput, colors);

    addBtn.addEventListener('click', () => {
        const selected = normalizeHexColor(picker.value);
        if (!selected) return;
        if (!colors.includes(selected)) {
            colors.push(selected);
            renderColorPreview(preview, hiddenInput, colors);
        }
    });

    preview.addEventListener('click', (event) => {
        const removeIndex = event.target.getAttribute('data-remove-color');
        if (removeIndex === null) return;
        colors = colors.filter((_, index) => index !== Number(removeIndex));
        renderColorPreview(preview, hiddenInput, colors);
    });

    return {
        setColors(nextColors) {
            colors = (nextColors || []).map(normalizeHexColor).filter(Boolean);
            renderColorPreview(preview, hiddenInput, colors);
        },
        clear() {
            colors = [];
            renderColorPreview(preview, hiddenInput, colors);
        }
    };
}

let addColorManager = null;
let editColorManager = null;

function initAddProductForm() {
    const form = document.getElementById('add-product-form');
    if (!form) return;
    
    const imageInput = document.getElementById('product-image');
    const imagePreview = document.getElementById('image-preview');

    if (!addColorManager) {
        addColorManager = setupColorPicker({
            addButtonId: 'add-product-colour-btn',
            pickerId: 'product-colour-picker',
            hiddenInputId: 'product-colours-hidden',
            previewId: 'product-colour-preview'
        });
    }
    
    // Image preview
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []).slice(0, 5);
            renderImagePreviewFiles(imagePreview, files);
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
            colour_options: JSON.parse(formData.get('colour_options') || '[]'),
            product_colour: '',
            box: formData.get('box') || 'without box',
            box_price: formData.get('box_price') ? parseFloat(formData.get('box_price')) : 0,
            badge: formData.get('badge') || null,
            featured: formData.get('featured') === 'on'
        };
        
        if (Array.isArray(productData.colour_options) && productData.colour_options.length > 0) {
            productData.product_colour = productData.colour_options[0];
        }

        try {
            showToast('Adding product...', 'info');
            
            // Upload images if selected (up to 5)
            const imageFiles = imageInput ? imageInput.files : [];
            const uploadResult = await uploadProductImages(imageFiles);
            if (uploadResult.imageUrls.length > 0) {
                productData.product_image_urls = uploadResult.imageUrls;
                productData.product_image_url = uploadResult.imageUrls[0];
            }

            // Add product
            await appwriteDB.addProduct(productData);
            
            if (uploadResult.skipped) {
                showToast('Product added, but image upload was skipped due to Appwrite permissions.', 'warning', 5000);
            } else {
                showToast('Product added successfully!', 'success');
            }
            form.reset();
            if (imagePreview) imagePreview.innerHTML = '';
            if (addColorManager) addColorManager.clear();
            
            // Reload data
            refreshAdminData(true);
            
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

    if (!editColorManager) {
        editColorManager = setupColorPicker({
            addButtonId: 'edit-product-colour-btn',
            pickerId: 'edit-product-colour-picker',
            hiddenInputId: 'edit-product-colours-hidden',
            previewId: 'edit-product-colour-preview'
        });
    }
    
    // Image preview
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []).slice(0, 5);
            renderImagePreviewFiles(imagePreview, files);
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
            colour_options: JSON.parse(formData.get('colour_options') || '[]'),
            product_colour: '',
            box: formData.get('box') || 'without box',
            box_price: formData.get('box_price') ? parseFloat(formData.get('box_price')) : 0,
            badge: formData.get('badge') || null,
            featured: formData.get('featured') === 'on'
        };
        
        if (Array.isArray(productData.colour_options) && productData.colour_options.length > 0) {
            productData.product_colour = productData.colour_options[0];
        }

        try {
            showToast('Updating product...', 'info');
            
            const existingProduct = await appwriteDB.getProductById(productId);
            const existingImages = getProductImages(existingProduct);

            // Upload new images if selected (up to 5)
            const imageFiles = imageInput ? imageInput.files : [];
            const uploadResult = await uploadProductImages(imageFiles);
            if (uploadResult.imageUrls.length > 0) {
                productData.product_image_urls = uploadResult.imageUrls;
                productData.product_image_url = uploadResult.imageUrls[0];
            }

            // Update product
            const updatedProduct = await appwriteDB.updateProduct(productId, productData);

            if (uploadResult.imageUrls.length > 0) {
                const nextImages = getProductImages(updatedProduct);
                const imagesToDelete = existingImages.filter((url) => !nextImages.includes(url));
                await appwriteDB.deleteImagesByUrls(imagesToDelete);
            }
            
            if (uploadResult.skipped) {
                showToast('Product updated, but image upload was skipped due to Appwrite permissions.', 'warning', 5000);
            } else {
                showToast('Product updated successfully!', 'success');
            }
            if (imagePreview) imagePreview.innerHTML = '';
            if (editColorManager) editColorManager.clear();
            
            // Reload data
            refreshAdminData(true);
            
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
        const boxField = document.getElementById('edit-box-option');
        const boxPriceField = document.getElementById('edit-box-price');
        const badgeField = document.getElementById('edit-product-badge');
        const featuredField = document.getElementById('edit-featured');
        
        if (idField) idField.value = product.id;
        if (nameField) nameField.value = product.product_name || '';
        if (categoryField) categoryField.value = product.category || '';
        if (priceField) priceField.value = product.main_price || '';
        if (discountField) discountField.value = product.discount_price || '';
        if (stockField) stockField.value = product.stock_quantity || '';
        if (descField) descField.value = product.short_description || '';
        if (editColorManager) editColorManager.setColors(product.colour_options || []);
        if (boxField) boxField.value = product.box || 'without box';
        if (boxPriceField) boxPriceField.value = product.box_price || '';
        if (badgeField) badgeField.value = product.badge || '';
        if (featuredField) featuredField.checked = product.featured || false;
        
        // Show current images
        const currentImageDiv = document.getElementById('edit-current-image');
        if (currentImageDiv) {
            const currentImages = getProductImages(product);
            if (currentImages.length > 0) {
                currentImageDiv.innerHTML = currentImages.map((url) => `<img src="${url}" alt="Current" style="width: 72px; height: 72px; object-fit: cover; border-radius: 8px; margin-right: 8px;">`).join('');
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
        const product = await appwriteDB.getProductById(id);
        const images = getProductImages(product);
        await appwriteDB.deleteProduct(id);
        await appwriteDB.deleteImagesByUrls(images);
        
        showToast('Product deleted successfully!', 'success');
        
        // Reload data
        refreshAdminData(true);
        
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
