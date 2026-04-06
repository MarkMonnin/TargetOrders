// Page Type Detection Module
// Identifies the type of Target page currently loaded

export class PageTypeDetector {
  constructor() {
    this.pageTypes = {
      ORDERS_LIST: 'orders-list',
      ORDER_DETAIL: 'order-detail',
      CHECKOUT: 'checkout',
      PRODUCT: 'product',
      SEARCH: 'search',
      HOME: 'home',
      ACCOUNT: 'account',
      RECEIPT: 'receipt',
      INVOICE: 'invoice',
      UNKNOWN: 'unknown'
    };
  }

  /**
   * Detect the current page type based on URL and page content
   * @returns {string} Page type identifier
   */
  detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // URL-based detection first (faster)
    const urlType = this.detectFromURL(url, pathname);
    if (urlType !== this.pageTypes.UNKNOWN) {
      return urlType;
    }
    
    // Content-based detection as fallback
    return this.detectFromContent();
  }

  /**
   * Detect page type from URL patterns
   * @param {string} url - Current URL
   * @param {string} pathname - URL pathname
   * @returns {string} Page type identifier
   */
  detectFromURL(url, pathname) {
    // Orders list page
    if (pathname.includes('/orders') && !pathname.includes('/orders/')) {
      return this.pageTypes.ORDERS_LIST;
    }
    
    // Order detail page
    if (pathname.includes('/orders/') && /\d+/.test(pathname)) {
      return this.pageTypes.ORDER_DETAIL;
    }
    
    // Receipt page
    if (pathname.includes('/receipt') || url.includes('receipt')) {
      return this.pageTypes.RECEIPT;
    }
    
    // Invoice page
    if (pathname.includes('/invoice') || url.includes('invoice')) {
      return this.pageTypes.INVOICE;
    }
    
    // Checkout page
    if (pathname.includes('/checkout') || pathname.includes('/cart')) {
      return this.pageTypes.CHECKOUT;
    }
    
    // Product page
    if (pathname.includes('/p/') || pathname.includes('/product/')) {
      return this.pageTypes.PRODUCT;
    }
    
    // Search page
    if (pathname.includes('/search') || url.includes('search?')) {
      return this.pageTypes.SEARCH;
    }
    
    // Account pages
    if (pathname.includes('/account') || pathname.includes('/profile')) {
      return this.pageTypes.ACCOUNT;
    }
    
    // Home page
    if (pathname === '/' || pathname === '' || pathname.includes('/default')) {
      return this.pageTypes.HOME;
    }
    
    return this.pageTypes.UNKNOWN;
  }

  /**
   * Detect page type from DOM content
   * @returns {string} Page type identifier
   */
  detectFromContent() {
    // Orders list detection
    if (this.hasOrdersListElements()) {
      return this.pageTypes.ORDERS_LIST;
    }
    
    // Order detail detection
    if (this.hasOrderDetailElements()) {
      return this.pageTypes.ORDER_DETAIL;
    }
    
    // Receipt detection
    if (this.hasReceiptElements()) {
      return this.pageTypes.RECEIPT;
    }
    
    // Invoice detection
    if (this.hasInvoiceElements()) {
      return this.pageTypes.INVOICE;
    }
    
    // Checkout detection
    if (this.hasCheckoutElements()) {
      return this.pageTypes.CHECKOUT;
    }
    
    // Product detection
    if (this.hasProductElements()) {
      return this.pageTypes.PRODUCT;
    }
    
    // Search detection
    if (this.hasSearchElements()) {
      return this.pageTypes.SEARCH;
    }
    
    // Account detection
    if (this.hasAccountElements()) {
      return this.pageTypes.ACCOUNT;
    }
    
    return this.pageTypes.UNKNOWN;
  }

  /**
   * Check if page has orders list elements
   * @returns {boolean}
   */
  hasOrdersListElements() {
    const selectors = [
      '[data-test="order-history-container"]',
      '[data-test="orders-list"]',
      '.order-history',
      '[data-test="order-card"]',
      '.order-item',
      'h2:contains("Orders")',
      'h1:contains("Order history")'
    ];
    
    return selectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if page has order detail elements
   * @returns {boolean}
   */
  hasOrderDetailElements() {
    const selectors = [
      '[data-test="order-details"]',
      '[data-test="order-summary"]',
      '.order-details',
      '.order-summary',
      '[data-test="order-number"]',
      '.order-number',
      '[data-test="order-items"]',
      '.order-items'
    ];
    
    return selectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if page has receipt elements
   * @returns {boolean}
   */
  hasReceiptElements() {
    const selectors = [
      '[data-test="receipt"]',
      '.receipt',
      '[data-test="store-receipt"]',
      '.store-receipt',
      '[data-test="receipt-items"]',
      '.receipt-items',
      'h1:contains("Receipt")',
      'h2:contains("Store receipt")'
    ];
    
    return selectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if page has invoice elements
   * @returns {boolean}
   */
  hasInvoiceElements() {
    const selectors = [
      '[data-test="invoice"]',
      '.invoice',
      '[data-test="invoice-details"]',
      '.invoice-details',
      '[data-test="invoice-items"]',
      '.invoice-items',
      'h1:contains("Invoice")',
      'h2:contains("Order invoice")'
    ];
    
    return selectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if page has checkout elements
   * @returns {boolean}
   */
  hasCheckoutElements() {
    const selectors = [
      '[data-test="checkout"]',
      '.checkout',
      '[data-test="cart"]',
      '.cart',
      '[data-test="payment-form"]',
      '.payment-form',
      '[data-test="shipping-form"]',
      '.shipping-form'
    ];
    
    return selectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if page has product elements
   * @returns {boolean}
   */
  hasProductElements() {
    const selectors = [
      '[data-test="product-details"]',
      '.product-details',
      '[data-test="product-title"]',
      '.product-title',
      '[data-test="product-price"]',
      '.product-price',
      '[data-test="add-to-cart"]',
      '.add-to-cart'
    ];
    
    return selectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if page has search elements
   * @returns {boolean}
   */
  hasSearchElements() {
    const selectors = [
      '[data-test="search-results"]',
      '.search-results',
      '[data-test="search-grid"]',
      '.search-grid',
      '[data-test="search-query"]',
      '.search-query'
    ];
    
    return selectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if page has account elements
   * @returns {boolean}
   */
  hasAccountElements() {
    const selectors = [
      '[data-test="account-dashboard"]',
      '.account-dashboard',
      '[data-test="profile-settings"]',
      '.profile-settings',
      '[data-test="account-menu"]',
      '.account-menu'
    ];
    
    return selectors.some(selector => {
      try {
        return document.querySelector(selector) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Get page metadata for logging and debugging
   * @returns {Object} Page metadata
   */
  getPageMetadata() {
    return {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      title: document.title,
      pageType: this.detectPageType(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }
}

// Export singleton instance
export const pageDetector = new PageTypeDetector();
