export type ImageItem = {
  id: string
  name: string
  url: string
  thumbnail?: string
  mimeType?: string
  createdTime?: string
}

export type HeartState = {
  count: number
  hasHearted: boolean
}
