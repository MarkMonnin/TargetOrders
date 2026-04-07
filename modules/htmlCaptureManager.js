/**
 * HTML Capture Manager Module
 * Handles capturing and saving HTML content with timestamp-based naming
 * Includes deduplication, storage management, and download functionality
 */

export class HTMLCaptureManager {
  constructor() {
    this.captureCount = 0;
    this.sessionId = this.generateSessionId();
    this.captures = new Map(); // Store metadata for each capture
    this.lastCaptureHash = null; // Store hash of last captured HTML
    this.duplicateThreshold = 0.95; // 95% similarity threshold for duplicates
    this.saveToDownloadsEnabled = true; // Save files to downloads instead of storage (renamed to avoid conflict)
    this.useStorageForMetadata = true; // Keep metadata in storage for indexing
    this.downloadSubfolder = 'TargetOrders-Captures'; // Subfolder for organized downloads
  }

  /**
   * Generate a unique session ID for this browser session
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a timestamp-based filename
   * @param {string} pageType - Type of page being captured
   * @param {number} loadCount - Load count for this page
   * @returns {string} Generated filename
   */
  generateFilename(pageType, loadCount = 1) {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\.\d{3}Z/, '')
      .replace('T', '_');
    
    return `${pageType}-${timestamp}_load-${loadCount}.html`;
  }

  /**
   * Clean HTML content by removing scripts and sensitive elements
   * @param {string} htmlContent - Raw HTML content
   * @returns {string} Cleaned HTML content
   */
  cleanHTML(htmlContent) {
    // Remove script tags
    let cleaned = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>))[^<]*<\/script>/gi, '');
    
    // Remove sensitive attributes that might contain personal data
    cleaned = cleaned.replace(/data-(user|session|token)=[^>\s]*/gi, '');
    
    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    return cleaned;
  }

  /**
   * Generate a hash of HTML content for deduplication
   * @param {string} htmlContent - HTML content to hash
   * @returns {string} Hash of the content
   */
  generateHTMLHash(htmlContent) {
    // Simple hash function for deduplication
    let hash = 0;
    for (let i = 0; i < htmlContent.length; i++) {
      const char = htmlContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Check if HTML content is duplicate of last capture
   * @param {string} htmlContent - HTML content to check
   * @returns {boolean} Whether content is duplicate
   */
  isDuplicateHTML(htmlContent) {
    if (!this.lastCaptureHash) {
      return false;
    }
    
    const currentHash = this.generateHTMLHash(htmlContent);
    return currentHash === this.lastCaptureHash;
  }

  /**
   * Calculate similarity between two HTML contents
   * @param {string} html1 - First HTML content
   * @param {string} html2 - Second HTML content
   * @returns {number} Similarity percentage (0-100)
   */
  calculateSimilarity(html1, html2) {
    const hash1 = this.generateHTMLHash(html1);
    const hash2 = this.generateHTMLHash(html2);
    
    // Simple similarity check based on hash
    return hash1 === hash2 ? 100 : 0;
  }

  /**
   * Save HTML content to downloads folder (fallback method)
   * @param {string} filename - Filename for the capture
   * @param {string} htmlContent - HTML content to save
   * @param {Object} metadata - Metadata to save
   * @returns {Promise<void>}
   */
  async saveToDownloads(filename, htmlContent, metadata) {
    try {
      console.log(`💾 Starting download for: ${filename}`);
      
      // Create full path with subfolder
      const fullPath = `${this.downloadSubfolder}/${filename}`;
      console.log(`📂 Intended path: ${fullPath}`);
      
      // Method 1: Try to use Chrome's download API via background script
      console.log('🔧 Attempting download via background script...');
      try {
        console.log('📤 Sending message to background script:', {
          type: 'DOWNLOAD_FILE',
          filename: filename,
          fullPath: fullPath,
          htmlContentLength: htmlContent.length,
          metadataKeys: Object.keys(metadata)
        });
        
        const response = await chrome.runtime.sendMessage({
          type: 'DOWNLOAD_FILE',
          filename: filename,
          fullPath: fullPath,
          htmlContent: htmlContent,
          metadata: metadata
        });
        
        console.log('📨 Received response from background script:', response);
        
        if (response && response.success) {
          console.log(`✅ File saved via background script: ${fullPath} (ID: ${response.downloadId})`);
          return;
        } else {
          console.error('❌ Background script download failed:', response?.error);
          console.log('⚠️ Falling back to manual method');
        }
      } catch (messageError) {
        console.error('❌ Message to background script failed:', messageError);
        console.log('⚠️ Falling back to manual method');
      }
      
      // Method 2: Manual download with data URL (fallback)
      console.log('🔧 Using manual download method');
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
      
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename; // Note: browsers don't always support subfolders in manual download
      a.style.display = 'none';
      
      // Add to DOM, click, and remove immediately
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log(`💾 File saved via data URL: ${filename} (Background script would use: ${fullPath})`);
      console.log('⚠️ Note: Manual download may not support subfolders - files may go to root Downloads folder');
      
    } catch (error) {
      console.error('❌ Failed to save to downloads:', error);
      throw error;
    }
  }

  /**
   * Save metadata and HTML content for analysis
   * @param {string} filename - Filename for the capture
   * @param {Object} metadata - Metadata to save
   * @param {string} htmlContent - HTML content to save
   * @returns {Promise<void>}
   */
  async saveMetadataToStorage(filename, metadata, htmlContent) {
    try {
      const captureKey = `capture_${filename}`;
      const captureData = {
        filename,
        htmlContent, // Store HTML content for analysis
        metadata,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      };
      
      // Save to chrome.storage.local with a special key for analysis
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [captureKey]: captureData }, () => {
          if (chrome.runtime.lastError) {
            console.error('❌ Failed to save metadata:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log(`📊 Saved metadata for analysis: ${filename}`);
            resolve();
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to save metadata:', error);
      throw error;
    }
  }

  /**
   * Save HTML content and metadata to browser storage
   * @param {string} filename - Filename for the capture
   * @param {string} htmlContent - HTML content to save
   * @param {Object} metadata - Metadata to save
   * @returns {Promise<void>}
   */
  async saveToStorage(filename, htmlContent, metadata) {
    try {
      // If saveToDownloads is enabled, save to downloads instead
      if (this.saveToDownloadsEnabled) {
        await this.saveToDownloads(filename, htmlContent, metadata);
        
        // Only save metadata to storage for indexing and analysis
        if (this.useStorageForMetadata) {
          await this.saveMetadataToStorage(filename, metadata, htmlContent);
        }
        return;
      }
      
      // Original storage saving logic
      const storageKey = `capture_${Date.now()}_${this.captureCount++}`;
      const captureData = {
        filename,
        htmlContent,
        metadata,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      };
      
      this.captures.set(storageKey, captureData);
      
      // Save to chrome.storage.local
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [storageKey]: captureData }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log(`💾 Saved to storage: ${filename} (${htmlContent.length} bytes)`);
            resolve();
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to save to storage:', error);
      throw error;
    }
  }

  /**
   * Capture HTML content from current page
   * @param {string} pageType - Type of page being captured
   * @param {number} loadCount - Load count for this page
   * @returns {Promise<Object>} Capture result
   */
  async captureHTML(pageType, loadCount = 1) {
    try {
      console.log(`📸 Capturing HTML for ${pageType} (load #${loadCount})...`);
      
      // Generate filename
      const filename = this.generateFilename(pageType, loadCount);
      
      // Get HTML content
      const htmlContent = document.documentElement.outerHTML;
      
      // Check for duplicates
      if (this.isDuplicateHTML(htmlContent)) {
        console.log(`🔄 Skipping duplicate capture: ${filename}`);
        return {
          success: false,
          reason: 'duplicate',
          filename,
          pageType,
          loadCount
        };
      }
      
      // Clean HTML content
      const cleanedHTML = this.cleanHTML(htmlContent);
      
      // Save to storage
      await this.saveToStorage(filename, cleanedHTML, {
        pageType,
        loadCount,
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
      
      // Update last capture hash
      this.lastCaptureHash = this.generateHTMLHash(cleanedHTML);
      
      console.log(`📸 Captured HTML: ${filename} (${cleanedHTML.length} bytes)`);
      
      return {
        success: true,
        filename,
        pageType,
        loadCount,
        size: cleanedHTML.length,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to capture HTML:', error);
      return {
        success: false,
        reason: error.message,
        filename,
        pageType,
        loadCount
      };
    }
  }

  /**
   * Get data from chrome.storage.local
   * @param {string} key - Storage key
   * @returns {Promise<Object>} Stored data
   */
  async getStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  /**
   * Get all capture data from storage
   * @returns {Promise<Array>} Array of captures
   */
  async getAllCaptures() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        const captures = [];
        Object.keys(result).forEach(key => {
          if (key.startsWith('capture_')) {
            captures.push(result[key]);
          }
        });
        resolve(captures);
      });
    });
  }

  /**
   * Get storage information
   * @returns {Promise<Object>} Storage info
   */
  async getStorageInfo() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
        resolve({
          usage: bytesInUse,
          quota: 5242880 // 5MB default quota for chrome.storage.local
        });
      });
    });
  }

  /**
   * Clean up old captures to free space
   * @param {number} keepCount - Number of recent captures to keep
   * @returns {Promise<void>}
   */
  async cleanupOldCaptures(keepCount = 20) {
    try {
      console.log(`🧹 Cleaning up old captures, keeping last ${keepCount}...`);
      
      const allCaptures = await this.getAllCaptures();
      
      // Sort by timestamp (newest first)
      allCaptures.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Keep the most recent captures
      const toKeep = allCaptures.slice(0, keepCount);
      const toRemove = allCaptures.slice(keepCount);
      
      // Remove old captures from storage
      for (const capture of toRemove) {
        const key = `capture_${capture.filename}`;
        await new Promise((resolve) => {
          chrome.storage.local.remove(key, () => {
            console.log(`🗑️ Removed old capture: ${capture.filename}`);
            resolve();
          });
        });
      }
      
      console.log(`✅ Cleanup complete. Kept ${toKeep.length}, removed ${toRemove.length}`);
      
    } catch (error) {
      console.error('❌ Failed to cleanup old captures:', error);
      throw error;
    }
  }

  /**
   * Emergency cleanup when quota is exceeded
   * @returns {Promise<void>}
   */
  async emergencyCleanup() {
    try {
      console.log('🚨 Emergency cleanup triggered - quota exceeded');
      
      const allCaptures = await this.getAllCaptures();
      
      // Remove all captures except the most recent one
      if (allCaptures.length > 0) {
        const mostRecent = allCaptures.reduce((newest, current) => {
          return new Date(current.timestamp) > new Date(newest.timestamp) ? current : newest;
        });
        
        const toRemove = allCaptures.filter(capture => capture.filename !== mostRecent.filename);
        
        for (const capture of toRemove) {
          const key = `capture_${capture.filename}`;
          await new Promise((resolve) => {
            chrome.storage.local.remove(key, () => {
              console.log(`🗑️ Emergency removed: ${capture.filename}`);
              resolve();
            });
          });
        }
        
        console.log(`✅ Emergency cleanup complete. Kept 1, removed ${toRemove.length}`);
      }
      
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Configure save location
   * @param {boolean} saveToDownloads - Whether to save to downloads folder
   * @param {boolean} useStorageForMetadata - Whether to save metadata to storage
   * @param {string} subfolder - Subfolder name for downloads
   */
  configureSaveLocation(saveToDownloads, useStorageForMetadata = true, subfolder = 'TargetOrders-Captures') {
    this.saveToDownloadsEnabled = saveToDownloads;
    this.useStorageForMetadata = useStorageForMetadata;
    this.downloadSubfolder = subfolder;
    console.log(`📁 Save location configured: ${saveToDownloads ? 'Downloads folder' : 'Browser storage'}`);
    console.log(`📂 Subfolder: ${subfolder}`);
  }

  /**
   * Get current save configuration
   * @returns {Object} Current configuration
   */
  getSaveConfiguration() {
    return {
      saveToDownloads: this.saveToDownloadsEnabled,
      useStorageForMetadata: this.useStorageForMetadata,
      downloadSubfolder: this.downloadSubfolder
    };
  }
}

// Export singleton instance
export const htmlCaptureManager = new HTMLCaptureManager();
