/**
 * waveroute.pins - Popup Script (Spacious Green & Black Layout)
 * Handles UI interactions, state management, ZIP generation, and Figma link exporter.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const themeToggle = document.getElementById('themeToggle');
  const themeIconDark = document.getElementById('themeIconDark');
  const themeIconLight = document.getElementById('themeIconLight');

  const presetBtns = document.querySelectorAll('.preset-btn');
  const customLimitInput = document.getElementById('customLimit');

  const startScanBtn = document.getElementById('startScanBtn');
  const stopScanBtn = document.getElementById('stopScanBtn');

  const progressContainer = document.getElementById('progressContainer');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressStatus = document.getElementById('progressStatus');
  const progressCount = document.getElementById('progressCount');

  const pinCountBadge = document.getElementById('pinCountBadge');
  const downloadZipBtn = document.getElementById('downloadZipBtn');
  const copyFigmaBtn = document.getElementById('copyFigmaBtn');
  const selectedCountText = document.getElementById('selectedCountText');

  const toast = document.getElementById('toast');

  // State
  let currentTheme = 'dark';
  let selectedLimit = 25;
  let collectedPins = [];
  let activeTabId = null;
  let isScanning = false;

  // 1. Initialize Theme & Settings
  const savedSettings = await chrome.storage.local.get(['theme', 'lastLimit']);
  if (savedSettings.theme) {
    currentTheme = savedSettings.theme;
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcons();
  }
  if (savedSettings.lastLimit !== undefined) {
    selectedLimit = savedSettings.lastLimit;
    customLimitInput.value = selectedLimit;
    updatePresetActiveState(selectedLimit);
  }

  // Theme Switcher
  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    chrome.storage.local.set({ theme: currentTheme });
    updateThemeIcons();
  });

  function updateThemeIcons() {
    if (currentTheme === 'dark') {
      themeIconDark.classList.remove('hidden');
      themeIconLight.classList.add('hidden');
    } else {
      themeIconDark.classList.add('hidden');
      themeIconLight.classList.remove('hidden');
    }
  }

  // 2. Limit Preset Controls
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const limitVal = parseInt(btn.getAttribute('data-limit'), 10);
      selectedLimit = limitVal;
      customLimitInput.value = limitVal;
      updatePresetActiveState(limitVal);
      chrome.storage.local.set({ lastLimit: selectedLimit });
    });
  });

  customLimitInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    selectedLimit = val;
    updatePresetActiveState(val);
    chrome.storage.local.set({ lastLimit: selectedLimit });
  });

  function updatePresetActiveState(val) {
    presetBtns.forEach((btn) => {
      const btnVal = parseInt(btn.getAttribute('data-limit'), 10);
      if (btnVal === val) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // 3. Tab Check & Initialization
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && (tab.url.includes('pinterest.com') || tab.url.includes('pinterest.'))) {
    activeTabId = tab.id;
    try {
      chrome.tabs.sendMessage(activeTabId, { action: 'GET_PINS' }, (response) => {
        if (response && response.pins && response.pins.length > 0) {
          updatePinsData(response.pins);
        }
      });
    } catch (e) {
      // Content script not ready yet
    }
  } else {
    showToast('Open a Pinterest tab to scan pins');
  }

  // 4. Start / Stop Scanning Actions
  startScanBtn.addEventListener('click', async () => {
    if (!activeTabId) {
      showToast('Open a Pinterest tab to scan pins');
      return;
    }

    isScanning = true;
    toggleScanningUI(true);

    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ['content/content_script.js']
      }).catch(() => {});

      chrome.tabs.sendMessage(activeTabId, {
        action: 'START_SCAN',
        limit: selectedLimit,
        delay: 800
      }, (res) => {
        if (chrome.runtime.lastError) {
          showToast('Reload Pinterest page and try again');
          toggleScanningUI(false);
        }
      });
    } catch (err) {
      showToast('Could not connect to page');
      toggleScanningUI(false);
    }
  });

  stopScanBtn.addEventListener('click', () => {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { action: 'STOP_SCAN' });
    }
    isScanning = false;
    toggleScanningUI(false);
    showToast('Scan stopped');
  });

  function toggleScanningUI(scanning) {
    if (scanning) {
      startScanBtn.classList.add('hidden');
      stopScanBtn.classList.remove('hidden');
      progressContainer.classList.remove('hidden');
      progressStatus.textContent = 'Scanning board...';
    } else {
      startScanBtn.classList.remove('hidden');
      stopScanBtn.classList.add('hidden');
    }
  }

  // 5. Runtime Message Listener for Progress Updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'PINPASTA_PROGRESS') {
      const { status, target, count, pins } = message;

      if (pins) {
        updatePinsData(pins);
      }

      const targetVal = target > 0 ? target : Math.max(count, 100);
      const percent = Math.min(Math.round((count / targetVal) * 100), 100);
      progressBarFill.style.width = `${percent}%`;
      progressCount.textContent = target > 0 ? `${count} / ${target}` : `${count} pins`;

      if (status === 'completed' || status === 'stopped') {
        isScanning = false;
        toggleScanningUI(false);
        progressStatus.textContent = status === 'completed' ? 'Scan complete' : 'Scan stopped';
        showToast(status === 'completed' ? `Found ${count} HD pins` : 'Scan finished');
      }
    }
  });

  // 6. Pins Data Update Logic
  function updatePinsData(pins) {
    collectedPins = pins;
    const count = pins.length;
    pinCountBadge.textContent = count;
    selectedCountText.textContent = count;

    downloadZipBtn.disabled = count === 0;
    copyFigmaBtn.disabled = count === 0;
  }

  // 7. ZIP Export Action
  downloadZipBtn.addEventListener('click', async () => {
    if (collectedPins.length === 0) return;

    downloadZipBtn.disabled = true;
    const btnSpan = downloadZipBtn.querySelector('span');
    btnSpan.textContent = 'Building ZIP...';
    showToast('Fetching HD images...');

    try {
      const zip = new JSZip();
      let downloadedCount = 0;

      for (let i = 0; i < collectedPins.length; i++) {
        const pin = collectedPins[i];
        try {
          const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'FETCH_IMAGE_BLOB', url: pin.originalUrl }, resolve);
          });

          if (response && response.success && response.dataUrl) {
            const res = await fetch(response.dataUrl);
            const blob = await res.blob();
            
            let ext = 'jpg';
            if (response.type.includes('png')) ext = 'png';
            else if (response.type.includes('webp')) ext = 'webp';
            else if (response.type.includes('gif')) ext = 'gif';

            const cleanTitle = (pin.title || `pin_${pin.id}`)
              .replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_')
              .substring(0, 30);
            
            const filename = `${i + 1}_${cleanTitle}_${pin.id}.${ext}`;
            zip.file(filename, blob);
            downloadedCount++;
          }
        } catch (err) {
          console.error('Failed image download:', pin.originalUrl, err);
        }

        btnSpan.textContent = `ZIP (${i + 1}/${collectedPins.length})...`;
      }

      if (downloadedCount === 0) {
        showToast('Download failed. Try again.');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const objectUrl = URL.createObjectURL(zipBlob);

      const dateStr = new Date().toISOString().slice(0, 10);
      const zipFilename = `waveroute.pins_${dateStr}_${downloadedCount}_pins.zip`;

      chrome.downloads.download({
        url: objectUrl,
        filename: zipFilename,
        saveAs: true
      }, () => {
        showToast(`Downloaded ZIP (${downloadedCount} pins)`);
      });

    } catch (err) {
      console.error(err);
      showToast('Error creating ZIP archive');
    } finally {
      downloadZipBtn.disabled = false;
      updatePinsData(collectedPins);
    }
  });

  // 8. Copy Links for Figma Exporter
  copyFigmaBtn.addEventListener('click', () => {
    const urls = collectedPins.map((p) => p.originalUrl);

    if (urls.length === 0) return;

    const formattedText = urls.join('\n');
    navigator.clipboard.writeText(formattedText).then(() => {
      showToast(`${urls.length} links copied for Figma`);
    }).catch(() => {
      showToast('Copy failed');
    });
  });

  // Toast Notification
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }
});
