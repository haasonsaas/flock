/**
 * Flock Service Worker
 * Background script for extension coordination
 */

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup - this is handled by default_popup in manifest
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'openPopup':
      // Can't programmatically open popup, but we can open options page
      chrome.runtime.openOptionsPage();
      break;

    case 'getContactCount':
      // This would be handled by the popup directly accessing IndexedDB
      sendResponse({ count: 0 });
      break;

    case 'exportData':
      // Trigger export functionality
      handleExport(sendResponse);
      return true; // Will respond asynchronously

    default:
      console.log('[Flock] Unknown message action:', message.action);
  }
});

// Handle export
async function handleExport(sendResponse) {
  try {
    // The actual export happens in the popup/content script
    // This is just a coordinator
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Badge updates (show contact count)
async function updateBadge() {
  // Badge updates would go here
  // For now, we'll skip this as it requires more setup
}

// Install/update handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Flock] Extension installed');
    // Could open onboarding page here
  } else if (details.reason === 'update') {
    console.log('[Flock] Extension updated to version', chrome.runtime.getManifest().version);
  }
});

console.log('[Flock] Service worker initialized');
