'use strict';

const STORAGE_KEY = 'saveimageas-pending-upload';
const MESSAGE_TYPE = 'SAVEIMAGEAS_EXTENSION_UPLOAD';

function run() {
  chrome.storage.local.get(STORAGE_KEY, (data) => {
    const pending = data[STORAGE_KEY];
    if (!pending?.dataUrl) return;
    chrome.storage.local.remove(STORAGE_KEY, () => {});
    window.postMessage({ type: MESSAGE_TYPE, payload: { dataUrl: pending.dataUrl, filename: pending.filename || 'image.png' } }, '*');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
