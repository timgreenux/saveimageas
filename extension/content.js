'use strict';

const STORAGE_KEY = 'saveimageas-pending-upload';
const MESSAGE_TYPE = 'SAVEIMAGEAS_EXTENSION_UPLOAD';
const GET_PENDING_TYPE = 'SAVEIMAGEAS_GET_PENDING';

function sendPendingIfAny() {
  chrome.storage.local.get(STORAGE_KEY, (data) => {
    const pending = data[STORAGE_KEY];
    if (!pending?.dataUrl) return;
    chrome.storage.local.remove(STORAGE_KEY, () => {});
    window.postMessage(
      { type: MESSAGE_TYPE, payload: { dataUrl: pending.dataUrl, filename: pending.filename || 'image.png' } },
      '*'
    );
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'SAVEIMAGEAS_FLUSH_PENDING') sendPendingIfAny();
});

window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.type !== GET_PENDING_TYPE) return;
  sendPendingIfAny();
});

setTimeout(sendPendingIfAny, 200);
setTimeout(sendPendingIfAny, 600);
setTimeout(sendPendingIfAny, 1500);
