# Post to save image as – Chrome extension

Right-click any image on the web and choose **Post to save image as** to upload it to [saveimageas](https://saveimageas.vercel.app).

## How it works

1. You right-click an image and select **Post to save image as**.
2. The extension fetches the image and opens (or focuses) saveimageas.vercel.app.
3. The app receives the image and uploads it using the **same flow as “Add image”** – so if you’re signed in, your **name is taken from your Google account** and stored with the image.

You must be **signed in** on saveimageas for your name to be used; otherwise the upload is attributed to “Anonymous”.

## Install (unpacked)

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension` folder.
4. The extension is now installed.

## Usage

1. Sign in at [saveimageas.vercel.app](https://saveimageas.vercel.app) (Google).
2. On any website, right-click an image.
3. Click **Post to save image as**.
4. Saveimageas will open or refresh and the image will upload with your name.

## Permissions

- **contextMenus** – add the right‑click menu item.
- **storage** – temporarily hold the image data before passing it to the app.
- **host_permissions** – fetch the image from any page and run the content script on saveimageas.

No data is sent to any server except saveimageas (and GitHub when you upload).
