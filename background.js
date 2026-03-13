// Background script - Main entry point
// Handles tab operations and order HTML saving

import { setupMessageHandlers } from './modules/messageHandlers.js';
import { processOrderPage } from './modules/orderProcessor.js';

console.log('Background script loaded');

// Set up message handlers
setupMessageHandlers();

// Listen for receipt data messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RECEIPT_DATA_EXTRACTED') {
    console.log('🧾 Receipt data received:', message.data);
    
    if (message.data && message.data.success) {
      // Create a new CSV preview with receipt data
      chrome.scripting.executeScript({
        target: { tabId: sender.tab?.id },
        func: showReceiptCsvPreview,
        args: [message.data]
      }).catch(error => {
        console.error('❌ Error showing receipt CSV preview:', error);
      });
    }
    
    sendResponse({ success: true });
  }
});

// Function to show CSV preview for receipt data (executed in content script)
function showReceiptCsvPreview(receiptData) {
  console.log('[Receipt CSV Preview] Showing preview for receipt data:', receiptData);
  
  if (!receiptData || !receiptData.items || receiptData.items.length === 0) {
    console.log('[Receipt CSV Preview] No items to display');
    return;
  }

  // Create CSV content
  const headers = ['Order Number', 'Item Name', 'Quantity', 'Unit Price', 'Total Price', 'Timestamp'];
  const csvRows = [headers.join(',')];
  
  receiptData.items.forEach(item => {
    const row = [
      receiptData.orderNumber || 'Unknown',
      `"${item.name || ''}"`,
      item.quantity || 1,
      item.unitPrice || '0.00',
      item.totalPrice || '0.00',
      receiptData.timestamp || new Date().toISOString()
    ];
    csvRows.push(row.join(','));
  });
  
  const csvContent = csvRows.join('\n');
  
  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: Arial, sans-serif;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 80%;
    max-height: 80%;
    overflow-y: auto;
    position: relative;
  `;
  
  // Create title
  const title = document.createElement('h2');
  title.textContent = `Receipt CSV Preview - Order ${receiptData.orderNumber || 'Unknown'}`;
  title.style.cssText = `
    margin-top: 0;
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
  `;
  
  // Create CSV display area
  const csvDisplay = document.createElement('textarea');
  csvDisplay.value = csvContent;
  csvDisplay.style.cssText = `
    width: 100%;
    height: 300px;
    font-family: monospace;
    font-size: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    margin: 10px 0;
    resize: vertical;
  `;
  
  // Create copy button
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy to Clipboard';
  copyButton.style.cssText = `
    background-color: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 10px;
    font-size: 14px;
  `;
  
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(csvContent).then(() => {
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy to Clipboard';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    });
  });
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 10px;
    font-size: 14px;
  `;
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    text-align: center;
    margin-top: 20px;
  `;
  buttonContainer.appendChild(copyButton);
  buttonContainer.appendChild(closeButton);
  
  // Assemble modal
  modalContent.appendChild(title);
  modalContent.appendChild(csvDisplay);
  modalContent.appendChild(buttonContainer);
  modal.appendChild(modalContent);
  
  // Add to page
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}
