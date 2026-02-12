/**
 * List and upload images from/to a GitHub repo folder.
 * No Drive or Google Admin needed.
 *
 * Env: GITHUB_REPO (owner/repo), GITHUB_BRANCH (default main), GITHUB_TOKEN, GITHUB_IMAGES_PATH (default "images")
 */

const GITHUB_REPO = process.env.GITHUB_REPO || ''
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_IMAGES_PATH = process.env.GITHUB_IMAGES_PATH || 'images'

const IMAGE_EXT = /\.(gif|jpe?g|png|webp|bmp|svg|ico)$/i

export type GitHubImage = {
  id: string
  name: string
  url: string
  mimeType?: string
  createdTime?: string
}

function apiUrl(path: string): string {
  return `https://api.github.com/repos/${GITHUB_REPO}/${path}`
}

function rawUrl(filePath: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`
}

export async function listImagesFromGitHub(): Promise<GitHubImage[]> {
  if (!GITHUB_REPO) return []
  const url = apiUrl(`contents/${GITHUB_IMAGES_PATH}`) + `?ref=${GITHUB_BRANCH}`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    console.error('GitHub list error:', res.status, await res.text())
    return []
  }
  const data = await res.json()
  if (!Array.isArray(data)) return []

  const images: GitHubImage[] = []
  for (const file of data) {
    if (file.type !== 'file' || !file.name) continue
    if (!IMAGE_EXT.test(file.name)) continue
    const filePath = `${GITHUB_IMAGES_PATH}/${file.name}`
    images.push({
      id: file.name,
      name: file.name,
      url: rawUrl(filePath),
      createdTime: file.sha ? undefined : undefined,
    })
  }
  images.sort((a, b) => b.name.localeCompare(a.name))
  return images
}

export async function uploadImageToGitHub(
  buffer: Buffer,
  filename: string,
  _mimeType: string
): Promise<GitHubImage | null> {
  if (!GITHUB_REPO || !GITHUB_TOKEN) return null
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const base = safeName.replace(/\.[^.]+$/, '')
  const ext = (safeName.match(/\.[^.]+$/) || ['.bin'])[0]
  const uniqueName = `${base}-${Date.now()}${ext}`
  const path = `${GITHUB_IMAGES_PATH}/${uniqueName}`

  const content = buffer.toString('base64')
  const url = apiUrl(`contents/${path}`)
  const body = {
    message: `Add image: ${uniqueName}`,
    content,
    branch: GITHUB_BRANCH,
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error('GitHub upload error:', res.status, await res.text())
    return null
  }

  return {
    id: uniqueName,
    name: uniqueName,
    url: rawUrl(path),
  }
}
