// src/background.ts

// This is the extension's background service worker.
// It remains inactive until an event it listens for occurs.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Highlight Saver extension installed.');
});

// Example: Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    console.log('Received ping from:', sender.url);
    sendResponse({ status: 'PONG' });
  }
  // Return true if you want to respond asynchronously
  return false;
});
