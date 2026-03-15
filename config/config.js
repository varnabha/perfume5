// Storeify Watches - Configuration File
// Edit these settings to customize your store

const CONFIG = {
    // Store Information
    storeName: 'Storeify Watches',
    storeTagline: 'Premium Lifestyle Accessories',
    storeDescription: 'Discover our curated collection of premium watches, sunglasses, and couple watches.',
    
    // WhatsApp Configuration
    whatsapp: {
        number: '919689467611', // Format: country code + number (no + or spaces)
        message: 'Hello! I want to order from Storeify Watches.',
        enabled: true
    },
    
    // Appwrite Configuration
    // Sign up at https://appwrite.io and create a project
    appwrite: {
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '69b3bf3c0025d8a05b28',
    databaseId: '69b3c54b002196d96204',
    productsCollectionId: 'products',  // The collection/table we just created
    bucketId: '69b3c75400312816f5e1',  // You still need to create this in Appwrite Storage
    apiKey: 'standard_1d600da673fae48a78afd9c0c6bb7e8f37d2ffce4376734ee28abfcea27c45315242bf96853885d43406d2fd54bb7a32d9273f5ea893cdcdced412397f467f42cf8f250a111993055cdb13d15b0e9218d9882216cc698a03f6cde69f11a923982cfca967cad09b003c127ecb7ef78c1488aeb877114b0d676d45c2756856436a' // Full access API key
},
    
    // Cache Configuration
    cache: {
        enabled: true,
        defaultTTL: 5 * 60 * 1000, // 5 minutes in milliseconds
        cleanupInterval: 10 * 60 * 1000 // 10 minutes
    },
    
    // Admin Configuration
    admin: {
        // Simple password protection (in production, use proper authentication)
        password: 'admin123',
        sessionDuration: 3600000 // 1 hour in milliseconds
    },
    
    // Currency Configuration
    currency: {
        symbol: '₹',
        code: 'INR',
        position: 'before' // 'before' or 'after'
    },
    
    // Categories
    categories: [
        { id: 'all', name: 'All Products', icon: 'grid' },
        { id: 'watches', name: 'All Watches', icon: 'watch' },
        { id: 'mens-watches', name: "Men's Watches", icon: 'watch' },
        { id: 'female-watches', name: 'Female Watches', icon: 'watch' },
        { id: 'unisex-watches', name: 'Unisex Watches', icon: 'watch' },
        { id: 'sunglasses', name: 'Sunglasses', icon: 'sun' },
        { id: 'couple-accessories', name: 'Couple Watches', icon: 'heart' }
    ],
    
    // Theme Colors
    colors: {
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
        gold: '#d4af37',
        silver: '#c0c0c0',
        text: '#333333',
        lightText: '#666666',
        background: '#f8f9fa',
        white: '#ffffff'
    },
    
    // Social Links
    social: {
        instagram: 'https://www.instagram.com/storeify.watches?igsh=MTJ6bXgzNzRwdGdkag==',
        facebook: 'https://www.facebook.com/share/1EU6x2EHDr/?mibextid=wwXIfr',
        twitter: 'https://twitter.com/storeifywatches',
        whatsapp: 'https://wa.me/919876543210'
    },
    
    // Contact Information
    contact: {
        email: 'support@storeifywatches.com',
        phone: '+91 9689467611',
        address: '123 Fashion Street, Mumbai, India'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
