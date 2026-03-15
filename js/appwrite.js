// Storeify Watches - Appwrite Integration Module with Cache Management
// Handles all database operations, storage, and caching

class AppwriteDB {
    constructor() {
        this.projectId = CONFIG.appwrite.projectId;
        this.endpoint = CONFIG.appwrite.endpoint;
        this.databaseId = CONFIG.appwrite.databaseId;
        this.productsCollectionId = CONFIG.appwrite.productsCollectionId;
        this.bucketId = CONFIG.appwrite.bucketId;
        this.apiKey = CONFIG.appwrite.apiKey; // ADD THIS - Critical for admin ops
        
        // Cache configuration
        this.cacheConfig = {
            enabled: true,
            defaultTTL: 5 * 60 * 1000, // 5 minutes in milliseconds
            productsKey: 'cached_products',
            productPrefix: 'cached_product_',
            categoryCountsKey: 'cached_category_counts',
            lastFetchKey: 'last_fetch_time',
            dataVersionKey: 'products_data_version'
        };

        this.currentDataVersion = this.getDataVersion();
        
        // Initialize cache cleanup
        this.initCacheCleanup();
    }

    // ===== Cache Management =====
    
    // Initialize cache cleanup on startup
    initCacheCleanup() {
        // Clean expired cache entries on initialization
        this.cleanExpiredCache();
        
        // Set up periodic cache cleanup every 10 minutes
        setInterval(() => this.cleanExpiredCache(), 10 * 60 * 1000);
    }
    
    // Get item from cache with TTL check
    getFromCache(key) {
        if (!this.cacheConfig.enabled) return null;
        
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache has expired
            if (data.expiry && data.expiry < now) {
                localStorage.removeItem(key);
                return null;
            }
            
            return data.value;
        } catch (error) {
            console.warn('Cache read error:', error);
            return null;
        }
    }

    // Get current products data version
    getDataVersion() {
        try {
            return localStorage.getItem(this.cacheConfig.dataVersionKey) || '0';
        } catch (error) {
            return '0';
        }
    }

    // Bump version after data mutation, so other tabs/pages can refresh cache instantly
    bumpDataVersion() {
        const newVersion = Date.now().toString();
        try {
            localStorage.setItem(this.cacheConfig.dataVersionKey, newVersion);
        } catch (error) {
            console.warn('Data version update error:', error);
        }
        this.currentDataVersion = newVersion;
    }

    // Clear local cache if another tab/page mutated products
    syncCacheVersion() {
        const latestVersion = this.getDataVersion();
        if (latestVersion !== this.currentDataVersion) {
            this.clearProductsCache();
            this.currentDataVersion = latestVersion;
        }
    }
    
    // Save item to cache with TTL
    setCache(key, value, ttl = this.cacheConfig.defaultTTL) {
        if (!this.cacheConfig.enabled) return;
        
        try {
            const data = {
                value: value,
                expiry: Date.now() + ttl,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('Cache write error:', error);
            // If quota exceeded, clear old cache entries
            if (error.name === 'QuotaExceededError') {
                this.clearOldCache();
            }
        }
    }
    
    // Remove item from cache
    removeFromCache(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Cache remove error:', error);
        }
    }
    
    // Clear all cached products
    clearProductsCache() {
        try {
            // Remove products list cache
            localStorage.removeItem(this.cacheConfig.productsKey);
            localStorage.removeItem(this.cacheConfig.categoryCountsKey);
            localStorage.removeItem(this.cacheConfig.lastFetchKey);
            
            // Remove individual product caches
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.cacheConfig.productPrefix)) {
                    localStorage.removeItem(key);
                }
            }
        } catch (error) {
            console.warn('Cache clear error:', error);
        }
    }
    
    // Clean expired cache entries
    cleanExpiredCache() {
        try {
            const now = Date.now();
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('cached_') || key.startsWith(this.cacheConfig.productPrefix))) {
                    try {
                        const cached = JSON.parse(localStorage.getItem(key));
                        if (cached.expiry && cached.expiry < now) {
                            localStorage.removeItem(key);
                        }
                    } catch (e) {
                        // Invalid cache entry, remove it
                        localStorage.removeItem(key);
                    }
                }
            }
        } catch (error) {
            console.warn('Cache cleanup error:', error);
        }
    }
    
    // Clear old cache entries when quota is exceeded
    clearOldCache() {
        try {
            const cacheEntries = [];
            
            // Collect all cache entries with their timestamps
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('cached_') || key.startsWith(this.cacheConfig.productPrefix))) {
                    try {
                        const cached = JSON.parse(localStorage.getItem(key));
                        cacheEntries.push({ key, timestamp: cached.timestamp || 0 });
                    } catch (e) {
                        // Invalid entry, remove immediately
                        localStorage.removeItem(key);
                    }
                }
            }
            
            // Sort by timestamp (oldest first) and remove oldest 50%
            cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
            const toRemove = Math.ceil(cacheEntries.length / 2);
            
            for (let i = 0; i < toRemove; i++) {
                localStorage.removeItem(cacheEntries[i].key);
            }
        } catch (error) {
            console.warn('Old cache clear error:', error);
        }
    }
    
    // Get cache statistics
    getCacheStats() {
        try {
            let totalEntries = 0;
            let expiredEntries = 0;
            const now = Date.now();
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('cached_') || key.startsWith(this.cacheConfig.productPrefix))) {
                    totalEntries++;
                    try {
                        const cached = JSON.parse(localStorage.getItem(key));
                        if (cached.expiry && cached.expiry < now) {
                            expiredEntries++;
                        }
                    } catch (e) {
                        expiredEntries++;
                    }
                }
            }
            
            return {
                totalEntries,
                expiredEntries,
                activeEntries: totalEntries - expiredEntries
            };
        } catch (error) {
            return { totalEntries: 0, expiredEntries: 0, activeEntries: 0 };
        }
    }

    // ===== Appwrite API Helpers =====
    
    // Build Appwrite database URL
    buildDatabaseUrl(path = '') {
        return `${this.endpoint}/databases/${this.databaseId}/collections/${this.productsCollectionId}${path}`;
    }
    
    // Build Appwrite storage URL
    buildStorageUrl(path = '') {
        return `${this.endpoint}/storage/buckets/${this.bucketId}${path}`;
    }
    
    // Get headers for Appwrite API - CRITICAL FIX: Include API key for admin ops
    getHeaders(includeApiKey = false) {
        const headers = {
            'X-Appwrite-Project': this.projectId,
            'Content-Type': 'application/json'
        };
        
        // Add API key for admin operations (write/delete/update)
        if (includeApiKey && this.apiKey) {
            headers['X-Appwrite-Key'] = this.apiKey;
        }
        
        return headers;
    }

    // ===== Product Operations =====
    
    // Fetch all products with caching
    async getAllProducts(options = {}) {
        const { category, featured, limit = 100, offset = 0, forceRefresh = false } = options;

        this.syncCacheVersion();
        
        // Generate cache key based on query parameters
        const cacheKey = `${this.cacheConfig.productsKey}_${category || 'all'}_${featured || 'false'}_${limit}_${offset}`;
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('Returning cached products');
                return cached;
            }
        }
        
        try {
            // Build query parameters
            const queries = [];
            
            if (category && category !== 'all') {
                queries.push(`queries[]=${encodeURIComponent(JSON.stringify({
                    method: 'equal',
                    attribute: 'category',
                    values: [category]
                }))}`);
            }
            
            if (featured) {
                queries.push(`queries[]=${encodeURIComponent(JSON.stringify({
                    method: 'equal',
                    attribute: 'featured',
                    values: [true]
                }))}`);
            }
            
            queries.push(`queries[]=${encodeURIComponent(JSON.stringify({
                method: 'limit',
                values: [limit]
            }))}`);
            
            queries.push(`queries[]=${encodeURIComponent(JSON.stringify({
                method: 'offset',
                values: [offset]
            }))}`);
            
            queries.push(`queries[]=${encodeURIComponent(JSON.stringify({
                method: 'orderDesc',
                attribute: '$createdAt'
            }))}`);
            
            const queryString = queries.length > 0 ? '?' + queries.join('&') : '';
            const url = this.buildDatabaseUrl('/documents') + queryString;
            
            const response = await fetch(url, { 
                headers: this.getHeaders(false), // No API key needed for reads
                method: 'GET'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const products = this.formatDocuments(data.documents || []);
            
            // Cache the results
            this.setCache(cacheKey, products);
            this.setCache(this.cacheConfig.lastFetchKey, Date.now());
            
            return products;
        } catch (error) {
            console.error('Error fetching products:', error);
            
            // Return cached data as fallback if available
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('Returning stale cached products due to error');
                return cached;
            }
            
            throw error;
        }
    }

    // Fetch single product by ID with caching
    async getProductById(id, options = {}) {
        const { forceRefresh = false } = options;
        const cacheKey = `${this.cacheConfig.productPrefix}${id}`;

        this.syncCacheVersion();
        
        // Check cache first
        if (!forceRefresh) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('Returning cached product');
                return cached;
            }
        }
        
        try {
            const url = this.buildDatabaseUrl(`/documents/${id}`);
            const response = await fetch(url, { 
                headers: this.getHeaders(false), // No API key needed for reads
                method: 'GET'
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const product = this.formatDocument(data);
            
            // Cache the result
            this.setCache(cacheKey, product);
            
            return product;
        } catch (error) {
            console.error('Error fetching product:', error);
            
            // Return cached data as fallback
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('Returning stale cached product due to error');
                return cached;
            }
            
            throw error;
        }
    }

    // Fetch products by category
    async getProductsByCategory(category, options = {}) {
        return this.getAllProducts({ category, ...options });
    }

    // Fetch featured products
    async getFeaturedProducts(limit = 6, options = {}) {
        return this.getAllProducts({ featured: true, limit, ...options });
    }

    // Search products
    async searchProducts(query, options = {}) {
        try {
            // Appwrite doesn't have full-text search, so we'll fetch all and filter
            // In production, you might want to use Appwrite's search or Algolia
            const allProducts = await this.getAllProducts({ limit: 1000, ...options });
            
            const searchTerm = query.toLowerCase();
            return allProducts.filter(product => 
                (product.product_name && product.product_name.toLowerCase().includes(searchTerm)) ||
                (product.short_description && product.short_description.toLowerCase().includes(searchTerm)) ||
                (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                (product.product_tags && product.product_tags.some(tag => 
                    tag.toLowerCase().includes(searchTerm)
                ))
            );
        } catch (error) {
            console.error('Error searching products:', error);
            throw error;
        }
    }

    // ===== Admin Operations =====

    // Extract unknown attribute name from Appwrite validation errors
    extractUnknownAttribute(errorMessage = '') {
        const match = String(errorMessage).match(/Unknown attribute:\s*"([^"]+)"/i);
        return match ? match[1] : null;
    }

    // Retry payload by dropping fields not present in current Appwrite collection schema
    async executeWithSchemaRetry(requestFn, formattedData) {
        let payload = { ...formattedData };
        const maxRetries = 5;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const response = await requestFn(payload);
            if (response.ok) {
                return response;
            }

            const errorData = await response.json().catch(() => ({}));
            const message = errorData.message || `HTTP error! status: ${response.status}`;
            const unknownAttr = this.extractUnknownAttribute(message);

            if (!unknownAttr || !(unknownAttr in payload)) {
                throw new Error(message);
            }

            console.warn(`Skipping unknown Appwrite attribute: ${unknownAttr}`);
            delete payload[unknownAttr];
        }

        throw new Error('Could not process write request after removing unknown attributes.');
    }

    // Add new product
    async addProduct(productData) {
        try {
            const url = this.buildDatabaseUrl('/documents');
            
            // Format data for Appwrite
            const formattedData = this.formatDataForAppwrite(productData);
            
            const response = await this.executeWithSchemaRetry(
                (payload) => fetch(url, {
                    method: 'POST',
                    headers: this.getHeaders(true), // CRITICAL: Include API key
                    body: JSON.stringify({
                        documentId: 'unique()',
                        data: payload
                    })
                }),
                formattedData
            );
            
            const data = await response.json();
            
            // Clear products cache to ensure fresh data
            this.clearProductsCache();
            this.bumpDataVersion();
            
            return this.formatDocument(data);
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    // Update product
    async updateProduct(id, productData) {
        try {
            const url = this.buildDatabaseUrl(`/documents/${id}`);
            
            // Format data for Appwrite
            const formattedData = this.formatDataForAppwrite(productData);
            
            const response = await this.executeWithSchemaRetry(
                (payload) => fetch(url, {
                    method: 'PATCH',
                    headers: this.getHeaders(true), // CRITICAL: Include API key
                    body: JSON.stringify({
                        data: payload
                    })
                }),
                formattedData
            );
            
            const data = await response.json();
            const product = this.formatDocument(data);
            
            // Update cache
            this.setCache(`${this.cacheConfig.productPrefix}${id}`, product);
            this.clearProductsCache();
            this.bumpDataVersion();
            
            return product;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    // Delete product
    async deleteProduct(id) {
        try {
            const url = this.buildDatabaseUrl(`/documents/${id}`);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders(true), // CRITICAL: Include API key
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            // Remove from cache
            this.removeFromCache(`${this.cacheConfig.productPrefix}${id}`);
            this.clearProductsCache();
            this.bumpDataVersion();
            
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    // Update stock quantity
    async updateStock(id, quantity) {
        try {
            return await this.updateProduct(id, { stock_quantity: quantity });
        } catch (error) {
            console.error('Error updating stock:', error);
            throw error;
        }
    }

    // ===== Storage Operations =====

    extractFileIdFromUrl(fileUrl) {
        const value = String(fileUrl || '');
        const match = value.match(/\/files\/([^/]+)\/view/i);
        return match ? match[1] : null;
    }

    async deleteImageByUrl(fileUrl) {
        const fileId = this.extractFileIdFromUrl(fileUrl);
        if (!fileId) return false;

        try {
            const url = this.buildStorageUrl(`/files/${fileId}`);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'X-Appwrite-Project': this.projectId,
                    'X-Appwrite-Key': this.apiKey
                }
            });

            if (!response.ok && response.status !== 404) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Delete failed: ${response.statusText}`);
            }

            return true;
        } catch (error) {
            console.warn('Error deleting image:', error);
            return false;
        }
    }

    async deleteImagesByUrls(urls = []) {
        if (!Array.isArray(urls) || urls.length === 0) return;
        await Promise.all(urls.map((url) => this.deleteImageByUrl(url)));
    }

    // Upload image to Appwrite Storage
    async uploadImage(file, folder = 'product-images') {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 10);
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${folder}/${timestamp}_${randomString}.${fileExt}`;
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('fileId', 'unique()');
            formData.append('file', file, fileName);
            
            const url = this.buildStorageUrl('/files');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Appwrite-Project': this.projectId,
                    'X-Appwrite-Key': this.apiKey // Include API key for upload
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Upload error:', errorData);
                throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Return the public URL
            const fileId = data.$id;
            const publicUrl = `${this.endpoint}/storage/buckets/${this.bucketId}/files/${fileId}/view?project=${this.projectId}`;
            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    // ===== Statistics =====

    // Get product counts by category with caching
    async getCategoryCounts(forceRefresh = false) {
        this.syncCacheVersion();

        // Check cache first
        if (!forceRefresh) {
            const cached = this.getFromCache(this.cacheConfig.categoryCountsKey);
            if (cached) {
                console.log('Returning cached category counts');
                return cached;
            }
        }
        
        try {
            const products = await this.getAllProducts({ limit: 1000 });
            const counts = {};
            
            products.forEach(product => {
                if (product.category) {
                    counts[product.category] = (counts[product.category] || 0) + 1;
                }
            });
            
            // Cache the results
            this.setCache(this.cacheConfig.categoryCountsKey, counts);
            
            return counts;
        } catch (error) {
            console.error('Error getting category counts:', error);
            
            // Return cached data as fallback
            const cached = this.getFromCache(this.cacheConfig.categoryCountsKey);
            if (cached) {
                return cached;
            }
            
            throw error;
        }
    }

    // Get total product count
    async getProductCount() {
        try {
            const products = await this.getAllProducts({ limit: 1000 });
            return products.length;
        } catch (error) {
            console.error('Error getting product count:', error);
            throw error;
        }
    }

    // ===== Data Formatting =====
    
    // Format Appwrite document to match expected product format
// Format Appwrite document to match expected product format
formatDocument(doc) {
    if (!doc) return null;
    
    const productImageUrls = Array.isArray(doc.product_image_urls) ? doc.product_image_urls.filter(Boolean) : [];
    const primaryImage = productImageUrls[0] || doc.product_image_url || 'https://via.placeholder.com/300x300?text=No+Image';

    return {
        $id: doc.$id,
        id: doc.$id,
        product_name: doc.product_name || '',
        name: doc.product_name || '',
        short_description: doc.short_description || '',
        description: doc.short_description || '',
        main_price: doc.main_price || 0,
        price: doc.main_price || 0,
        original_price: doc.main_price || 0,
        discount_price: doc.discount_price || null,
        category: doc.category || 'uncategorized',
        category_name: doc.category || 'uncategorized',
        // THIS LINE IS THE FIX - replaces missing images automatically
        product_image_url: primaryImage,
        product_image_urls: productImageUrls.length > 0 ? productImageUrls : (doc.product_image_url ? [doc.product_image_url] : []),
        image: primaryImage,
        stock_quantity: doc.stock_quantity || 0,
        stock: doc.stock_quantity || 0,
        colour_options: doc.colour_options || [],
        colors: doc.colour_options || [],
        product_tags: doc.product_tags || [],
        tags: doc.product_tags || [],
        featured: doc.featured || false,
        badge: doc.badge || '',
        product_colour: doc.product_colour || '',
        box: doc.box || 'without box',
        box_price: doc.box_price || 0,
        created_date: doc.$createdAt || '',
        updated_date: doc.$updatedAt || ''
    };
}
    
    // Format multiple documents
    formatDocuments(docs) {
        if (!Array.isArray(docs)) return [];
        return docs.map(doc => this.formatDocument(doc)).filter(Boolean);
    }
    
    // Format data for Appwrite (convert to Appwrite format)
    formatDataForAppwrite(data) {
        const formatted = {};
        
        // Map field names correctly
        if (data.product_name !== undefined) formatted.product_name = data.product_name;
        if (data.category !== undefined) formatted.category = data.category;
        if (data.main_price !== undefined) formatted.main_price = data.main_price;
        if (data.discount_price !== undefined) formatted.discount_price = data.discount_price;
        if (data.stock_quantity !== undefined) formatted.stock_quantity = data.stock_quantity;
        if (data.short_description !== undefined) formatted.short_description = data.short_description;
        if (data.product_image_url !== undefined) formatted.product_image_url = data.product_image_url;
        if (data.product_image_urls !== undefined) formatted.product_image_urls = data.product_image_urls;
        if (data.colour_options !== undefined) formatted.colour_options = data.colour_options;
        if (data.product_tags !== undefined) formatted.product_tags = data.product_tags;
        if (data.featured !== undefined) formatted.featured = data.featured;
        if (data.badge !== undefined) formatted.badge = data.badge;
        if (data.product_colour !== undefined) formatted.product_colour = data.product_colour;
        if (data.box !== undefined) formatted.box = data.box;
        if (data.box_price !== undefined) formatted.box_price = data.box_price;
        if (data.status !== undefined) formatted.status = data.status;
        
        return formatted;
    }
}

// Initialize Appwrite instance
const appwriteDB = new AppwriteDB();

// Expose cache management functions globally
window.appwriteCache = {
    clear: () => appwriteDB.clearProductsCache(),
    stats: () => appwriteDB.getCacheStats(),
    clean: () => appwriteDB.cleanExpiredCache()
};
