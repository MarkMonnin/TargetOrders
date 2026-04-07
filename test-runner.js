#!/usr/bin/env node

/**
 * Standalone Test Runner for Target Orders Extension
 * Tests captured HTML files without requiring Chrome extension
 * Usage: node test-runner.js --input-dir ./TargetOrders-Captures/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import modules (adapted for Node.js)
import { FileAnalyzer } from './modules/fileAnalyzer.js';

class TestRunner {
  constructor() {
    this.fileAnalyzer = new FileAnalyzer();
    this.testResults = [];
    this.options = {
      inputDir: './TargetOrders-Captures',
      outputDir: './test-results',
      verbose: false,
      htmlOnly: false
    };
  }

  /**
   * Parse command line arguments
   * @param {Array} args - Command line arguments
   */
  parseArguments(args) {
    const parsed = {
      inputDir: './TargetOrders-Captures',
      outputDir: './test-results',
      verbose: false,
      htmlOnly: true,
      help: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--input-dir':
        case '-i':
          parsed.inputDir = args[++i];
          break;
        case '--output-dir':
        case '-o':
          parsed.outputDir = args[++i];
          break;
        case '--verbose':
        case '-v':
          parsed.verbose = true;
          break;
        case '--html-only':
          parsed.htmlOnly = true;
          break;
        case '--help':
        case '-h':
          parsed.help = true;
          break;
      }
    }

    return parsed;
  }

  /**
   * Show usage information
   */
  showUsage() {
    console.log('🧪 Target Orders Extension Test Runner');
    console.log('====================================');
    console.log('');
    console.log('USAGE:');
    console.log('  node test-runner.js [options]');
    console.log('');
    console.log('OPTIONS:');
    console.log('  -i, --input-dir <dir>    Input directory with captured HTML files');
    console.log('  -o, --output-dir <dir>   Output directory for test results');
    console.log('  -v, --verbose             Enable verbose logging');
    console.log('  --html-only               Test HTML files only (skip images, etc.)');
    console.log('  -h, --help               Show this help message');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  node test-runner.js                                    # Test default directory');
    console.log('  node test-runner.js -i ./my-captures -o ./results   # Custom directories');
    console.log('  node test-runner.js --verbose                          # Verbose output');
    console.log('');
    console.log('FEATURES:');
    console.log('  📊 Reporting         - Generates detailed reports and recommendations');
    console.log('  🧹 Duplicate Detection - Identifies and manages duplicate files');
    console.log('  📈 Scoring          - Quantifies test performance metrics');
  }

  /**
   * Find all HTML files in directory recursively
   * @param {string} dir - Directory to search
   * @returns {Array} Array of file paths
   */
  findHTMLFiles(dir) {
    const files = [];
    
    function scanDirectory(currentDir) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          files.push(...scanDirectory(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
          // Add HTML files
          files.push(fullPath);
        }
      }
    }
    
    try {
      scanDirectory(dir);
    } catch (error) {
      console.error(`❌ Error scanning directory ${dir}:`, error.message);
    }
    
    return files;
  }

  /**
   * Read file content
   * @param {string} filePath - Path to file
   * @returns {string} File content
   */
  readFileContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`❌ Error reading file ${filePath}:`, error.message);
      return '';
    }
  }

  /**
   * Run comprehensive tests on all files
   * @param {Array} filePaths - Array of file paths
   * @returns {Object} Complete test results
   */
  async runTests(filePaths) {
    console.log(`🧪 Starting comprehensive test run on ${filePaths.length} files...`);
    
    const testSuite = {
      pageTypeDetection: { passed: 0, failed: 0, details: [], scores: [] },
      dataExtraction: { passed: 0, failed: 0, details: [], scores: [] },
      validation: { passed: 0, failed: 0, details: [], scores: [] },
      moduleTesting: { passed: 0, failed: 0, details: [], scores: [] }
    };

    // Test each file
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      
      if (this.options.verbose) {
        console.log(`🔍 Testing file: ${fileName}`);
      }
      
      try {
        const htmlContent = this.readFileContent(filePath);
        
        if (!htmlContent) {
          console.warn(`⚠️ Skipping empty file: ${fileName}`);
          continue;
        }
        
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
        this.testResults.push({
          filePath,
          fileName,
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
        console.error(`❌ Error testing ${fileName}:`, error.message);
        this.testResults.push({
          filePath,
          fileName,
          error: error.message,
          overall: { passed: false, score: 0 }
        });
      }
    }

    // Generate final results
    const finalResults = this.generateFinalResults(testSuite, filePaths.length);
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
    const detectedType = this.fileAnalyzer.detectPageType(htmlContent, filePath);
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
    const pageType = this.fileAnalyzer.detectPageType(htmlContent, filePath);
    const extractedData = this.fileAnalyzer.extractDataByPageType(htmlContent, pageType);
    
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
    const pageType = this.fileAnalyzer.detectPageType(htmlContent, filePath);
    const extractedData = this.fileAnalyzer.extractDataByPageType(htmlContent, pageType);
    const validationResults = this.fileAnalyzer.validateExtraction(extractedData, pageType);
    
    return {
      passed: validationResults.passed,
      score: validationResults.score,
      errors: validationResults.errors,
      warnings: validationResults.warnings,
      details: this.fileAnalyzer.getValidationSummary(validationResults)
    };
  }

  /**
   * Test module functionality
   * @param {string} filePath - File path
   * @param {string} htmlContent - HTML content
   * @returns {Object} Test result
   */
  testModuleFunctionality(filePath, htmlContent) {
    const pageType = this.fileAnalyzer.detectPageType(htmlContent, filePath);
    let score = 100;
    let passed = true;
    const details = [];

    try {
      // Test file analyzer module
      const analysis = this.fileAnalyzer.analyzeFile(filePath, htmlContent);
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
   * Get expected page type from filename
   * @param {string} filePath - File path
   * @returns {string} Expected page type
   */
  getExpectedPageType(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('orders-list')) return 'orders-list';
    if (fileName.includes('order-detail')) return 'order-detail';
    if (fileName.includes('unknown')) return 'unknown';
    
    return 'unknown';
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
   * @param {number} totalFiles - Total files tested
   * @returns {Object} Final results
   */
  generateFinalResults(testSuite, totalFiles) {
    const finalResults = {
      summary: {
        totalFiles,
        duplicatesFound: 0, // Will be updated separately
        overallPassRate: Math.round(((testSuite.pageTypeDetection.passed + testSuite.dataExtraction.passed + testSuite.validation.passed + testSuite.moduleTesting.passed) / (totalFiles * 4)) * 100),
        testResults: {
          pageTypeDetection: {
            passRate: Math.round((testSuite.pageTypeDetection.passed / totalFiles) * 100),
            score: testSuite.pageTypeDetection.scores.length > 0 ? Math.round(testSuite.pageTypeDetection.scores.reduce((sum, item) => sum + item.score, 0) / testSuite.pageTypeDetection.scores.length) : 0
          },
          dataExtraction: {
            passRate: Math.round((testSuite.dataExtraction.passed / totalFiles) * 100),
            score: testSuite.dataExtraction.scores.length > 0 ? Math.round(testSuite.dataExtraction.scores.reduce((sum, item) => sum + item.score, 0) / testSuite.dataExtraction.scores.length) : 0
          },
          validation: {
            passRate: Math.round((testSuite.validation.passed / totalFiles) * 100),
            score: testSuite.validation.scores.length > 0 ? Math.round(testSuite.validation.scores.reduce((sum, item) => sum + item.score, 0) / testSuite.validation.scores.length) : 0
          },
          moduleTesting: {
            passRate: Math.round((testSuite.moduleTesting.passed / totalFiles) * 100),
            score: testSuite.moduleTesting.scores.length > 0 ? Math.round(testSuite.moduleTesting.scores.reduce((sum, item) => sum + item.score, 0) / testSuite.moduleTesting.scores.length) : 0
          }
        }
      },
      detailedResults: this.testResults,
      recommendations: this.generateRecommendations(testSuite),
      timestamp: new Date().toISOString(),
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        testDuration: process.uptime()
      }
    };

    // Find duplicates
    const duplicates = this.fileAnalyzer.findDuplicates(this.testResults.map(r => r.filePath));
    if (duplicates.length > 0) {
      finalResults.summary.duplicatesFound = duplicates.length;
      finalResults.duplicates = duplicates;
    }

    return finalResults;
  }

  /**
   * Generate recommendations based on test results
   * @param {Object} testSuite - Complete test suite results
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(testSuite) {
    const recommendations = [];
    const total = testSuite.pageTypeDetection.passed + testSuite.dataExtraction.passed + testSuite.validation.passed + testSuite.moduleTesting.passed;

    if (testSuite.pageTypeDetection.failed > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Page Detection',
        description: `${testSuite.pageTypeDetection.failed} files had incorrect page type detection`,
        action: 'Improve page type detection logic in pageTypeDetector.js',
        affectedFiles: testSuite.pageTypeDetection.details.filter(d => !d.passed).map(d => d.fileName)
      });
    }

    if (testSuite.dataExtraction.failed > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Data Extraction',
        description: `${testSuite.dataExtraction.failed} files failed data extraction tests`,
        action: 'Review and fix extraction selectors in fileAnalyzer.js',
        affectedFiles: testSuite.dataExtraction.details.filter(d => !d.passed).map(d => d.fileName)
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
        description: `All ${total} tests passed successfully`,
        action: 'System is working correctly'
      });
    }

    return recommendations;
  }

  /**
   * Save test results to file
   * @param {Object} results - Test results to save
   * @param {string} outputPath - Output directory
   */
  saveResults(results, outputPath) {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      const timestampNow = Date.now();
      const resultsFile = path.join(outputPath, `test-results-${timestampNow}.json`);
      const reportFile = path.join(outputPath, `test-report-${timestampNow}.html`);

      // Write JSON results
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

      // Generate HTML report
      const htmlReport = this.generateHTMLReport(results);
      fs.writeFileSync(reportFile, htmlReport);

      console.log(`📄 Results saved:`);
      console.log(`   JSON: ${resultsFile}`);
      console.log(`   HTML: ${reportFile}`);

    } catch (error) {
      console.error('❌ Error saving results:', error.message);
    }
  }

  /**
   * Generate HTML report
   * @param {Object} results - Test results
   * @returns {string} HTML report
   */
  generateHTMLReport(results) {
    const { summary, detailedResults, recommendations } = results;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Target Orders Extension - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .metric .label { font-size: 12px; color: #666; margin-top: 5px; }
        .details { margin-top: 30px; }
        .file-list { max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; }
        .file-item { padding: 10px; border-bottom: 1px solid #eee; }
        .file-passed { background: #d4edda; }
        .file-failed { background: #f8d7da; }
        .recommendations { margin-top: 30px; }
        .rec-item { padding: 15px; margin-bottom: 10px; border-left: 4px solid #ddd; }
        .high { border-left-color: #dc3545; }
        .medium { border-left-color: #ffc107; }
        .low { border-left-color: #28a745; }
        .info { border-left-color: #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Target Orders Extension Test Results</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>📁 Total Files</h3>
                <div class="value">${summary.totalFiles}</div>
                <div class="label">Files tested</div>
            </div>
            <div class="metric">
                <h3>✅ Overall Pass Rate</h3>
                <div class="value">${summary.overallPassRate}%</div>
                <div class="label">Success rate</div>
            </div>
            <div class="metric">
                <h3>🔄 Duplicates Found</h3>
                <div class="value">${summary.duplicatesFound}</div>
                <div class="label">Duplicate groups</div>
            </div>
            <div class="metric">
                <h3>🔍 Page Detection</h3>
                <div class="value">${summary.testResults.pageTypeDetection.passRate}%</div>
                <div class="label">Pass rate (${summary.testResults.pageTypeDetection.score} avg score)</div>
            </div>
            <div class="metric">
                <h3>📤 Data Extraction</h3>
                <div class="value">${summary.testResults.dataExtraction.passRate}%</div>
                <div class="label">Pass rate (${summary.testResults.dataExtraction.score} avg score)</div>
            </div>
            <div class="metric">
                <h3>✅ Validation</h3>
                <div class="value">${summary.testResults.validation.passRate}%</div>
                <div class="label">Pass rate (${summary.testResults.validation.score} avg score)</div>
            </div>
            <div class="metric">
                <h3>🔧 Module Testing</h3>
                <div class="value">${summary.testResults.moduleTesting.passRate}%</div>
                <div class="label">Pass rate (${summary.testResults.moduleTesting.score} avg score)</div>
            </div>
        </div>

        <div class="details">
            <h2>📋 Detailed Results</h2>
            <div class="file-list">
                ${detailedResults.map(result => `
                    <div class="file-item ${result.overall?.passed ? 'file-passed' : 'file-failed'}">
                        <div><strong>${result.fileName}</strong></div>
                        <div>Score: ${result.overall?.score || 0}/100</div>
                        <div>Page Type: ${result.pageTypeDetection?.actual || 'Unknown'}</div>
                        <div>Data Extraction: ${result.dataExtraction?.passed ? '✅' : '❌'} (${result.dataExtraction?.score || 0})</div>
                        <div>Validation: ${result.validation?.passed ? '✅' : '❌'} (${result.validation?.score || 0})</div>
                        <div>Modules: ${result.moduleTesting?.passed ? '✅' : '❌'} (${result.moduleTesting?.score || 0})</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            ${recommendations.map(rec => `
                <div class="rec-item ${rec.priority}">
                    <div><strong>${rec.category}:</strong> ${rec.description}</div>
                    <div>Action: ${rec.action}</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      console.log('🚀 Starting Target Orders Extension Test Runner');
      
      // Parse command line arguments
      const args = process.argv.slice(2);
      this.options = this.parseArguments(args);

      // Show help if requested
      if (this.options.help) {
        this.showUsage();
        return;
      }

      console.log(`📁 Input directory: ${this.options.inputDir}`);
      console.log(`📄 Output directory: ${this.options.outputDir}`);

      // Find all HTML files
      const htmlFiles = this.findHTMLFiles(this.options.inputDir);
      
      if (htmlFiles.length === 0) {
        console.log('❌ No HTML files found in input directory');
        console.log(`💡 Tip: Make sure your ${this.options.inputDir} directory contains captured HTML files`);
        console.log();
        console.log('🔧 To capture files:');
        console.log('   1. Load the Target Orders extension in Chrome');
        console.log('   2. Browse to Target.com orders and order pages');
        console.log(`   3. Files will be automatically saved to ${this.options.inputDir}/`);
        console.log();
        process.exit(1); // Exit with error code when no files found
      }

      console.log(`🔍 Found ${htmlFiles.length} HTML files to test`);

      // Find duplicates first
      const duplicates = this.fileAnalyzer.findDuplicates(htmlFiles);
      if (duplicates.length > 0) {
        console.log(`🔄 Found ${duplicates.length} duplicate groups:`);
        duplicates.forEach(dup => {
          console.log(`   ${dup.baseName}: ${dup.count} files`);
          console.log(`   Recommendation: ${dup.recommendation}`);
        });
      }

      // Remove duplicates, keep only latest versions
      const uniqueFiles = this.removeDuplicates(htmlFiles);
      console.log(`📁 After removing duplicates: ${uniqueFiles.length} files to test`);

      // Run comprehensive tests
      const results = await this.runTests(uniqueFiles);

      // Display results (don't save files)
      console.log('✅ Test run completed successfully!');
      console.log('');
      console.log('📊 Test Results Summary:');
      console.log(`   Total Files Tested: ${results.summary.totalFiles}`);
      console.log(`   Overall Pass Rate: ${results.summary.overallPassRate}%`);
      console.log('');
      console.log('📈 Category Results:');
      console.log(`   Page Type Detection: ${results.summary.testResults.pageTypeDetection.passRate}% (${results.summary.testResults.pageTypeDetection.score} avg score)`);
      console.log(`   Data Extraction: ${results.summary.testResults.dataExtraction.passRate}% (${results.summary.testResults.dataExtraction.score} avg score)`);
      console.log(`   Validation: ${results.summary.testResults.validation.passRate}% (${results.summary.testResults.validation.score} avg score)`);
      console.log(`   Module Testing: ${results.summary.testResults.moduleTesting.passRate}% (${results.summary.testResults.moduleTesting.score} avg score)`);
      
      if (results.recommendations && results.recommendations.length > 0) {
        console.log('');
        console.log('💡 Recommendations:');
        results.recommendations.forEach((rec, index) => {
          const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          console.log(`   ${index + 1}. ${priority} ${rec.category}: ${rec.description}`);
          console.log(`      Action: ${rec.action}`);
        });
      }

    } catch (error) {
      console.error('❌ Test run failed:', error.message);
      process.exit(1);
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
      const fileNameA = path.basename(a);
      const fileNameB = path.basename(b);
      return fileNameA.localeCompare(fileNameB);
    });

    sortedFiles.forEach(filePath => {
      const baseName = filePath.replace(/-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}_load-\d+\.html$/, '');
      
      if (!seen.has(baseName)) {
        seen.add(baseName);
        uniqueFiles.push(filePath);
      }
    });

    return uniqueFiles;
  }
}

// Main execution
const testRunner = new TestRunner();
testRunner.run();
