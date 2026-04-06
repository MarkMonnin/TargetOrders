// Page Load Router Module
// Detects page loads and routes to appropriate processors

import { pageDetector } from './pageTypeDetector.js';
import { htmlCaptureManager } from './htmlCaptureManager.js';

export class PageLoadRouter {
  constructor() {
    this.isInitialized = false;
    this.currentUrl = '';
    this.currentPageType = '';
    this.processors = new Map();
    this.loadCount = 0;
    this.lastLoadTime = 0;
    
    // Debounce timer for rapid page changes
    this.debounceTimer = null;
    this.debounceDelay = 1000; // Increased to 1 second to reduce duplicates
    
    // Minimum time between captures for same URL
    this.minCaptureInterval = 5000; // 5 seconds
    this.lastCaptureTime = 0;
    
    // Track recently captured URLs to avoid duplicates
    this.recentlyCaptured = new Set();
    this.cleanupInterval = null;
  }

  /**
   * Initialize the page load router
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Initializing Page Load Router...');
    
    // Set up initial page detection
    await this.handlePageLoad();
    
    // Set up listeners for page changes
    this.setupListeners();
    
    // Set up cleanup interval for recently captured URLs
    this.cleanupInterval = setInterval(() => {
      this.cleanupRecentlyCaptured();
    }, 30000); // Clean up every 30 seconds
    
    this.isInitialized = true;
    console.log('✅ Page Load Router initialized');
  }

  /**
   * Set up event listeners for page changes
   */
  setupListeners() {
    // Listen for navigation events
    window.addEventListener('popstate', () => {
      this.debouncePageLoad();
    });

    // Listen for pushstate/replacestate (SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.debouncePageLoad();
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.debouncePageLoad();
    };

    // Listen for DOM content changes (for dynamic content)
    const observer = new MutationObserver((mutations) => {
      const shouldCheck = mutations.some(mutation => 
        mutation.type === 'childList' && 
        mutation.addedNodes.length > 0
      );
      
      if (shouldCheck) {
        this.debouncePageLoad();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Listen for URL hash changes
    window.addEventListener('hashchange', () => {
      this.debouncePageLoad();
    });

    // Periodic check for page changes (fallback)
    setInterval(() => {
      this.checkForPageChange();
    }, 2000);
  }

  /**
   * Debounce page load detection to avoid rapid successive calls
   */
  debouncePageLoad() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.handlePageLoad();
    }, this.debounceDelay);
  }

  /**
   * Check if page has changed and handle if needed
   */
  async checkForPageChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== this.currentUrl) {
      await this.handlePageLoad();
    }
  }

  /**
   * Handle page load detection and routing
   */
  async handlePageLoad() {
    try {
      const startTime = performance.now();
      const currentUrl = window.location.href;
      const currentTime = Date.now();
      
      // Check if this is actually a new page
      if (currentUrl === this.currentUrl && this.loadCount > 0) {
        return;
      }

      // Check if we recently captured this URL
      if (this.recentlyCaptured.has(currentUrl)) {
        console.log(`🔄 Skipping recently captured URL: ${currentUrl}`);
        return;
      }

      // Check minimum capture interval
      if (currentTime - this.lastCaptureTime < this.minCaptureInterval && this.loadCount > 0) {
        console.log(`🔄 Skipping capture due to time limit: ${currentUrl}`);
        return;
      }

      this.loadCount++;
      this.lastLoadTime = currentTime;
      this.lastCaptureTime = currentTime;
      
      console.log(`📄 Page Load #${this.loadCount}: ${currentUrl}`);
      
      // Detect page type
      const pageType = pageDetector.detectPageType();
      const pageMetadata = pageDetector.getPageMetadata();
      
      console.log(`🔍 Page Type Detected: ${pageType}`);
      
      // Capture HTML before processing
      const captureResult = await this.capturePageHTML(pageType, pageMetadata);
      
      // Only proceed if capture was successful (not a duplicate)
      if (captureResult.success) {
        // Add to recently captured
        this.recentlyCaptured.add(currentUrl);
        
        // Route to appropriate processor
        await this.routeToProcessor(pageType, pageMetadata, captureResult);
        
        // Update current page info
        this.currentUrl = currentUrl;
        this.currentPageType = pageType;
        
        const endTime = performance.now();
        console.log(`✅ Page load handled in ${(endTime - startTime).toFixed(2)}ms`);
        
        // Emit page load event for other components
        this.emitPageLoadEvent(pageType, pageMetadata, captureResult);
      } else if (captureResult.duplicate) {
        console.log(`🔄 Duplicate capture skipped: ${captureResult.reason}`);
      } else {
        console.error(`❌ Capture failed: ${captureResult.error}`);
      }
      
    } catch (error) {
      console.error('❌ Error handling page load:', error);
    }
  }

  /**
   * Clean up recently captured URLs
   */
  cleanupRecentlyCaptured() {
    // Remove URLs that were captured more than 2 minutes ago
    const cutoffTime = Date.now() - 120000; // 2 minutes
    
    // Simple cleanup - just clear the set periodically
    if (this.recentlyCaptured.size > 50) {
      console.log(`🧹 Cleaning up recently captured URLs (${this.recentlyCaptured.size} entries)`);
      this.recentlyCaptured.clear();
    }
  }

  /**
   * Capture page HTML with metadata
   * @param {string} pageType - Detected page type
   * @param {Object} metadata - Page metadata
   * @returns {Promise<Object>} Capture result
   */
  async capturePageHTML(pageType, metadata) {
    try {
      // Generate suffix based on load count
      const suffix = `load_${this.loadCount}`;
      
      // Add additional metadata
      const captureMetadata = {
        ...metadata,
        loadCount: this.loadCount,
        loadTime: this.lastLoadTime,
        previousUrl: this.currentUrl || 'none',
        pageChangeType: this.currentUrl ? 'navigation' : 'initial'
      };
      
      return await htmlCaptureManager.captureHTML(pageType, captureMetadata, suffix);
    } catch (error) {
      console.error('❌ Error capturing page HTML:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Route to appropriate processor based on page type
   * @param {string} pageType - Detected page type
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   */
  async routeToProcessor(pageType, metadata, captureResult) {
    try {
      const processor = this.processors.get(pageType);
      
      if (processor) {
        console.log(`🔄 Routing to ${pageType} processor`);
        await processor.process(metadata, captureResult);
      } else {
        console.log(`⚠️ No processor found for page type: ${pageType}`);
        await this.handleUnknownPage(metadata, captureResult);
      }
    } catch (error) {
      console.error('❌ Error routing to processor:', error);
    }
  }

  /**
   * Handle pages without specific processors
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   */
  async handleUnknownPage(metadata, captureResult) {
    console.log('❓ Handling unknown page type');
    
    // You could implement a generic processor here
    // Or log for analysis
    await this.logUnknownPage(metadata, captureResult);
  }

  /**
   * Log unknown pages for analysis
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   */
  async logUnknownPage(metadata, captureResult) {
    try {
      const logKey = 'unknown_pages_log';
      const existingLogs = await this.getStorageData(logKey) || [];
      
      existingLogs.push({
        timestamp: new Date().toISOString(),
        metadata: metadata,
        captureResult: captureResult
      });
      
      // Keep only last 50 unknown pages
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      
      await chrome.storage.local.set({ [logKey]: existingLogs });
    } catch (error) {
      console.error('❌ Failed to log unknown page:', error);
    }
  }

  /**
   * Register a processor for a specific page type
   * @param {string} pageType - Page type to handle
   * @param {Object} processor - Processor instance with process() method
   */
  registerProcessor(pageType, processor) {
    if (!processor || typeof processor.process !== 'function') {
      throw new Error('Processor must have a process() method');
    }
    
    this.processors.set(pageType, processor);
    console.log(`📝 Registered processor for: ${pageType}`);
  }

  /**
   * Unregister a processor
   * @param {string} pageType - Page type to unregister
   */
  unregisterProcessor(pageType) {
    this.processors.delete(pageType);
    console.log(`🗑️ Unregistered processor for: ${pageType}`);
  }

  /**
   * Get registered processors
   * @returns {Map} Map of registered processors
   */
  getRegisteredProcessors() {
    return new Map(this.processors);
  }

  /**
   * Emit page load event for other components
   * @param {string} pageType - Detected page type
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   */
  emitPageLoadEvent(pageType, metadata, captureResult) {
    const event = new CustomEvent('pageLoad', {
      detail: {
        pageType: pageType,
        metadata: metadata,
        captureResult: captureResult,
        loadCount: this.loadCount,
        timestamp: new Date().toISOString()
      }
    });
    
    document.dispatchEvent(event);
  }

  /**
   * Get current page information
   * @returns {Object} Current page info
   */
  getCurrentPageInfo() {
    return {
      url: this.currentUrl,
      pageType: this.currentPageType,
      loadCount: this.loadCount,
      lastLoadTime: this.lastLoadTime,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Get router statistics
   * @returns {Object} Router statistics
   */
  getRouterStats() {
    return {
      loadCount: this.loadCount,
      currentUrl: this.currentUrl,
      currentPageType: this.currentPageType,
      registeredProcessors: Array.from(this.processors.keys()),
      isInitialized: this.isInitialized,
      lastLoadTime: this.lastLoadTime,
      sessionDuration: this.lastLoadTime ? Date.now() - this.lastLoadTime : 0
    };
  }

  /**
   * Reset router state
   */
  reset() {
    this.currentUrl = '';
    this.currentPageType = '';
    this.loadCount = 0;
    this.lastLoadTime = 0;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    console.log('🔄 Page Load Router reset');
  }

  /**
   * Get data from browser storage
   * @param {string} key - Storage key
   * @returns {Promise<any>} Stored data
   */
  async getStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }
}

// Export singleton instance
export const pageLoadRouter = new PageLoadRouter();
