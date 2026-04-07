/**
 * File Analyzer Module
 * Analyzes captured HTML files to identify page types and extract data
 * Used for testing and validation of captured content
 */

export class FileAnalyzer {
  constructor() {
    this.analysisResults = new Map();
    this.duplicateFiles = new Set();
  }

  /**
   * Analyze a captured HTML file
   * @param {string} filePath - Path to the file
   * @param {string} htmlContent - HTML content of the file
   * @returns {Object} Analysis result
   */
  analyzeFile(filePath, htmlContent) {
    console.log(`🔍 Analyzing file: ${filePath}`);
    
    const analysis = {
      filePath,
      fileName: this.extractFileName(filePath),
      fileSize: htmlContent.length,
      pageType: this.detectPageType(htmlContent, filePath),
      extractedData: {},
      validationResults: {},
      timestamp: new Date().toISOString()
    };

    // Extract data based on page type
    analysis.extractedData = this.extractDataByPageType(htmlContent, analysis.pageType);
    
    // Validate the extraction
    analysis.validationResults = this.validateExtraction(analysis.extractedData, analysis.pageType);
    
    // Store analysis result
    this.analysisResults.set(filePath, analysis);
    
    console.log(`✅ Analysis complete for ${analysis.fileName}:`, {
      pageType: analysis.pageType,
      dataKeys: Object.keys(analysis.extractedData),
      validationPassed: this.getValidationSummary(analysis.validationResults)
    });

    return analysis;
  }

  /**
   * Extract filename from file path
   * @param {string} filePath - Full file path
   * @returns {string} Filename
   */
  extractFileName(filePath) {
    return filePath.split('/').pop() || filePath;
  }

  /**
   * Detect page type from HTML content and filename
   * @param {string} htmlContent - HTML content
   * @param {string} filePath - File path
   * @returns {string} Page type
   */
  detectPageType(htmlContent, filePath) {
    // First, try to detect from filename
    const fileName = this.extractFileName(filePath).toLowerCase();
    if (fileName.includes('orders-list')) return 'orders-list';
    if (fileName.includes('order-detail')) return 'order-detail';
    if (fileName.includes('unknown')) return 'unknown';

    // Then, detect from HTML content
    const lowerHtml = htmlContent.toLowerCase();
    
    // Orders list page detection
    if (lowerHtml.includes('target.com/orders') && 
        (lowerHtml.includes('your orders') || lowerHtml.includes('order #'))) {
      return 'orders-list';
    }
    
    // Order detail page detection
    if (lowerHtml.includes('order details') || 
        lowerHtml.includes('order summary') ||
        lowerHtml.includes('shipping information') ||
        lowerHtml.includes('payment information')) {
      return 'order-detail';
    }
    
    // Invoice/receipt page detection
    if (lowerHtml.includes('invoice') || 
        lowerHtml.includes('receipt') ||
        lowerHtml.includes('transaction details')) {
      return 'order-detail'; // Invoice pages are a type of order detail
    }
    
    return 'unknown';
  }

  /**
   * Extract data based on page type
   * @param {string} htmlContent - HTML content
   * @param {string} pageType - Detected page type
   * @returns {Object} Extracted data
   */
  extractDataByPageType(htmlContent, pageType) {
    switch (pageType) {
      case 'orders-list':
        return this.extractOrdersListData(htmlContent);
      case 'order-detail':
        return this.extractOrderDetailData(htmlContent);
      default:
        return this.extractGenericData(htmlContent);
    }
  }

  /**
   * Extract data from orders list page
   * @param {string} htmlContent - HTML content
   * @returns {Object} Extracted orders list data
   */
  extractOrdersListData(htmlContent) {
    const data = {
      pageType: 'orders-list',
      orders: [],
      pagination: {},
      filters: {},
      pageStats: {}
    };

    try {
      // Extract orders
      const orderElements = this.extractAllElements(htmlContent, [
        '[data-test="order-item"]',
        '[data-testid="order-item"]',
        '.order-item',
        '[class*="order"]',
        'a[href*="/orders/"]'
      ]);

      data.orders = orderElements.map(el => ({
        orderNumber: this.extractText(el, ['[data-test="order-number"]', '.order-number']),
        orderDate: this.extractText(el, ['[data-test="order-date"]', '.order-date']),
        orderStatus: this.extractText(el, ['[data-test="order-status"]', '.order-status']),
        orderTotal: this.extractText(el, ['[data-test="order-total"]', '.order-total']),
        orderUrl: this.extractAttribute(el, 'href'),
        itemCount: this.extractText(el, ['[data-test="item-count"]', '.item-count'])
      })).filter(order => order.orderNumber);

      // Extract pagination
      data.pagination = {
        currentPage: this.extractText(htmlContent, ['[data-test="current-page"]', '.current-page']),
        totalPages: this.extractText(htmlContent, ['[data-test="total-pages"]', '.total-pages']),
        hasNext: this.exists(htmlContent, ['[data-test="next-page"]', '.next-page']),
        hasPrevious: this.exists(htmlContent, ['[data-test="previous-page"]', '.previous-page'])
      };

      // Extract filters
      data.filters = {
        dateRange: this.extractText(htmlContent, ['[data-test="date-filter"]', '.date-filter']),
        status: this.extractText(htmlContent, ['[data-test="status-filter"]', '.status-filter']),
        search: this.extractText(htmlContent, ['[data-test="search"]', '.search-input'])
      };

      // Extract page statistics
      data.pageStats = {
        totalOrders: data.orders.length,
        ordersByStatus: this.groupOrdersByStatus(data.orders),
        dateRange: this.getDateRange(data.orders)
      };

    } catch (error) {
      console.error('❌ Error extracting orders list data:', error);
      data.extractionError = error.message;
    }

    return data;
  }

  /**
   * Extract data from order detail page
   * @param {string} htmlContent - HTML content
   * @returns {Object} Extracted order detail data
   */
  extractOrderDetailData(htmlContent) {
    const data = {
      pageType: 'order-detail',
      orderInfo: {},
      items: [],
      shipping: {},
      payment: {},
      timeline: [],
      receipts: []
    };

    try {
      // Extract order information
      data.orderInfo = {
        orderNumber: this.extractText(htmlContent, [
          '[data-test="order-number"]',
          '#orderNumber',
          '.order-number',
          'h1:contains("Order")'
        ]),
        orderDate: this.extractText(htmlContent, [
          '[data-test="order-date"]',
          '.order-date',
          '[data-test="order-date"]'
        ]),
        orderStatus: this.extractText(htmlContent, [
          '[data-test="order-status"]',
          '.order-status',
          '[class*="status"]'
        ]),
        orderTotal: this.extractText(htmlContent, [
          '[data-test="order-total"]',
          '.order-total',
          '[class*="total"]'
        ]),
        orderType: this.detectOrderType(htmlContent)
      };

      // Extract order items
      const itemElements = this.extractAllElements(htmlContent, [
        '[data-test="order-item"]',
        '[data-testid="order-item"]',
        '.order-item',
        '.item',
        '[class*="product"]'
      ]);

      data.items = itemElements.map(el => ({
        itemName: this.extractText(el, [
          '[data-test="item-name"]',
          '.item-name',
          '.product-name',
          '.product-title'
        ]),
        itemQuantity: this.extractText(el, [
          '[data-test="item-quantity"]',
          '.item-quantity',
          '.quantity'
        ]),
        itemPrice: this.extractText(el, [
          '[data-test="item-price"]',
          '.item-price',
          '.price'
        ]),
        itemTotal: this.extractText(el, [
          '[data-test="item-total"]',
          '.item-total'
        ]),
        itemImage: this.extractAttribute(el, ['src', 'data-src']),
        itemUrl: this.extractAttribute(el, ['href', 'data-url'])
      })).filter(item => item.itemName);

      // Extract shipping information
      data.shipping = {
        recipient: this.extractText(htmlContent, [
          '[data-test="recipient"]',
          '.recipient',
          '.shipping-name'
        ]),
        address: this.extractText(htmlContent, [
          '[data-test="shipping-address"]',
          '.shipping-address',
          '.address'
        ]),
        method: this.extractText(htmlContent, [
          '[data-test="shipping-method"]',
          '.shipping-method'
        ]),
        trackingNumber: this.extractText(htmlContent, [
          '[data-test="tracking-number"]',
          '.tracking-number'
        ])
      };

      // Extract payment information
      data.payment = {
        method: this.extractText(htmlContent, [
          '[data-test="payment-method"]',
          '.payment-method'
        ]),
        last4Digits: this.extractText(htmlContent, [
          '[data-test="card-last4"]',
          '.card-last4'
        ]),
        billingAddress: this.extractText(htmlContent, [
          '[data-test="billing-address"]',
          '.billing-address'
        ])
      };

      // Extract timeline/events
      const timelineElements = this.extractAllElements(htmlContent, [
        '[data-test="timeline-event"]',
        '.timeline-event',
        '.order-event'
      ]);

      data.timeline = timelineElements.map(el => ({
        date: this.extractText(el, [
          '[data-test="event-date"]',
          '.event-date'
        ]),
        description: this.extractText(el, [
          '[data-test="event-description"]',
          '.event-description'
        ]),
        status: this.extractText(el, [
          '[data-test="event-status"]',
          '.event-status'
        ])
      }));

      // Extract receipt information
      if (htmlContent.toLowerCase().includes('receipt') || 
          htmlContent.toLowerCase().includes('invoice')) {
        data.receipts = this.extractReceiptData(htmlContent);
      }

    } catch (error) {
      console.error('❌ Error extracting order detail data:', error);
      data.extractionError = error.message;
    }

    return data;
  }

  /**
   * Extract generic data from unknown page types
   * @param {string} htmlContent - HTML content
   * @returns {Object} Generic extracted data
   */
  extractGenericData(htmlContent) {
    return {
      pageType: 'unknown',
      title: this.extractText(htmlContent, ['title', 'h1', '.title']),
      url: this.extractAttribute(htmlContent, ['href', 'src']),
      content: {
        textContent: this.extractText(htmlContent, ['body', '.content']),
        links: this.extractAllAttributes(htmlContent, 'a', 'href'),
        forms: this.extractAllAttributes(htmlContent, 'form', 'action')
      }
    };
  }

  /**
   * Detect order type (online vs store)
   * @param {string} htmlContent - HTML content
   * @returns {string} Order type
   */
  detectOrderType(htmlContent) {
    const lowerHtml = htmlContent.toLowerCase();
    
    if (lowerHtml.includes('store receipt') || 
        lowerHtml.includes('in-store purchase') ||
        lowerHtml.includes('store transaction')) {
      return 'store';
    }
    
    if (lowerHtml.includes('digital order') || 
        lowerHtml.includes('online order') ||
        lowerHtml.includes('shipping')) {
      return 'online';
    }
    
    return 'unknown';
  }

  /**
   * Extract receipt data from HTML
   * @param {string} htmlContent - HTML content
   * @returns {Array} Receipt data
   */
  extractReceiptData(htmlContent) {
    const receiptData = [];
    
    try {
      // Look for receipt items
      const receiptItems = this.extractAllElements(htmlContent, [
        '[data-test="receipt-item"]',
        '.receipt-item',
        '.line-item'
      ]);

      receiptItems.forEach(item => {
        receiptData.push({
          type: 'item',
          name: this.extractText(item, [
            '[data-test="item-name"]',
            '.item-name'
          ]),
          quantity: this.extractText(item, [
            '[data-test="item-quantity"]',
            '.item-quantity'
          ]),
          price: this.extractText(item, [
            '[data-test="item-price"]',
            '.item-price'
          ]),
          total: this.extractText(item, [
            '[data-test="item-total"]',
            '.item-total'
          ])
        });
      });

      // Look for receipt totals
      const totals = this.extractAllElements(htmlContent, [
        '[data-test="receipt-total"]',
        '.receipt-total',
        '.total'
      ]);

      totals.forEach(total => {
        receiptData.push({
          type: 'total',
          label: this.extractText(total, [
            '[data-test="total-label"]',
            '.total-label'
          ]),
          amount: this.extractText(total, [
            '[data-test="total-amount"]',
            '.total-amount'
          ])
        });
      });

    } catch (error) {
      console.error('❌ Error extracting receipt data:', error);
    }

    return receiptData;
  }

  /**
   * Validate extracted data
   * @param {Object} extractedData - Data to validate
   * @param {string} pageType - Page type for validation rules
   * @returns {Object} Validation results
   */
  validateExtraction(extractedData, pageType) {
    const validation = {
      passed: true,
      errors: [],
      warnings: [],
      score: 0
    };

    switch (pageType) {
      case 'orders-list':
        validation.errors.push(...this.validateOrdersListData(extractedData));
        break;
      case 'order-detail':
        validation.errors.push(...this.validateOrderDetailData(extractedData));
        break;
      default:
        validation.warnings.push('Unknown page type - limited validation');
    }

    validation.passed = validation.errors.length === 0;
    validation.score = Math.max(0, 100 - (validation.errors.length * 10) - (validation.warnings.length * 5));

    return validation;
  }

  /**
   * Validate orders list data
   * @param {Object} data - Orders list data
   * @returns {Array} Validation errors
   */
  validateOrdersListData(data) {
    const errors = [];

    if (!data.orders || data.orders.length === 0) {
      errors.push('No orders found');
    }

    if (data.orders && data.orders.length > 0) {
      const invalidOrders = data.orders.filter(order => !order.orderNumber);
      if (invalidOrders.length > 0) {
        errors.push(`${invalidOrders.length} orders missing order numbers`);
      }
    }

    return errors;
  }

  /**
   * Validate order detail data
   * @param {Object} data - Order detail data
   * @returns {Array} Validation errors
   */
  validateOrderDetailData(data) {
    const errors = [];

    if (!data.orderInfo || !data.orderInfo.orderNumber) {
      errors.push('Missing order number');
    }

    if (!data.items || data.items.length === 0) {
      errors.push('No order items found');
    }

    if (data.items && data.items.length > 0) {
      const invalidItems = data.items.filter(item => !item.itemName);
      if (invalidItems.length > 0) {
        errors.push(`${invalidItems.length} items missing names`);
      }
    }

    return errors;
  }

  /**
   * Get validation summary
   * @param {Object} validation - Validation results
   * @returns {string} Summary text
   */
  getValidationSummary(validation) {
    if (validation.passed) {
      return `✅ PASSED (Score: ${validation.score})`;
    } else {
      return `❌ FAILED (${validation.errors.length} errors, ${validation.warnings.length} warnings, Score: ${validation.score})`;
    }
  }

  /**
   * Helper: Extract text using multiple selectors
   * @param {string|Object} htmlContent - HTML content or element
   * @param {Array} selectors - Array of CSS selectors
   * @returns {string} Extracted text
   */
  extractText(htmlContent, selectors) {
    if (typeof htmlContent !== 'string') {
      // It's an element, extract from it
      for (const selector of selectors) {
        const element = htmlContent.querySelector(selector);
        if (element && element.textContent) {
          return element.textContent.trim();
        }
      }
      return '';
    }

    // It's HTML string, create a temporary DOM
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    for (const selector of selectors) {
      const element = tempDiv.querySelector(selector);
      if (element && element.textContent) {
        return element.textContent.trim();
      }
    }
    
    return '';
  }

  /**
   * Helper: Extract attribute using multiple selectors
   * @param {string|Object} htmlContent - HTML content or element
   * @param {Array} attributes - Array of attribute names
   * @returns {string} Extracted attribute value
   */
  extractAttribute(htmlContent, attributes) {
    if (typeof htmlContent !== 'string') {
      // It's an element
      for (const attr of attributes) {
        if (htmlContent.getAttribute && htmlContent.getAttribute(attr)) {
          return htmlContent.getAttribute(attr);
        }
      }
      return '';
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const element = tempDiv.querySelector('a, img, link, script');
    if (element) {
      for (const attr of attributes) {
        if (element.getAttribute && element.getAttribute(attr)) {
          return element.getAttribute(attr);
        }
      }
    }
    
    return '';
  }

  /**
   * Helper: Extract all elements matching multiple selectors
   * @param {string} htmlContent - HTML content
   * @param {Array} selectors - Array of CSS selectors
   * @returns {Array} Array of elements
   */
  extractAllElements(htmlContent, selectors) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    for (const selector of selectors) {
      const elements = Array.from(tempDiv.querySelectorAll(selector));
      if (elements.length > 0) {
        return elements;
      }
    }
    
    return [];
  }

  /**
   * Helper: Extract all attributes from elements
   * @param {string} htmlContent - HTML content
   * @param {string} tag - HTML tag to search for
   * @param {string} attribute - Attribute to extract
   * @returns {Array} Array of attribute values
   */
  extractAllAttributes(htmlContent, tag, attribute) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const elements = tempDiv.querySelectorAll(tag);
    return Array.from(elements)
      .map(el => el.getAttribute && el.getAttribute(attribute))
      .filter(attr => attr);
  }

  /**
   * Helper: Check if element exists
   * @param {string} htmlContent - HTML content
   * @param {Array} selectors - Array of CSS selectors
   * @returns {boolean} Whether element exists
   */
  exists(htmlContent, selectors) {
    return this.extractText(htmlContent, selectors) !== '';
  }

  /**
   * Helper: Group orders by status
   * @param {Array} orders - Array of orders
   * @returns {Object} Orders grouped by status
   */
  groupOrdersByStatus(orders) {
    return orders.reduce((groups, order) => {
      const status = order.orderStatus || 'Unknown';
      groups[status] = (groups[status] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Helper: Get date range from orders
   * @param {Array} orders - Array of orders
   * @returns {Object} Date range info
   */
  getDateRange(orders) {
    const dates = orders
      .map(order => order.orderDate)
      .filter(date => date)
      .map(date => new Date(date));

    if (dates.length === 0) {
      return { min: null, max: null, range: 'No dates found' };
    }

    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    
    return {
      min: min.toISOString(),
      max: max.toISOString(),
      range: `${min.toLocaleDateString()} - ${max.toLocaleDateString()}`
    };
  }

  /**
   * Find duplicate files
   * @param {Array} filePaths - Array of file paths
   * @returns {Array} Array of duplicate file groups
   */
  findDuplicates(filePaths) {
    const fileGroups = new Map();
    const duplicates = [];

    filePaths.forEach(filePath => {
      const fileName = this.extractFileName(filePath);
      const baseName = fileName.replace(/-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_load-\d+\.html$/, '');
      
      if (!fileGroups.has(baseName)) {
        fileGroups.set(baseName, []);
      }
      fileGroups.get(baseName).push(filePath);
    });

    fileGroups.forEach((files, baseName) => {
      if (files.length > 1) {
        duplicates.push({
          baseName,
          files,
          count: files.length,
          recommendation: `Keep the latest: ${files[files.length - 1]}`
        });
      }
    });

    return duplicates;
  }

  /**
   * Get analysis summary
   * @returns {Object} Summary of all analyses
   */
  getAnalysisSummary() {
    const summary = {
      totalFiles: this.analysisResults.size,
      pageTypes: {},
      validationResults: {},
      duplicateGroups: [],
      recommendations: []
    };

    // Count page types
    this.analysisResults.forEach((analysis, filePath) => {
      const pageType = analysis.pageType;
      summary.pageTypes[pageType] = (summary.pageTypes[pageType] || 0) + 1;
      
      const validationStatus = analysis.validationResults.passed ? 'passed' : 'failed';
      summary.validationResults[validationStatus] = (summary.validationResults[validationStatus] || 0) + 1;
    });

    // Calculate success rate
    const passedCount = summary.validationResults.passed || 0;
    const failedCount = summary.validationResults.failed || 0;
    summary.successRate = totalFiles > 0 ? Math.round((passedCount / totalFiles) * 100) : 0;

    // Generate recommendations
    if (summary.successRate < 100) {
      summary.recommendations.push(`${failedCount} files failed validation - review extraction logic`);
    }

    if (summary.pageTypes['unknown'] > 0) {
      summary.recommendations.push(`${summary.pageTypes['unknown']} files have unknown page type - improve detection`);
    }

    return summary;
  }

  /**
   * Export analysis results to JSON
   * @returns {string} JSON string of analysis results
   */
  exportResults() {
    const results = {
      summary: this.getAnalysisSummary(),
      detailedAnalysis: Array.from(this.analysisResults.entries()).map(([filePath, analysis]) => ({
        filePath,
        ...analysis
      })),
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(results, null, 2);
  }
}

// Export singleton instance
export const fileAnalyzer = new FileAnalyzer();
