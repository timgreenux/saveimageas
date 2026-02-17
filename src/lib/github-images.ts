/**
 * Client-side GitHub images: list, upload metadata, delete.
 * Uses VITE_GITHUB_* env vars.
 */

import type { ImageItem } from '../types/api'

const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || ''
const GH_REPO = import.meta.env.VITE_GITHUB_REPO || ''
const GH_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main'
const GH_PATH = import.meta.env.VITE_GITHUB_IMAGES_PATH || 'images'

const IMAGE_EXT = /\.(gif|jpe?g|png|webp|bmp|svg|ico)$/i

export function isGitHubConfigured(): boolean {
  return !!(GH_TOKEN && GH_REPO)
}

export type MetadataMap = Record<string, { uploadedBy?: string; uploadedAt?: string; description?: string }>

export async function fetchImagesFromGitHub(): Promise<ImageItem[]> {
  if (!GH_TOKEN || !GH_REPO) return []

  const listUrl = `https://api.github.com/repos/${GH_REPO}/contents/${GH_PATH}?ref=${GH_BRANCH}`
  const res = await fetch(listUrl, {
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${GH_TOKEN}` },
  })
  if (!res.ok) return []

  const files: { name: string; sha: string; type: string }[] = await res.json()
  const imageFiles = files.filter((f) => f.type === 'file' && f.name && IMAGE_EXT.test(f.name))

  // Don't include metadata.json as an image
  const imageOnly = imageFiles.filter((f) => f.name !== 'metadata.json')

  // Fetch metadata via API (works for private repos; raw URL would 404). No cache so refresh shows latest.
  let metadata: MetadataMap = {}
  try {
    const metaRes = await fetch(
      `https://api.github.com/repos/${GH_REPO}/contents/${GH_PATH}/metadata.json?ref=${GH_BRANCH}&t=${Date.now()}`,
      { cache: 'no-store', headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${GH_TOKEN}` } }
    )
    if (metaRes.ok) {
      const data = await metaRes.json()
      if (data.content) {
        metadata = JSON.parse(atob(data.content.replace(/\n/g, '')))
      }
    }
  } catch {
    // no metadata file yet
  }

  const baseUrl = `https://raw.githubusercontent.com/${GH_REPO}/${GH_BRANCH}/${GH_PATH}`
  const items: ImageItem[] = imageOnly.map((f) => {
    const meta = metadata[f.name] || {}
    return {
      id: f.name,
      name: f.name,
      url: `${baseUrl}/${f.name}`,
      sha: f.sha,
      uploadedBy: meta.uploadedBy,
      uploadedAt: meta.uploadedAt,
      description: meta.description,
    }
  })

  // Sort: newest first. Use uploadedAt when present; else use timestamp in filename (base-{Date.now()}.ext).
  function timestampFromName(name: string): number {
    const withoutExt = name.replace(/\.[^.]+$/, '')
    const num = withoutExt.split('-').pop()
    const t = num ? parseInt(num, 10) : 0
    return Number.isFinite(t) ? t : 0
  }
  items.sort((a, b) => {
    const aHas = a.uploadedAt != null && a.uploadedAt !== ''
    const bHas = b.uploadedAt != null && b.uploadedAt !== ''
    if (aHas && bHas) return new Date(b.uploadedAt!).getTime() - new Date(a.uploadedAt!).getTime()
    if (aHas) return -1
    if (bHas) return 1
    return timestampFromName(b.name) - timestampFromName(a.name)
  })

  return items
}

async function getMetadataBlob(): Promise<{ data: MetadataMap; sha: string | undefined }> {
  const metaPath = `${GH_PATH}/metadata.json`
  const getUrl = `https://api.github.com/repos/${GH_REPO}/contents/${metaPath}?ref=${GH_BRANCH}&t=${Date.now()}`
  const getRes = await fetch(getUrl, {
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${GH_TOKEN}` },
  })
  let existing: MetadataMap = {}
  let sha: string | undefined
  if (getRes.ok) {
    const data = await getRes.json()
    sha = data.sha
    if (data.content) {
      try {
        existing = JSON.parse(atob(data.content.replace(/\n/g, '')))
      } catch {
        // invalid json, start fresh
      }
    }
  }
  return { data: existing, sha }
}

export async function updateMetadataInGitHub(
  filename: string,
  uploadedBy: string,
  uploadedAt: string,
  description?: string
): Promise<void> {
  if (!GH_TOKEN || !GH_REPO) return

  const metaPath = `${GH_PATH}/metadata.json`
  const putUrl = `https://api.github.com/repos/${GH_REPO}/contents/${metaPath}`
  const maxAttempts = 4
  const backoffMs = [400, 800, 1600]

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: existing, sha } = await getMetadataBlob()
    const entry = { uploadedBy, uploadedAt, ...(description != null && description !== '' ? { description } : {}) }
    const updated = { ...existing, [filename]: entry }
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2))))

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${GH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Update metadata for ${filename}`,
        content,
        branch: GH_BRANCH,
        ...(sha ? { sha } : {}),
      }),
    })

    if (putRes.ok) return

    const errText = await putRes.text()
    const isConflict = putRes.status === 422 || putRes.status === 409
    if (isConflict && attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 2000))
      continue
    }
    throw new Error(`Failed to update metadata: ${errText}`)
  }
}

export async function deleteImageFromGitHub(filePath: string, sha: string): Promise<void> {
  if (!GH_TOKEN || !GH_REPO) throw new Error('GitHub not configured')

  const url = `https://api.github.com/repos/${GH_REPO}/contents/${filePath}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${GH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `Delete image: ${filePath}`, branch: GH_BRANCH, sha }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Delete failed: ${err}`)
  }

  // Also remove from metadata.json
  const metaPath = `${GH_PATH}/metadata.json`
  const getUrl = `https://api.github.com/repos/${GH_REPO}/contents/${metaPath}?ref=${GH_BRANCH}`
  const getRes = await fetch(getUrl, {
    headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${GH_TOKEN}` },
  })
  if (getRes.ok) {
    const data = await getRes.json()
    const existing: MetadataMap = JSON.parse(atob(data.content.replace(/\n/g, '')))
    const name = filePath.replace(`${GH_PATH}/`, '')
    delete existing[name]
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(existing, null, 2))))
    await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${metaPath}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${GH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Remove metadata for deleted image',
        content,
        branch: GH_BRANCH,
        sha: data.sha,
      }),
    })
  }
}
