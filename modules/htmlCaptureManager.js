// HTML Capture Manager Module
// Handles capturing and saving HTML content with timestamp-based naming

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
   * Generate a unique session ID for this browser session
   * @returns {string} Session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate timestamp for filename
   * @returns {string} Formatted timestamp
   */
  generateTimestamp() {
    const now = new Date();
    return now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .replace('Z', '')
      .substring(0, 19); // YYYY-MM-DD_HH-MM-SS
  }

  /**
   * Generate filename for HTML capture
   * @param {string} pageType - Type of page being captured
   * @param {string} timestamp - Timestamp for filename
   * @param {string} suffix - Optional suffix for filename
   * @returns {string} Generated filename
   */
  generateFilename(pageType, timestamp, suffix = '') {
    const cleanPageType = pageType.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    const cleanSuffix = suffix ? `_${suffix.replace(/[^a-zA-Z0-9-]/g, '-')}` : '';
    return `${cleanPageType}-${timestamp}${cleanSuffix}.html`;
  }

  /**
   * Generate a simple hash of HTML content for duplicate detection
   * @param {string} htmlContent - HTML content to hash
   * @returns {string} Hash string
   */
  generateHTMLHash(htmlContent) {
    // Create a simple hash based on content length and key positions
    const length = htmlContent.length;
    const positions = [0, Math.floor(length / 4), Math.floor(length / 2), Math.floor(3 * length / 4), length - 1];
    
    let hash = length.toString();
    for (const pos of positions) {
      if (pos < length) {
        hash += htmlContent.charCodeAt(pos).toString(36);
      }
    }
    
    return hash;
  }

  /**
   * Check if HTML content is a duplicate of the last capture
   * @param {string} htmlContent - HTML content to check
   * @returns {boolean} True if duplicate
   */
  isDuplicateHTML(htmlContent) {
    if (!this.lastCaptureHash) {
      return false;
    }
    
    const currentHash = this.generateHTMLHash(htmlContent);
    const isDuplicate = currentHash === this.lastCaptureHash;
    
    if (!isDuplicate) {
      this.lastCaptureHash = currentHash;
    }
    
    return isDuplicate;
  }

  /**
   * Calculate similarity between two HTML strings
   * @param {string} html1 - First HTML string
   * @param {string} html2 - Second HTML string
   * @returns {number} Similarity ratio (0-1)
   */
  calculateSimilarity(html1, html2) {
    if (html1 === html2) return 1.0;
    
    // Simple similarity based on common substrings
    const longer = html1.length > html2.length ? html1 : html2;
    const shorter = html1.length > html2.length ? html2 : html1;
    
    if (longer.length === 0) return 1.0;
    
    // Count matching characters at key positions
    const positions = [0, Math.floor(longer.length / 4), Math.floor(longer.length / 2), Math.floor(3 * longer.length / 4), longer.length - 1];
    let matches = 0;
    
    for (const pos of positions) {
      if (pos < shorter.length && longer[pos] === shorter[pos]) {
        matches++;
      }
    }
    
    return matches / positions.length;
  }

  /**
   * Capture and save HTML content
   * @param {string} pageType - Type of page being captured
   * @param {Object} metadata - Additional metadata to store
   * @param {string} suffix - Optional suffix for filename
   * @returns {Promise<Object>} Capture result with filename and metadata
   */
  async captureHTML(pageType, metadata = {}, suffix = '') {
    try {
      this.captureCount++;
      const timestamp = this.generateTimestamp();
      const filename = this.generateFilename(pageType, timestamp, suffix);
      
      // Get HTML content
      const htmlContent = await this.getHTMLContent();
      
      // Check for duplicates
      if (this.isDuplicateHTML(htmlContent)) {
        console.log(`🔄 Skipping duplicate capture: ${filename} (same as previous)`);
        return {
          success: false,
          duplicate: true,
          filename: filename,
          metadata: null,
          reason: 'Duplicate HTML content'
        };
      }
      
      // Create capture metadata
      const captureMetadata = {
        id: this.captureCount,
        sessionId: this.sessionId,
        filename: filename,
        pageType: pageType,
        timestamp: timestamp,
        url: window.location.href,
        title: document.title,
        size: htmlContent.length,
        captureTime: new Date().toISOString(),
        contentHash: this.lastCaptureHash,
        ...metadata
      };

      // Save to browser storage
      await this.saveToStorage(filename, htmlContent, captureMetadata);
      
      // Store in memory for quick access
      this.captures.set(filename, captureMetadata);
      
      console.log(`📸 Captured HTML: ${filename} (${htmlContent.length} bytes)`);
      
      return {
        success: true,
        filename: filename,
        metadata: captureMetadata,
        size: htmlContent.length,
        duplicate: false
      };
      
    } catch (error) {
      console.error('❌ Failed to capture HTML:', error);
      return {
        success: false,
        error: error.message,
        filename: null,
        metadata: null,
        duplicate: false
      };
    }
  }

  /**
   * Get the current HTML content with cleaning
   * @returns {Promise<string>} HTML content
   */
  async getHTMLContent() {
    // Get the full HTML document
    let htmlContent = document.documentElement.outerHTML;
    
    // Clean up the HTML for storage
    htmlContent = this.cleanHTML(htmlContent);
    
    return htmlContent;
  }

  /**
   * Clean HTML content for storage
   * @param {string} html - Raw HTML content
   * @returns {string} Cleaned HTML content
   */
  cleanHTML(html) {
    // Remove script tags that might cause issues
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove inline event handlers
    html = html.replace(/\s+on\w+="[^"]*"/gi, '');
    html = html.replace(/\s+on\w+='[^']*'/gi, '');
    
    // Remove potentially sensitive attributes
    html = html.replace(/\s+data-testid="[^"]*"/gi, '');
    html = html.replace(/\s+data-test="[^"]*"/gi, '');
    
    // Normalize whitespace
    html = html.replace(/\s+/g, ' ');
    html = html.replace(/>\s+</g, '><');
    
    return html;
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
        
        // Only save metadata to storage for indexing
        if (this.useStorageForMetadata) {
          await this.saveMetadataToStorage(filename, metadata);
        }
        return;
      }
      
      // Original storage logic (for backward compatibility)
      // Check storage quota before saving
      const storageInfo = await this.getStorageInfo();
      const estimatedSize = htmlContent.length + JSON.stringify(metadata).length;
      
      // If we're approaching quota limit, clean up old captures
      if (storageInfo.usage + estimatedSize > storageInfo.quota * 0.8) {
        console.log('🧹 Storage quota approaching limit, cleaning up old captures...');
        await this.cleanupOldCaptures();
      }
      
      // Save HTML content
      const htmlKey = `html_capture_${filename}`;
      await chrome.storage.local.set({
        [htmlKey]: {
          content: htmlContent,
          metadata: metadata,
          savedAt: new Date().toISOString()
        }
      });

      // Update capture index
      const indexKey = 'html_capture_index';
      const existingIndex = await this.getStorageData(indexKey) || [];
      existingIndex.push({
        filename: filename,
        metadata: metadata,
        savedAt: new Date().toISOString()
      });
      
      await chrome.storage.local.set({
        [indexKey]: existingIndex
      });

      // Update session info
      const sessionKey = `session_${this.sessionId}`;
      const sessionData = await this.getStorageData(sessionKey) || { captures: [] };
      sessionData.captures.push({
        filename: filename,
        metadata: metadata,
        capturedAt: new Date().toISOString()
      });
      sessionData.lastUpdated = new Date().toISOString();
      
      await chrome.storage.local.set({
        [sessionKey]: sessionData
      });

    } catch (error) {
      console.error('❌ Failed to save to storage:', error);
      
      // If it's a quota error, try to clean up and retry
      if (error.message.includes('quota')) {
        console.log('🧹 Quota exceeded, performing emergency cleanup...');
        await this.emergencyCleanup();
        
        // Retry saving after cleanup
        try {
          const htmlKey = `html_capture_${filename}`;
          await chrome.storage.local.set({
            [htmlKey]: {
              content: htmlContent,
              metadata: metadata,
              savedAt: new Date().toISOString()
            }
          });
          console.log('✅ Retry successful after cleanup');
        } catch (retryError) {
          console.error('❌ Retry failed even after cleanup:', retryError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Save only metadata to storage (for indexing when files are saved to downloads)
   * @param {string} filename - Filename for the capture
   * @param {Object} metadata - Metadata to save
   * @returns {Promise<void>}
   */
  async saveMetadataToStorage(filename, metadata) {
    try {
      // Update capture index (without the actual HTML content)
      const indexKey = 'html_capture_index';
      const existingIndex = await this.getStorageData(indexKey) || [];
      existingIndex.push({
        filename: filename,
        metadata: metadata,
        savedAt: new Date().toISOString(),
        savedToDownloads: true
      });
      
      await chrome.storage.local.set({
        [indexKey]: existingIndex
      });

      // Update session info
      const sessionKey = `session_${this.sessionId}`;
      const sessionData = await this.getStorageData(sessionKey) || { captures: [] };
      sessionData.captures.push({
        filename: filename,
        metadata: metadata,
        capturedAt: new Date().toISOString(),
        savedToDownloads: true
      });
      sessionData.lastUpdated = new Date().toISOString();
      
      await chrome.storage.local.set({
        [sessionKey]: sessionData
      });

    } catch (error) {
      console.error('❌ Failed to save metadata to storage:', error);
      // Don't throw error for metadata saving failures
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
   */
  async cleanupOldCaptures(keepCount = 20) {
    try {
      console.log(`🧹 Cleaning up old captures, keeping last ${keepCount}...`);
      
      const indexKey = 'html_capture_index';
      const index = await this.getStorageData(indexKey) || [];
      
      if (index.length <= keepCount) {
        console.log('✅ No cleanup needed, within limits');
        return;
      }
      
      // Sort by savedAt date and keep only the most recent
      const sortedIndex = index.sort((a, b) => 
        new Date(b.savedAt) - new Date(a.savedAt)
      );
      
      const toRemove = sortedIndex.slice(keepCount);
      const keysToRemove = [];
      
      for (const item of toRemove) {
        keysToRemove.push(`html_capture_${item.filename}`);
        
        // Remove from memory tracking
        this.captures.delete(item.filename);
      }
      
      // Remove old captures from storage
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        
        // Update index to keep only remaining items
        const remainingItems = sortedIndex.slice(0, keepCount);
        await chrome.storage.local.set({
          [indexKey]: remainingItems
        });
        
        console.log(`🗑️ Removed ${keysToRemove.length} old captures`);
      }
      
    } catch (error) {
      console.error('❌ Failed to cleanup old captures:', error);
    }
  }

  /**
   * Emergency cleanup when quota is exceeded
   */
  async emergencyCleanup() {
    try {
      console.log('🚨 Performing emergency cleanup...');
      
      // Get all storage keys
      const allData = await chrome.storage.local.get();
      const keys = Object.keys(allData);
      
      // Separate capture keys from other data
      const captureKeys = keys.filter(key => key.startsWith('html_capture_'));
      const otherKeys = keys.filter(key => !key.startsWith('html_capture_'));
      
      if (captureKeys.length === 0) {
        console.log('⚠️ No captures to clean up');
        return;
      }
      
      // Keep only the 10 most recent captures
      const indexKey = 'html_capture_index';
      const index = await this.getStorageData(indexKey) || [];
      const sortedIndex = index.sort((a, b) => 
        new Date(b.savedAt) - new Date(a.savedAt)
      );
      
      const toKeep = sortedIndex.slice(0, 10);
      const toRemove = captureKeys.filter(key => {
        const filename = key.replace('html_capture_', '');
        return !toKeep.some(item => item.filename === filename);
      });
      
      // Remove old captures
      if (toRemove.length > 0) {
        await chrome.storage.local.remove(toRemove);
        
        // Update index
        await chrome.storage.local.set({
          [indexKey]: toKeep
        });
        
        // Clear memory tracking
        this.captures.clear();
        toKeep.forEach(item => {
          this.captures.set(item.filename, item.metadata);
        });
        
        console.log(`🚨 Emergency cleanup removed ${toRemove.length} captures`);
      }
      
      // Also clear old session data
      const sessionKeys = keys.filter(key => key.startsWith('session_'));
      if (sessionKeys.length > 5) {
        const oldSessions = sessionKeys.slice(0, -5); // Keep last 5 sessions
        await chrome.storage.local.remove(oldSessions);
        console.log(`🗑️ Removed ${oldSessions.length} old sessions`);
      }
      
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
    }
  }

  /**
   * Get data from browser storage
   * @param {string} key - Storage key
   * @returns {Promise<any>} Stored data
   */
  async getStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  /**
   * Get all captures for current session
   * @returns {Promise<Array>} Array of capture metadata
   */
  async getSessionCaptures() {
    try {
      const sessionKey = `session_${this.sessionId}`;
      const sessionData = await this.getStorageData(sessionKey);
      return sessionData?.captures || [];
    } catch (error) {
      console.error('❌ Failed to get session captures:', error);
      return [];
    }
  }

  /**
   * Get all captures from storage
   * @returns {Promise<Array>} Array of all capture metadata
   */
  async getAllCaptures() {
    try {
      const indexKey = 'html_capture_index';
      const index = await this.getStorageData(indexKey);
      return index || [];
    } catch (error) {
      console.error('❌ Failed to get all captures:', error);
      return [];
    }
  }

  /**
   * Get specific capture by filename
   * @param {string} filename - Filename to retrieve
   * @returns {Promise<Object>} Capture data with content and metadata
   */
  async getCapture(filename) {
    try {
      const htmlKey = `html_capture_${filename}`;
      const captureData = await this.getStorageData(htmlKey);
      return captureData;
    } catch (error) {
      console.error('❌ Failed to get capture:', error);
      return null;
    }
  }

  /**
   * Delete specific capture
   * @param {string} filename - Filename to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteCapture(filename) {
    try {
      const htmlKey = `html_capture_${filename}`;
      await chrome.storage.local.remove(htmlKey);
      
      // Update index
      const indexKey = 'html_capture_index';
      const index = await this.getStorageData(indexKey) || [];
      const updatedIndex = index.filter(item => item.filename !== filename);
      await chrome.storage.local.set({ [indexKey]: updatedIndex });
      
      // Remove from memory
      this.captures.delete(filename);
      
      console.log(`🗑️ Deleted capture: ${filename}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete capture:', error);
      return false;
    }
  }

  /**
   * Clear all captures for current session
   * @returns {Promise<boolean>} Success status
   */
  async clearSessionCaptures() {
    try {
      const sessionCaptures = await this.getSessionCaptures();
      for (const capture of sessionCaptures) {
        await this.deleteCapture(capture.filename);
      }
      
      // Clear session data
      const sessionKey = `session_${this.sessionId}`;
      await chrome.storage.local.remove(sessionKey);
      
      console.log(`🗑️ Cleared session captures: ${this.sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to clear session captures:', error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage usage info
   */
  async getStorageStats() {
    try {
      const allCaptures = await this.getAllCaptures();
      const sessionCaptures = await this.getSessionCaptures();
      
      let totalSize = 0;
      for (const capture of allCaptures) {
        const captureData = await this.getCapture(capture.filename);
        if (captureData?.content) {
          totalSize += captureData.content.length;
        }
      }

      return {
        totalCaptures: allCaptures.length,
        sessionCaptures: sessionCaptures.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        sessionId: this.sessionId,
        captureCount: this.captureCount
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return null;
    }
  }

  /**
   * Export captures as downloadable files
   * @param {Array} filenames - Array of filenames to export (optional, exports all if not provided)
   * @returns {Promise<void>}
   */
  async exportCaptures(filenames = null) {
    try {
      const capturesToExport = filenames || (await this.getAllCaptures()).map(c => c.filename);
      
      for (const filename of capturesToExport) {
        const captureData = await this.getCapture(filename);
        if (captureData?.content) {
          // Create download link
          const blob = new Blob([captureData.content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`📥 Exported ${capturesToExport.length} captures`);
    } catch (error) {
      console.error('❌ Failed to export captures:', error);
    }
  }
}

// Export singleton instance
export const htmlCaptureManager = new HTMLCaptureManager();
