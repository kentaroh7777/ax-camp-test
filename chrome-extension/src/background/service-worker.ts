// Background Service Worker
console.log('Multi-Channel Reply Assistant Service Worker loaded')

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed')
})

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request)
  sendResponse({ success: true })
})

export {}