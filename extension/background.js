'use strict';

const SAVEIMAGEAS_ORIGIN = 'https://saveimageas.vercel.app';
const STORAGE_KEY = 'saveimageas-pending-upload';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'post-to-saveimageas',
    title: 'Post to save image as',
    contexts: ['image'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'post-to-saveimageas' || !info.srcUrl) return;

  try {
    const res = await fetch(info.srcUrl, { mode: 'cors' });
    if (!res.ok) throw new Error('Failed to fetch image');
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
    if (existing.length > 0) {
      await chrome.tabs.update(existing[0].id, { active: true });
      await chrome.tabs.reload(existing[0].id);
    } else {
      await chrome.tabs.create({ url: saveimageasUrl });
    }
  } catch (err) {
    console.error('Post to save image as:', err);
  }
});
