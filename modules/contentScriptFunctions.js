// Content script functions module
// All functions that need to be executed in the content script context

export function getContentScriptFunction() {
  // Return a function that contains all the content script logic
  return function(orderNumber, htmlContent) {
    // All functions need to be defined in this scope for content script execution
    
    // Function to click the receipt button
    function clickReceiptButton() {
      console.log('[Receipt Button] Looking for receipt button to click...');
      
      // First try to find the store receipt button (in-store purchases)
      const storeReceiptSelectors = [
        'div:has-text("View and save your store receipt")',
        'div:has-text("View your receipt")',
        'span:has-text("View and save your store receipt")',
        'span:has-text("View your receipt")',
        'a:has-text("View and save your store receipt")',
        'a:has-text("View your receipt")',
        'button:has-text("View and save your store receipt")',
        'button:has-text("View your receipt")'
      ];

      // Try store receipt button first
      for (const selector of storeReceiptSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            console.log('[Receipt Button] Found store receipt element:', selector, element);
            element.click();
            console.log('[Receipt Button] Successfully clicked store receipt button');
            
            // Wait for receipt modal to load, then extract receipt data
            setTimeout(() => {
              extractStoreReceiptData();
            }, 2000);
            
            return true;
          }
        } catch (e) {
          console.debug('[Receipt Button] Store receipt selector failed:', selector, e);
        }
      }

      // Fallback: look by text content for store receipt
      const allElements = document.querySelectorAll('div, span, a, button');
      for (const element of allElements) {
        const text = element.textContent?.trim() || '';
        if (text.includes('View and save your store receipt') || text.includes('View your receipt')) {
          console.log('[Receipt Button] Found store receipt element by text:', text, element);
          element.click();
          console.log('[Receipt Button] Successfully clicked store receipt button by text');
          
          // Wait for receipt modal to load, then extract receipt data
          setTimeout(() => {
            extractStoreReceiptData();
          }, 2000);
          
          return true;
        }
      }

      // If no store receipt button found, try invoice button (online purchases)
      console.log('[Receipt Button] No store receipt button found, looking for invoice button...');
      const invoiceSelectors = [
        'div:has-text("View invoice")',
        'span:has-text("View invoice")',
        'a:has-text("View invoice")',
        'button:has-text("View invoice")'
      ];

      for (const selector of invoiceSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            console.log('[Receipt Button] Found invoice element:', selector, element);
            element.click();
            console.log('[Receipt Button] Successfully clicked invoice button');
            
            // Wait for invoice page to load, then extract invoice data
            setTimeout(() => {
              extractInvoiceData();
            }, 3000);
            
            return true;
          }
        } catch (e) {
          console.debug('[Receipt Button] Invoice selector failed:', selector, e);
        }
      }

      // Fallback: look by text content for invoice
      for (const element of allElements) {
        const text = element.textContent?.trim() || '';
        if (text.includes('View invoice')) {
          console.log('[Receipt Button] Found invoice element by text:', text, element);
          element.click();
          console.log('[Receipt Button] Successfully clicked invoice button by text');
          
          // Wait for invoice page to load, then extract invoice data
          setTimeout(() => {
            extractInvoiceData();
          }, 3000);
          
          return true;
        }
      }

      console.log('[Receipt Button] No receipt or invoice button found');
      return false;
    }

    // Function to extract data from the store receipt modal
    function extractStoreReceiptData() {
      console.log('[Store Receipt Data] Looking for store receipt modal to extract data...');
      
      // Look for the receipt container
      const receiptContainer = document.querySelector('[data-test="store-pos-order-receipt-container"]');
      if (!receiptContainer) {
        console.log('[Store Receipt Data] No receipt container found, retrying...');
        setTimeout(() => extractStoreReceiptData(), 1000);
        return;
      }
      
      console.log('[Store Receipt Data] Found receipt container, extracting data...');
      
      // Extract date
      const dateElement = receiptContainer.querySelector('.date');
      const receiptDate = dateElement ? dateElement.textContent?.trim() : '';
      
      // Extract items from the receipt tables
      const receiptItems = [];
      const tables = receiptContainer.querySelectorAll('table tbody');
      
      tables.forEach(tbody => {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 4) {
            const itemCode = cells[0].textContent?.trim() || '';
            const itemName = cells[1].textContent?.trim() || '';
            const taxCode = cells[2].textContent?.trim() || '';
            const priceText = cells[3].textContent?.trim() || '';
            
            // Skip if this looks like a summary row or empty
            if (itemCode && itemName && priceText && !itemName.includes('@') && !itemName.includes('SUBTOTAL')) {
              const price = parseFloat(priceText.replace('$', '').replace(',', ''));
              if (!isNaN(price) && price > 0) {
                receiptItems.push({
                  name: itemName,
                  quantity: 1,
                  unitPrice: price.toFixed(2),
                  totalPrice: price.toFixed(2),
                  status: 'Purchased',
                  orderNumber: 'STORE_RECEIPT',
                  url: window.location.href,
                  date: receiptDate,
                  taxCode: taxCode,
                  itemCode: itemCode
                });
              }
            }
          }
        });
      });
      
      // Extract tax information
      let taxRate = 0;
      let taxAmount = 0;
      const receiptText = receiptContainer.textContent || '';
      
      // Look for tax information like "T = OH TAX 7.80000 on $70.83"
      const taxMatch = receiptText.match(/T\s*=\s*\w+\s+TAX\s+([\d.]+)\s+on\s+\$([\d.,]+)/);
      if (taxMatch) {
        taxRate = parseFloat(taxMatch[1]);
        const taxableAmount = parseFloat(taxMatch[2].replace(',', ''));
        taxAmount = taxableAmount * (taxRate / 100);
      }
      
      // Apply tax to items with T+ code
      receiptItems.forEach(item => {
        if (item.taxCode && item.taxCode.includes('T')) {
          const basePrice = parseFloat(item.unitPrice);
          const itemTax = basePrice * (taxRate / 100);
          const totalPrice = basePrice + itemTax;
          item.unitPrice = basePrice.toFixed(2);
          item.totalPrice = totalPrice.toFixed(2);
          item.taxAmount = itemTax.toFixed(2);
        }
      });
      
      console.log(`[Store Receipt Data] Extracted ${receiptItems.length} items from store receipt`);
      
      // Send receipt data back to background script
      if (receiptItems.length > 0) {
        chrome.runtime.sendMessage({
          type: 'RECEIPT_DATA_EXTRACTED',
          data: {
            success: true,
            items: receiptItems,
            date: receiptDate,
            taxRate: taxRate,
            taxAmount: taxAmount.toFixed(2),
            orderNumber: 'STORE_RECEIPT',
            url: window.location.href,
            timestamp: new Date().toISOString(),
            receiptType: 'STORE'
          }
        });
      } else {
        console.log('[Store Receipt Data] No items found in store receipt');
      }
    }

    // Function to extract data from the invoice page (online purchases)
    function extractInvoiceData() {
      console.log('[Invoice Data] Looking for invoice page to extract data...');
      
      // Check if we're on an invoice page
      if (!window.location.href.includes('/invoices/')) {
        console.log('[Invoice Data] Not on invoice page, waiting...');
        setTimeout(() => extractInvoiceData(), 1000);
        return;
      }
      
      console.log('[Invoice Data] Found invoice page, extracting data...');
      
      // Extract invoice date
      let invoiceDate = '';
      const dateElement = document.querySelector('div[data-test="invoice-meta"]');
      if (dateElement) {
        const dateText = dateElement.textContent || '';
        const dateMatch = dateText.match(/Invoice date.*?:\s*([^,\n]+)/);
        if (dateMatch) {
          invoiceDate = dateMatch[1].trim();
        }
      }
      
      // Extract items from invoice details cards
      const invoiceItems = [];
      const detailCards = document.querySelectorAll('[data-test="invoice-details-card"]');
      
      detailCards.forEach(card => {
        try {
          // Extract item name
          const itemElement = card.querySelector('p.h-padding-v-tiny');
          const itemName = itemElement ? itemElement.textContent?.trim() : '';
          
          // Extract quantity
          const qtyElement = card.querySelector('[data-test="item-quantity"] b');
          const quantityText = qtyElement ? qtyElement.textContent?.trim() : '';
          const quantity = parseInt(quantityText) || 1;
          
          // Extract unit price
          const unitPriceElements = card.querySelectorAll('div[class*="innerDiv"]');
          const unitPriceElement = unitPriceElements[1]; // Second inner div should be unit price
          const unitPriceText = unitPriceElement ? unitPriceElement.textContent?.trim() : '';
          const unitPriceMatch = unitPriceText.match(/\$(\d+\.?\d*)/);
          const unitPrice = unitPriceMatch ? parseFloat(unitPriceMatch[1]) : 0;
          
          // Extract item total
          const totalElements = card.querySelectorAll('div[class*="detailsRow"]');
          let itemTotal = 0;
          
          for (const element of totalElements) {
            const text = element.textContent || '';
            if (text.includes('Item total')) {
              const totalMatch = text.match(/\$(\d+\.?\d*)/);
              if (totalMatch) {
                itemTotal = parseFloat(totalMatch[1]);
                break;
              }
            }
          }
          
          // Only add if we have valid item data
          if (itemName && (unitPrice > 0 || itemTotal > 0)) {
            const finalUnitPrice = unitPrice > 0 ? unitPrice : (itemTotal / quantity);
            const finalTotalPrice = itemTotal > 0 ? itemTotal : (finalUnitPrice * quantity);
            
            invoiceItems.push({
              name: itemName,
              quantity: quantity,
              unitPrice: finalUnitPrice.toFixed(2),
              totalPrice: finalTotalPrice.toFixed(2),
              status: 'Purchased',
              orderNumber: 'INVOICE',
              url: window.location.href,
              date: invoiceDate,
              taxCode: 'N/A', // Invoice doesn't use tax codes
              itemCode: 'N/A'
            });
          }
        } catch (e) {
          console.debug('[Invoice Data] Error extracting from card:', e);
        }
      });
      
      console.log(`[Invoice Data] Extracted ${invoiceItems.length} items from invoice`);
      
      // Send invoice data back to background script
      if (invoiceItems.length > 0) {
        chrome.runtime.sendMessage({
          type: 'RECEIPT_DATA_EXTRACTED',
          data: {
            success: true,
            items: invoiceItems,
            date: invoiceDate,
            taxRate: 0, // Tax is already included in invoice totals
            taxAmount: '0.00',
            orderNumber: 'INVOICE',
            url: window.location.href,
            timestamp: new Date().toISOString(),
            receiptType: 'INVOICE'
          }
        });
      } else {
        console.log('[Invoice Data] No items found in invoice');
      }
    }

    // Helper functions for Target-specific extraction
    function extractTargetItemName(element) {
      const selectors = [
        'h3[id*="item-"]',
        'h3',
        '[data-test*="item-title"]',
        'div[class*="title"] h3',
        'div[class*="name"]',
        'a[class*="title"]'
      ];

      for (const selector of selectors) {
        const nameElement = element.querySelector(selector);
        if (nameElement) {
          const text = nameElement.textContent?.trim() || '';
          // Filter out promotional text and status indicators
          if (text && !text.includes('Free') && !text.includes('Save') && !text.includes('Deal') && 
              !text.includes('Offer') && !text.includes('Add') && !text.includes('Pickup') &&
              !text.includes('Delivery') && !text.includes('Shipping') && text.length > 3) {
            return text;
          }
        }
      }

      // Fallback: look for any text element that might be a product name
      const allTextElements = element.querySelectorAll('div, span, p, a');
      for (const textElement of allTextElements) {
        const text = textElement.textContent?.trim() || '';
        // Look for product-like patterns (numbers, measurements, brand names)
        if (text && text.length > 5 && !text.includes('$') && !text.includes('Qty') && 
            !text.includes('FREE') && !text.includes('Save') && !text.includes('Add to cart') &&
            (/\d/.test(text) || /ct|pk|oz|lb|fl oz|ml|g|kg/.test(text) || 
             text.includes('Target') || text.includes('Good & Gather'))) {
          return text;
        }
      }

      return '';
    }

    function extractTargetQuantity(element) {
      const selectors = [
        '[data-test*="quantity"]',
        '[data-test*="qty"]',
        '.quantity',
        '.qty',
        'div:has-text("Qty")',
        'span:has-text("Qty")',
        'div:has-text("Quantity")',
        'span:has-text("Quantity")'
      ];

      for (const selector of selectors) {
        const qtyElement = element.querySelector(selector);
        if (qtyElement) {
          const text = qtyElement.textContent?.trim() || '';
          const qtyMatch = text.match(/(\d+)/);
          if (qtyMatch) {
            const qty = parseInt(qtyMatch[1]);
            if (qty > 0 && qty < 100) return qty;
          }
        }
      }

      // Fallback: look for standalone numbers that might be quantities
      const allText = element.textContent || '';
      const lines = allText.split('\n').map(line => line.trim());
      for (const line of lines) {
        if (/^\d+$/.test(line)) {
          const qty = parseInt(line);
          if (qty > 0 && qty < 100) return qty;
        }
      }

      return 1;
    }

    function extractTargetUnitPrice(element) {
      const selectors = [
        '[data-test*="price"]',
        '[data-test*="unit-price"]',
        '.price',
        '.unit-price',
        'div:has-text("$")',
        'span:has-text("$")'
      ];

      for (const selector of selectors) {
        const priceElement = element.querySelector(selector);
        if (priceElement) {
          const text = priceElement.textContent?.trim() || '';
          const priceMatch = text.match(/\$(\d+\.?\d*)/);
          if (priceMatch) {
            const price = parseFloat(priceMatch[1]);
            if (price > 0 && price < 1000) return price.toFixed(2);
          }
        }
      }

      // Fallback: look for dollar amounts in the element
      const allText = element.textContent || '';
      const priceMatches = allText.match(/\$(\d+\.?\d*)/g);
      if (priceMatches) {
        for (const match of priceMatches) {
          const price = parseFloat(match.replace('$', ''));
          if (price > 0 && price < 1000) {
            // Filter out gift card amounts which are usually round numbers
            if (price < 50 || !Number.isInteger(price)) {
              return price.toFixed(2);
            }
          }
        }
      }

      return '0.00';
    }

    // Function to extract order details from the HTML content
    function extractOrderDetailsFromPage(orderNumber, htmlContent) {
      console.log('[Content Script] extractOrderDetailsFromPage started');
      console.log('[Content Script] Starting order details extraction from:', window.location.href);
      
      const orderInfo = {
        orderNumber: orderNumber,
        orderDate: '',
        orderStatus: '',
        items: []
      };
      
      console.log('[Content Script] Extracting order information...');
      
      try {
        // Extract order date
        const dateMatch = htmlContent.match(/Placed at\s+(.+?)(?:\n|$)/) || 
                       htmlContent.match(/Order placed:\s+(.+?)(?:\n|$)/) ||
                       htmlContent.match(/(\w+ \d{1,2}, \d{4})/);
        if (dateMatch) {
          orderInfo.orderDate = dateMatch[1].trim();
        }
        
        // Extract order status
        const statusMatch = htmlContent.match(/Status:\s+(.+?)(?:\n|$)/) || 
                          htmlContent.match(/Order status:\s+(.+?)(?:\n|$)/);
        if (statusMatch) {
          orderInfo.orderStatus = statusMatch[1].trim();
        }
        
        console.log('[Content Script] Order info:', orderInfo);
        
        console.log('[Content Script] Saving page HTML...');
        
        // Save the HTML content to storage
        const saveResult = {
          success: true,
          orderNumber: orderNumber,
          htmlContent: htmlContent,
          timestamp: new Date().toISOString()
        };
        
        console.log('[Content Script] Save result:', saveResult);
        
        console.log('[Content Script] Extracting order items from HTML...');
        const orderItems = [];

        try {
          // Create a temporary DOM element to parse the HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');

          // Look for order item elements in the parsed HTML
          const itemSelectors = [
            // Most stable Target selectors (data attributes and utility classes)
            '[data-test="package-card-item-row"]', // Data attribute selectors are stable
            'div[class*="display-flex"][class*="padding-h-default"]', // Item containers with flex and padding
            'div[class*="padding-l-tight"]', // Items with tight left padding
            'div[class*="pictureWrapper"]', // Image wrapper containers
            '[data-test*="item"]' // Any element with "item" in data-test attribute
          ];

          // Collect all potential item containers first
          const allItemContainers = new Set();
          
          itemSelectors.forEach(selector => {
            try {
              const elements = doc.querySelectorAll(selector);
              console.log(`[Content Script] Found ${elements.length} elements with selector: ${selector}`);
              
              elements.forEach(element => {
                // Get unique containers by finding parent containers
                let container = element;
                let attempts = 0;
                while (container && attempts < 5) {
                  const text = container.textContent?.trim() || '';
                  if (text.length > 50 && text.includes('$') && (text.includes('Qty') || /\d+\.\d{2}/.test(text))) {
                    allItemContainers.add(container);
                    break;
                  }
                  container = container.parentElement;
                  attempts++;
                }
              });
            } catch (e) {
              console.debug(`[Content Script] Selector ${selector} failed:`, e);
            }
          });

          console.log(`[Content Script] Found ${allItemContainers.size} potential item containers`);

          // Process each unique container
          let processedCount = 0;
          allItemContainers.forEach((container, index) => {
            try {
              // Try to extract item information using Target-specific patterns
              const itemName = extractTargetItemName(container);
              const quantity = extractTargetQuantity(container);
              const unitPrice = extractTargetUnitPrice(container);

              if (itemName && (quantity || unitPrice)) {
                // Calculate total price
                const qty = quantity || 1;
                const price = parseFloat(unitPrice) || 0;
                const totalPrice = (qty * price).toFixed(2);

                orderItems.push({
                  name: itemName,
                  quantity: qty,
                  unitPrice: unitPrice || '0.00',
                  totalPrice: totalPrice,
                  status: orderInfo.orderStatus || 'Purchased',
                  orderNumber: orderNumber,
                  url: window.location.href,
                  date: orderInfo.orderDate || new Date().toISOString().split('T')[0]
                });
                
                console.log(`[Content Script] Extracted item ${index + 1}:`, itemName, `Qty: ${qty}`, `Price: $${unitPrice}`);
                processedCount++;
              }
            } catch (e) {
              console.debug(`[Content Script] Error extracting from container ${index}:`, e);
            }
          });

          console.log(`[Content Script] Extracted ${processedCount} order items`);
        } catch (e) {
          console.error('[Content Script] Error extracting items:', e);
        }

        orderInfo.items = orderItems;
        console.log('[Content Script] Final extracted items:', orderItems.length);
        
        const result = {
          success: true,
          orderInfo: orderInfo,
          items: orderItems,
          htmlSaved: true
        };
        
        console.log('[Content Script] Returning result:', result);
        return result;
        
      } catch (error) {
        console.error('[Content Script] Error in extractOrderDetailsFromPage:', error);
        return {
          success: false,
          error: error.message,
          orderNumber: orderNumber,
          items: []
        };
      } finally {
        console.log('[Content Script] extractOrderDetailsFromPage completed');
      }
    }

    // Function to show CSV preview in the order tab
    function showCsvPreview(orderResult) {
      console.log('[Order Tab] Showing CSV preview for order:', orderResult.orderNumber);

      // Create a modal overlay
      const modal = document.createElement('div');
      modal.id = 'csv-preview-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 20px;
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      `;

      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #dc2626;
        padding-bottom: 10px;
      `;

      const title = document.createElement('h2');
      title.textContent = `📋 Order #${orderResult.orderNumber} - CSV Preview`;
      title.style.cssText = `
        margin: 0;
        color: #dc2626;
        font-size: 18px;
      `;

      const closeButton = document.createElement('button');
      closeButton.textContent = '✕';
      closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeButton.onclick = () => modal.remove();

      header.appendChild(title);
      header.appendChild(closeButton);

      // CSV content
      const csvSection = document.createElement('div');
      csvSection.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #333;">CSV Content:</h3>
        <textarea id="csvContent" readonly style="
          width: 100%;
          height: 400px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 10px;
          background: #f9f9f9;
        "></textarea>
      `;

      modalContent.appendChild(header);
      modalContent.appendChild(csvSection);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Generate CSV content from order items
      if (orderResult.items && orderResult.items.length > 0) {
        const headers = [
          'Date',
          'Order Type',
          'Order Number',
          'Item Name',
          'Quantity',
          'Unit Price',
          'Total Price',
          'Status',
          'Notes'
        ];

        const rows = orderResult.items.map(item => [
          `"${item.date || ''}"`,
          `"${item.type || ''}"`,
          `"${item.orderNumber || ''}"`,
          `"${(item.name || '').replace(/"/g, '""')}"`,
          `"${item.quantity || 1}"`,
          `"${item.unitPrice || '0.00'}"`,
          `"${item.totalPrice || '0.00'}"`,
          `"${item.status || 'Purchased'}"`,
          `""`
        ]);

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        document.getElementById('csvContent').value = csvContent;
      } else {
        document.getElementById('csvContent').value = 'No items found in this order.';
      }

      console.log('[Order Tab] CSV preview modal displayed');
    }

    // Main execution
    console.log('[Content Script] Starting extraction for order:', orderNumber);
    const result = extractOrderDetailsFromPage(orderNumber, htmlContent);
    
    if (result.success && result.items && result.items.length > 0) {
      console.log('[Content Script] Extraction successful, showing CSV preview');
      showCsvPreview(result);
      
      // After showing CSV preview, try to click receipt button
      console.log('[Content Script] CSV preview shown, now looking for receipt button...');
      setTimeout(() => {
        clickReceiptButton();
      }, 1000);
    } else {
      console.log('[Content Script] Extraction failed or no items found');
    }
    
    return result;
  };
}
