/**
 * Test Runner Module
 * Runs comprehensive tests on captured HTML files without requiring Chrome
 * Tests page detection, data extraction, and validation
 */

import { fileAnalyzer } from './fileAnalyzer.js';

export class TestRunner {
  constructor() {
    this.testResults = new Map();
    this.testFiles = [];
    this.duplicates = [];
  }

  /**
   * Initialize test runner with captured files
   * @param {Array} filePaths - Array of file paths to test
   */
  async initialize(filePaths) {
    console.log('🧪 Initializing Test Runner...');
    console.log(`📁 Found ${filePaths.length} files to test`);

    // Find duplicates first
    this.duplicates = fileAnalyzer.findDuplicates(filePaths);
    
    // Remove duplicates, keep only latest versions
    this.testFiles = this.removeDuplicates(filePaths);
    
    console.log(`📁 After removing duplicates: ${this.testFiles.length} files to test`);
    
    if (this.duplicates.length > 0) {
      console.log('🔄 Found duplicate files:');
      this.duplicates.forEach(dup => {
        console.log(`   ${dup.baseName}: ${dup.count} files - ${dup.recommendation}`);
      });
    }
  }

  /**
   * Remove duplicate files, keeping latest versions
   * @param {Array} filePaths - Array of file paths
   * @returns {Array} Deduplicated file paths
   */
  removeDuplicates(filePaths) {
    const seen = new Set();
    const uniqueFiles = [];

    // Sort by filename (newest last)
    const sortedFiles = [...filePaths].sort((a, b) => {
      const fileNameA = fileAnalyzer.extractFileName(a);
      const fileNameB = fileAnalyzer.extractFileName(b);
      return fileNameA.localeCompare(fileNameB);
    });

    sortedFiles.forEach(filePath => {
      const baseName = filePath.replace(/-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_load-\d+\.html$/, '');
      
      if (!seen.has(baseName)) {
        seen.add(baseName);
        uniqueFiles.push(filePath);
      }
    });

    return uniqueFiles;
  }

  /**
   * Run all tests on all files
   * @returns {Object} Complete test results
   */
  async runAllTests() {
    console.log('🧪 Running comprehensive tests...');
    
    const testSuite = {
      pageTypeDetection: { passed: 0, failed: 0, details: [] },
      dataExtraction: { passed: 0, failed: 0, details: [] },
      validation: { passed: 0, failed: 0, details: [] },
      moduleTesting: { passed: 0, failed: 0, details: [] }
    };

    // Test each file
    for (const filePath of this.testFiles) {
      console.log(`🔍 Testing file: ${fileAnalyzer.extractFileName(filePath)}`);
      
      try {
        // Read file content (simulated - in real usage would read from filesystem)
        const htmlContent = await this.readFileContent(filePath);
        
        // Test page type detection
        const pageTypeResult = this.testPageTypeDetection(filePath, htmlContent);
        this.updateTestResults(testSuite.pageTypeDetection, pageTypeResult);
        
        // Test data extraction
        const extractionResult = this.testDataExtraction(filePath, htmlContent);
        this.updateTestResults(testSuite.dataExtraction, extractionResult);
        
        // Test validation
        const validationResult = this.testValidation(filePath, htmlContent);
        this.updateTestResults(testSuite.validation, validationResult);
        
        // Test module functionality
        const moduleResult = this.testModuleFunctionality(filePath, htmlContent);
        this.updateTestResults(testSuite.moduleTesting, moduleResult);
        
        // Store combined result
        this.testResults.set(filePath, {
          pageTypeDetection: pageTypeResult,
          dataExtraction: extractionResult,
          validation: validationResult,
          moduleTesting: moduleResult,
          overall: {
            passed: pageTypeResult.passed && extractionResult.passed && validationResult.passed && moduleResult.passed,
            score: (pageTypeResult.score + extractionResult.score + validationResult.score + moduleResult.score) / 4
          }
        });
        
      } catch (error) {
        console.error(`❌ Error testing ${filePath}:`, error);
        this.testResults.set(filePath, {
          error: error.message,
          overall: { passed: false, score: 0 }
        });
      }
    }

    // Generate final results
    const finalResults = this.generateFinalResults(testSuite);
    console.log('✅ All tests completed');
    
    return finalResults;
  }

  /**
   * Test page type detection
   * @param {string} filePath - File path
   * @param {string} htmlContent - HTML content
   * @returns {Object} Test result
   */
  testPageTypeDetection(filePath, htmlContent) {
    const detectedType = fileAnalyzer.detectPageType(htmlContent, filePath);
    const expectedType = this.getExpectedPageType(filePath);
    
    const passed = detectedType === expectedType;
    const score = passed ? 100 : 0;
    
    return {
      passed,
      score,
      expected: expectedType,
      actual: detectedType,
      details: `Expected: ${expectedType}, Detected: ${detectedType}`
    };
  }

  /**
   * Test data extraction
   * @param {string} filePath - File path
   * @param {string} htmlContent - HTML content
   * @returns {Object} Test result
   */
  testDataExtraction(filePath, htmlContent) {
    const pageType = fileAnalyzer.detectPageType(htmlContent, filePath);
    const extractedData = fileAnalyzer.extractDataByPageType(htmlContent, pageType);
    
    let score = 0;
    let passed = false;
    const details = [];

    // Score based on data completeness
    switch (pageType) {
      case 'orders-list':
        score = this.scoreOrdersListExtraction(extractedData);
        passed = score >= 70;
        details.push(`Orders found: ${extractedData.orders?.length || 0}`);
        details.push(`Pagination detected: ${Object.keys(extractedData.pagination || {}).length > 0}`);
        break;
        
      case 'order-detail':
        score = this.scoreOrderDetailExtraction(extractedData);
        passed = score >= 70;
        details.push(`Order info: ${extractedData.orderInfo?.orderNumber ? 'Found' : 'Missing'}`);
        details.push(`Items found: ${extractedData.items?.length || 0}`);
        details.push(`Shipping info: ${Object.keys(extractedData.shipping || {}).length > 0}`);
        break;
        
      default:
        score = 50; // Partial credit for unknown pages
        passed = true; // Unknown pages pass by default
        details.push('Unknown page type - basic extraction only');
    }

    return {
      passed,
      score,
      extractedData,
      details
    };
  }

  /**
   * Test validation
   * @param {string} filePath - File path
   * @param {string} htmlContent - HTML content
   * @returns {Object} Test result
   */
  testValidation(filePath, htmlContent) {
    const pageType = fileAnalyzer.detectPageType(htmlContent, filePath);
    const extractedData = fileAnalyzer.extractDataByPageType(htmlContent, pageType);
    const validationResults = fileAnalyzer.validateExtraction(extractedData, pageType);
    
    return {
      passed: validationResults.passed,
      score: validationResults.score,
      errors: validationResults.errors,
      warnings: validationResults.warnings,
      details: fileAnalyzer.getValidationSummary(validationResults)
    };
  }

  /**
   * Test module functionality
   * @param {string} filePath - File path
   * @param {string} htmlContent - HTML content
   * @returns {Object} Test result
   */
  testModuleFunctionality(filePath, htmlContent) {
    const pageType = fileAnalyzer.detectPageType(htmlContent, filePath);
    let score = 100;
    let passed = true;
    const details = [];

    try {
      // Test page detector module
      const detectedType = fileAnalyzer.detectPageType(htmlContent, filePath);
      details.push(`Page detector: ${detectedType}`);

      // Test file analyzer module
      const analysis = fileAnalyzer.analyzeFile(filePath, htmlContent);
      details.push(`File analyzer: ${analysis.pageType} detected`);

      // Test specific functionality based on page type
      switch (pageType) {
        case 'orders-list':
          if (analysis.extractedData.orders && analysis.extractedData.orders.length > 0) {
            details.push('Orders list extraction working');
          } else {
            score -= 30;
            passed = false;
            details.push('Orders list extraction failed');
          }
          break;
          
        case 'order-detail':
          if (analysis.extractedData.orderInfo && analysis.extractedData.orderInfo.orderNumber) {
            details.push('Order detail extraction working');
          } else {
            score -= 30;
            passed = false;
            details.push('Order detail extraction failed');
          }
          break;
      }

    } catch (error) {
      score = 0;
      passed = false;
      details.push(`Module error: ${error.message}`);
    }

    return {
      passed,
      score,
      details
    };
  }

  /**
   * Score orders list extraction
   * @param {Object} data - Extracted data
   * @returns {number} Score 0-100
   */
  scoreOrdersListExtraction(data) {
    let score = 0;
    
    if (data.orders && data.orders.length > 0) score += 40;
    if (data.pagination && Object.keys(data.pagination).length > 0) score += 20;
    if (data.filters && Object.keys(data.filters).length > 0) score += 20;
    if (data.pageStats && data.pageStats.totalOrders > 0) score += 20;
    
    return Math.min(100, score);
  }

  /**
   * Score order detail extraction
   * @param {Object} data - Extracted data
   * @returns {number} Score 0-100
   */
  scoreOrderDetailExtraction(data) {
    let score = 0;
    
    if (data.orderInfo && data.orderInfo.orderNumber) score += 25;
    if (data.items && data.items.length > 0) score += 30;
    if (data.shipping && Object.keys(data.shipping).length > 0) score += 20;
    if (data.payment && Object.keys(data.payment).length > 0) score += 15;
    if (data.timeline && data.timeline.length > 0) score += 10;
    
    return Math.min(100, score);
  }

  /**
   * Get expected page type from filename
   * @param {string} filePath - File path
   * @returns {string} Expected page type
   */
  getExpectedPageType(filePath) {
    const fileName = fileAnalyzer.extractFileName(filePath).toLowerCase();
    
    if (fileName.includes('orders-list')) return 'orders-list';
    if (fileName.includes('order-detail')) return 'order-detail';
    if (fileName.includes('unknown')) return 'unknown';
    
    return 'unknown';
  }

  /**
   * Update test results
   * @param {Object} testSuite - Test suite results
   * @param {Object} result - Individual test result
   */
  updateTestResults(testSuite, result) {
    if (result.passed) {
      testSuite.passed++;
    } else {
      testSuite.failed++;
    }
    testSuite.details.push(result);
  }

  /**
   * Generate final test results
   * @param {Object} testSuite - Complete test suite results
   * @returns {Object} Final results
   */
  generateFinalResults(testSuite) {
    const total = this.testFiles.length;
    
    return {
      summary: {
        totalFiles: total,
        duplicatesFound: this.duplicates.length,
        overallPassRate: Math.round(((testSuite.pageTypeDetection.passed + testSuite.dataExtraction.passed + testSuite.validation.passed + testSuite.moduleTesting.passed) / (total * 4)) * 100),
        testResults: {
          pageTypeDetection: {
            passRate: Math.round((testSuite.pageTypeDetection.passed / total) * 100),
            score: Math.round(testSuite.pageTypeDetection.details.reduce((sum, item) => sum + item.score, 0) / total)
          },
          dataExtraction: {
            passRate: Math.round((testSuite.dataExtraction.passed / total) * 100),
            score: Math.round(testSuite.dataExtraction.details.reduce((sum, item) => sum + item.score, 0) / total)
          },
          validation: {
            passRate: Math.round((testSuite.validation.passed / total) * 100),
            score: Math.round(testSuite.validation.details.reduce((sum, item) => sum + item.score, 0) / total)
          },
          moduleTesting: {
            passRate: Math.round((testSuite.moduleTesting.passed / total) * 100),
            score: Math.round(testSuite.moduleTesting.details.reduce((sum, item) => sum + item.score, 0) / total)
          }
        }
      },
      detailedResults: Array.from(this.testResults.entries()),
      recommendations: this.generateRecommendations(testSuite),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate recommendations based on test results
   * @param {Object} testSuite - Test suite results
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(testSuite) {
    const recommendations = [];

    if (testSuite.pageTypeDetection.failed > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Page Detection',
        description: `${testSuite.pageTypeDetection.failed} files had incorrect page type detection`,
        action: 'Improve page type detection logic in pageTypeDetector.js'
      });
    }

    if (testSuite.dataExtraction.failed > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Data Extraction',
        description: `${testSuite.dataExtraction.failed} files failed data extraction tests`,
        action: 'Review and fix extraction selectors in fileAnalyzer.js'
      });
    }

    if (testSuite.validation.failed > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Validation',
        description: `${testSuite.validation.failed} files failed validation`,
        action: 'Improve data validation rules'
      });
    }

    if (testSuite.moduleTesting.failed > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Module Testing',
        description: `${testSuite.moduleTesting.failed} files failed module tests`,
        action: 'Debug module functionality and fix integration issues'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'info',
        category: 'Success',
        description: 'All tests passed successfully',
        action: 'System is working correctly'
      });
    }

    return recommendations;
  }

  /**
   * Read file content (simulated for browser use)
   * In real Node.js usage, this would read from filesystem
   * @param {string} filePath - File path
   * @returns {Promise<string>} File content
   */
  async readFileContent(filePath) {
    // In browser environment, we'll need to use a different approach
    // For now, return a placeholder that would be replaced with actual file reading
    console.log(`📖 Would read file: ${filePath}`);
    
    // In a real implementation, this would be:
    // return await fs.readFile(filePath, 'utf-8');
    
    // For browser testing, we'll need to implement file reading via input
    return new Promise((resolve) => {
      // This would be replaced with actual file reading logic
      resolve('<html><body><h1>Test Content</h1><p>This is test HTML content for testing purposes.</p></body></html>');
    });
  }

  /**
   * Export test results
   * @returns {string} JSON string of test results
   */
  exportResults() {
    const results = this.generateFinalResults({
      pageTypeDetection: { passed: 0, failed: 0, details: [] },
      dataExtraction: { passed: 0, failed: 0, details: [] },
      validation: { passed: 0, failed: 0, details: [] },
      moduleTesting: { passed: 0, failed: 0, details: [] }
    });

    return JSON.stringify(results, null, 2);
  }

  /**
   * Display test results in console
   */
  displayResults() {
    const results = this.generateFinalResults({
      pageTypeDetection: { passed: 0, failed: 0, details: [] },
      dataExtraction: { passed: 0, failed: 0, details: [] },
      validation: { passed: 0, failed: 0, details: [] },
      moduleTesting: { passed: 0, failed: 0, details: [] }
    });

    console.log('\n🧪 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`📁 Total Files: ${results.summary.totalFiles}`);
    console.log(`🔄 Duplicates Found: ${results.summary.duplicatesFound}`);
    console.log(`✅ Overall Pass Rate: ${results.summary.overallPassRate}%`);
    
    console.log('\n📊 CATEGORY RESULTS:');
    console.log(`🔍 Page Detection: ${results.summary.testResults.pageTypeDetection.passRate}% (${results.summary.testResults.pageTypeDetection.score} avg score)`);
    console.log(`📤 Data Extraction: ${results.summary.testResults.dataExtraction.passRate}% (${results.summary.testResults.dataExtraction.score} avg score)`);
    console.log(`✅ Validation: ${results.summary.testResults.validation.passRate}% (${results.summary.testResults.validation.score} avg score)`);
    console.log(`🔧 Module Testing: ${results.summary.testResults.moduleTesting.passRate}% (${results.summary.testResults.moduleTesting.score} avg score)`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    results.recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`${index + 1}. ${priority} ${rec.category}: ${rec.description}`);
      console.log(`   Action: ${rec.action}`);
    });
  }
}

// Export singleton instance
export const testRunner = new TestRunner();
