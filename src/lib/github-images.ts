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

export type MetadataMap = Record<string, { uploadedBy?: string; uploadedAt?: string }>

export async function fetchImagesFromGitHub(): Promise<ImageItem[]> {
  if (!GH_TOKEN || !GH_REPO) return []

  const listUrl = `https://api.github.com/repos/${GH_REPO}/contents/${GH_PATH}?ref=${GH_BRANCH}`
  const res = await fetch(listUrl, {
    headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${GH_TOKEN}` },
  })
  if (!res.ok) return []

  const files: { name: string; sha: string; type: string }[] = await res.json()
  const imageFiles = files.filter((f) => f.type === 'file' && f.name && IMAGE_EXT.test(f.name))

  // Don't include metadata.json as an image
  const imageOnly = imageFiles.filter((f) => f.name !== 'metadata.json')

  let metadata: MetadataMap = {}
  try {
    const metaRes = await fetch(
      `https://raw.githubusercontent.com/${GH_REPO}/${GH_BRANCH}/${GH_PATH}/metadata.json`
    )
    if (metaRes.ok) {
      metadata = await metaRes.json()
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
    }
  })

  // Sort: most recent first (by uploadedAt date, then by name which contains timestamp)
  items.sort((a, b) => {
    const aDate = a.uploadedAt || a.name
    const bDate = b.uploadedAt || b.name
    return bDate.localeCompare(aDate)
  })

  return items
}

export async function updateMetadataInGitHub(
  filename: string,
  uploadedBy: string,
  uploadedAt: string
): Promise<void> {
  if (!GH_TOKEN || !GH_REPO) return

  const metaPath = `${GH_PATH}/metadata.json`
  const getUrl = `https://api.github.com/repos/${GH_REPO}/contents/${metaPath}?ref=${GH_BRANCH}`

  let existing: MetadataMap = {}
  let sha: string | undefined
  const getRes = await fetch(getUrl, {
    headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${GH_TOKEN}` },
  })
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

  const updated = { ...existing, [filename]: { uploadedBy, uploadedAt } }
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2))))

  const putUrl = `https://api.github.com/repos/${GH_REPO}/contents/${metaPath}`
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
  if (!putRes.ok) {
    const err = await putRes.text()
    throw new Error(`Failed to update metadata: ${err}`)
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
