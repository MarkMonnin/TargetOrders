// Orders List Page Processor
// Handles processing of Target orders list pages

import { BasePageProcessor } from '../base/BasePageProcessor.js';

export class OrdersListProcessor extends BasePageProcessor {
  constructor() {
    super('orders-list');
    this.orders = [];
    this.pagination = {
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
      loadMoreButton: null
    };
  }

  /**
   * Process orders list page
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   * @returns {Promise<Object>} Processing result
   */
  async process(metadata, captureResult) {
    await this.initializeProcessing(metadata, captureResult);
    
    try {
      this.logStep('Starting orders list processing');
      
      // Wait for page to load
      await this.waitForPageLoad();
      
      // Extract order information
      const orders = await this.extractOrders();
      
      // Extract pagination info
      const pagination = await this.extractPagination();
      
      // Extract filters and sorting
      const filters = await this.extractFilters();
      
      // Get page statistics
      const stats = await this.getPageStatistics();
      
      const result = {
        success: true,
        orders: orders,
        pagination: pagination,
        filters: filters,
        statistics: stats,
        metadata: metadata
      };
      
      return await this.finalizeProcessing(result);
      
    } catch (error) {
      this.addError(`Processing failed: ${error.message}`);
      const errorResult = {
        success: false,
        error: error.message,
        metadata: metadata
      };
      return await this.finalizeProcessing(errorResult);
    }
  }

  /**
   * Wait for orders list page to load
   */
  async waitForPageLoad() {
    this.logStep('Waiting for page load');
    
    const selectors = [
      '[data-test="order-history-container"]',
      '.order-history',
      '[data-test="orders-list"]',
      '.orders-list'
    ];
    
    for (const selector of selectors) {
      const element = await this.waitForElement(selector, 10000);
      if (element) {
        this.logStep('Page container found', { selector });
        return;
      }
    }
    
    throw new Error('Orders list container not found');
  }

  /**
   * Extract order information from the page
   * @returns {Promise<Array>} Array of order objects
   */
  async extractOrders() {
    this.logStep('Extracting orders');
    
    const orderSelectors = [
      '[data-test="order-card"]',
      '.order-card',
      '[data-test="order-item"]',
      '.order-item',
      '.order'
    ];
    
    let orderElements = [];
    
    // Try each selector until we find orders
    for (const selector of orderSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        orderElements = Array.from(elements);
        this.logStep('Found orders', { count: elements.length, selector });
        break;
      }
    }
    
    if (orderElements.length === 0) {
      this.logStep('No orders found');
      return [];
    }
    
    const orders = [];
    
    for (let i = 0; i < orderElements.length; i++) {
      const element = orderElements[i];
      try {
        const order = await this.extractOrderData(element, i);
        if (order) {
          orders.push(order);
        }
      } catch (error) {
        this.addError(`Failed to extract order ${i}: ${error.message}`);
      }
    }
    
    this.logStep('Orders extracted', { count: orders.length });
    return orders;
  }

  /**
   * Extract data from a single order element
   * @param {Element} element - Order element
   * @param {number} index - Order index
   * @returns {Promise<Object>} Order data
   */
  async extractOrderData(element, index) {
    const orderData = {
      index: index,
      extractedAt: new Date().toISOString()
    };
    
    // Extract order number
    const orderNumberSelectors = [
      '[data-test="order-number"]',
      '.order-number',
      '[data-test="order-id"]',
      '.order-id'
    ];
    
    for (const selector of orderNumberSelectors) {
      const orderNumberEl = element.querySelector(selector);
      if (orderNumberEl) {
        orderData.orderNumber = this.extractText(orderNumberEl);
        break;
      }
    }
    
    // Extract order date
    const dateSelectors = [
      '[data-test="order-date"]',
      '.order-date',
      '[data-test="order-placed"]',
      '.order-placed'
    ];
    
    for (const selector of dateSelectors) {
      const dateEl = element.querySelector(selector);
      if (dateEl) {
        orderData.orderDate = this.extractText(dateEl);
        orderData.orderDateParsed = this.extractDate(orderData.orderDate);
        break;
      }
    }
    
    // Extract order total
    const totalSelectors = [
      '[data-test="order-total"]',
      '.order-total',
      '[data-test="order-amount"]',
      '.order-amount'
    ];
    
    for (const selector of totalSelectors) {
      const totalEl = element.querySelector(selector);
      if (totalEl) {
        const totalText = this.extractText(totalEl);
        orderData.orderTotal = totalText;
        orderData.orderTotalParsed = this.extractPrice(totalText);
        break;
      }
    }
    
    // Extract order status
    const statusSelectors = [
      '[data-test="order-status"]',
      '.order-status',
      '[data-test="status"]',
      '.status'
    ];
    
    for (const selector of statusSelectors) {
      const statusEl = element.querySelector(selector);
      if (statusEl) {
        orderData.orderStatus = this.extractText(statusEl);
        break;
      }
    }
    
    // Extract order type (online/in-store)
    const typeSelectors = [
      '[data-test="order-type"]',
      '.order-type',
      '[data-test="fulfillment-type"]',
      '.fulfillment-type'
    ];
    
    for (const selector of typeSelectors) {
      const typeEl = element.querySelector(selector);
      if (typeEl) {
        orderData.orderType = this.extractText(typeEl);
        break;
      }
    }
    
    // Extract order URL
    const linkSelectors = [
      'a[href*="/orders/"]',
      '[data-test="order-link"]',
      '.order-link a'
    ];
    
    for (const selector of linkSelectors) {
      const linkEl = element.querySelector(selector);
      if (linkEl && linkEl.href) {
        orderData.orderUrl = linkEl.href;
        break;
      }
    }
    
    // Extract item count
    const itemCountSelectors = [
      '[data-test="item-count"]',
      '.item-count',
      '[data-test="order-items-count"]',
      '.order-items-count'
    ];
    
    for (const selector of itemCountSelectors) {
      const countEl = element.querySelector(selector);
      if (countEl) {
        orderData.itemCount = this.extractText(countEl);
        break;
      }
    }
    
    // Extract delivery/pickup info
    const deliverySelectors = [
      '[data-test="delivery-info"]',
      '.delivery-info',
      '[data-test="pickup-info"]',
      '.pickup-info'
    ];
    
    for (const selector of deliverySelectors) {
      const deliveryEl = element.querySelector(selector);
      if (deliveryEl) {
        orderData.deliveryInfo = this.extractText(deliveryEl);
        break;
      }
    }
    
    // Extract store name (for in-store orders)
    const storeSelectors = [
      '[data-test="store-name"]',
      '.store-name',
      '[data-test="store-location"]',
      '.store-location'
    ];
    
    for (const selector of storeSelectors) {
      const storeEl = element.querySelector(selector);
      if (storeEl) {
        orderData.storeName = this.extractText(storeEl);
        break;
      }
    }
    
    // Extract raw HTML for debugging
    orderData.rawHTML = element.outerHTML.substring(0, 1000); // Limit size
    
    return orderData;
  }

  /**
   * Extract pagination information
   * @returns {Promise<Object>} Pagination data
   */
  async extractPagination() {
    this.logStep('Extracting pagination');
    
    const pagination = {
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
      loadMoreButton: null,
      nextButton: null,
      prevButton: null
    };
    
    // Look for "Load more" button
    const loadMoreSelectors = [
      '[data-test="load-more-orders"]',
      '.load-more',
      '[data-test="show-more"]',
      '.show-more',
      'button:contains("Load more")',
      'button:contains("Show more")'
    ];
    
    for (const selector of loadMoreSelectors) {
      const button = document.querySelector(selector);
      if (button) {
        pagination.loadMoreButton = {
          selector: selector,
          text: this.extractText(button),
          disabled: button.disabled
        };
        pagination.hasMore = !button.disabled;
        break;
      }
    }
    
    // Look for pagination controls
    const paginationSelectors = [
      '[data-test="pagination"]',
      '.pagination',
      '[data-test="page-controls"]',
      '.page-controls'
    ];
    
    for (const selector of paginationSelectors) {
      const paginationEl = document.querySelector(selector);
      if (paginationEl) {
        // Extract current page
        const currentPageEl = paginationEl.querySelector('.current, [data-test="current-page"]');
        if (currentPageEl) {
          pagination.currentPage = parseInt(this.extractText(currentPageEl)) || 1;
        }
        
        // Extract total pages
        const totalPagesEl = paginationEl.querySelector('.total, [data-test="total-pages"]');
        if (totalPagesEl) {
          pagination.totalPages = parseInt(this.extractText(totalPagesEl)) || 1;
        }
        
        // Look for next/prev buttons
        const nextButton = paginationEl.querySelector('.next, [data-test="next-page"]');
        const prevButton = paginationEl.querySelector('.prev, [data-test="prev-page"]');
        
        if (nextButton) {
          pagination.nextButton = {
            selector: '.next',
            disabled: nextButton.disabled
          };
        }
        
        if (prevButton) {
          pagination.prevButton = {
            selector: '.prev',
            disabled: prevButton.disabled
          };
        }
        
        break;
      }
    }
    
    pagination.hasMore = pagination.currentPage < pagination.totalPages || pagination.loadMoreButton;
    
    this.logStep('Pagination extracted', pagination);
    return pagination;
  }

  /**
   * Extract filter information
   * @returns {Promise<Object>} Filter data
   */
  async extractFilters() {
    this.logStep('Extracting filters');
    
    const filters = {
      dateRange: null,
      orderType: null,
      status: null,
      sortBy: null,
      activeFilters: []
    };
    
    // Extract date range filter
    const dateRangeSelectors = [
      '[data-test="date-range-filter"]',
      '.date-range',
      '[data-test="date-filter"]',
      '.date-filter'
    ];
    
    for (const selector of dateRangeSelectors) {
      const filterEl = document.querySelector(selector);
      if (filterEl) {
        filters.dateRange = {
          selector: selector,
          text: this.extractText(filterEl),
          value: filterEl.value || null
        };
        break;
      }
    }
    
    // Extract order type filter
    const orderTypeSelectors = [
      '[data-test="order-type-filter"]',
      '.order-type-filter',
      '[data-test="fulfillment-filter"]',
      '.fulfillment-filter'
    ];
    
    for (const selector of orderTypeSelectors) {
      const filterEl = document.querySelector(selector);
      if (filterEl) {
        filters.orderType = {
          selector: selector,
          text: this.extractText(filterEl),
          value: filterEl.value || null
        };
        break;
      }
    }
    
    // Extract status filter
    const statusSelectors = [
      '[data-test="status-filter"]',
      '.status-filter',
      '[data-test="order-status-filter"]',
      '.order-status-filter'
    ];
    
    for (const selector of statusSelectors) {
      const filterEl = document.querySelector(selector);
      if (filterEl) {
        filters.status = {
          selector: selector,
          text: this.extractText(filterEl),
          value: filterEl.value || null
        };
        break;
      }
    }
    
    // Extract sort options
    const sortSelectors = [
      '[data-test="sort"]',
      '.sort',
      '[data-test="sort-by"]',
      '.sort-by'
    ];
    
    for (const selector of sortSelectors) {
      const sortEl = document.querySelector(selector);
      if (sortEl) {
        filters.sortBy = {
          selector: selector,
          text: this.extractText(sortEl),
          value: sortEl.value || null
        };
        break;
      }
    }
    
    // Collect all active filters
    const activeFilterSelectors = [
      '[data-test="active-filter"]',
      '.active-filter',
      '.filter-tag',
      '.filter-chip'
    ];
    
    for (const selector of activeFilterSelectors) {
      const filterElements = document.querySelectorAll(selector);
      if (filterElements.length > 0) {
        filters.activeFilters = Array.from(filterElements).map(el => ({
          text: this.extractText(el),
          selector: selector
        }));
        break;
      }
    }
    
    this.logStep('Filters extracted', filters);
    return filters;
  }

  /**
   * Get page statistics
   * @returns {Promise<Object>} Page statistics
   */
  async getPageStatistics() {
    this.logStep('Getting page statistics');
    
    const stats = {
      totalOrders: 0,
      onlineOrders: 0,
      inStoreOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalValue: 0,
      averageOrderValue: 0
    };
    
    // Count orders by type and status
    const orderElements = document.querySelectorAll('[data-test="order-card"], .order-card, [data-test="order-item"], .order-item');
    
    for (const element of orderElements) {
      stats.totalOrders++;
      
      // Count by type
      const typeEl = element.querySelector('[data-test="order-type"], .order-type');
      if (typeEl) {
        const type = this.extractText(typeEl).toLowerCase();
        if (type.includes('in-store') || type.includes('pickup')) {
          stats.inStoreOrders++;
        } else {
          stats.onlineOrders++;
        }
      }
      
      // Count by status
      const statusEl = element.querySelector('[data-test="order-status"], .order-status');
      if (statusEl) {
        const status = this.extractText(statusEl).toLowerCase();
        if (status.includes('pending') || status.includes('processing')) {
          stats.pendingOrders++;
        } else if (status.includes('delivered') || status.includes('completed')) {
          stats.completedOrders++;
        } else if (status.includes('cancelled') || status.includes('canceled')) {
          stats.cancelledOrders++;
        }
      }
      
      // Sum total values
      const totalEl = element.querySelector('[data-test="order-total"], .order-total');
      if (totalEl) {
        const totalText = this.extractText(totalEl);
        const totalValue = this.extractPrice(totalText);
        if (totalValue) {
          stats.totalValue += totalValue;
        }
      }
    }
    
    stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalValue / stats.totalOrders : 0;
    
    this.logStep('Statistics calculated', stats);
    return stats;
  }
}
