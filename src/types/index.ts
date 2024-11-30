export interface Photo {
  id: number
  filename: string
  filesize: number
  time: number
  folder_id: number
  owner_user_id: number
  type: string
  indexed_time: number
  additional: {
    thumbnail?: {
      cache_key: string
      m: string
      preview: string
      sm: string
      unit_id: number
      xl: string
    }
    resolution?: {
      height: number
      width: number
    }
    orientation?: number
    video_convert?: any
    video_meta?: any
  }
  thumbnailUrl?: string
}

export interface SynoResponse<T> {
  data: T
  success: boolean
}

export interface Env {
  NAS_IP: string
  USER_ID: string
  USER_PASSWORD: string
  SEND_BY: 'month' | 'week' | 'day'
  SERVICE_NAME: string
  SEND_EMAIL: string
  SEND_EMAIL_PASSWORD: string
  RECEIVE_EMAIL: string
  EMAIL_SUBJECT: string
  PORT: string
  FOTO_TEAM: string
}
