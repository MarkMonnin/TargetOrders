# 🎯 Target Orders Extension - Testing & Analysis Guide

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🧪 Testing System](#-testing-system)
  - [Chrome Extension Tests](#chrome-extension-tests)
  - [Standalone Node.js Tests](#standalone-nodejs-tests)
  - [Test Results](#test-results)
- [🔧 Module Development](#-module-development)
- [📊 File Analysis](#-file-analysis)
- [🐛 Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ (for standalone testing)
- Target.com account (for capturing files)
- Chrome browser with extension loaded

### Basic Usage

1. **Load Extension**: Load the Target Orders Extension in Chrome
2. **Browse Target.com**: Navigate to orders and order pages
3. **Capture Files**: HTML files are automatically saved to `Downloads/TargetOrders-Captures/`
4. **Run Tests**: Use the testing commands below

---

## 🧪 Testing System

The extension includes comprehensive testing capabilities that work both in Chrome and offline environments.

### Chrome Extension Tests (Available Now)

Run these commands in the browser console (F12):

```javascript
// Analyze all captured files
await TargetOrdersDebug.analyzeCapturedFiles()

// Run simulated offline tests
await TargetOrdersDebug.runOfflineTests()

// Find and manage duplicate files
await TargetOrdersDebug.cleanupDuplicates()

// Test message passing to background script
await TargetOrdersDebug.testMessagePassing()
```

### Standalone Node.js Tests (New!)

For comprehensive offline testing without Chrome:

```bash
# Install dependencies (if needed)
npm install

# Run tests on default directory
npm test

# Run with custom options
npm run test:custom -- --input-dir ./my-captures --output-dir ./results

# Show help
npm run test:help
```

### Test Results

#### Chrome Extension Tests
Results appear in the browser console with detailed metrics:
- **Page Type Detection Accuracy**
- **Data Extraction Completeness** 
- **Validation Scores**
- **Module Integration Status**
- **Overall Success Rate**

#### Node.js Tests
Generates two output files:
- **JSON Report**: `test-results-[timestamp].json` with machine-readable results
- **HTML Report**: `test-report-[timestamp].html` with visual dashboard

---

## 📊 File Analysis

The testing system analyzes captured files for:

### Page Type Detection
- **Orders List**: `orders-list-*.html`
- **Order Detail**: `order-detail-*.html`
- **Invoice/Receipt**: `order-detail-*.html` (subset)

### Data Extraction Validation
- **Orders List**: Order numbers, dates, status, pagination
- **Order Detail**: Order info, items, shipping, payment, timeline
- **Receipt Data**: Line items, totals, taxes

### Duplicate Detection
- Groups files by base name (ignoring timestamps)
- Recommends keeping latest version
- Reports cleanup suggestions

---

## 🔧 Module Development

### Core Modules

1. **`pageTypeDetector.js`** - Identifies page types from URLs and DOM
2. **`htmlCaptureManager.js`** - Captures and saves HTML with deduplication
3. **`fileAnalyzer.js`** - Analyzes captured files and extracts data
4. **`testRunner.js`** - Runs comprehensive tests offline

### Integration Points

- **Message Passing**: Content script ↔ Background script communication
- **Storage Management**: Chrome storage API with quota handling
- **Download API**: Background script handles file downloads with subfolders
- **Module Loading**: Dynamic imports with cache-busting

---

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Loading
```bash
# Check service worker registration
# Look for errors in chrome://extensions/
# Reload extension after changes
```

#### Files Not Saving to Subfolder
```javascript
// Check permissions in manifest.json
// Verify "downloads" permission is present
// Test background script message passing
await TargetOrdersDebug.testMessagePassing()
```

#### Tests Failing
```bash
# Verify file paths are correct
# Check HTML content is not empty
# Run with --verbose flag for detailed logging
npm test --verbose
```

### Debug Commands

All debugging commands are available via `TargetOrdersDebug` object:

```javascript
// Check system status
TargetOrdersDebug.getSaveConfiguration()

// Test individual components
TargetOrdersDebug.testDownloadsAPI()
TargetOrdersDebug.testMessagePassing()

// Analyze captured files
TargetOrdersDebug.analyzeCapturedFiles()
TargetOrdersDebug.cleanupDuplicates()
```

---

## 📈 Performance Metrics

### Success Indicators
- ✅ **Page Detection**: >90% accuracy
- ✅ **Data Extraction**: >70% completeness score
- ✅ **Validation**: >80% pass rate
- ✅ **Module Integration**: All modules working correctly

### File Organization
- 📁 **Subfolder**: `TargetOrders-Captures/`
- 🏷️ **Timestamp Format**: `YYYY-MM-DD_HH-MM-SS_load-N.html`
- 🔄 **Deduplication**: Automatic duplicate detection and cleanup

---

## 🎯 Usage Workflow

1. **Development**: Use Chrome extension tests for rapid iteration
2. **Capture**: Browse Target.com to collect test data
3. **Analysis**: Run `analyzeCapturedFiles()` to validate captures
4. **Testing**: Execute `runOfflineTests()` for comprehensive validation
5. **Batch Testing**: Use Node.js runner for large file sets
6. **Refinement**: Fix issues identified by testing system

This testing system provides comprehensive validation of the Target Orders extension's functionality and data extraction capabilities.
