// Message handlers for Chrome extension
// Handles all incoming messages from popup and content scripts

export function setupMessageHandlers() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.action, request);

    // Handle request to open popup
    if (request.action === 'openPopup') {
      try {
        chrome.action.openPopup();
        if (sendResponse) {
          sendResponse({ status: 'success' });
        }
      } catch (error) {
        console.error('❌ Error calling chrome.action.openPopup:', error);
        if (sendResponse) {
          sendResponse({ status: 'error', error: error.message });
        }
      }
      return true; // Keep the message channel open for the async response
    }

    // Handle request to process order page
    if (request.action === 'processOrderPage') {
      console.log('Processing order page:', request.url);

      // Add error handling for the processOrderPage callback
      const handleResponse = (response) => {
        console.log('Sending response:', response);
        try {
          sendResponse(response);
        } catch (e) {
          console.error('Error in sendResponse:', e);
        }
      };

      // Import and call processOrderPage
      import('./orderProcessor.js').then(module => {
        module.processOrderPage(request.url, handleResponse);
      }).catch(error => {
        console.error('Error importing orderProcessor:', error);
        handleResponse({
          success: false,
          error: 'Failed to load order processor',
          orderNumber: 'Error',
          items: [],
          url: request.url,
          timestamp: new Date().toISOString()
        });
      });

      return true; // Keep the message channel open for the async response
    }

    // Handle request to process current page
    if (request.action === 'processCurrentPage') {
      console.log('Processing current page:', request.url);

      // Add error handling for the processOrderPage callback
      const handleResponse = (response) => {
        console.log('Sending response:', response);
        try {
          sendResponse(response);
        } catch (e) {
          console.error('Error in sendResponse:', e);
        }
      };

      // Get the current active tab and process it directly
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting current tab:', chrome.runtime.lastError);
          handleResponse({
            success: false,
            error: chrome.runtime.lastError.message,
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
          handleResponse({
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
        
        // Import and call processExistingTab with the current tab
        import('./orderProcessor.js').then(module => {
          module.processExistingTab(currentTab, handleResponse);
        }).catch(error => {
          console.error('Error importing orderProcessor:', error);
          handleResponse({
            success: false,
            error: 'Failed to load order processor',
            orderNumber: 'Error',
            items: [],
            url: currentTab.url,
            timestamp: new Date().toISOString()
          });
        });
      });

      return true; // Keep the message channel open for the async response
    }
    
    // Handle request to generate CSV from all saved orders
    if (request.action === 'generateCSV') {
      console.log('Generating CSV from saved orders');
      
      // Create a new tab to execute the CSV generation in the context of the extension
      chrome.tabs.create({
        url: chrome.runtime.getURL('popup.html'),
        active: false
      }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Error creating tab for CSV generation:', chrome.runtime.lastError);
          if (sendResponse) {
            sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
          }
          return;
        }

        // Execute CSV generation script
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['csvGenerator.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error executing CSV generator:', chrome.runtime.lastError);
            if (sendResponse) {
              sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
            }
          } else {
            console.log('CSV generator executed successfully');
            if (sendResponse) {
              sendResponse({ status: 'success', message: 'CSV generation initiated' });
            }
          }
          
          // Close the temporary tab
          chrome.tabs.remove(tab.id);
        });
      });
      
      return true; // Keep the message channel open for the async response
    }

    // Return true for other message types to keep the message channel open
    return true;
  });
}
