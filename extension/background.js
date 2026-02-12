'use strict';

const SAVEIMAGEAS_ORIGIN = 'https://saveimageas.vercel.app';
const STORAGE_KEY = 'saveimageas-pending-upload';
const FLUSH_DELAY_MS = 1200;

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (id, changeInfo) => {
      if (id === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((t) => {
      if (t.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }).catch(() => {});
  });
}

function tellContentScriptToFlush(tabId) {
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, { type: 'SAVEIMAGEAS_FLUSH_PENDING' }).catch(() => {});
  }, FLUSH_DELAY_MS);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'post-to-saveimageas',
    title: 'Post to saveimageas',
    contexts: ['image'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'post-to-saveimageas' || !info.srcUrl) return;

  try {
    const res = await fetch(info.srcUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });

    const filename = info.srcUrl.split('/').pop()?.split('?')[0] || 'image.png';
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image.png';

    await chrome.storage.local.set({
      [STORAGE_KEY]: { dataUrl, filename: safeName },
    });

    const saveimageasUrl = SAVEIMAGEAS_ORIGIN + '/';
    const existing = await chrome.tabs.query({ url: SAVEIMAGEAS_ORIGIN + '/*' });
    let targetTabId;

    if (existing.length > 0) {
      targetTabId = existing[0].id;
      await chrome.tabs.update(targetTabId, { active: true });
      await chrome.tabs.reload(targetTabId);
    } else {
      const newTab = await chrome.tabs.create({ url: saveimageasUrl });
      targetTabId = newTab.id;
    }

    await waitForTabLoad(targetTabId);
    tellContentScriptToFlush(targetTabId);
  } catch (err) {
    console.error('Post to saveimageas:', err);
  }
});
