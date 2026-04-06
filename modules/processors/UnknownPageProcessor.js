// Unknown Page Processor
// Handles processing of pages that don't match known types

import { BasePageProcessor } from '../base/BasePageProcessor.js';

export class UnknownPageProcessor extends BasePageProcessor {
  constructor() {
    super('unknown');
  }

  /**
   * Process unknown page
   * @param {Object} metadata - Page metadata
   * @param {Object} captureResult - HTML capture result
   * @returns {Promise<Object>} Processing result
   */
  async process(metadata, captureResult) {
    await this.initializeProcessing(metadata, captureResult);
    
    try {
      this.logStep('Processing unknown page type');
      
      // Extract basic page information
      const pageInfo = await this.extractPageInfo();
      
      // Extract potential navigation elements
      const navigation = await this.extractNavigation();
      
      // Extract forms and inputs
      const forms = await this.extractForms();
      
      // Extract links and buttons
      const interactive = await this.extractInteractiveElements();
      
      // Look for Target-specific elements
      const targetElements = await this.extractTargetElements();
      
      const result = {
        success: true,
        pageInfo: pageInfo,
        navigation: navigation,
        forms: forms,
        interactive: interactive,
        targetElements: targetElements,
        metadata: metadata,
        notes: 'Page type not recognized - basic extraction performed'
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
   * Extract basic page information
   * @returns {Promise<Object>} Page information
   */
  async extractPageInfo() {
    this.logStep('Extracting basic page information');
    
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      language: document.documentElement.lang || navigator.language,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      documentInfo: {
        characterSet: document.characterSet,
        contentType: document.contentType,
        referrer: document.referrer,
        lastModified: document.lastModified
      }
    };
    
    // Extract meta tags
    const metaTags = {};
    const metaElements = document.querySelectorAll('meta');
    metaElements.forEach(meta => {
      const name = meta.name || meta.property || meta.getAttribute('http-equiv');
      if (name) {
        metaTags[name] = meta.content;
      }
    });
    pageInfo.metaTags = metaTags;
    
    // Extract structured data
    const structuredData = [];
    const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
    scriptElements.forEach(script => {
      try {
        structuredData.push(JSON.parse(script.textContent));
      } catch (error) {
        // Ignore invalid JSON
      }
    });
    pageInfo.structuredData = structuredData;
    
    return pageInfo;
  }

  /**
   * Extract navigation elements
   * @returns {Promise<Object>} Navigation information
   */
  async extractNavigation() {
    this.logStep('Extracting navigation elements');
    
    const navigation = {
      mainMenu: [],
      breadcrumbs: [],
      pagination: [],
      tabs: []
    };
    
    // Extract main navigation
    const navSelectors = [
      'nav',
      '[role="navigation"]',
      '.navigation',
      '.nav',
      '.menu',
      '[data-test="navigation"]',
      '[data-test="nav"]'
    ];
    
    for (const selector of navSelectors) {
      const navElement = document.querySelector(selector);
      if (navElement) {
        const links = navElement.querySelectorAll('a');
        navigation.mainMenu = Array.from(links).map(link => ({
          text: this.extractText(link),
          href: link.href,
          title: link.title || null
        }));
        break;
      }
    }
    
    // Extract breadcrumbs
    const breadcrumbSelectors = [
      '[data-test="breadcrumbs"]',
      '.breadcrumbs',
      '.breadcrumb',
      '[role="breadcrumb"]',
      'nav[aria-label="breadcrumb"]'
    ];
    
    for (const selector of breadcrumbSelectors) {
      const breadcrumbElement = document.querySelector(selector);
      if (breadcrumbElement) {
        const links = breadcrumbElement.querySelectorAll('a, span');
        navigation.breadcrumbs = Array.from(links).map((link, index) => ({
          index: index,
          text: this.extractText(link),
          href: link.href || null,
          isCurrent: link.tagName === 'SPAN' || link.classList.contains('current')
        }));
        break;
      }
    }
    
    // Extract pagination
    const paginationSelectors = [
      '[data-test="pagination"]',
      '.pagination',
      '[role="navigation"][aria-label*="pagination"]'
    ];
    
    for (const selector of paginationSelectors) {
      const paginationElement = document.querySelector(selector);
      if (paginationElement) {
        const links = paginationElement.querySelectorAll('a, button');
        navigation.pagination = Array.from(links).map(link => ({
          text: this.extractText(link),
          href: link.href || null,
          disabled: link.disabled || link.classList.contains('disabled')
        }));
        break;
      }
    }
    
    // Extract tabs
    const tabSelectors = [
      '[data-test="tabs"]',
      '.tabs',
      '[role="tablist"]',
      '.tab-list'
    ];
    
    for (const selector of tabSelectors) {
      const tabElement = document.querySelector(selector);
      if (tabElement) {
        const tabs = tabElement.querySelectorAll('[role="tab"], .tab');
        navigation.tabs = Array.from(tabs).map(tab => ({
          text: this.extractText(tab),
          selected: tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('active'),
          disabled: tab.disabled || tab.classList.contains('disabled')
        }));
        break;
      }
    }
    
    return navigation;
  }

  /**
   * Extract forms and inputs
   * @returns {Promise<Array>} Array of form information
   */
  async extractForms() {
    this.logStep('Extracting forms');
    
    const forms = [];
    const formElements = document.querySelectorAll('form');
    
    formElements.forEach((form, index) => {
      const formData = {
        index: index,
        action: form.action,
        method: form.method,
        id: form.id,
        className: form.className,
        fields: []
      };
      
      // Extract form fields
      const inputs = form.querySelectorAll('input, select, textarea, button');
      inputs.forEach(input => {
        const field = {
          type: input.type || input.tagName.toLowerCase(),
          name: input.name,
          id: input.id,
          className: input.className,
          value: input.value,
          placeholder: input.placeholder,
          required: input.required,
          disabled: input.disabled,
          text: this.extractText(input)
        };
        formData.fields.push(field);
      });
      
      forms.push(formData);
    });
    
    return forms;
  }

  /**
   * Extract interactive elements
   * @returns {Promise<Object>} Interactive elements information
   */
  async extractInteractiveElements() {
    this.logStep('Extracting interactive elements');
    
    const interactive = {
      buttons: [],
      links: [],
      dropdowns: []
    };
    
    // Extract buttons
    const buttonElements = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
    interactive.buttons = Array.from(buttonElements).map(button => ({
      text: this.extractText(button),
      type: button.type,
      disabled: button.disabled,
      className: button.className
    }));
    
    // Extract links
    const linkElements = document.querySelectorAll('a[href]');
    interactive.links = Array.from(linkElements).map(link => ({
      text: this.extractText(link),
      href: link.href,
      target: link.target,
      className: link.className
    }));
    
    // Extract dropdowns
    const selectElements = document.querySelectorAll('select');
    interactive.dropdowns = Array.from(selectElements).map(select => ({
      name: select.name,
      id: select.id,
      options: Array.from(select.options).map(option => ({
        value: option.value,
        text: option.text,
        selected: option.selected
      }))
    }));
    
    return interactive;
  }

  /**
   * Extract Target-specific elements
   * @returns {Promise<Object>} Target elements information
   */
  async extractTargetElements() {
    this.logStep('Extracting Target-specific elements');
    
    const targetElements = {
      dataTestElements: [],
      targetClasses: [],
      targetIds: []
    };
    
    // Extract elements with data-test attributes
    const dataTestElements = document.querySelectorAll('[data-test]');
    targetElements.dataTestElements = Array.from(dataTestElements).map(el => ({
      tag: el.tagName,
      dataTest: el.getAttribute('data-test'),
      text: this.extractText(el),
      className: el.className
    }));
    
    // Extract elements with Target-related classes
    const targetClassElements = document.querySelectorAll('[class*="target"], [class*="order"], [class*="product"], [class*="cart"]');
    targetElements.targetClasses = Array.from(targetClassElements).map(el => ({
      tag: el.tagName,
      className: el.className,
      text: this.extractText(el)
    }));
    
    // Extract elements with Target-related IDs
    const targetIdElements = document.querySelectorAll('[id*="target"], [id*="order"], [id*="product"], [id*="cart"]');
    targetElements.targetIds = Array.from(targetIdElements).map(el => ({
      tag: el.tagName,
      id: el.id,
      text: this.extractText(el)
    }));
    
    return targetElements;
  }
}
