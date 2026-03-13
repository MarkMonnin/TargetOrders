// Extraction runner module
// Handles the actual extraction process for order pages

export function runExtraction(tabId, url, onComplete) {
  console.log('Running extraction for tab:', tabId, 'URL:', url);

  // First, inject the saveOrderHtml.js script
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['saveOrderHtml.js']
  }, (injectionResults) => {
    if (chrome.runtime.lastError) {
      const errorMsg = `Script injection failed: ${chrome.runtime.lastError.message}`;
      console.error(errorMsg);
      onComplete({
        success: false,
        error: errorMsg,
        orderNumber: 'Error',
        items: [],
        url: url,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('Script injection successful, getting HTML content...');

    // Get the HTML content from the page
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return document.documentElement.outerHTML;
      }
    }, (htmlResults) => {
      if (chrome.runtime.lastError) {
        const errorMsg = `Failed to get HTML: ${chrome.runtime.lastError.message}`;
        console.error(errorMsg);
        onComplete({
          success: false,
          error: errorMsg,
          orderNumber: 'Error',
          items: [],
          url: url,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const htmlContent = htmlResults && htmlResults[0] && htmlResults[0].result;
      if (!htmlContent) {
        console.error('No HTML content received');
        onComplete({
          success: false,
          error: 'No HTML content received',
          orderNumber: 'Error',
          items: [],
          url: url,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`Got HTML content (${htmlContent.length} characters)`);

      // Extract order number from URL
      const orderNumber = url.match(/\/orders\/(\d+)/)?.[1] || 'Unknown';

      // Import and run the content script functions
      import('./contentScriptFunctions.js').then(module => {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: module.getContentScriptFunction(),
          args: [orderNumber, htmlContent]
        }, (results) => {
          if (chrome.runtime.lastError) {
            const errorMsg = `Execution failed: ${chrome.runtime.lastError.message}`;
            console.error(errorMsg);
            onComplete({
              success: false,
              error: errorMsg,
              orderNumber: 'Error',
              items: [],
              url: url,
              timestamp: new Date().toISOString()
            });
            return;
          }

          console.log('Extraction results:', results);

          const result = results && results[0] && results[0].result;
          console.log('[Background] Received result from content script:', {
            success: result?.success,
            orderNumber: result?.orderNumber,
            hasHtml: !!result?.html,
            htmlLength: result?.html?.length || 0,
            keys: result ? Object.keys(result) : 'no result'
          });

          if (result) {
            // Process the result and send it back to the original caller
            onComplete({
              success: result.success || false,
              orderNumber: result.orderNumber || 'Unknown',
              items: result.items || [],
              url: result.url || url,
              timestamp: new Date().toISOString(),
              html: result.html || '',
              error: result.error || null
            });
          } else {
            console.error('No result received from content script');
            onComplete({
              success: false,
              error: 'No result received from content script',
              orderNumber: 'Error',
              items: [],
              url: url,
              timestamp: new Date().toISOString()
            });
          }
        });
      }).catch(error => {
        console.error('Error importing contentScriptFunctions:', error);
        onComplete({
          success: false,
          error: 'Failed to load content script functions',
          orderNumber: 'Error',
          items: [],
          url: url,
          timestamp: new Date().toISOString()
        });
      });
    });
  });
}
