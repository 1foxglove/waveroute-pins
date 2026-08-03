/**
 * PinPasta Plus - Background Service Worker
 * Handles extension lifecycle, message routing, and downloading tasks.
 */

// Listener for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('PinPasta Plus Extension Installed successfully.');
});

// Listener for messages from Popup or Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'FETCH_IMAGE_BLOB') {
    // Fetch image as blob to bypass potential CORS restrictions in content script
    fetch(message.url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ success: true, dataUrl: reader.result, type: blob.type });
        };
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // async response
  } else if (message.action === 'TRIGGER_DOWNLOAD') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || 'pinterest_image.jpg',
      saveAs: false
    }, (downloadId) => {
      sendResponse({ success: !!downloadId, downloadId: downloadId });
    });
    return true;
  }
});
