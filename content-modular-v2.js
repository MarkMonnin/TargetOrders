// Modular Content Script for Target Orders Extractor (Non-Module Version)
// Uses dynamic imports to load modules

// Global state
let isInitialized = false;
let pageDetector = null;
let htmlCaptureManager = null;
let pageLoadRouter = null;
let testingFramework = null;
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
    console.log('⚠️ Already initialized, skipping...');
    return;
  }

  console.log('🚀 Initializing Modular Content Script v2...');
  console.log('🔍 Page info:', {
    url: window.location.href,
    readyState: document.readyState,
    timestamp: new Date().toISOString()
  });
  processingStats.startTime = Date.now();

  try {
    // Load modules dynamically
    await loadModules();
    
    // Register processors with the router
    await registerProcessors();
    
    // Initialize the page load router
    await pageLoadRouter.initialize();
    
    // Set up message listeners for popup communication
    setupMessageListeners();
    
    // Set up page load event listeners
    setupPageLoadListeners();
    
    // Start a test session
    testingFramework.startTestSession('Browsing Session', {
      captureAllPages: true,
      captureProcessingResults: true,
      captureErrors: true
    });
    
    isInitialized = true;
    
    console.log('✅ Modular Content Script v2 initialized successfully');
    showNotification('Target Orders Extractor - Modular system active', 'success');
    
  } catch (error) {
    console.error('❌ Failed to initialize modular content script:', error);
    showNotification('Error initializing extension - please refresh the page', 'error');
  }
}

/**
 * Load all required modules dynamically
 */
async function loadModules() {
  console.log('📦 Loading modules...');
  
  // Add cache-busting timestamp to force reload
  const cacheBuster = Date.now();
  
  // Import the page type detector
  const { pageDetector: detector } = await import(chrome.runtime.getURL(`modules/pageTypeDetector.js?t=${cacheBuster}`));
  pageDetector = detector;
  
  // Import the HTML capture manager
  const { htmlCaptureManager: captureManager } = await import(chrome.runtime.getURL(`modules/htmlCaptureManager.js?t=${cacheBuster}`));
  htmlCaptureManager = captureManager;
  
  // Debug: Check if saveToDownloads method exists
  console.log('🔍 Checking htmlCaptureManager methods:', {
    hasSaveToDownloads: typeof htmlCaptureManager.saveToDownloads,
    hasSaveToStorage: typeof htmlCaptureManager.saveToStorage,
    saveToDownloadsEnabled: htmlCaptureManager.saveToDownloadsEnabled,
    managerType: typeof htmlCaptureManager,
    managerInstance: htmlCaptureManager.constructor.name,
    allMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(htmlCaptureManager))
  });
  
  // Import the page load router
  const { pageLoadRouter: router } = await import(chrome.runtime.getURL(`modules/pageLoadRouter.js?t=${cacheBuster}`));
  pageLoadRouter = router;
  
  // Import the testing framework
  const { testingFramework: testFramework } = await import(chrome.runtime.getURL(`modules/testingFramework.js?t=${cacheBuster}`));
  testingFramework = testFramework;
  
  console.log('✅ All modules loaded successfully');
}

/**
 * Register all page processors with the router
 */
async function registerProcessors() {
  console.log('📝 Registering page processors...');
  
  // Add cache-busting timestamp to force reload
  const cacheBuster = Date.now();
  
  // Import processors dynamically to avoid circular dependencies
  const { OrdersListProcessor } = await import(chrome.runtime.getURL(`modules/processors/OrdersListProcessor.js?t=${cacheBuster}`));
  const { OrderDetailProcessor } = await import(chrome.runtime.getURL(`modules/processors/OrderDetailProcessor.js?t=${cacheBuster}`));
  const { UnknownPageProcessor } = await import(chrome.runtime.getURL(`modules/processors/UnknownPageProcessor.js?t=${cacheBuster}`));
  
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
        
      case 'startTestSession':
        handleStartTestSession(message, sendResponse);
        break;
        
      case 'stopTestSession':
        handleStopTestSession(sendResponse);
        break;
        
      case 'exportTestResults':
        handleExportTestResults(message, sendResponse);
        break;
        
      case 'exportCapturedHTML':
        handleExportCapturedHTML(message, sendResponse);
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
    const currentSession = testingFramework.getCurrentSession();
    
    sendResponse({
      success: true,
      processingStats: processingStats,
      routerStats: routerStats,
      storageStats: storageStats,
      currentSession: currentSession
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
    
    // Record the capture in testing framework
    if (testingFramework.isRecording) {
      testingFramework.recordCapture(captureResult);
    }
    
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
 * Handle start test session request
 */
async function handleStartTestSession(message, sendResponse) {
  try {
    const { sessionName, config } = message;
    const sessionId = testingFramework.startTestSession(sessionName, config);
    
    sendResponse({
      success: true,
      sessionId: sessionId,
      message: `Test session "${sessionName}" started`
    });
  } catch (error) {
    console.error('❌ Error starting test session:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle stop test session request
 */
async function handleStopTestSession(sendResponse) {
  try {
    const session = testingFramework.stopTestSession();
    
    sendResponse({
      success: true,
      session: session,
      message: `Test session "${session.name}" stopped`
    });
  } catch (error) {
    console.error('❌ Error stopping test session:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle export test results request
 */
async function handleExportTestResults(message, sendResponse) {
  try {
    const { sessionId } = message;
    await testingFramework.exportResults(sessionId);
    
    sendResponse({
      success: true,
      message: 'Test results exported successfully'
    });
  } catch (error) {
    console.error('❌ Error exporting test results:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle export captured HTML request
 */
async function handleExportCapturedHTML(message, sendResponse) {
  try {
    const { sessionId } = message;
    await testingFramework.exportCapturedHTML(sessionId);
    
    sendResponse({
      success: true,
      message: 'Captured HTML exported successfully'
    });
  } catch (error) {
    console.error('❌ Error exporting captured HTML:', error);
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
    
    // Record events in testing framework
    if (testingFramework.isRecording) {
      testingFramework.recordPageLoad({
        pageType: pageType,
        metadata: metadata,
        loadCount: loadCount,
        timestamp: timestamp
      });
      
      if (captureResult.success) {
        testingFramework.recordCapture(captureResult);
      } else if (!captureResult.duplicate) {
        // Only record actual errors, not duplicates
        testingFramework.recordError({
          message: captureResult.error,
          pageType: pageType,
          metadata: metadata
        });
      }
    }
    
    if (captureResult.success) {
      console.log(`✅ Page captured: ${captureResult.filename}`);
      showNotification(`Page captured: ${pageType}`, 'success');
    } else if (captureResult.duplicate) {
      console.log(`🔄 Duplicate capture skipped: ${captureResult.reason}`);
      // Don't show notification for duplicates to reduce noise
    } else {
      processingStats.errorsCount++;
      console.error(`❌ Page capture failed: ${captureResult.error}`);
      showNotification(`Capture failed: ${captureResult.error}`, 'error');
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
    
    if (testingFramework.isRecording) {
      testingFramework.recordError({
        message: event.error.message || event.error,
        timestamp: Date.now()
      });
    }
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
    routerInfo: pageLoadRouter ? pageLoadRouter.getCurrentPageInfo() : null,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    modulesLoaded: {
      pageDetector: !!pageDetector,
      htmlCaptureManager: !!htmlCaptureManager,
      pageLoadRouter: !!pageLoadRouter,
      testingFramework: !!testingFramework
    }
  };
}

/**
 * Export functions for debugging
 */
window.TargetOrdersDebug = {
  getDebugInfo: getDebugInfo,
  getPageInfo: () => pageLoadRouter ? pageLoadRouter.getCurrentPageInfo() : null,
  getRouterStats: () => pageLoadRouter ? pageLoadRouter.getRouterStats() : null,
  forceProcess: () => pageLoadRouter ? pageLoadRouter.handlePageLoad() : null,
  captureCurrentPage: async () => {
    if (!pageDetector || !htmlCaptureManager) return null;
    const pageType = pageDetector.detectPageType();
    const metadata = pageDetector.getPageMetadata();
    return await htmlCaptureManager.captureHTML(pageType, metadata, 'debug');
  },
  startTestSession: (name, config) => testingFramework ? testingFramework.startTestSession(name, config) : null,
  stopTestSession: () => testingFramework ? testingFramework.stopTestSession() : null,
  exportTestResults: (sessionId) => testingFramework ? testingFramework.exportResults(sessionId) : null,
  exportCapturedHTML: (sessionId) => testingFramework ? testingFramework.exportCapturedHTML(sessionId) : null,
  showNotification: showNotification,
  clearStorage: async () => {
    if (!htmlCaptureManager) return null;
    try {
      await htmlCaptureManager.emergencyCleanup();
      console.log('🧹 Storage cleared manually');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
      return false;
    }
  },
  getStorageInfo: async () => {
    if (!htmlCaptureManager) return null;
    return await htmlCaptureManager.getStorageInfo();
  },
  cleanupOldCaptures: async (keepCount = 20) => {
    if (!htmlCaptureManager) return null;
    try {
      await htmlCaptureManager.cleanupOldCaptures(keepCount);
      console.log(`🧹 Cleaned up old captures, keeping ${keepCount}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to cleanup old captures:', error);
      return false;
    }
  },
  // New configuration methods
  setSaveToDownloads: (enabled = true) => {
    if (!htmlCaptureManager) return null;
    htmlCaptureManager.configureSaveLocation(enabled, true, 'TargetOrders-Captures');
    console.log(`💾 Save to downloads: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    return true;
  },
  setSaveToStorage: (enabled = true) => {
    if (!htmlCaptureManager) return null;
    htmlCaptureManager.configureSaveLocation(!enabled, true, 'TargetOrders-Captures');
    console.log(`💾 Save to storage: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    return true;
  },
  getSaveConfiguration: () => {
    if (!htmlCaptureManager) return null;
    return htmlCaptureManager.getSaveConfiguration();
  },
  setDownloadSubfolder: (subfolderName) => {
    if (!htmlCaptureManager) return null;
    htmlCaptureManager.configureSaveLocation(true, true, subfolderName);
    console.log(`📂 Download subfolder set to: ${subfolderName}`);
    return true;
  },
  testDownloadsAPI: async () => {
    if (!htmlCaptureManager) return null;
    try {
      console.log('🔧 Testing Chrome downloads API via background script...');
      
      // Test with a simple file via background script
      const testContent = '<html><body><h1>Test File from Background Script</h1></body></html>';
      const testFilename = 'test-background-download.html';
      const testPath = `${htmlCaptureManager.downloadSubfolder}/${testFilename}`;
      
      console.log('📤 Sending test message to background script...');
      
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_FILE',
        filename: testFilename,
        fullPath: testPath,
        htmlContent: testContent,
        metadata: { test: true, timestamp: new Date().toISOString() }
      });
      
      console.log('📨 Received test response:', response);
      
      if (response && response.success) {
        console.log(`✅ Test download successful: ${testPath} (ID: ${response.downloadId})`);
        return { success: true, downloadId: response.downloadId, path: testPath };
      } else {
        console.log('❌ Test download failed:', response?.error);
        return { success: false, error: response?.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('❌ Downloads API test failed:', error);
      return { success: false, error: error.message };
    }
  },
  testMessagePassing: async () => {
    try {
      console.log('🔧 Testing basic message passing to background script...');
      
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_MESSAGE',
        data: 'Hello from content script!'
      });
      
      console.log('📨 Test message response:', response);
      return { success: true, response };
    } catch (error) {
      console.error('❌ Message passing test failed:', error);
      return { success: false, error: error.message };
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  console.log('📄 DOM still loading, adding DOMContentLoaded listener');
  document.addEventListener('DOMContentLoaded', initializeModularContentScript);
} else {
  console.log('📄 DOM already loaded, initializing immediately');
  initializeModularContentScript();
}

// Also initialize on page visibility change (for SPA navigation)
document.addEventListener('visibilitychange', () => {
  console.log('👁️ Visibility change detected:', {
    hidden: document.hidden,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    isInitialized: isInitialized
  });
  if (!document.hidden && !isInitialized) {
    console.log('🔄 Page became visible, reinitializing...');
    initializeModularContentScript();
  } else if (!document.hidden && isInitialized) {
    console.log('👁️ Page became visible but already initialized');
  }
});

// Monitor for potential page reloads
window.addEventListener('beforeunload', () => {
  console.log('🚪 Page unloading detected');
});

window.addEventListener('load', () => {
  console.log('📄 Window load event detected');
});

console.log('📦 Modular content script v2 loaded');
