export interface Photo {
  id: string
  filename: string
  filesize: number
  time: number
  thumbnail_size: number
  type: string
  additional?: {
    resolution?: {
      height: number
      width: number
    }
    orientation?: number
  }
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
