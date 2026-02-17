# save image as

A React web app for saving and displaying images in a masonry feed. Images live in **GitHub** (this repo). Access is limited to people you allow—**no Google Admin required** if you use the allow-list or domain option below.

## Stack

- **Frontend:** React 18, Vite, React Router, react-masonry-css
- **Backend:** Vercel serverless (API routes in `/api`)
- **Auth:** Google Sign-In (OAuth) + token verification
- **Access:** Allow-list, domain restriction, or (optional) Google Group via Admin API
- **Images:** GitHub repo (`images/` folder); list + upload via GitHub API
- **Hearts:** In-memory (replace with Vercel KV for production)

---

## Quick setup (no Google Admin)

### 1. Google OAuth (Sign in with Google)

1. [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID** → **Web application**.
3. Add **Authorized JavaScript origins**: `http://localhost:5173` (dev), and your production URL (e.g. `https://saveimageas.vercel.app`). If you use another port (e.g. `npm run preview` → 4173), add `http://localhost:4173` too. **If you get "Error 400: origin_mismatch" on localhost, the exact origin (including port) must be listed here.**
4. Copy the **Client ID** → set as `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` in your env.

### 2. Who can sign in (pick one – no Admin API needed)

| Option | Env var | Example |
|--------|---------|--------|
| **Allow-list** | `ALLOWED_EMAILS` | `tim.green@preply.com,other@preply.com` |
| **Any @preply.com** | `ALLOWED_DOMAIN` | `preply.com` |

- **Allow-list:** Only these exact emails can use the app. Add/remove emails when your team changes.
- **Domain:** Any Google account whose email ends with `@preply.com` can sign in (weaker, but no list to maintain).

Set **only one** of these. If both are set, allow-list wins.

### 3. Images from GitHub

Images are stored in this repo in the **`images/`** folder. The app lists and (optionally) uploads via the GitHub API.

| Variable | Description |
|----------|-------------|
| `GITHUB_REPO` | Repo in `owner/repo` form (e.g. `preply/saveimageas` or `your-username/saveimageas`). |
| `GITHUB_BRANCH` | Branch to use (default: `main`). |
| `GITHUB_IMAGES_PATH` | Folder name inside the repo (default: `images`). |
| `GITHUB_TOKEN` | **Required for upload.** A [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope so the app can push new images. Optional for **list-only** if the repo is public. |

- **List:** With `GITHUB_REPO` set, the app lists files in `images/` and builds image URLs from `raw.githubusercontent.com`. No token needed if the repo is public.
- **Upload:** Set `GITHUB_TOKEN`; the app will commit new images into `images/` on the given branch.

You can also add images manually: drop files into `images/`, commit, and push. They’ll show up in the feed after the next load.

### 4. Env summary (simple path)

**Frontend:** `VITE_GOOGLE_CLIENT_ID`  
**Backend:** `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` or `ALLOWED_DOMAIN`, `GITHUB_REPO`, and (for upload) `GITHUB_TOKEN`

No service account, no Drive, no domain-wide delegation.

---

## Local development

1. Copy assets into `public/` (fonts + SVGs):
   ```bash
   mkdir -p public/Assets/Platform
   cp Assets/Platform/*.otf public/Assets/Platform/
   cp Assets/*.svg public/Assets/
   ```

2. Create a **`.env`** (see `.env.example`) with at least:
   - `VITE_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID`
   - `ALLOWED_EMAILS=tim.green@preply.com` (or `ALLOWED_DOMAIN=preply.com`)
   - `GITHUB_REPO=your-username/saveimageas` (and `GITHUB_TOKEN` if you want upload)

3. Run the app:
   ```bash
   npm install
   npx vercel dev
   ```

---

## Optional: restrict by Google Group (needs Admin)

If you want access limited to the **all-preply-design@preply.com** group (and not a manual list or domain), you need:

- A **service account** in Google Cloud and its key (base64) → `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Domain-wide delegation** in Google Admin Console (only an admin can do this) with scopes:
  - `https://www.googleapis.com/auth/admin.directory.group.readonly`
  - `https://www.googleapis.com/auth/drive` (only if you also use Drive for images)
- **`GOOGLE_ADMIN_EMAIL`** = a Workspace user the service account impersonates (that user must have the Drive folder shared with them if you use Drive)

**Priority:** The app checks access in this order: `ALLOWED_EMAILS` → `ALLOWED_DOMAIN` → Admin API group. So if you set `ALLOWED_EMAILS` or `ALLOWED_DOMAIN`, the group check is skipped and you don’t need any admin setup.

---

## Optional: images from Google Drive

If you prefer Drive instead of GitHub, leave **`GITHUB_REPO`** unset and configure Drive:

- Service account + domain-wide delegation (with Drive scope) and `GOOGLE_ADMIN_EMAIL` as the user who has the folder shared.
- Env: `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_ADMIN_EMAIL`, and optionally `DRIVE_FOLDER_ID`.

When `GITHUB_REPO` is set, the app uses GitHub for images. When it’s not set, it uses Drive (if configured).

---

## Vercel deployment

1. Push to GitHub and import the project in [Vercel](https://vercel.com).
2. In **Settings → Environment Variables**, add the same vars you use in `.env` (e.g. `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` or `ALLOWED_DOMAIN`, `GITHUB_REPO`, `GITHUB_TOKEN`).
3. Deploy. Add your production URL to the OAuth client’s **Authorized JavaScript origins** in Google Cloud.

---

## Project structure

- `src/` – React app (pages, components, contexts, hooks).
- `api/` – Vercel serverless: auth check, images list, upload, hearts.
- `images/` – Image files (committed or added via app when using GitHub).
- `Assets/` – Fonts and SVGs; copied to `public/Assets/` on build.
