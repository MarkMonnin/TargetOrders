// Order processing module
// Handles processing of order pages and existing tabs

export function processOrderPage(url, callback, retries = 3, timeout = 60000) {
  console.log(`[${new Date().toISOString()}] processOrderPage called with:`, { url, retries, timeout });
  
  let tabId;
  let timeoutId;
  let isComplete = false;
  
  const cleanup = () => {
    console.log('Cleaning up resources');
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    // NOTE: Tab closing disabled for manual inspection
    // if (tabId) {
    //   console.log('Removing tab:', tabId);
    //   chrome.tabs.remove(tabId).catch(e => console.error('Error removing tab:', e));
    //   tabId = null;
    // }
  };
  
  const onComplete = (result) => {
    if (isComplete) {
      console.log('Operation already completed, ignoring duplicate completion');
      return;
    }
    console.log('Operation completed with result:', result);
    isComplete = true;
    cleanup();
    try {
      callback(result);
    } catch (e) {
      console.error('Error in completion callback:', e);
    }
  };
  
  const onTimeout = () => {
    console.warn(`[${new Date().toISOString()}] Timeout processing order page:`, url);
    if (retries > 0) {
      console.log(`Retrying... (${retries - 1} attempts left)`);
      processOrderPage(url, callback, retries - 1, timeout);
    } else {
      console.error('Maximum retries reached, giving up');
      onComplete({
        success: false,
        error: 'Operation timed out after maximum retries',
        orderNumber: 'Error',
        items: [],
        url,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  console.log('Creating new tab for URL:', url);
  chrome.tabs.create({ url, active: false }, (tab) => {
    if (chrome.runtime.lastError) {
      const errorMsg = `Failed to create tab: ${chrome.runtime.lastError.message}`;
      console.error(errorMsg);
      onComplete({
        success: false,
        error: errorMsg,
        orderNumber: 'Error',
        items: [],
        url,
        timestamp: new Date().toISOString()
      });
      return;
    }

    tabId = tab.id;
    console.log('Created tab with ID:', tabId);

    const onTabUpdated = (updatedTabId, changeInfo, updatedTab) => {
      if (updatedTabId !== tab.id) return;

      console.log('Tab updated:', { tabId: updatedTabId, status: changeInfo.status });

      if (changeInfo.status === 'complete') {
        console.log('Tab loading complete, waiting for dynamic content to load...');
        chrome.tabs.onUpdated.removeListener(onTabUpdated);

        // Wait for dynamic content (order items) to load before extracting
        const waitForOrderItems = () => {
          console.log('Checking if order items have loaded...');

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              // Check for common order item selectors (ONLY stable ones)
              const itemSelectors = [
                '[data-testid*="item"]',
                '[data-test*="item"]',
                '[data-test="package-card-item-row"]',
                'div[class*="display-flex"][class*="padding-h-default"]',
                'div[class*="padding-l-tight"]',
                'div[class*="pictureWrapper"]',
                'h3[id*="item-"]',
                '[data-test="order-price"]'
              ];

              for (const selector of itemSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                  console.log(`Found ${elements.length} elements with selector: ${selector}`);
                  return { found: true, selector, count: elements.length };
                }
              }

              // Check for text content that indicates items
              const bodyText = document.body.innerText || '';
              const hasItemIndicators = /\$\d+\.\d+|\d+ items?|quantity|price/i.test(bodyText);

              if (hasItemIndicators) {
                console.log('Found item indicators in text content');
                return { found: true, indicator: 'text_content' };
              }

              return { found: false };
            }
          }, (checkResult) => {
            const checkData = checkResult && checkResult[0] && checkResult[0].result;

            if (checkData && checkData.found) {
              console.log('✅ Order items detected! Proceeding with extraction...');
              // Items are loaded, proceed with extraction
              injectScripts();
            } else {
              // Items not loaded yet, wait and check again
              setTimeout(waitForOrderItems, 2000); // Check every 2 seconds
            }
          });
        };

        const injectScripts = () => {
          console.log('Injecting scripts for order extraction...');

          // Import and use extraction functions
          import('./extractionRunner.js').then(module => {
            module.runExtraction(tab.id, url, onComplete);
          }).catch(error => {
            console.error('Error importing extractionRunner:', error);
            onComplete({
              success: false,
              error: 'Failed to load extraction runner',
              orderNumber: 'Error',
              items: [],
              url,
              timestamp: new Date().toISOString()
            });
          });
        };

        // Start waiting for order items
        setTimeout(waitForOrderItems, 2000); // Initial 2-second wait
      }
    };

    // Start listening for tab updates
    chrome.tabs.onUpdated.addListener(onTabUpdated);

    // Set up timeout
    console.log(`Setting timeout for ${timeout}ms`);
    timeoutId = setTimeout(onTimeout, timeout);
  });
}

export function processExistingTab(onComplete) {
  console.log(`[${new Date().toISOString()}] processExistingTab called`);
  
  let timeoutId;
  let isComplete = false;
  
  const cleanup = () => {
    console.log('Cleaning up resources');
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  const handleComplete = (result) => {
    if (isComplete) {
      console.log('Operation already completed, ignoring duplicate completion');
      return;
    }
    console.log('Operation completed with result:', result);
    isComplete = true;
    cleanup();
    try {
      onComplete(result);
    } catch (e) {
      console.error('Error in completion callback:', e);
    }
  };
  
  const onTimeout = () => {
    console.warn(`[${new Date().toISOString()}] Timeout processing existing tab`);
    handleComplete({
      success: false,
      error: 'Operation timed out',
      orderNumber: 'Error',
      items: [],
      url: 'unknown',
      timestamp: new Date().toISOString()
    });
  };
  
  // Set up timeout
  console.log(`Setting timeout for 30000ms`);
  timeoutId = setTimeout(onTimeout, 30000);
  
  // Get the current active tab and process it directly
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      const errorMsg = `Error getting current tab: ${chrome.runtime.lastError.message}`;
      console.error(errorMsg);
      handleComplete({
        success: false,
        error: errorMsg,
        orderNumber: 'Error',
        items: [],
        url: 'unknown',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const currentTab = tabs[0];
    if (!currentTab) {
      console.error('No active tab found');
      handleComplete({
        success: false,
        error: 'No active tab found',
        orderNumber: 'Error',
        items: [],
        url: 'unknown',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('Processing current tab:', currentTab.url);
    
    // Import and use extraction functions
    import('./extractionRunner.js').then(module => {
      module.runExtraction(currentTab.id, currentTab.url, handleComplete);
    }).catch(error => {
      console.error('Error importing extractionRunner:', error);
      handleComplete({
        success: false,
        error: 'Failed to load extraction runner',
        orderNumber: 'Error',
        items: [],
        url: currentTab.url,
        timestamp: new Date().toISOString()
      });
    });
  });
}
