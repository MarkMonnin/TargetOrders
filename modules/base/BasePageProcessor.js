// Base Page Processor Class
// Abstract base class for all page processors

export class BasePageProcessor {
  constructor(pageType) {
    this.pageType = pageType;
    this.processedCount = 0;
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Main processing method - must be implemented by subclasses
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   * @returns {Promise<Object>} Processing result
   */
  async process(metadata, captureResult) {
    throw new Error('process() method must be implemented by subclass');
  }

  /**
   * Initialize processing
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   */
  async initializeProcessing(metadata, captureResult) {
    this.startTime = performance.now();
    this.processedCount++;
    
    console.log(`🔧 Starting ${this.pageType} processing #${this.processedCount}`);
    
    return {
      success: true,
      startTime: this.startTime,
      processedCount: this.processedCount
    };
  }

  /**
   * Finalize processing
   * @param {Object} result - Processing result
   * @returns {Object} Final processing result
   */
  async finalizeProcessing(result) {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;
    
    const finalResult = {
      ...result,
      endTime: this.endTime,
      duration: duration,
      pageType: this.pageType,
      processedCount: this.processedCount,
      errors: this.errors.length > 0 ? this.errors : undefined
    };
    
    console.log(`✅ Completed ${this.pageType} processing in ${duration.toFixed(2)}ms`);
    
    return finalResult;
  }

  /**
   * Extract data from page using selectors
   * @param {Array} selectors - Array of selector objects with name and selector
   * @returns {Object} Extracted data
   */
  extractData(selectors) {
    const data = {};
    
    for (const { name, selector, attribute = 'textContent', multiple = false } of selectors) {
      try {
        if (multiple) {
          const elements = document.querySelectorAll(selector);
          data[name] = Array.from(elements).map(el => 
            attribute === 'textContent' ? el.textContent.trim() : el.getAttribute(attribute)
          );
        } else {
          const element = document.querySelector(selector);
          if (element) {
            data[name] = attribute === 'textContent' ? element.textContent.trim() : element.getAttribute(attribute);
          } else {
            data[name] = null;
          }
        }
      } catch (error) {
        console.error(`❌ Error extracting ${name}:`, error);
        data[name] = null;
        this.addError(`Failed to extract ${name}: ${error.message}`);
      }
    }
    
    return data;
  }

  /**
   * Wait for element to appear on page
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element|null>} Found element or null
   */
  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /**
   * Wait for multiple elements to appear
   * @param {Array} selectors - Array of CSS selectors
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Array>} Array of found elements
   */
  async waitForElements(selectors, timeout = 5000) {
    const promises = selectors.map(selector => this.waitForElement(selector, timeout));
    return Promise.all(promises);
  }

  /**
   * Scroll element into view
   * @param {Element} element - Element to scroll to
   * @param {Object} options - Scroll options
   */
  scrollIntoView(element, options = {}) {
    try {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
        ...options
      });
    } catch (error) {
      console.error('❌ Error scrolling to element:', error);
    }
  }

  /**
   * Click element safely
   * @param {Element} element - Element to click
   * @param {number} delay - Delay before click in milliseconds
   */
  async safeClick(element, delay = 100) {
    try {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Scroll into view first
      this.scrollIntoView(element);
      
      // Wait a bit for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Click the element
      element.click();
      
      console.log(`🖱️ Clicked element: ${element.tagName}${element.className ? '.' + element.className : ''}`);
    } catch (error) {
      console.error('❌ Error clicking element:', error);
      this.addError(`Failed to click element: ${error.message}`);
    }
  }

  /**
   * Extract text content with cleanup
   * @param {Element} element - Element to extract text from
   * @returns {string} Cleaned text content
   */
  extractText(element) {
    if (!element) return '';
    
    return element.textContent
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\n\r\t]/g, ' ');
  }

  /**
   * Extract price from text
   * @param {string} text - Text containing price
   * @returns {number|null} Extracted price as number
   */
  extractPrice(text) {
    if (!text) return null;
    
    const priceMatch = text.match(/[\$£€]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (priceMatch) {
      return parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    
    return null;
  }

  /**
   * Extract date from text
   * @param {string} text - Text containing date
   * @returns {Date|null} Extracted date
   */
  extractDate(text) {
    if (!text) return null;
    
    // Try various date formats
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/, // Month DD, YYYY
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return new Date(match[0]);
        } catch (error) {
          continue;
        }
      }
    }
    
    return null;
  }

  /**
   * Add error to error log
   * @param {string} error - Error message
   */
  addError(error) {
    this.errors.push({
      message: error,
      timestamp: new Date().toISOString(),
      pageType: this.pageType,
      processedCount: this.processedCount
    });
  }

  /**
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getStats() {
    return {
      pageType: this.pageType,
      processedCount: this.processedCount,
      errorCount: this.errors.length,
      lastError: this.errors.length > 0 ? this.errors[this.errors.length - 1] : null,
      averageProcessingTime: this.calculateAverageProcessingTime()
    };
  }

  /**
   * Calculate average processing time
   * @returns {number} Average processing time in milliseconds
   */
  calculateAverageProcessingTime() {
    // This would need to be implemented by tracking processing times
    // For now, return current duration if available
    if (this.startTime && this.endTime) {
      return this.endTime - this.startTime;
    }
    return 0;
  }

  /**
   * Reset processor state
   */
  reset() {
    this.processedCount = 0;
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Validate processing result
   * @param {Object} result - Processing result to validate
   * @returns {boolean} Whether result is valid
   */
  validateResult(result) {
    return result && 
           typeof result === 'object' && 
           result.success !== false &&
           result.pageType === this.pageType;
  }

  /**
   * Log processing step
   * @param {string} step - Step description
   * @param {any} data - Optional data to log
   */
  logStep(step, data = null) {
    const logData = {
      step: step,
      pageType: this.pageType,
      processedCount: this.processedCount,
      timestamp: new Date().toISOString()
    };
    
    if (data !== null) {
      logData.data = data;
    }
    
    console.log(`🔄 ${this.pageType} - ${step}:`, data || '');
  }
}
