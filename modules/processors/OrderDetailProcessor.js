// Order Detail Page Processor
// Handles processing of individual Target order detail pages

import { BasePageProcessor } from '../base/BasePageProcessor.js';

export class OrderDetailProcessor extends BasePageProcessor {
  constructor() {
    super('order-detail');
    this.orderDetails = {};
    this.items = [];
  }

  /**
   * Process order detail page
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   * @returns {Promise<Object>} Processing result
   */
  async process(metadata, captureResult) {
    await this.initializeProcessing(metadata, captureResult);
    
    try {
      this.logStep('Starting order detail processing');
      
      // Wait for page to load
      await this.waitForPageLoad();
      
      // Extract order details
      const orderDetails = await this.extractOrderDetails();
      
      // Extract order items
      const items = await this.extractOrderItems();
      
      // Extract shipping information
      const shipping = await this.extractShippingInfo();
      
      // Extract payment information
      const payment = await this.extractPaymentInfo();
      
      // Extract timeline/history
      const timeline = await this.extractOrderTimeline();
      
      // Extract receipt/invoice information
      const receipts = await this.extractReceiptInfo();
      
      const result = {
        success: true,
        orderDetails: orderDetails,
        items: items,
        shipping: shipping,
        payment: payment,
        timeline: timeline,
        receipts: receipts,
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
   * Wait for order detail page to load
   */
  async waitForPageLoad() {
    this.logStep('Waiting for order detail page load');
    
    const selectors = [
      '[data-test="order-details"]',
      '.order-details',
      '[data-test="order-summary"]',
      '.order-summary',
      '[data-test="order-container"]',
      '.order-container'
    ];
    
    for (const selector of selectors) {
      const element = await this.waitForElement(selector, 10000);
      if (element) {
        this.logStep('Order details container found', { selector });
        return;
      }
    }
    
    throw new Error('Order details container not found');
  }

  /**
   * Extract main order details
   * @returns {Promise<Object>} Order details
   */
  async extractOrderDetails() {
    this.logStep('Extracting order details');
    
    const details = {
      orderNumber: null,
      orderDate: null,
      orderStatus: null,
      orderType: null,
      orderTotal: null,
      subtotal: null,
      tax: null,
      shipping: null,
      discounts: null,
      estimatedDelivery: null,
      storeName: null,
      storeAddress: null
    };
    
    // Extract order number
    const orderNumberSelectors = [
      '[data-test="order-number"]',
      '.order-number',
      '[data-test="order-id"]',
      '.order-id',
      'h1:contains("Order")',
      '.order-header h1'
    ];
    
    for (const selector of orderNumberSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractText(element);
        details.orderNumber = text;
        break;
      }
    }
    
    // Extract order date
    const dateSelectors = [
      '[data-test="order-date"]',
      '.order-date',
      '[data-test="order-placed"]',
      '.order-placed',
      '.date-placed'
    ];
    
    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractText(element);
        details.orderDate = text;
        details.orderDateParsed = this.extractDate(text);
        break;
      }
    }
    
    // Extract order status
    const statusSelectors = [
      '[data-test="order-status"]',
      '.order-status',
      '[data-test="status-badge"]',
      '.status-badge',
      '.status'
    ];
    
    for (const selector of statusSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        details.orderStatus = this.extractText(element);
        break;
      }
    }
    
    // Extract order type
    const typeSelectors = [
      '[data-test="order-type"]',
      '.order-type',
      '[data-test="fulfillment-type"]',
      '.fulfillment-type'
    ];
    
    for (const selector of typeSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        details.orderType = this.extractText(element);
        break;
      }
    }
    
    // Extract financial details
    const financialSelectors = {
      orderTotal: [
        '[data-test="order-total"]',
        '.order-total',
        '[data-test="grand-total"]',
        '.grand-total'
      ],
      subtotal: [
        '[data-test="subtotal"]',
        '.subtotal',
        '[data-test="order-subtotal"]',
        '.order-subtotal'
      ],
      tax: [
        '[data-test="tax"]',
        '.tax',
        '[data-test="sales-tax"]',
        '.sales-tax'
      ],
      shipping: [
        '[data-test="shipping"]',
        '.shipping',
        '[data-test="shipping-fee"]',
        '.shipping-fee'
      ],
      discounts: [
        '[data-test="discounts"]',
        '.discounts',
        '[data-test="promotions"]',
        '.promotions'
      ]
    };
    
    for (const [key, selectors] of Object.entries(financialSelectors)) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = this.extractText(element);
          details[key] = text;
          details[`${key}Parsed`] = this.extractPrice(text);
          break;
        }
      }
    }
    
    // Extract delivery estimate
    const deliverySelectors = [
      '[data-test="estimated-delivery"]',
      '.estimated-delivery',
      '[data-test="delivery-date"]',
      '.delivery-date'
    ];
    
    for (const selector of deliverySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractText(element);
        details.estimatedDelivery = text;
        details.estimatedDeliveryParsed = this.extractDate(text);
        break;
      }
    }
    
    // Extract store information (for in-store orders)
    const storeSelectors = {
      storeName: [
        '[data-test="store-name"]',
        '.store-name',
        '[data-test="store-location"]',
        '.store-location'
      ],
      storeAddress: [
        '[data-test="store-address"]',
        '.store-address',
        '[data-test="store-location-address"]',
        '.store-location-address'
      ]
    };
    
    for (const [key, selectors] of Object.entries(storeSelectors)) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          details[key] = this.extractText(element);
          break;
        }
      }
    }
    
    this.logStep('Order details extracted', details);
    return details;
  }

  /**
   * Extract order items
   * @returns {Promise<Array>} Array of order items
   */
  async extractOrderItems() {
    this.logStep('Extracting order items');
    
    const itemSelectors = [
      '[data-test="order-item"]',
      '.order-item',
      '[data-test="item"]',
      '.item',
      '[data-test="product-item"]',
      '.product-item'
    ];
    
    let itemElements = [];
    
    for (const selector of itemSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        itemElements = Array.from(elements);
        this.logStep('Found order items', { count: elements.length, selector });
        break;
      }
    }
    
    if (itemElements.length === 0) {
      this.logStep('No order items found');
      return [];
    }
    
    const items = [];
    
    for (let i = 0; i < itemElements.length; i++) {
      const element = itemElements[i];
      try {
        const item = await this.extractItemData(element, i);
        if (item) {
          items.push(item);
        }
      } catch (error) {
        this.addError(`Failed to extract item ${i}: ${error.message}`);
      }
    }
    
    this.logStep('Order items extracted', { count: items.length });
    return items;
  }

  /**
   * Extract data from a single item element
   * @param {Element} element - Item element
   * @param {number} index - Item index
   * @returns {Promise<Object>} Item data
   */
  async extractItemData(element, index) {
    const itemData = {
      index: index,
      extractedAt: new Date().toISOString()
    };
    
    // Extract item name
    const nameSelectors = [
      '[data-test="item-name"]',
      '.item-name',
      '[data-test="product-title"]',
      '.product-title',
      'h3',
      '.product-name'
    ];
    
    for (const selector of nameSelectors) {
      const nameEl = element.querySelector(selector);
      if (nameEl) {
        itemData.itemName = this.extractText(nameEl);
        break;
      }
    }
    
    // Extract item description
    const descSelectors = [
      '[data-test="item-description"]',
      '.item-description',
      '[data-test="product-description"]',
      '.product-description'
    ];
    
    for (const selector of descSelectors) {
      const descEl = element.querySelector(selector);
      if (descEl) {
        itemData.description = this.extractText(descEl);
        break;
      }
    }
    
    // Extract quantity
    const quantitySelectors = [
      '[data-test="quantity"]',
      '.quantity',
      '[data-test="item-quantity"]',
      '.item-quantity',
      '[data-test="qty"]',
      '.qty'
    ];
    
    for (const selector of quantitySelectors) {
      const qtyEl = element.querySelector(selector);
      if (qtyEl) {
        const text = this.extractText(qtyEl);
        itemData.quantity = text;
        itemData.quantityParsed = parseInt(text) || 1;
        break;
      }
    }
    
    // Extract unit price
    const unitPriceSelectors = [
      '[data-test="unit-price"]',
      '.unit-price',
      '[data-test="item-price"]',
      '.item-price',
      '[data-test="price"]',
      '.price'
    ];
    
    for (const selector of unitPriceSelectors) {
      const priceEl = element.querySelector(selector);
      if (priceEl) {
        const text = this.extractText(priceEl);
        itemData.unitPrice = text;
        itemData.unitPriceParsed = this.extractPrice(text);
        break;
      }
    }
    
    // Extract total price
    const totalPriceSelectors = [
      '[data-test="total-price"]',
      '.total-price',
      '[data-test="item-total"]',
      '.item-total'
    ];
    
    for (const selector of totalPriceSelectors) {
      const totalEl = element.querySelector(selector);
      if (totalEl) {
        const text = this.extractText(totalEl);
        itemData.totalPrice = text;
        itemData.totalPriceParsed = this.extractPrice(text);
        break;
      }
    }
    
    // Extract item image
    const imageSelectors = [
      '[data-test="item-image"]',
      '.item-image',
      '[data-test="product-image"]',
      '.product-image',
      'img'
    ];
    
    for (const selector of imageSelectors) {
      const imgEl = element.querySelector(selector);
      if (imgEl && imgEl.src) {
        itemData.imageUrl = imgEl.src;
        break;
      }
    }
    
    // Extract item URL
    const linkSelectors = [
      'a[href*="/p/"]',
      'a[href*="/product/"]',
      '[data-test="item-link"]',
      '.item-link'
    ];
    
    for (const selector of linkSelectors) {
      const linkEl = element.querySelector(selector);
      if (linkEl && linkEl.href) {
        itemData.itemUrl = linkEl.href;
        break;
      }
    }
    
    // Extract item ID/SKU
    const skuSelectors = [
      '[data-test="item-sku"]',
      '.item-sku',
      '[data-test="product-id"]',
      '.product-id',
      '[data-test="item-number"]',
      '.item-number'
    ];
    
    for (const selector of skuSelectors) {
      const skuEl = element.querySelector(selector);
      if (skuEl) {
        itemData.itemSku = this.extractText(skuEl);
        break;
      }
    }
    
    // Extract item status
    const itemStatusSelectors = [
      '[data-test="item-status"]',
      '.item-status',
      '[data-test="fulfillment-status"]',
      '.fulfillment-status'
    ];
    
    for (const selector of itemStatusSelectors) {
      const statusEl = element.querySelector(selector);
      if (statusEl) {
        itemData.itemStatus = this.extractText(statusEl);
        break;
      }
    }
    
    // Extract raw HTML for debugging
    itemData.rawHTML = element.outerHTML.substring(0, 1000); // Limit size
    
    return itemData;
  }

  /**
   * Extract shipping information
   * @returns {Promise<Object>} Shipping information
   */
  async extractShippingInfo() {
    this.logStep('Extracting shipping information');
    
    const shipping = {
      method: null,
      address: null,
      trackingNumber: null,
      carrier: null,
      estimatedDelivery: null,
      actualDelivery: null
    };
    
    const shippingSelectors = {
      method: [
        '[data-test="shipping-method"]',
        '.shipping-method',
        '[data-test="fulfillment-method"]',
        '.fulfillment-method'
      ],
      address: [
        '[data-test="shipping-address"]',
        '.shipping-address',
        '[data-test="delivery-address"]',
        '.delivery-address'
      ],
      trackingNumber: [
        '[data-test="tracking-number"]',
        '.tracking-number',
        '[data-test="tracking-id"]',
        '.tracking-id'
      ],
      carrier: [
        '[data-test="carrier"]',
        '.carrier',
        '[data-test="shipping-carrier"]',
        '.shipping-carrier'
      ],
      estimatedDelivery: [
        '[data-test="estimated-delivery"]',
        '.estimated-delivery',
        '[data-test="delivery-estimate"]',
        '.delivery-estimate'
      ],
      actualDelivery: [
        '[data-test="actual-delivery"]',
        '.actual-delivery',
        '[data-test="delivered-date"]',
        '.delivered-date'
      ]
    };
    
    for (const [key, selectors] of Object.entries(shippingSelectors)) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          shipping[key] = this.extractText(element);
          if (key.includes('Delivery')) {
            shipping[`${key}Parsed`] = this.extractDate(shipping[key]);
          }
          break;
        }
      }
    }
    
    this.logStep('Shipping info extracted', shipping);
    return shipping;
  }

  /**
   * Extract payment information
   * @returns {Promise<Object>} Payment information
   */
  async extractPaymentInfo() {
    this.logStep('Extracting payment information');
    
    const payment = {
      method: null,
      cardType: null,
      lastFour: null,
      billingAddress: null,
      giftCards: [],
      promotions: []
    };
    
    const paymentSelectors = {
      method: [
        '[data-test="payment-method"]',
        '.payment-method',
        '[data-test="payment-type"]',
        '.payment-type'
      ],
      cardType: [
        '[data-test="card-type"]',
        '.card-type',
        '[data-test="credit-card-type"]',
        '.credit-card-type'
      ],
      lastFour: [
        '[data-test="last-four"]',
        '.last-four',
        '[data-test="card-last-four"]',
        '.card-last-four'
      ],
      billingAddress: [
        '[data-test="billing-address"]',
        '.billing-address'
      ]
    };
    
    for (const [key, selectors] of Object.entries(paymentSelectors)) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          payment[key] = this.extractText(element);
          break;
        }
      }
    }
    
    // Extract gift cards
    const giftCardElements = document.querySelectorAll('[data-test="gift-card"], .gift-card');
    payment.giftCards = Array.from(giftCardElements).map(el => ({
      amount: this.extractText(el),
      amountParsed: this.extractPrice(this.extractText(el))
    }));
    
    // Extract promotions
    const promoElements = document.querySelectorAll('[data-test="promotion"], .promotion, [data-test="discount"], .discount');
    payment.promotions = Array.from(promoElements).map(el => ({
      description: this.extractText(el)
    }));
    
    this.logStep('Payment info extracted', payment);
    return payment;
  }

  /**
   * Extract order timeline/history
   * @returns {Promise<Array>} Order timeline
   */
  async extractOrderTimeline() {
    this.logStep('Extracting order timeline');
    
    const timeline = [];
    
    const timelineSelectors = [
      '[data-test="order-timeline"]',
      '.order-timeline',
      '[data-test="order-history"]',
      '.order-history',
      '[data-test="tracking-events"]',
      '.tracking-events'
    ];
    
    let timelineContainer = null;
    
    for (const selector of timelineSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        timelineContainer = container;
        break;
      }
    }
    
    if (!timelineContainer) {
      this.logStep('No timeline found');
      return timeline;
    }
    
    // Extract timeline events
    const eventSelectors = [
      '[data-test="timeline-event"]',
      '.timeline-event',
      '[data-test="tracking-event"]',
      '.tracking-event',
      '[data-test="order-status-update"]',
      '.order-status-update'
    ];
    
    let eventElements = [];
    
    for (const selector of eventSelectors) {
      const elements = timelineContainer.querySelectorAll(selector);
      if (elements.length > 0) {
        eventElements = Array.from(elements);
        break;
      }
    }
    
    for (let i = 0; i < eventElements.length; i++) {
      const element = eventElements[i];
      try {
        const event = await this.extractTimelineEvent(element, i);
        if (event) {
          timeline.push(event);
        }
      } catch (error) {
        this.addError(`Failed to extract timeline event ${i}: ${error.message}`);
      }
    }
    
    this.logStep('Timeline extracted', { events: timeline.length });
    return timeline;
  }

  /**
   * Extract data from a single timeline event
   * @param {Element} element - Timeline event element
   * @param {number} index - Event index
   * @returns {Promise<Object>} Timeline event data
   */
  async extractTimelineEvent(element, index) {
    const event = {
      index: index,
      extractedAt: new Date().toISOString()
    };
    
    // Extract event date
    const dateSelectors = [
      '[data-test="event-date"]',
      '.event-date',
      '[data-test="timeline-date"]',
      '.timeline-date'
    ];
    
    for (const selector of dateSelectors) {
      const dateEl = element.querySelector(selector);
      if (dateEl) {
        const text = this.extractText(dateEl);
        event.date = text;
        event.dateParsed = this.extractDate(text);
        break;
      }
    }
    
    // Extract event description
    const descSelectors = [
      '[data-test="event-description"]',
      '.event-description',
      '[data-test="timeline-description"]',
      '.timeline-description'
    ];
    
    for (const selector of descSelectors) {
      const descEl = element.querySelector(selector);
      if (descEl) {
        event.description = this.extractText(descEl);
        break;
      }
    }
    
    // Extract event status
    const statusSelectors = [
      '[data-test="event-status"]',
      '.event-status',
      '[data-test="timeline-status"]',
      '.timeline-status'
    ];
    
    for (const selector of statusSelectors) {
      const statusEl = element.querySelector(selector);
      if (statusEl) {
        event.status = this.extractText(statusEl);
        break;
      }
    }
    
    return event;
  }

  /**
   * Extract receipt/invoice information
   * @returns {Promise<Object>} Receipt information
   */
  async extractReceiptInfo() {
    this.logStep('Extracting receipt information');
    
    const receipts = {
      hasReceipt: false,
      hasInvoice: false,
      receiptUrl: null,
      invoiceUrl: null,
      downloadButtons: []
    };
    
    // Look for receipt button/link
    const receiptSelectors = [
      '[data-test="receipt-button"]',
      '.receipt-button',
      '[data-test="view-receipt"]',
      '.view-receipt',
      'a:contains("Receipt")',
      'button:contains("Receipt")'
    ];
    
    for (const selector of receiptSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        receipts.hasReceipt = true;
        receipts.receiptUrl = element.href || null;
        break;
      }
    }
    
    // Look for invoice button/link
    const invoiceSelectors = [
      '[data-test="invoice-button"]',
      '.invoice-button',
      '[data-test="view-invoice"]',
      '.view-invoice',
      'a:contains("Invoice")',
      'button:contains("Invoice")'
    ];
    
    for (const selector of invoiceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        receipts.hasInvoice = true;
        receipts.invoiceUrl = element.href || null;
        break;
      }
    }
    
    // Look for download buttons
    const downloadElements = document.querySelectorAll('[data-test="download"], .download, [data-test="pdf"], .pdf');
    receipts.downloadButtons = Array.from(downloadElements).map(el => ({
      text: this.extractText(el),
      url: el.href || null
    }));
    
    this.logStep('Receipt info extracted', receipts);
    return receipts;
  }
}
