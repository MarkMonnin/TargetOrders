@echo off
echo.
echo ========================================
echo   Target Orders Extension Tests
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo SUCCESS: Node.js found
echo.

REM Check if test-runner.js exists
if not exist "test-runner.js" (
    echo ERROR: test-runner.js not found in current directory
    echo.
    echo Please run this batch file from the project root directory
    echo.
    pause
    exit /b 1
)

echo.
echo Running tests...
echo.

REM Run the test runner and capture its exit code
node test-runner.js %*
set TEST_EXIT_CODE=%ERRORLEVEL%

echo.
if %TEST_EXIT_CODE% EQU 0 (
    REM Tests ran successfully - show results
    echo ========================================
    echo    Testing Complete!
    echo ========================================
    echo.
    echo Test Summary:
    echo    - Page Type Detection: Validates orders-list vs order-detail pages
    echo    - Data Extraction: Checks order info, items, shipping, payment data
    echo    - Validation: Ensures data completeness and quality
    echo    - Module Testing: Verifies all modules work correctly
    echo.
    echo Check the console output above for detailed test results and recommendations
) else (
    REM Tests failed - show error message
    echo ========================================
    echo    Testing Failed
    echo ========================================
    echo.
    echo This could mean:
    echo    - No HTML files were found in TargetOrders-Captures directory
    echo    - Test runner encountered an error
    echo.
    echo To capture and test files:
    echo    1. Load the Target Orders extension in Chrome
    echo    2. Browse to Target.com orders and order pages
    echo    3. Files will be automatically saved to TargetOrders-Captures directory
    echo    4. Run this batch file again to test the captured files
)

echo.
echo Press any key to exit...
pause
