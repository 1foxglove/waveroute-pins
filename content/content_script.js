/**
 * PinPasta Plus - Content Script
 * Handles Pinterest DOM scraping, high-res image URL resolution, and auto-scrolling.
 */

(function () {
  if (window.__pinpasta_script_injected) return;
  window.__pinpasta_script_injected = true;

  let isScanning = false;
  let scrollTimer = null;
  let collectedPinsMap = new Map(); // key: pinId or cleanOriginalUrl

  // Helper to convert Pinterest thumbnail URLs to original full resolution
  function getOriginalImageUrl(src) {
    if (!src || typeof src !== 'string') return null;
    // Replace standard thumbnail size path segments with '/originals/'
    // e.g., https://i.pinimg.com/236x/ab/cd/ef/filename.jpg -> https://i.pinimg.com/originals/ab/cd/ef/filename.jpg
    return src.replace(/\/(170x|236x|474x|564x|736x|1200x)\//i, '/originals/');
  }

  // Extract unique ID from Pinterest Pin URL or Image URL
  function extractPinId(imgSrc, pinAnchorHref) {
    if (pinAnchorHref) {
      const match = pinAnchorHref.match(/\/pin\/(\d+)\//);
      if (match && match[1]) return match[1];
    }
    if (imgSrc) {
      const filenameMatch = imgSrc.match(/\/([a-f0-9]{32}|[a-f0-9]{24,32})\./i);
      if (filenameMatch && filenameMatch[1]) return filenameMatch[1];
      const match = imgSrc.match(/\/([^\/]+)$/);
      if (match && match[1]) return match[1].split('.')[0];
    }
    return 'pin_' + Math.random().toString(36).substring(2, 9);
  }

  // Scan current DOM for Pinterest pins
  function scanDOMPins() {
    const images = Array.from(document.querySelectorAll('img[src*="pinimg.com"]'));
    const newPins = [];

    images.forEach((img) => {
      const src = img.src || img.getAttribute('src');
      if (!src || src.includes('user/')) return; // skip user avatars

      const originalUrl = getOriginalImageUrl(src);
      if (!originalUrl) return;

      // Find closest anchor tag or pin container if available
      const container = img.closest('[data-test-id="pin"]') || img.closest('a[href*="/pin/"]') || img.parentElement;
      const anchor = container ? (container.tagName === 'A' ? container : container.querySelector('a[href*="/pin/"]')) : null;
      const pinHref = anchor ? anchor.getAttribute('href') : null;
      const pinUrl = pinHref ? (pinHref.startsWith('http') ? pinHref : 'https://www.pinterest.com' + pinHref) : window.location.href;

      const pinId = extractPinId(src, pinHref);
      const title = img.alt || img.getAttribute('aria-label') || container?.textContent?.trim()?.slice(0, 60) || `Pin ${pinId}`;

      if (!collectedPinsMap.has(pinId) && !collectedPinsMap.has(originalUrl)) {
        const pinObj = {
          id: pinId,
          thumbUrl: src,
          originalUrl: originalUrl,
          title: title,
          pinUrl: pinUrl,
          timestamp: Date.now()
        };
        collectedPinsMap.set(pinId, pinObj);
        collectedPinsMap.set(originalUrl, pinObj);
        newPins.push(pinObj);
      }
    });

    return Array.from(new Set(collectedPinsMap.values()));
  }

  // Auto-scroll loop to trigger lazy loading of pins up to targetLimit
  async function startAutoScroll(targetLimit = 50, scrollDelay = 800) {
    isScanning = true;
    let noNewPinsCount = 0;
    let lastPinCount = 0;

    sendProgressMessage('scanning', targetLimit);

    while (isScanning) {
      const currentPins = scanDOMPins();

      // Check if target count is reached
      if (targetLimit > 0 && currentPins.length >= targetLimit) {
        isScanning = false;
        sendProgressMessage('completed', targetLimit, currentPins.slice(0, targetLimit));
        break;
      }

      sendProgressMessage('scanning', targetLimit, currentPins);

      // Check if new pins were loaded
      if (currentPins.length === lastPinCount) {
        noNewPinsCount++;
        if (noNewPinsCount >= 6) { // Tried 6 times without new pins, page end reached
          isScanning = false;
          sendProgressMessage('completed', targetLimit, currentPins);
          break;
        }
      } else {
        noNewPinsCount = 0;
        lastPinCount = currentPins.length;
      }

      // Scroll down by 800px or to document height
      window.scrollBy({ top: 800, behavior: 'smooth' });

      // Wait for lazy load
      await new Promise((resolve) => setTimeout(resolve, scrollDelay));
    }
  }

  function stopAutoScroll() {
    isScanning = false;
    if (scrollTimer) clearTimeout(scrollTimer);
    const currentPins = Array.from(new Set(collectedPinsMap.values()));
    sendProgressMessage('stopped', 0, currentPins);
  }

  function sendProgressMessage(status, targetLimit, pins = null) {
    const pinList = pins || Array.from(new Set(collectedPinsMap.values()));
    try {
      chrome.runtime.sendMessage({
        action: 'PINPASTA_PROGRESS',
        status: status,
        target: targetLimit,
        count: pinList.length,
        pins: pinList
      });
    } catch (e) {
      // Extension popup might be closed or detached
    }
  }

  // Listen for control messages from popup / background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_SCAN') {
      const targetLimit = parseInt(request.limit, 10) || 0; // 0 = unlimited
      const delay = parseInt(request.delay, 10) || 800;
      if (!isScanning) {
        startAutoScroll(targetLimit, delay);
      }
      sendResponse({ status: 'started', count: collectedPinsMap.size });
    } else if (request.action === 'STOP_SCAN') {
      stopAutoScroll();
      sendResponse({ status: 'stopped', count: collectedPinsMap.size });
    } else if (request.action === 'GET_PINS') {
      const pins = scanDOMPins();
      sendResponse({ status: isScanning ? 'scanning' : 'idle', count: pins.length, pins: pins });
    } else if (request.action === 'CLEAR_PINS') {
      collectedPinsMap.clear();
      sendResponse({ status: 'cleared' });
    }
    return true;
  });

  console.log('PinPasta Plus Content Script Loaded on Pinterest.');
})();
