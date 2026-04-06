// Testing Framework Module
// Provides comprehensive testing and data analysis capabilities

export class TestingFramework {
  constructor() {
    this.testResults = [];
    this.testSessions = new Map();
    this.currentSession = null;
    this.isRecording = false;
    this.testData = {
      pageLoads: [],
      captures: [],
      processingResults: [],
      errors: []
    };
  }

  /**
   * Start a new test session
   * @param {string} sessionName - Name for the test session
   * @param {Object} config - Test configuration
   * @returns {string} Session ID
   */
  startTestSession(sessionName, config = {}) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      name: sessionName,
      startTime: Date.now(),
      endTime: null,
      config: {
        captureAllPages: true,
        captureProcessingResults: true,
        captureErrors: true,
        autoExport: false,
        maxCaptures: 100,
        ...config
      },
      stats: {
        pageLoads: 0,
        captures: 0,
        processingResults: 0,
        errors: 0,
        successRate: 0
      }
    };

    this.testSessions.set(sessionId, session);
    this.currentSession = sessionId;
    this.isRecording = true;

    console.log(`🧪 Test session started: ${sessionName} (${sessionId})`);
    return sessionId;
  }

  /**
   * Stop the current test session
   * @returns {Object} Session results
   */
  stopTestSession() {
    if (!this.currentSession) {
      throw new Error('No active test session');
    }

    const session = this.testSessions.get(this.currentSession);
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // Calculate success rate
    const totalOperations = session.stats.pageLoads + session.stats.captures + session.stats.processingResults;
    session.stats.successRate = totalOperations > 0 ? 
      ((totalOperations - session.stats.errors) / totalOperations * 100).toFixed(2) : 0;

    this.isRecording = false;
    const sessionId = this.currentSession;
    this.currentSession = null;

    console.log(`🏁 Test session stopped: ${session.name} (${sessionId})`);
    return session;
  }

  /**
   * Record a page load event
   * @param {Object} pageData - Page load data
   */
  recordPageLoad(pageData) {
    if (!this.isRecording) return;

    const record = {
      type: 'pageLoad',
      timestamp: Date.now(),
      sessionId: this.currentSession,
      data: pageData
    };

    this.testData.pageLoads.push(record);
    this.updateSessionStats('pageLoads');

    console.log(`📄 Recorded page load: ${pageData.pageType}`);
  }

  /**
   * Record an HTML capture
   * @param {Object} captureData - Capture data
   */
  recordCapture(captureData) {
    if (!this.isRecording) return;

    const record = {
      type: 'capture',
      timestamp: Date.now(),
      sessionId: this.currentSession,
      data: captureData
    };

    this.testData.captures.push(record);
    this.updateSessionStats('captures');

    console.log(`📸 Recorded capture: ${captureData.filename}`);
  }

  /**
   * Record a processing result
   * @param {Object} processingData - Processing result data
   */
  recordProcessingResult(processingData) {
    if (!this.isRecording) return;

    const record = {
      type: 'processingResult',
      timestamp: Date.now(),
      sessionId: this.currentSession,
      data: processingData
    };

    this.testData.processingResults.push(record);
    this.updateSessionStats('processingResults');

    console.log(`⚙️ Recorded processing result: ${processingData.pageType}`);
  }

  /**
   * Record an error
   * @param {Object} errorData - Error data
   */
  recordError(errorData) {
    if (!this.isRecording) return;

    const record = {
      type: 'error',
      timestamp: Date.now(),
      sessionId: this.currentSession,
      data: errorData
    };

    this.testData.errors.push(record);
    this.updateSessionStats('errors');

    console.error(`❌ Recorded error: ${errorData.message}`);
  }

  /**
   * Update session statistics
   * @param {string} type - Type of event
   */
  updateSessionStats(type) {
    if (!this.currentSession) return;

    const session = this.testSessions.get(this.currentSession);
    session.stats[type]++;
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get test results for analysis
   * @param {string} sessionId - Optional session ID (uses current if not provided)
   * @returns {Object} Test results
   */
  getTestResults(sessionId = null) {
    const targetSessionId = sessionId || this.currentSession;
    
    if (!targetSessionId) {
      throw new Error('No session specified or active');
    }

    const session = this.testSessions.get(targetSessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const sessionData = {
      pageLoads: this.testData.pageLoads.filter(r => r.sessionId === targetSessionId),
      captures: this.testData.captures.filter(r => r.sessionId === targetSessionId),
      processingResults: this.testData.processingResults.filter(r => r.sessionId === targetSessionId),
      errors: this.testData.errors.filter(r => r.sessionId === targetSessionId)
    };

    return {
      session: session,
      data: sessionData,
      analysis: this.analyzeResults(sessionData)
    };
  }

  /**
   * Analyze test results
   * @param {Object} data - Test data
   * @returns {Object} Analysis results
   */
  analyzeResults(data) {
    const analysis = {
      summary: {
        totalEvents: data.pageLoads.length + data.captures.length + 
                   data.processingResults.length + data.errors.length,
        pageTypes: new Set(),
        captureSuccessRate: 0,
        processingSuccessRate: 0,
        errorRate: 0
      },
      pageTypeAnalysis: {},
      timelineAnalysis: [],
      errorAnalysis: {
        commonErrors: {},
        errorByPageType: {}
      },
      performanceAnalysis: {
        averageProcessingTime: 0,
        captureTimes: [],
        processingTimes: []
      }
    };

    // Analyze page types
    [...data.pageLoads, ...data.processingResults].forEach(record => {
      const pageType = record.data.pageType || record.data.metadata?.pageType;
      if (pageType) {
        analysis.summary.pageTypes.add(pageType);
        analysis.pageTypeAnalysis[pageType] = (analysis.pageTypeAnalysis[pageType] || 0) + 1;
      }
    });

    // Calculate success rates
    const totalCaptures = data.captures.length;
    const successfulCaptures = data.captures.filter(c => c.data.success).length;
    analysis.summary.captureSuccessRate = totalCaptures > 0 ? 
      (successfulCaptures / totalCaptures * 100).toFixed(2) : 0;

    const totalProcessing = data.processingResults.length;
    const successfulProcessing = data.processingResults.filter(p => p.data.success).length;
    analysis.summary.processingSuccessRate = totalProcessing > 0 ? 
      (successfulProcessing / totalProcessing * 100).toFixed(2) : 0;

    const totalEvents = analysis.summary.totalEvents;
    const totalErrors = data.errors.length;
    analysis.summary.errorRate = totalEvents > 0 ? 
      (totalErrors / totalEvents * 100).toFixed(2) : 0;

    // Analyze errors
    data.errors.forEach(error => {
      const message = error.data.message || error.data.error;
      const pageType = error.data.pageType || error.data.metadata?.pageType;
      
      analysis.errorAnalysis.commonErrors[message] = 
        (analysis.errorAnalysis.commonErrors[message] || 0) + 1;
      
      if (pageType) {
        analysis.errorAnalysis.errorByPageType[pageType] = 
          (analysis.errorAnalysis.errorByPageType[pageType] || 0) + 1;
      }
    });

    // Analyze performance
    const processingTimes = data.processingResults
      .filter(r => r.data.duration)
      .map(r => r.data.duration);
    
    if (processingTimes.length > 0) {
      analysis.performanceAnalysis.averageProcessingTime = 
        (processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length).toFixed(2);
      analysis.performanceAnalysis.processingTimes = processingTimes;
    }

    // Convert Set to Array for JSON serialization
    analysis.summary.pageTypes = Array.from(analysis.summary.pageTypes);

    return analysis;
  }

  /**
   * Export test results as JSON
   * @param {string} sessionId - Optional session ID
   * @returns {Promise<void>}
   */
  async exportResults(sessionId = null) {
    try {
      const results = this.getTestResults(sessionId);
      const filename = `test-results-${results.session.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
      
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`📥 Test results exported: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to export test results:', error);
    }
  }

  /**
   * Export captured HTML files
   * @param {string} sessionId - Optional session ID
   * @returns {Promise<void>}
   */
  async exportCapturedHTML(sessionId = null) {
    try {
      const results = this.getTestResults(sessionId);
      const captures = results.data.captures.filter(c => c.data.success);
      
      console.log(`📥 Exporting ${captures.length} HTML files...`);
      
      for (const capture of captures) {
        const captureData = await htmlCaptureManager.getCapture(capture.data.filename);
        if (captureData?.content) {
          const blob = new Blob([captureData.content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = capture.data.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log('✅ HTML files exported successfully');
    } catch (error) {
      console.error('❌ Failed to export HTML files:', error);
    }
  }

  /**
   * Generate a test report
   * @param {string} sessionId - Optional session ID
   * @returns {string} HTML report
   */
  generateReport(sessionId = null) {
    const results = this.getTestResults(sessionId);
    const { session, data, analysis } = results;
    
    const report = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - ${session.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .error { background: #f8d7da; color: #721c24; }
        .success { background: #d4edda; color: #155724; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Report: ${session.name}</h1>
        <p>Session ID: ${session.id}</p>
        <p>Duration: ${(session.duration / 1000).toFixed(2)} seconds</p>
        <p>Start: ${new Date(session.startTime).toLocaleString()}</p>
        <p>End: ${new Date(session.endTime).toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>Summary Statistics</h2>
        <div class="stats">
            <div class="stat">Page Loads: ${session.stats.pageLoads}</div>
            <div class="stat">Captures: ${session.stats.captures}</div>
            <div class="stat">Processing Results: ${session.stats.processingResults}</div>
            <div class="stat">Errors: ${session.stats.errors}</div>
            <div class="stat ${session.stats.successRate > 90 ? 'success' : 'error'}">
                Success Rate: ${session.stats.successRate}%
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Page Type Analysis</h2>
        <table>
            <tr><th>Page Type</th><th>Count</th></tr>
            ${Object.entries(analysis.pageTypeAnalysis)
              .map(([type, count]) => `<tr><td>${type}</td><td>${count}</td></tr>`)
              .join('')}
        </table>
    </div>

    <div class="section">
        <h2>Performance Analysis</h2>
        <p>Average Processing Time: ${analysis.performanceAnalysis.averageProcessingTime}ms</p>
        <p>Capture Success Rate: ${analysis.summary.captureSuccessRate}%</p>
        <p>Processing Success Rate: ${analysis.summary.processingSuccessRate}%</p>
    </div>

    <div class="section">
        <h2>Errors</h2>
        <table>
            <tr><th>Error Message</th><th>Count</th></tr>
            ${Object.entries(analysis.errorAnalysis.commonErrors)
              .map(([message, count]) => `<tr><td>${message}</td><td>${count}</td></tr>`)
              .join('')}
        </table>
    </div>
</body>
</html>`;

    return report;
  }

  /**
   * Export test report as HTML
   * @param {string} sessionId - Optional session ID
   * @returns {Promise<void>}
   */
  async exportReport(sessionId = null) {
    try {
      const report = this.generateReport(sessionId);
      const results = this.getTestResults(sessionId);
      const filename = `test-report-${results.session.name.replace(/\s+/g, '-')}-${Date.now()}.html`;
      
      const blob = new Blob([report], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`📥 Test report exported: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to export test report:', error);
    }
  }

  /**
   * Clear all test data
   */
  clearTestData() {
    this.testResults = [];
    this.testSessions.clear();
    this.currentSession = null;
    this.isRecording = false;
    this.testData = {
      pageLoads: [],
      captures: [],
      processingResults: [],
      errors: []
    };
    
    console.log('🗑️ Test data cleared');
  }

  /**
   * Get all test sessions
   * @returns {Array} Array of test sessions
   */
  getAllSessions() {
    return Array.from(this.testSessions.values());
  }

  /**
   * Get current session info
   * @returns {Object|null} Current session info
   */
  getCurrentSession() {
    return this.currentSession ? this.testSessions.get(this.currentSession) : null;
  }
}

// Export singleton instance
export const testingFramework = new TestingFramework();
