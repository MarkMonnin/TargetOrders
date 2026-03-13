// htmlSaver.js - Utility for saving order HTML content

// Function to save HTML content to chrome.storage.local
async function saveOrderHtml(htmlContent, orderInfo = {}) {
  try {
    const timestamp = new Date().toISOString();
    const orderId = orderInfo.orderNumber || `order_${Date.now()}`;
    const storageKey = `order_${orderId}_${timestamp}`.replace(/[^\w-]/g, '_');
    
    const orderData = {
      id: storageKey,
      orderNumber: orderInfo.orderNumber || 'unknown',
      url: orderInfo.url || window.location.href,
      timestamp: timestamp,
      title: orderInfo.title || document.title,
      html: htmlContent,
      orderInfo: orderInfo
    };
    
    // Save the order data
    await chrome.storage.local.set({ [storageKey]: orderData });
    
    // Update the list of saved orders
    const { savedOrders = [] } = await chrome.storage.local.get('savedOrders');
    const updatedOrders = [...savedOrders, storageKey];
    await chrome.storage.local.set({ savedOrders: updatedOrders });
    
    console.log(`Saved order HTML with key: ${storageKey}`);
    return { success: true, storageKey, orderData };
    
  } catch (error) {
    console.error('Error saving order HTML:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Function to get all saved orders
async function getSavedOrders() {
  try {
    const { savedOrders = [] } = await chrome.storage.local.get('savedOrders');
    const orders = await chrome.storage.local.get(savedOrders);
    return {
      success: true,
      count: savedOrders.length,
      orders: savedOrders.map(key => ({
        key,
        ...(orders[key] || {})
      })).filter(Boolean)
    };
  } catch (error) {
    console.error('Error getting saved orders:', error);
    return { success: false, error: error.message };
  }
}

// Function to clear all saved orders
async function clearSavedOrders() {
  try {
    const { savedOrders = [] } = await chrome.storage.local.get('savedOrders');
    await chrome.storage.local.remove([...savedOrders, 'savedOrders']);
    return { success: true, cleared: savedOrders.length };
  } catch (error) {
    console.error('Error clearing saved orders:', error);
    return { success: false, error: error.message };
  }
}

// Export functions for use in other files
window.HtmlSaver = {
  saveOrderHtml,
  getSavedOrders,
  clearSavedOrders
};
