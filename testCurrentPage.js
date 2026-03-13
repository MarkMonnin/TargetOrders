// Test script to trigger current page processing
chrome.runtime.sendMessage({ action: 'processCurrentPage' }, (response) => {
  console.log('Current page processing response:', response);
});
