// Receipt modal module
// Handles displaying receipt CSV preview modals

export function showReceiptCsvPreview(receiptResult) {
  console.log('[Invoice Tab] Showing receipt CSV preview for:', receiptResult.orderNumber);

  // Create a modal overlay
  const modal = document.createElement('div');
  modal.id = 'receipt-csv-preview-modal';
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
    border-bottom: 2px solid ${receiptResult.receiptType === 'STORE' ? '#dc2626' : '#4CAF50'};
    padding-bottom: 10px;
  `;

  const title = document.createElement('h2');
  title.textContent = `${receiptResult.receiptType === 'STORE' ? '🧾' : '🧾'} ${receiptResult.receiptType === 'STORE' ? 'Store Receipt' : 'Invoice'} #${receiptResult.orderNumber} - CSV Preview`;
  title.style.cssText = `
    margin: 0;
    color: ${receiptResult.receiptType === 'STORE' ? '#dc2626' : '#4CAF50'};
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

  // Info section
  const infoSection = document.createElement('div');
  infoSection.style.cssText = `
    background-color: ${receiptResult.receiptType === 'STORE' ? '#fef2f2' : '#f0f9ff'};
    border: 1px solid ${receiptResult.receiptType === 'STORE' ? '#fecaca' : '#bae6fd'};
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 15px;
    font-size: 13px;
  `;
  
  const infoText = receiptResult.receiptType === 'STORE' 
    ? `📍 Store Receipt Date: ${receiptResult.date || 'N/A'} | 🧾 Tax Rate: ${receiptResult.taxRate || 0}% | 💰 Tax Amount: $${receiptResult.taxAmount || '0.00'}`
    : `📍 Invoice Date: ${receiptResult.date || 'N/A'} | 💰 Total: $${receiptResult.items?.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0).toFixed(2)} | Tax Included`;
  
  infoSection.innerHTML = `<strong>${receiptResult.receiptType === 'STORE' ? 'Store Receipt' : 'Online Invoice'} Details:</strong><br>${infoText}`;

  // CSV content
  const csvSection = document.createElement('div');
  csvSection.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #333;">CSV Content:</h3>
    <textarea id="receiptCsvContent" readonly style="
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
  modalContent.appendChild(infoSection);
  modalContent.appendChild(csvSection);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Generate CSV content from receipt items
  if (receiptResult.items && receiptResult.items.length > 0) {
    const headers = [
      'Date',
      'Type',
      'Order Number',
      'Item Name',
      'Quantity',
      'Unit Price',
      'Total Price',
      'Tax Code',
      'Tax Amount',
      'Status'
    ];

    const rows = receiptResult.items.map(item => [
      `"${item.date || ''}"`,
      `"${receiptResult.receiptType || ''}"`,
      `"${item.orderNumber || ''}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.quantity || 1}"`,
      `"${item.unitPrice || '0.00'}"`,
      `"${item.totalPrice || '0.00'}"`,
      `"${item.taxCode || 'N/A'}"`,
      `"${item.taxAmount || '0.00'}"`,
      `"${item.status || 'Purchased'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    document.getElementById('receiptCsvContent').value = csvContent;
  } else {
    document.getElementById('receiptCsvContent').value = 'No items found in this receipt.';
  }

  console.log(`[${receiptResult.receiptType}] CSV preview modal displayed`);
}
