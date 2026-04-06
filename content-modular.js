// Modular Content Script for Target Orders Extractor
// Uses the new modular architecture for page detection and processing

// Import the page type detector and HTML capture manager
import { pageDetector } from './modules/pageTypeDetector.js';
import { htmlCaptureManager } from './modules/htmlCaptureManager.js';
import { pageLoadRouter } from './modules/pageLoadRouter.js';

// Global state
let isInitialized = false;
let processingStats = {
  pagesProcessed: 0,
  errorsCount: 0,
  startTime: null,
  lastProcessedTime: null
};

/**
 * Initialize the modular content script
 */
async function initializeModularContentScript() {
  if (isInitialized) {
    return;
  }

  console.log('🚀 Initializing Modular Content Script...');
  processingStats.startTime = Date.now();

  try {
    // Register processors with the router
    await registerProcessors();
    
    // Initialize the page load router
    await pageLoadRouter.initialize();
    
    // Set up message listeners for popup communication
    setupMessageListeners();
    
    // Set up page load event listeners
    setupPageLoadListeners();
    
    isInitialized = true;
    
    console.log('✅ Modular Content Script initialized successfully');
    showNotification('Target Orders Extractor - Modular system active');
    
  } catch (error) {
    console.error('❌ Failed to initialize modular content script:', error);
    showNotification('Error initializing extension - please refresh the page');
  }
}

/**
 * Register all page processors with the router
 */
async function registerProcessors() {
  console.log('📝 Registering page processors...');
  
  // Import processors dynamically to avoid circular dependencies
  const { OrdersListProcessor } = await import('./modules/processors/OrdersListProcessor.js');
  const { OrderDetailProcessor } = await import('./modules/processors/OrderDetailProcessor.js');
  const { UnknownPageProcessor } = await import('./modules/processors/UnknownPageProcessor.js');
  
  // Register orders list processor
  const ordersListProcessor = new OrdersListProcessor();
  pageLoadRouter.registerProcessor('orders-list', ordersListProcessor);
  
  // Register order detail processor
  const orderDetailProcessor = new OrderDetailProcessor();
  pageLoadRouter.registerProcessor('order-detail', orderDetailProcessor);
  
  // Register unknown page processor (fallback)
  const unknownPageProcessor = new UnknownPageProcessor();
  pageLoadRouter.registerProcessor('unknown', unknownPageProcessor);
  
  console.log('✅ Page processors registered');
}

/**
 * Set up message listeners for popup communication
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Message received in modular content script:', message);
    
    switch (message.action) {
      case 'getPageInfo':
        handleGetPageInfo(sendResponse);
        break;
        
      case 'getProcessingStats':
        handleGetProcessingStats(sendResponse);
        break;
        
      case 'getCurrentPageData':
        handleGetCurrentPageData(sendResponse);
        break;
        
      case 'forcePageProcess':
        handleForcePageProcess(sendResponse);
        break;
        
      case 'getRouterStats':
        handleGetRouterStats(sendResponse);
        break;
        
      case 'resetRouter':
        handleResetRouter(sendResponse);
        break;
        
      default:
        console.log('⚠️ Unknown message action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return true; // Keep message channel open for async response
  });
}

/**
 * Handle get page info request
 */
async function handleGetPageInfo(sendResponse) {
  try {
    const pageInfo = pageLoadRouter.getCurrentPageInfo();
    const pageMetadata = pageDetector.getPageMetadata();
    
    sendResponse({
      success: true,
      pageInfo: pageInfo,
      metadata: pageMetadata,
      processingStats: processingStats
    });
  } catch (error) {
    console.error('❌ Error getting page info:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get processing stats request
 */
async function handleGetProcessingStats(sendResponse) {
  try {
    const routerStats = pageLoadRouter.getRouterStats();
    const storageStats = await htmlCaptureManager.getStorageStats();
    
    sendResponse({
      success: true,
      processingStats: processingStats,
      routerStats: routerStats,
      storageStats: storageStats
    });
  } catch (error) {
    console.error('❌ Error getting processing stats:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get current page data request
 */
async function handleGetCurrentPageData(sendResponse) {
  try {
    const currentUrl = window.location.href;
    const pageType = pageDetector.detectPageType();
    const pageMetadata = pageDetector.getPageMetadata();
    
    // Capture current page HTML
    const captureResult = await htmlCaptureManager.captureHTML(
      pageType, 
      pageMetadata, 
      'manual_request'
    );
    
    sendResponse({
      success: true,
      pageType: pageType,
      metadata: pageMetadata,
      captureResult: captureResult
    });
  } catch (error) {
    console.error('❌ Error getting current page data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle force page process request
 */
async function handleForcePageProcess(sendResponse) {
  try {
    console.log('🔄 Force processing current page...');
    
    const result = await pageLoadRouter.handlePageLoad();
    
    sendResponse({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('❌ Error force processing page:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get router stats request
 */
async function handleGetRouterStats(sendResponse) {
  try {
    const stats = pageLoadRouter.getRouterStats();
    sendResponse({ success: true, stats: stats });
  } catch (error) {
    console.error('❌ Error getting router stats:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle reset router request
 */
async function handleResetRouter(sendResponse) {
  try {
    pageLoadRouter.reset();
    processingStats = {
      pagesProcessed: 0,
      errorsCount: 0,
      startTime: Date.now(),
      lastProcessedTime: null
    };
    
    sendResponse({ success: true, message: 'Router reset successfully' });
  } catch (error) {
    console.error('❌ Error resetting router:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Set up page load event listeners
 */
function setupPageLoadListeners() {
  // Listen for page load events from router
  document.addEventListener('pageLoad', async (event) => {
    const { pageType, metadata, captureResult, loadCount, timestamp } = event.detail;
    
    console.log(`📄 Page load event: ${pageType} (load #${loadCount})`);
    
    // Update processing stats
    processingStats.pagesProcessed++;
    processingStats.lastProcessedTime = Date.now();
    
    if (captureResult.success) {
      console.log(`✅ Page captured: ${captureResult.filename}`);
    } else {
      processingStats.errorsCount++;
      console.error(`❌ Page capture failed: ${captureResult.error}`);
    }
    
    // Send page load notification to background script
    try {
      chrome.runtime.sendMessage({
        action: 'pageLoadProcessed',
        pageType: pageType,
        metadata: metadata,
        captureResult: captureResult,
        processingStats: processingStats
      });
    } catch (error) {
      console.error('❌ Error sending page load notification:', error);
    }
  });
  
  // Listen for processing errors
  document.addEventListener('error', (event) => {
    processingStats.errorsCount++;
    console.error('🚨 Processing error:', event.error);
  });
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
  const colors = {
    info: '#007bff',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545'
  };
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 350px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      <div style="flex: 1;">
        <strong>Target Orders Extractor</strong><br>
        ${message}
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        opacity: 0.8;
      ">&times;</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 6 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 6000);
}

/**
 * Get debug information
 */
function getDebugInfo() {
  return {
    isInitialized: isInitialized,
    processingStats: processingStats,
    routerInfo: pageLoadRouter.getCurrentPageInfo(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
}

/**
 * Export functions for debugging
 */
window.TargetOrdersDebug = {
  getDebugInfo: getDebugInfo,
  getPageInfo: () => pageLoadRouter.getCurrentPageInfo(),
  getRouterStats: () => pageLoadRouter.getRouterStats(),
  forceProcess: () => pageLoadRouter.handlePageLoad(),
  showNotification: showNotification
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModularContentScript);
} else {
  initializeModularContentScript();
}

// Also initialize on page visibility change (for SPA navigation)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isInitialized) {
    initializeModularContentScript();
  }
});

console.log('📦 Modular content script loaded');
