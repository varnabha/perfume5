// Storeify Watches - Main JavaScript Module
// UI utilities, animations, and helper functions

// ===== Utility Functions =====

// Format price with currency
function formatPrice(price, showCurrency = true) {
    if (price === null || price === undefined) return '';
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const formatted = numPrice.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    
    if (showCurrency) {
        return `${CONFIG.currency.symbol}${formatted}`;
    }
    return formatted;
}

// Calculate discount percentage
function calculateDiscount(mainPrice, discountPrice) {
    if (!discountPrice || discountPrice >= mainPrice) return 0;
    return Math.round(((mainPrice - discountPrice) / mainPrice) * 100);
}

// Generate WhatsApp order link
function generateWhatsAppLink(product, selectedColor = null) {
    const phone = CONFIG.whatsapp.number;
    const price = product.discount_price || product.main_price;
    
    let message = `Hello! I want to order this product from ${CONFIG.storeName}:\n\n`;
    message += `*Product:* ${product.product_name}\n`;
    message += `*Category:* ${product.category}\n`;
    
    if (selectedColor && product.colour_options && product.colour_options.length > 0) {
        message += `*Colour:* ${getColorName(selectedColor)}\n`;
    }
    
    message += `*Price:* ${formatPrice(price)}\n\n`;
    message += `Please confirm availability. Thank you!`;
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Debounce function for search
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

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Truncate text
function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

// Get color name from hex
function getColorName(hexColor) {
    if (!hexColor) return '';
    
    const colorNames = {
        '#000000': 'Black',
        '#ffffff': 'White',
        '#FFFFFF': 'White',
        '#ff0000': 'Red',
        '#00ff00': 'Green',
        '#0000ff': 'Blue',
        '#ffff00': 'Yellow',
        '#ff00ff': 'Magenta',
        '#00ffff': 'Cyan',
        '#c0c0c0': 'Silver',
        '#C0C0C0': 'Silver',
        '#d4af37': 'Gold',
        '#D4AF37': 'Gold',
        '#c9a962': 'Gold',
        '#8B4513': 'Brown',
        '#800080': 'Purple',
        '#ffa500': 'Orange',
        '#ffc0cb': 'Pink',
        '#a52a2a': 'Brown',
        '#808080': 'Gray',
        '#f5f5dc': 'Beige',
        '#000080': 'Navy',
        '#800000': 'Maroon',
        '#008000': 'Dark Green'
    };
    
    return colorNames[hexColor.toLowerCase()] || hexColor.toUpperCase();
}

// ===== Toast Notifications =====

function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };
    
    toast.innerHTML = `
        <span style="font-size: 1.25rem; font-weight: bold;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===== Loading States =====

function showLoading(container, message = 'Loading...') {
    container.innerHTML = `
        <div class="loading-container">
            <div style="text-align: center;">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                <p style="color: var(--text-muted);">${message}</p>
            </div>
        </div>
    `;
}

function showError(container, message = 'Something went wrong. Please try again.') {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Oops!</h3>
            <p>${message}</p>
            <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
        </div>
    `;
}

function showEmpty(container, message = 'No items found.') {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <h3>Nothing Here</h3>
            <p>${message}</p>
        </div>
    `;
}

// ===== Navigation =====

function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            const spans = mobileMenuBtn.querySelectorAll('span');
            if (navLinks.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
        
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const spans = mobileMenuBtn.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            });
        });
    }
    
    // Set active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || href.endsWith(currentPage)) {
            link.classList.add('active');
        }
    });
}

// ===== Scroll Reveal Animation =====

function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            const revealPoint = 100;
            
            if (elementTop < windowHeight - revealPoint) {
                element.classList.add('active');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger on load
}


function getProductPrimaryImage(product) {
    const imageList = Array.isArray(product?.product_image_urls)
        ? product.product_image_urls.filter(Boolean)
        : [];
    return imageList[0] || product.product_image_url || 'assets/images/placeholder.svg';
}

function getProductDetailsUrl(productId) {
    const isInsidePagesDir = window.location.pathname.includes('/pages/');
    const prefix = isInsidePagesDir ? '' : 'pages/';
    return `${prefix}product.html?id=${productId}`;
}

// ===== Product Card Generator =====

function createProductCard(product) {
    const discount = calculateDiscount(product.main_price, product.discount_price);
    const finalPrice = product.discount_price || product.main_price;
    const hasColors = product.colour_options && product.colour_options.length > 0;
    
    return `
        <div class="product-card" data-id="${product.id}">
            ${product.featured ? '<span class="product-badge featured">Featured</span>' : ''}
            ${discount > 0 ? `<span class="product-badge discount">-${discount}%</span>` : ''}
            
            <div class="product-image">
                <img src="${getProductPrimaryImage(product)}" 
                     alt="${product.product_name}" 
                     loading="lazy"
                     onerror="this.src='assets/images/placeholder.svg'">
                
                ${hasColors ? `
                    <div class="product-colors">
                        ${product.colour_options.slice(0, 4).map(color => `
                            <span class="color-dot" style="background-color: ${color};" title="${getColorName(color)}"></span>
                        `).join('')}
                        ${product.colour_options.length > 4 ? `<span class="color-dot" style="background: linear-gradient(45deg, #ccc, #fff);">+</span>` : ''}
                    </div>
                ` : ''}
            </div>
            
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.product_name}</h3>
                <p class="product-description">${truncateText(product.short_description, 80)}</p>
                
                <div class="product-price">
                    <span class="price-current">${formatPrice(finalPrice)}</span>
                    ${discount > 0 ? `<span class="price-original">${formatPrice(product.main_price)}</span>` : ''}
                </div>
                
                <div class="product-actions">
                    <a href="${getProductDetailsUrl(product.id)}" class="btn btn-outline btn-sm">View Details</a>
                    <a href="${generateWhatsAppLink(product)}" target="_blank" class="btn btn-accent btn-sm">Book Now</a>
                </div>
            </div>
        </div>
    `;
}

// ===== Initialize =====

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollReveal();
});
