# Target Orders Extractor

A Chrome extension that extracts and filters Target orders by date range, providing comprehensive CSV export functionality.

## 🚀 Features

- **Comprehensive Order Extraction**: Processes both Online and In-store Target orders
- **Date Range Filtering**: Filter orders by custom date ranges (defaults to last 30 days)
- **Detailed Item Information**: Extracts item names, quantities, prices, and order metadata
- **Real-time Progress Tracking**: Visual progress indicators and detailed statistics
- **CSV Export**: Automatic CSV generation with proper formatting and headers
- **HTML Preservation**: Saves complete order HTML for verification and audit purposes
- **Modular Architecture**: Clean, maintainable ES modules-based codebase
- **Error Recovery**: Comprehensive error handling with retry logic

## 📋 Requirements

- Google Chrome browser
- Target.com account with order history
- Manifest V3 compatible Chrome extension support

## 🛠️ Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/MarkMonnin/target-orders-extractor.git
   cd target-orders-extractor
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top right)

4. Click **Load unpacked** and select the extension directory

5. The Target Orders Extractor icon will appear in your browser toolbar

## 📖 Usage

### Basic Usage

1. **Navigate to Target.com** and log in to your account
2. **Go to Orders page** in your Target account
3. **Click the extension icon** in your browser toolbar
4. **Select date range** (defaults to last 30 days)
5. **Click "Extract Orders"** to begin processing
6. **Monitor progress** as orders are processed in the background
7. **Download CSV file** when processing is complete
8. **Review extracted data** including items, prices, and order information

### Advanced Features

- **Real-time Progress**: View processing statistics and current/total counts
- **Error Handling**: Automatic retry logic for network issues and timeouts
- **Data Verification**: Complete HTML preservation for audit purposes
- **Bulk Processing**: Efficient handling of large order histories

## 🏗️ Architecture

### Modular Structure

```
target-orders-extractor/
├── manifest.json              # Extension configuration
├── background.js               # Main service worker entry point
├── modules/                   # Modular components
│   ├── messageHandlers.js     # Message routing and handling
│   ├── orderProcessor.js      # Order page processing
│   ├── contentScriptFunctions.js  # Content script execution
│   ├── extractionRunner.js    # Extraction coordination
│   └── receiptModal.js        # Receipt UI management
├── content.js                 # Main content script
├── popup.html                 # User interface
├── popup.js                   # UI interactions
├── htmlSaver.js               # HTML storage utilities
├── saveOrderHtml.js           # HTML processing
└── README.md                  # This file
```

### Core Components

#### Background Script (Modular)
- **Main Entry Point**: Initializes all modules and handles receipt data
- **Message Handlers**: Routes all incoming messages from popup and content scripts
- **Order Processor**: Manages tab creation, processing, and cleanup
- **Content Script Functions**: Executes extraction logic in page context
- **Extraction Runner**: Coordinates extraction workflow
- **Receipt Modal**: Manages receipt preview UI

#### Content Script
- **Order Discovery**: Identifies orders and handles pagination
- **Data Extraction**: Processes order details and item information
- **Progress Tracking**: Provides real-time updates to popup
- **Communication**: Coordinates with background script

#### Popup Interface
- **Date Selection**: Intuitive date range picker
- **Progress Display**: Visual indicators and statistics
- **Results Management**: CSV download and data review

## 🔧 Technical Details

### Technologies Used
- **Chrome Extension Manifest V3**
- **ES Modules** for modular architecture
- **Service Worker** for background processing
- **Chrome Storage API** for data persistence
- **Dynamic Content Script Injection**

### Key Features
- **Modular Design**: Clean separation of concerns
- **Error Recovery**: Comprehensive retry logic and error handling
- **Performance Optimization**: Efficient DOM parsing and memory management
- **Privacy-First**: Local storage only, no external data transmission
- **Rate Limiting**: Respectful scraping with controlled delays

## 📊 Data Flow

1. **User Interaction**: Select date range in popup
2. **Order Discovery**: Content script finds and filters orders
3. **Background Processing**: Creates tabs for detailed extraction
4. **Data Collection**: Extracts items, prices, and metadata
5. **CSV Generation**: Formats and prepares export data
6. **User Delivery**: Downloads CSV file with results

## 🛡️ Privacy & Security

- **Local Storage Only**: No data transmitted to external servers
- **Order Information Only**: Extracts only necessary order data
- **Secure Tab Management**: Proper cleanup and resource management
- **No Personal Data**: Beyond order information required for functionality

## 🐛 Troubleshooting

### Common Issues

**Extension Not Loading**
- Ensure Developer mode is enabled in Chrome extensions
- Check for manifest.json syntax errors
- Verify all required files are present

**Orders Not Found**
- Ensure you're logged into Target.com
- Navigate to the Orders page before using extension
- Check date range includes orders you expect to find

**Processing Errors**
- Network issues may cause timeouts (automatic retry enabled)
- Large order histories may take longer to process
- Check browser console for detailed error messages

**CSV Download Issues**
- Ensure browser allows downloads from extensions
- Check download folder permissions
- Verify popup permissions for file access

### Debug Mode

Enable console logging:
1. Open Chrome Developer Tools (F12)
2. Go to Console tab
3. Filter for extension messages
4. Look for detailed processing information

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Standards
- Use ES6+ features and modules
- Follow existing code style
- Add comprehensive error handling
- Include comments for complex logic
- Test all functionality

### Areas for Improvement
- [ ] Enhanced error reporting
- [ ] Additional export formats (JSON, XML)
- [ ] Order categorization and tagging
- [ ] Advanced filtering options
- [ ] Data visualization dashboard
- [ ] Automated testing suite

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Target.com for providing order history access
- Chrome Extension documentation and community
- Open source contributors and testers

## 📞 Support

For issues, questions, or feature requests:
1. Check existing [Issues](https://github.com/MarkMonnin/target-orders-extractor/issues)
2. Create a new issue with detailed information
3. Include browser version and error messages
4. Provide steps to reproduce any problems

---

**Disclaimer**: This extension is for personal use only. Please respect Target's terms of service and use responsibly.
