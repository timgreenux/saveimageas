export type ImageItem = {
  id: string
  name: string
  url: string
  thumbnail?: string
  mimeType?: string
  createdTime?: string
  uploadedBy?: string
  uploadedAt?: string
  /** GitHub blob sha, needed for delete API */
  sha?: string
}

export type HeartState = {
  count: number
  hasHearted: boolean
}
