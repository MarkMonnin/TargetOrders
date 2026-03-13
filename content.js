// Function to show a notification to the user
function showNotification(message) {
    // Create a notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #cc0000;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <div style="flex: 1;">
                <strong>Target Orders Extension</strong><br>
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

    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 8000);
}

// Function to click the 'Load more orders' button and wait for new orders to appear
async function loadMoreOrders() {
    // Find the load more button
    const buttons = Array.from(document.querySelectorAll('button'));
    const loadButton = buttons.find(btn => btn.textContent.trim() === 'Load more orders');
    
    if (!loadButton) return false;
    
    // Store current order cards
    const currentOrderCards = Array.from(document.querySelectorAll('div[id^="9"]'));
    const currentOrderIds = currentOrderCards.map(card => card.id);
    
    // Click the load button
    loadButton.click();
    
    // Wait for new orders to appear with a timeout
    const maxWaitTime = 10000; // 10 seconds maximum wait time
    const checkInterval = 300; // Check every 300ms
    let elapsed = 0;
    
    return new Promise((resolve) => {
        const checkForNewOrders = setInterval(() => {
            // Find all order cards and filter for new ones
            const allOrderCards = Array.from(document.querySelectorAll('div[id^="9"]'));
            const newOrders = allOrderCards.filter(card => !currentOrderIds.includes(card.id));
            
            if (newOrders.length > 0) {
                console.log(`Found ${newOrders.length} new orders`);
                clearInterval(checkForNewOrders);
                resolve(true);
            }
            
            elapsed += checkInterval;
            if (elapsed >= maxWaitTime) {
                console.log('Timed out waiting for new orders');
                clearInterval(checkForNewOrders);
                resolve(false);
            }
        }, checkInterval);
    });
}

// Function to switch between Online and In-store tabs
async function switchToTab(tabType) {
    try {
        const tabButton = document.querySelector(`button[data-test^='tab${tabType}'], button[id^='tab-${tabType}']`);
        if (!tabButton) {
            console.log(`Could not find ${tabType} tab button`);
            return false;
        }
        
        // Only click if not already selected
        if (tabButton.getAttribute('aria-selected') !== 'true') {
            tabButton.click();
            // Wait for the tab content to load
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        return true;
    } catch (error) {
        console.error(`Error switching to ${tabType} tab:`, error);
        return false;
    }
}

// Function to find the oldest order date on the page
function findOldestOrderDate() {
    const dateElements = document.querySelectorAll('.h-text-bold.h-text-lg');
    let oldestDate = new Date();
    
    dateElements.forEach(element => {
        const dateText = element.textContent.trim();
        const date = new Date(dateText);
        if (!isNaN(date.getTime()) && date < oldestDate) {
            oldestDate = date;
        }
    });
    
    return oldestDate;
}

// Function to extract order information from a single order page using the background script
async function extractOrderDetails(orderUrl) {
    console.log('Requesting order details for:', orderUrl);
    
    return new Promise((resolve) => {
        // Send message to background script to process the order page
        chrome.runtime.sendMessage(
            { 
                action: 'processOrderPage',
                url: orderUrl 
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error processing order page:', chrome.runtime.lastError);
                    resolve({
                        success: false,
                        error: chrome.runtime.lastError.message,
                        orderNumber: 'Error',
                        orderTotal: 'Error',
                        items: [],
                        url: orderUrl
                    });
                    return;
                }
                
                if (!response) {
                    console.error('No response received from background script');
                    resolve({
                        success: false,
                        error: 'No response received',
                        orderNumber: 'Error',
                        orderTotal: 'Error',
                        items: [],
                        url: orderUrl
                    });
                    return;
                }
                
                console.log('Received order details:', response);
                resolve(response);
            }
        );
    });
}

// Function to extract order information from the page
function extractOrders() {
    const orders = [];
    
    // Find all order containers - adjust the selector based on the actual HTML structure
    const orderContainers = document.querySelectorAll('div.h-display-flex.h-flex-justify-space-between');
    
    orderContainers.forEach(container => {
        // Find the date element
        const dateElement = container.querySelector('.h-text-bold.h-text-lg');
        // Find the order link
        const linkElement = container.querySelector('a[href*="/orders/"]');
        
        if (dateElement && linkElement) {
            const dateText = dateElement.textContent.trim();
            const orderUrl = new URL(linkElement.href, window.location.origin).href;
            
            // Parse the date (e.g., "Sep 9, 2025")
            const orderDate = new Date(dateText);
            
            if (!isNaN(orderDate.getTime())) {
                orders.push({
                    date: dateText,
                    dateObj: orderDate,
                    url: orderUrl
                });
            }
        }
    });
    
    return orders;
}

// Function to filter orders by date range
function filterOrdersByDate(orders, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of the day
    
    return orders.filter(order => {
        const orderDate = order.dateObj;
        return orderDate >= start && orderDate <= end;
    });
}

// Function to collect orders for a specific tab type (Online/In-store)
async function collectOrdersForTab(tabType, startDate, endDate) {
    // Switch to the specified tab
    const switched = await switchToTab(tabType);
    if (!switched) {
        console.log(`Skipping ${tabType} orders - tab not found`);
        return [];
    }
    
    let allOrders = [];
    let attempts = 0;
    const maxAttempts = 5; // Prevent infinite loading
    
    // Keep loading until we have all needed orders or hit max attempts
    while (attempts < maxAttempts) {
        // Get current orders
        const currentOrders = extractOrders();
        allOrders = [...new Map([...allOrders, ...currentOrders].map(o => [o.url, o])).values()];
        
        // Check if we need to load more
        const oldestDate = findOldestOrderDate();
        if (startDate >= oldestDate || !await loadMoreOrders()) {
            break; // No more orders to load
        }
        
        attempts++;
    }
    
    // Filter orders by date range and add tab type
    const filtered = filterOrdersByDate(allOrders, startDate, endDate).map(order => ({
        ...order,
        type: tabType.toLowerCase()
    }));
    
    console.log(`Found ${filtered.length} ${tabType} orders in date range`);
    return filtered;
}

// Function to process orders one by one with rate limiting and retry logic
async function processOrders(orders, onProgress) {
    const allOrderItems = [];
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds between retries
    
    // Function to process a single order with retries
    async function processSingleOrder(order, attempt = 1) {
        try {
            console.log(`Processing order (attempt ${attempt}):`, order.url);
            
            // Add a small delay between requests to avoid rate limiting
            if (attempt === 1 && allOrderItems.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Extract order details with a timeout
            const orderDetails = await Promise.race([
                extractOrderDetails(order.url),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Order processing timed out')), 60000) // 1 minute timeout - increased for patience
                )
            ]);
            
            if (orderDetails.success && orderDetails.items && orderDetails.items.length > 0) {
                // Add all items to our results
                allOrderItems.push(...orderDetails.items);
                console.log(`Added ${orderDetails.items.length} items from order ${orderDetails.orderNumber}`);
                return true;
            } else {
                throw new Error(orderDetails.error || 'No items found in order');
            }
            
        } catch (error) {
            console.error(`Error processing order ${order.url} (attempt ${attempt}):`, error);
            
            if (attempt < MAX_RETRIES) {
                console.log(`Retrying order (${attempt + 1}/${MAX_RETRIES}):`, order.url);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
                return processSingleOrder(order, attempt + 1);
            } else {
                // Max retries reached, add error to results
                allOrderItems.push({
                    date: new Date().toISOString().split('T')[0],
                    type: 'Error',
                    name: `Error processing order: ${error.message || 'Unknown error'}`,
                    quantity: 1,
                    unitPrice: '0.00',
                    totalPrice: '0.00',
                    status: 'Error',
                    orderNumber: order.orderNumber || 'Error',
                    url: order.url,
                    error: error.message
                });
                return false;
            }
        }
    }
    
    // Process all orders sequentially
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        
        // Update progress
        if (onProgress) {
            try {
                const progress = Math.round(((i) / orders.length) * 100);
                onProgress(i + 1, orders.length);
                
                // Send progress update
                await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'orderProgress',
                        current: i + 1,
                        total: orders.length,
                        progress: progress
                    }, resolve);
                }).catch(err => {
                    console.debug('Non-critical error sending progress update:', err);
                });
            } catch (err) {
                console.debug('Error in progress callback:', err);
            }
        }
        
        // Process the current order
        await processSingleOrder(order);
    }
    
    // Final progress update
    if (onProgress) {
        try {
            onProgress(orders.length, orders.length);
            await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'orderProgress',
                    current: orders.length,
                    total: orders.length,
                    progress: 100
                }, resolve);
            }).catch(err => console.debug('Non-critical error sending final progress:', err));
        } catch (err) {
            console.debug('Error in final progress update:', err);
        }
    }
    
    // Convert order items to CSV format
    const csvContent = convertToCSV(allOrderItems);
    
    return {
        success: true,
        items: allOrderItems,
        csv: csvContent,
        totalOrders: orders.length,
        totalItems: allOrderItems.length,
        processedOrders: allOrderItems.filter(item => !item.error).length,
        failedOrders: allOrderItems.filter(item => item.error).length
    };
}

// Helper function to convert order items to CSV format
function convertToCSV(items) {
    if (!items || items.length === 0) return '';
    
    // Define CSV headers
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
    
    // Convert items to CSV rows
    const rows = items.map(item => {
        return [
            `"${item.date || ''}"`,
            `"${item.type || ''}"`,
            `"${item.orderNumber || ''}"`,
            `"${(item.name || '').replace(/"/g, '""')}"`,
            `"${item.quantity || 1}"`,
            `"${item.unitPrice || '0.00'}"`,
            `"${item.totalPrice || '0.00'}"`,
            `"${item.status || 'Purchased'}"`,
            '' // Empty column for notes
        ].join(',');
    });
    
    // Combine headers and rows
    return [headers.join(','), ...rows].join('\n');
}

// Function to download CSV file
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Listen for messages from the popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Store the sendResponse function to call it later
    let responseSent = false;
    const safeSendResponse = (response) => {
        if (!responseSent) {
            responseSent = true;
            console.log('Sending response:', response);
            sendResponse(response);
        }
    };
    
    // Handle filter orders request
    if (request.action === 'filterOrders') {
        console.log('Received filterOrders request with dates:', request.startDate, 'to', request.endDate);
        
        // Process the request asynchronously
        (async () => {
            try {
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                
                console.log('Collecting Online orders...');
                const onlineOrders = await collectOrdersForTab('Online', startDate, endDate);
                console.log(`Found ${onlineOrders.length} Online orders`);
                
                console.log('Collecting In-store orders...');
                const instoreOrders = await collectOrdersForTab('Instore', startDate, endDate);
                console.log(`Found ${instoreOrders.length} In-store orders`);
                
                // Combine all orders
                const allOrders = [...onlineOrders, ...instoreOrders];
                
                if (allOrders.length === 0) {
                    safeSendResponse({
                        success: true,
                        message: 'No orders found in the selected date range.',
                        items: [],
                        csv: '',
                        totalOrders: 0,
                        totalItems: 0
                    });
                    return;
                }
                
                console.log(`Processing ${allOrders.length} orders...`);
                
                // Process all orders to get detailed information
                const result = await processOrders(allOrders, (current, total) => {
                    // Send progress updates back to popup
                    chrome.runtime.sendMessage({
                        action: 'orderProgress',
                        current,
                        total,
                        progress: Math.round((current / total) * 100)
                    }).catch(e => console.debug('Progress update failed:', e));
                });
                
                // Generate a timestamp for the filename
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `target-orders-${timestamp}.csv`;
                
                // Download the CSV file
                if (result.csv) {
                    downloadCSV(result.csv, filename);
                }
                
                // Send the results back to the popup
                safeSendResponse({
                    success: true,
                    message: `Processed ${result.totalOrders} orders with ${result.totalItems} items`,
                    items: result.items,
                    csv: result.csv,
                    filename: filename,
                    totalOrders: result.totalOrders,
                    totalItems: result.totalItems,
                    status: 'completed',
                    action: 'ordersComplete'
                });
                
            } catch (error) {
                console.error('Error processing request:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message || 'Unknown error occurred' 
                });
            }
        })();
        
        return true; // Keep the message channel open for async response
    }
    
    // Return false if the message wasn't handled
    return false;
});

// Function to wait for orders to load with a timeout
async function waitForOrders(maxWaitTime = 60000) {
    console.log('Waiting for initial orders to load...');
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms
    
    return new Promise((resolve) => {
        const checkOrders = () => {
            try {
                const orders = extractOrders();
                const elapsed = Date.now() - startTime;
                
                if (orders.length > 0) {
                    console.log(`Found ${orders.length} orders after ${elapsed}ms`);
                    resolve(orders);
                    return;
                }
                
                if (elapsed >= maxWaitTime) {
                    console.warn(`No orders found after ${maxWaitTime}ms`);
                    resolve([]);
                    return;
                }
                
                // Just check again after the interval
                setTimeout(checkOrders, checkInterval);
            } catch (error) {
                console.error('Error while waiting for orders:', error);
                resolve([]);
            }
        };
        
        checkOrders();
    });
}

// Initial extraction with waiting for orders
console.log('Target Orders Extension: Content script loaded');
let initialOrders = [];

// Wait for orders to load
waitForOrders().then(orders => {
    initialOrders = orders;
    console.log(`Found ${initialOrders.length} orders on the page`);

    // Auto-show popup when orders are found on Target.com orders page
    if (initialOrders.length > 0 && window.location.href.includes('target.com/orders')) {
        console.log('Orders detected on Target.com orders page');
        console.log('✓ Found', initialOrders.length, 'orders');
        console.log('📋 Opening extension popup...');

        // Send message to background script to open popup
        try {
            chrome.runtime.sendMessage({
                action: 'openPopup',
                ordersCount: initialOrders.length,
                hasOrders: initialOrders.length > 0
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Error sending openPopup message:', chrome.runtime.lastError);
                    // Fallback: show notification
                    showNotification(`Found ${initialOrders.length} orders! Click the extension icon to extract them.`);
                } else {
                    console.log('✅ openPopup message sent to background script');
                }
            });
        } catch (error) {
            console.error('❌ Error sending openPopup message:', error);
            // Fallback: show notification
            showNotification(`Found ${initialOrders.length} orders! Click the extension icon to extract them.`);
        }

    } else if (window.location.href.includes('target.com/orders')) {
        console.log('No orders found on Target.com orders page');
        console.log('📋 Opening extension popup to show message...');

        // Show popup even when no orders found
        try {
            chrome.runtime.sendMessage({
                action: 'openPopup',
                ordersCount: 0,
                hasOrders: false
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Error sending openPopup message (no orders):', chrome.runtime.lastError);
                } else {
                    console.log('✅ openPopup message sent to background script (no orders)');
                }
            });
        } catch (error) {
            console.error('❌ Error sending openPopup message (no orders):', error);
        }
    } else {
        console.log('Orders loaded and ready. Waiting for popup to request data...');
    }

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getOrders') {
            console.log('Sending orders to popup:', initialOrders.length);
            sendResponse({
                success: true,
                count: initialOrders.length,
                orders: initialOrders
            });
            return true; // Keep the message channel open for async response
        }
        return false;
    });
}).catch(error => {
    console.error('Error waiting for orders:', error);
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getOrders') {
            sendResponse({
                success: false,
                error: error.message
            });
            return true;
        }
        return false;
    });
});
