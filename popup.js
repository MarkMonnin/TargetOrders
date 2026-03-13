document.addEventListener('DOMContentLoaded', function() {
    // Log when popup is loaded
    console.log('Popup loaded');

    // Check if we were opened automatically due to orders being detected
    console.log('🔍 Checking for detected orders...');

    // Get DOM elements
    const resultsDiv = document.getElementById('results');
    const filterButton = document.getElementById('filterButton');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    // Get testing elements
    const testCurrentPageBtn = document.getElementById('testCurrentPage');
    const testOrderUrlBtn = document.getElementById('testOrderUrl');
    const testReceiptBtn = document.getElementById('testReceiptExtraction');
    const testInvoiceBtn = document.getElementById('testInvoiceExtraction');
    const testOrderUrlInput = document.getElementById('testOrderUrlInput');
    const testResultsDiv = document.getElementById('testResults');
    const testResultsContent = document.getElementById('testResultsContent');

    if (!resultsDiv || !filterButton || !startDateInput || !endDateInput) {
        console.error('Required DOM elements not found');
        if (resultsDiv) {
            resultsDiv.innerHTML = '<p class="error">Error: Some required elements could not be found. Please try refreshing the page.</p>';
        }
        return;
    }

    let isProcessing = false;

    // Set default dates (last 30 days)
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    startDateInput.valueAsDate = oneMonthAgo;
    endDateInput.valueAsDate = today;

    // Clear any previous results
    resultsDiv.innerHTML = '<p>🔍 Checking for orders...</p>';

    // Testing functionality
    function showTestResults(message, isError = false) {
        testResultsDiv.style.display = 'block';
        testResultsContent.innerHTML = `<span style="color: ${isError ? '#d32f2f' : '#4CAF50'}">${message}</span>`;
        console.log('Test Result:', message);
    }

    function clearTestResults() {
        testResultsDiv.style.display = 'none';
        testResultsContent.innerHTML = '';
    }

    // Test Current Page button
    if (testCurrentPageBtn) {
        testCurrentPageBtn.addEventListener('click', () => {
            if (isProcessing) {
                showTestResults('❌ Please wait for current operation to complete', true);
                return;
            }
            
            showTestResults('🔄 Processing current page...');
            clearTestResults();
            
            chrome.runtime.sendMessage({ action: 'processCurrentPage' }, (response) => {
                if (chrome.runtime.lastError) {
                    showTestResults(`❌ Error: ${chrome.runtime.lastError.message}`, true);
                    return;
                }
                
                if (response && response.success) {
                    showTestResults(`✅ Successfully processed ${response.items?.length || 0} items from current page`);
                    console.log('Current page processing response:', response);
                } else {
                    showTestResults(`❌ Failed: ${response?.error || 'Unknown error'}`, true);
                }
            });
        });
    }

    // Test Order URL button
    if (testOrderUrlBtn) {
        testOrderUrlBtn.addEventListener('click', () => {
            if (isProcessing) {
                showTestResults('❌ Please wait for current operation to complete', true);
                return;
            }
            
            const url = testOrderUrlInput.value.trim();
            if (!url) {
                showTestResults('❌ Please enter a Target order URL', true);
                return;
            }
            
            if (!url.includes('target.com/orders/')) {
                showTestResults('❌ Please enter a valid Target order URL', true);
                return;
            }
            
            showTestResults(`🔄 Processing order URL: ${url}`);
            
            chrome.runtime.sendMessage({ action: 'processOrderPage', url: url }, (response) => {
                if (chrome.runtime.lastError) {
                    showTestResults(`❌ Error: ${chrome.runtime.lastError.message}`, true);
                    return;
                }
                
                if (response && response.success) {
                    showTestResults(`✅ Successfully processed ${response.items?.length || 0} items from URL`);
                    console.log('Order URL processing response:', response);
                } else {
                    showTestResults(`❌ Failed: ${response?.error || 'Unknown error'}`, true);
                }
            });
        });
    }

    // Test Receipt Extraction button
    if (testReceiptBtn) {
        testReceiptBtn.addEventListener('click', () => {
            if (isProcessing) {
                showTestResults('❌ Please wait for current operation to complete', true);
                return;
            }
            
            showTestResults('🔄 Testing receipt extraction...');
            
            // Send message to content script to test receipt button click
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (chrome.runtime.lastError || !tabs[0]) {
                    showTestResults('❌ Could not access current tab', true);
                    return;
                }
                
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        // Look for receipt button and try to click it
                        const receiptSelectors = [
                            'div:has-text("View and save your store receipt")',
                            'div:has-text("View your receipt")',
                            'span:has-text("View and save your store receipt")',
                            'span:has-text("View your receipt")',
                            'a:has-text("View and save your store receipt")',
                            'a:has-text("View your receipt")',
                            'button:has-text("View and save your store receipt")',
                            'button:has-text("View your receipt")'
                        ];

                        for (const selector of receiptSelectors) {
                            try {
                                const element = document.querySelector(selector);
                                if (element) {
                                    return {
                                        found: true,
                                        selector: selector,
                                        text: element.textContent?.trim() || '',
                                        message: `Found receipt button: ${selector}`
                                    };
                                }
                            } catch (e) {
                                // Continue to next selector
                            }
                        }

                        // Fallback: look by text content
                        const allElements = document.querySelectorAll('div, span, a, button');
                        for (const element of allElements) {
                            const text = element.textContent?.trim() || '';
                            if (text.includes('View and save your store receipt') || text.includes('View your receipt')) {
                                return {
                                    found: true,
                                    text: text,
                                    message: `Found receipt button by text: ${text.substring(0, 50)}...`
                                };
                            }
                        }

                        return {
                            found: false,
                            message: 'No receipt button found on current page'
                        };
                    }
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        showTestResults(`❌ Error: ${chrome.runtime.lastError.message}`, true);
                        return;
                    }
                    
                    const result = results && results[0] && results[0].result;
                    if (result && result.found) {
                        showTestResults(`✅ ${result.message}`);
                    } else {
                        showTestResults(`❌ ${result?.message || 'Receipt button not found'}`, true);
                    }
                });
            });
        });
    }

    // Test Invoice Extraction button
    if (testInvoiceBtn) {
        testInvoiceBtn.addEventListener('click', () => {
            if (isProcessing) {
                showTestResults('❌ Please wait for current operation to complete', true);
                return;
            }
            
            showTestResults('🔄 Testing invoice extraction...');
            
            // Send message to content script to test invoice button click
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (chrome.runtime.lastError || !tabs[0]) {
                    showTestResults('❌ Could not access current tab', true);
                    return;
                }
                
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        // Look for invoice button and try to click it
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
                                    return {
                                        found: true,
                                        selector: selector,
                                        text: element.textContent?.trim() || '',
                                        message: `Found invoice button: ${selector}`
                                    };
                                }
                            } catch (e) {
                                // Continue to next selector
                            }
                        }

                        // Fallback: look by text content
                        const allElements = document.querySelectorAll('div, span, a, button');
                        for (const element of allElements) {
                            const text = element.textContent?.trim() || '';
                            if (text.includes('View invoice')) {
                                return {
                                    found: true,
                                    text: text,
                                    message: `Found invoice button by text: ${text.substring(0, 50)}...`
                                };
                            }
                        }

                        return {
                            found: false,
                            message: 'No invoice button found on current page'
                        };
                    }
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        showTestResults(`❌ Error: ${chrome.runtime.lastError.message}`, true);
                        return;
                    }
                    
                    const result = results && results[0] && results[0].result;
                    if (result && result.found) {
                        showTestResults(`✅ ${result.message}`);
                    } else {
                        showTestResults(`❌ ${result?.message || 'Invoice button not found'}`, true);
                    }
                });
            });
        });
    }

    // Query the active tab to get order information
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (chrome.runtime.lastError) {
            console.error('Error querying tabs:', chrome.runtime.lastError);
            resultsDiv.innerHTML = '<p class="error">Error accessing the current tab. Please refresh the page and try again.</p>';
            return;
        }

        const currentTab = tabs[0];
        if (!currentTab || !currentTab.id) {
            console.error('No active tab found');
            resultsDiv.innerHTML = '<p class="error">No active tab found. Please refresh the page and try again.</p>';
            return;
        }

        // Send message to content script to get current orders
        chrome.tabs.sendMessage(
            currentTab.id,
            { action: 'getOrders' },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error getting orders from content script:', chrome.runtime.lastError);
                    resultsDiv.innerHTML = '<p>Ready to extract Target orders. Select your date range and click "Extract Orders".</p>';
                    return;
                }

                if (response && response.success && response.orders) {
                    const orders = response.orders;
                    console.log(`📦 Found ${orders.length} orders in current tab`);
                    if (orders.length > 0) {
                        resultsDiv.innerHTML = `<p style="color: #4CAF50; font-weight: bold;">✓ Found ${orders.length} orders on this page!</p><p>Select your date range and click "Extract Orders" to process them.</p>`;
                    } else {
                        resultsDiv.innerHTML = '<p style="color: #ff9800; font-weight: bold;">No orders found on this page.</p><p>Make sure you\'re on your Target orders page with orders visible, then click "Extract Orders" to search again.</p>';
                    }
                } else {
                    console.log('No order data available or error in response');
                    resultsDiv.innerHTML = '<p>Ready to extract Target orders. Select your date range and click "Extract Orders".</p>';
                }
            }
        );
    });
    
    // Function to collect orders based on date range
    function collectOrders() {
        if (isProcessing) {
            console.log('Already processing orders');
            return;
        }
        
        isProcessing = true;
        resultsDiv.innerHTML = '<p>Collecting orders... Please wait.</p>';
        
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        console.log(`Collecting orders from ${startDate} to ${endDate}`);
        
        // Query the active tab
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('Error querying tabs:', chrome.runtime.lastError);
                showError('Error accessing the current tab. Please refresh the page and try again.');
                isProcessing = false;
                return;
            }
            
            const currentTab = tabs[0];
            if (!currentTab || !currentTab.id) {
                console.error('No active tab found');
                showError('No active tab found. Please refresh the page and try again.');
                isProcessing = false;
                return;
            }
            
            // Send message to the content script to start order collection
            chrome.tabs.sendMessage(
                currentTab.id, 
                { 
                    action: 'filterOrders',
                    startDate: startDate,
                    endDate: endDate
                },
                (response) => {
                    isProcessing = false;
                    
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message to content script:', chrome.runtime.lastError);
                        showError('Error communicating with the page. Please try again.');
                        return;
                    }
                    
                    if (response && response.success) {
                        console.log('Order collection completed successfully');
                        resultsDiv.innerHTML = `
                            <div class="success-message">
                                <p>Successfully collected ${response.totalOrders || 0} orders with ${response.totalItems || 0} items.</p>
                            </div>
                        `;
                    } else {
                        const errorMsg = (response && response.error) || 'Failed to collect orders';
                        console.error('Error collecting orders:', errorMsg);
                        showError('Error: ' + errorMsg);
                    }
                }
            );
        });
    }
    
    // Set up filter button click handler
    filterButton.addEventListener('click', collectOrders);
    
    // Listen for messages from background script and content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'orderProgress') {
            console.log(`Order collection progress: ${message.current}/${message.total} (${message.progress}%)`);
            // Update progress in the UI if needed
            if (sendResponse) sendResponse({ status: 'received' });
            return true;
        }

        if (message.action === 'showExtension') {
            console.log('Received showExtension message, auto-triggered:', message.autoTriggered);
            if (message.orders && message.orders.length > 0) {
                console.log(`Found ${message.orders.length} orders on page`);
                // Update results area to show orders were found
                resultsDiv.innerHTML = `<p style="color: #4CAF50; font-weight: bold;">✓ Found ${message.orders.length} orders on this page!</p><p>Select your date range and click "Extract Orders" to process them.</p>`;
            } else if (message.noOrders) {
                console.log('No orders found on page');
            } else {
                console.log('Extension popup opened manually');
                resultsDiv.innerHTML = '<p>Ready to extract Target orders. Select your date range and click "Extract Orders".</p>';
            }
            if (sendResponse) sendResponse({ status: 'received' });
            return true;
        }

        return false;
    });
    
    // Enable the filter button by default
    filterButton.disabled = false;
    
    function handleOrdersComplete(message) {
        isProcessing = false;
        
        if (!message.success) {
            showError(message.message || 'Failed to process orders');
            return;
        }
        
        // Clear previous results
        resultsDiv.innerHTML = '';
        
        // Show summary
        const summary = document.createElement('div');
        summary.className = 'summary';
        summary.innerHTML = `
            <h3>Order Processing Complete</h3>
            <p>${message.message || 'Successfully processed orders.'}</p>
            <p>Total Orders: ${message.totalOrders || 0}</p>
            <p>Total Items: ${message.totalItems || 0}</p>
        `;
        resultsDiv.appendChild(summary);
        
        // Add download button if CSV is available
        if (message.csv) {
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download CSV';
            downloadBtn.className = 'download-btn';
            downloadBtn.onclick = () => {
                const blob = new Blob([message.csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', message.filename || 'target-orders.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
            resultsDiv.appendChild(downloadBtn);
        }
        
        // Display items if available
        if (message.items && message.items.length > 0) {
            displayResults(message.items);
        }
    }

    function updateProgress(current, total, progress) {
        const progressElement = document.getElementById('progress') || createProgressElement();
        progressElement.textContent = `Processing order ${current} of ${total} (${progress}%)...`;
    }

    function createProgressElement() {
        const progressElement = document.createElement('div');
        progressElement.id = 'progress';
        progressElement.style.margin = '10px 0';
        progressElement.style.fontWeight = 'bold';
        resultsDiv.appendChild(progressElement);
        return progressElement;
    }

    filterButton.addEventListener('click', async () => {
        if (isProcessing) {
            showError('Already processing orders. Please wait...');
            return;
        }

        const startDate = new Date(startDateInput.value);
        const endDate = endDateInput.value ? new Date(endDateInput.value) : new Date();
        
        // Validate dates
        if (isNaN(startDate.getTime())) {
            showError('Please enter a valid start date');
            return;
        }
        
        if (isNaN(endDate.getTime())) {
            showError('Please enter a valid end date');
            return;
        }
        
        if (startDate > endDate) {
            showError('Start date must be before end date');
            return;
        }

        // Query the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Show loading indicator
        resultsDiv.innerHTML = 'Searching for orders...';
        isProcessing = true;
        currentRequest = {
            tabId: tab.id,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
        
        try {
            // Send message to content script
            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Request timed out. Please try again.'));
                }, 30000); // 30 second timeout
                
                chrome.tabs.sendMessage(tab.id, {
                    action: 'filterOrders',
                    startDate: currentRequest.startDate,
                    endDate: currentRequest.endDate
                }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message || 'Failed to communicate with content script'));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (!response) {
                throw new Error('No response from content script');
            }
            
            if (response.status === 'error' || !response.success) {
                throw new Error(response.message || response.error || 'Failed to fetch orders');
            }
            
            if (response.status === 'processing') {
                // Show initial processing message
                resultsDiv.innerHTML = `${response.message || `Found ${response.totalOrders} orders. Processing...`}`;
                createProgressElement();
                // Don't resolve yet, wait for completion message
                return;
            }
            
            // If we get here, we have the final results
            handleOrdersComplete(response);
            
        } catch (error) {
            console.error('Error:', error);
            isProcessing = false;
            showError(error.message);
        }
    });

    function displayResults(items) {
        if (!items || items.length === 0) return;
        
        const table = document.createElement('table');
        table.className = 'order-table';
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Date', 'Order Type', 'Order #', 'Item', 'Qty', 'Unit Price', 'Total', 'Status'];
        
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        items.forEach(item => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(item.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Create cells
            const cells = [
                formattedDate,
                item.type || 'N/A',
                item.orderNumber || 'N/A',
                item.name || 'N/A',
                item.quantity || '1',
                `$${parseFloat(item.unitPrice || 0).toFixed(2)}`,
                `$${parseFloat(item.totalPrice || 0).toFixed(2)}`,
                item.status || 'Purchased'
            ];
            
            // Add cells to row
            cells.forEach(cellText => {
                const cell = document.createElement('td');
                cell.textContent = cellText;
                
                // Add class for negative totals (returns)
                if (cellText.startsWith('-$')) {
                    cell.classList.add('negative-amount');
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        resultsDiv.appendChild(table);
        
        // Add some basic styling
        const style = document.createElement('style');
        style.textContent = `
            .order-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 14px;
            }
            .order-table th, .order-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            .order-table th {
                background-color: #f2f2f2;
                position: sticky;
                top: 0;
            }
            .order-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .order-table tr:hover {
                background-color: #f1f1f1;
            }
            .negative-amount {
                color: #d32f2f;
                font-weight: bold;
            }
            .summary {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 4px;
            }
            .download-btn {
                background-color: #4CAF50;
                color: white;
                padding: 10px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                margin: 10px 0;
            }
            .download-btn:hover {
                background-color: #45a049;
            }
        `;
        resultsDiv.appendChild(style);
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.style.color = '#d32f2f';
        errorDiv.style.padding = '10px';
        errorDiv.style.margin = '10px 0';
        errorDiv.style.border = '1px solid #f5c6cb';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.backgroundColor = '#f8d7da';
        errorDiv.textContent = message;
        
        // Clear previous content and show error
        resultsDiv.innerHTML = '';
        resultsDiv.appendChild(errorDiv);
    }
});
