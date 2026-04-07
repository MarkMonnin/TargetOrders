# 🧪 How to Run Tests

## Quick Start

### Main Batch File
```batch
run-tests.bat
```
- Runs tests with clear output
- **Displays results directly in console**
- **Pauses at the end** to review results
- Best for most users

## What Happens When You Run Tests

### 1. File Discovery
The system searches for HTML files in:
- Default: `./test-results/` (same directory as batch file)
- Custom: Use `--input-dir ./your-folder`

### 2. Comprehensive Testing
Each file is tested for:
- ✅ **Page Type Detection** - Correctly identifies page types
- 📤 **Data Extraction** - Extracts orders, items, shipping, payment
- ✅ **Validation** - Checks data completeness and quality
- 🔧 **Module Testing** - Verifies all modules work correctly

### 3. Results Display
Test results are displayed directly in the console:
- 📊 **Test Summary** - Shows total files and pass rates
- 📈 **Category Results** - Breakdown by test type with scores
- 💡 **Recommendations** - Specific actions to improve

### 4. Output with Pause
The batch file shows:
- 📊 **Test Summary** - What was tested and results
- � **Console Output** - Where to find detailed results
- ⏸️ **Pause** - Time to review before closing

## Example Output

When tests complete, you'll see:
```
========================================
   Testing Complete!
========================================

Test Summary:
   - Page Type Detection: Validates orders-list vs order-detail pages
   - Data Extraction: Checks order info, items, shipping, payment data
   - Validation: Ensures data completeness and quality
   - Module Testing: Verifies all modules work correctly

Check the console output above for detailed test results and recommendations

Press any key to exit...
```

## Next Steps

1. **Review Console Output** - All test results are shown above
2. **Check Recommendations** - Look for specific improvement suggestions
3. **Fix Issues** - Address any problems identified by tests
4. **Re-run Tests** - Validate fixes with another test run

## Troubleshooting

### No Files Found
```
No HTML files found in test-results directory
This could mean:
- No HTML files were found in the test directory
- Tests ran but no files to test

To capture and test files:
1. Load the Target Orders extension in Chrome
2. Browse to Target.com orders and order pages
3. Files will be automatically saved to test-results directory
4. Run this batch file again to test the captured files
```

### Node.js Not Found
```
ERROR: Node.js is not installed or not in PATH
Please install Node.js from https://nodejs.org/
```

### Module Errors
```
ERROR: test-runner.js not found in current directory
Please run this batch file from the project root directory
```

### Pause Not Working
If the batch file doesn't pause properly:
1. Run directly from Command Prompt instead of double-clicking
2. Check if your antivirus is blocking the pause

The testing system provides comprehensive validation of your Target Orders extension functionality!
