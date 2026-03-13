// saveOrderHtml.js - Utility for processing order HTML

// Function to clean HTML by removing script tags
function cleanHtml(html) {
  if (!html) return '';
  // Remove script tags and their content
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

// Function to process order HTML
async function saveOrderHtml(html, orderInfo) {
  try {
    if (!html) {
      console.error('No HTML content provided to saveOrderHtml');
      return { 
        success: false, 
        error: 'No HTML content provided',
        orderNumber: orderInfo?.orderNumber || 'unknown',
        timestamp: new Date().toISOString()
      };
    }

    // Clean the HTML by removing script tags
    const cleanedHtml = cleanHtml(html);
    
    // Log basic info about the HTML
    console.log(`[saveOrderHtml] Processing HTML for order ${orderInfo?.orderNumber || 'unknown'}`);
    console.log(`[saveOrderHtml] Original HTML length: ${html.length} characters`);
    console.log(`[saveOrderHtml] Cleaned HTML length: ${cleanedHtml.length} characters`);
    
    // Return the cleaned HTML in the response
    const result = { 
      success: true, 
      htmlSaved: true,
      orderNumber: orderInfo?.orderNumber || 'unknown',
      timestamp: new Date().toISOString(),
      url: orderInfo?.url || window.location.href,
      html: cleanedHtml.substring(0, 10000) // Limit size to avoid serialization issues
    };
    
    console.log('[saveOrderHtml] Successfully processed HTML');
    return result;
  } catch (error) {
    console.error('Error processing order HTML:', error);
    return { success: false, error: error.message };
  }
}

// Function to extract order data from HTML content
function extractOrderData(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Extract order details
  const orderNumber = doc.querySelector('[data-test="order-number"]')?.textContent.trim() || 'N/A';
  const orderDate = doc.querySelector('[data-test="order-date"]')?.textContent.trim() || 'N/A';
  const totalAmount = doc.querySelector('[data-test="order-total-amount"]')?.textContent.trim() || 'N/A';
  
  // Extract order items
  const items = [];
  const itemElements = doc.querySelectorAll('[data-test*="order-item-"]');
  
  itemElements.forEach(item => {
    const name = item.querySelector('[data-test*="product-title"]')?.textContent.trim() || 'Unknown Product';
    const quantity = item.querySelector('[data-test*="quantity"]')?.textContent.trim() || '1';
    const price = item.querySelector('[data-test*="price"]')?.textContent.trim() || '0';
    
    items.push({
      orderNumber,
      orderDate,
      totalAmount,
      itemName: name,
      quantity,
      price,
      total: (parseFloat(price.replace(/[^0-9.-]+/g, '')) * parseInt(quantity)).toFixed(2)
    });
  });
  
  return items;
}

// Function to generate CSV from order data
function generateCSV(ordersData) {
  if (!ordersData || ordersData.length === 0) return '';
  
  // Get headers from the first order item
  const headers = Object.keys(ordersData[0]);
  
  // Create CSV header row
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  ordersData.forEach(order => {
    const row = headers.map(header => {
      // Escape quotes and wrap in quotes to handle commas in data
      const value = String(order[header] || '').replace(/"/g, '""');
      return `"${value}"`;
    });
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
}

// Function to process all orders and generate CSV
async function processAllOrdersToCSV() {
  console.log('%c=== CSV Generation ===', 'background: #222; color: #bada55; font-size: 14px; padding: 5px;');
  console.log('To generate CSV, call extractOrderData(html) with your HTML content');
  return '';
}

// These functions are kept for compatibility but don't use storage
async function getSavedOrders() {
  console.log('Storage functionality has been removed');
  return { success: true, count: 0, orders: [] };
}

async function clearSavedOrders() {
  console.log('Storage functionality has been removed');
  return { success: true, cleared: 0 };
}

// Function to extract order data from HTML content
function extractOrderData(html) {
  const parser = new DOMParser();
  
  // Extract order details
  const orderNumber = doc.querySelector('[data-test="order-number"]')?.textContent.trim() || 'N/A';
  const orderDate = doc.querySelector('[data-test="order-date"]')?.textContent.trim() || 'N/A';
  const totalAmount = doc.querySelector('[data-test="order-total-amount"]')?.textContent.trim() || 'N/A';
  
  // Extract order items
  const items = [];
  const itemElements = doc.querySelectorAll('[data-test*="order-item-"]');
  
  itemElements.forEach(item => {
    const name = item.querySelector('[data-test*="product-title"]')?.textContent.trim() || 'Unknown Product';
    const quantity = item.querySelector('[data-test*="quantity"]')?.textContent.trim() || '1';
    const price = item.querySelector('[data-test*="price"]')?.textContent.trim() || '0';
    
    items.push({
      orderNumber,
      orderDate,
      totalAmount,
      itemName: name,
      quantity,
      price,
      total: (parseFloat(price.replace(/[^0-9.-]+/g, '')) * parseInt(quantity)).toFixed(2)
    });
  });
  
  return items;
}

// Function to generate CSV from order data
function generateCSV(ordersData) {
  if (!ordersData || ordersData.length === 0) return '';
  
  // Get headers from the first order item
  const headers = Object.keys(ordersData[0]);
  
  // Create CSV header row
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  ordersData.forEach(order => {
    const row = headers.map(header => {
      // Escape quotes and wrap in quotes to handle commas in data
      const value = String(order[header] || '').replace(/"/g, '""');
      return `"${value}"`;
    });
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
}

// Function to process all orders and generate CSV
async function processAllOrdersToCSV() {
  try {
    // Since we're not saving to storage anymore, this function needs to be called
    // with the HTML content directly. You can call extractOrderData() directly with your HTML.
    console.log('%c=== CSV Generation ===', 'background: #222; color: #bada55; font-size: 14px; padding: 5px;');
    console.log('To generate CSV, call extractOrderData(html) with your HTML content');
    return '';
  } catch (error) {
    console.error('Error processing orders to CSV:', error);
    throw error;
  }
}

// Export functions
window.HtmlSaver = {
  saveOrderHtml,
  getSavedOrders,
  clearSavedOrders,
  processAllOrdersToCSV
};
