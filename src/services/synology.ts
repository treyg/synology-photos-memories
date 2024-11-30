import { Photo, SynoResponse } from '../types/index.js'
import fetch from 'node-fetch'
import https from 'https'

// Create an HTTPS agent that accepts self-signed certificates
const agent = new https.Agent({
  rejectUnauthorized: false
})

export class SynologyService {
  private ip: string
  private userId: string
  private password: string
  private fotoSpace: string

  constructor(
    ip: string,
    userId: string,
    password: string,
    isFotoTeam: boolean
  ) {
    // Ensure the IP has a protocol, default to HTTPS if none specified
    if (!ip.startsWith('http://') && !ip.startsWith('https://')) {
      ip = 'https://' + ip
    }
    // Remove any trailing slashes
    ip = ip.replace(/\/$/, '')
    this.ip = ip
    this.userId = userId
    this.password = password
    this.fotoSpace = isFotoTeam ? 'FotoTeam' : 'Foto'
  }

  async authenticate(): Promise<string> {
    const authUrl = `${this.ip}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${this.userId}&passwd=${this.password}&session=FileStation&format=sid`
    console.log('Authenticating with URL:', authUrl)

    try {
      const response = await fetch(authUrl, {
        agent: this.ip.startsWith('https://') ? agent : undefined
      })

      const rawAuthResponse = await response.text()
      console.log('Raw auth response:', rawAuthResponse)

      const data = JSON.parse(rawAuthResponse) as SynoResponse<{ sid: string }>

      if (!data.success) {
        console.error('Authentication failed:', data)
        throw new Error('Authentication failed: ' + JSON.stringify(data))
      }

      const sid = data.data.sid
      console.log('Successfully authenticated, got session ID')
      return sid
    } catch (error) {
      console.error('Authentication error:', error)
      throw error
    }
  }

  async fetchPhotos(sid: string): Promise<Photo[]> {
    try {
      const infoUrl = `${this.ip}/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=all`
      console.log('Getting API info:', infoUrl)

      const infoResponse = await fetch(infoUrl, {
        agent: this.ip.startsWith('https://') ? agent : undefined
      })
      const infoData = await infoResponse.json()

      const url = `${this.ip}/webapi/entry.cgi?api=SYNO.${this.fotoSpace}.Browse.Item&version=1&method=list&additional=["thumbnail","resolution","orientation","video_convert","video_meta"]&type=photo&sort_by=takentime&sort_direction=desc&offset=0&limit=500&_sid=${sid}`
      console.log('Fetching photos from URL:', url)

      const response = await fetch(url, {
        agent: this.ip.startsWith('https://') ? agent : undefined
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawResponse = await response.text()

      try {
        const data = JSON.parse(rawResponse) as SynoResponse<{ list: Photo[] }>

        if (!data.success) {
          console.error('Synology API returned error:', data)
          throw new Error(`Failed to fetch photos: ${JSON.stringify(data)}`)
        }

        // Process the photos to add thumbnail URLs
        const processedPhotos = data.data.list.map(photo => {
          const thumbnailUrl = photo.additional.thumbnail
            ? this.getThumbnailUrl(
                photo.id,
                photo.additional.thumbnail.cache_key,
                sid
              )
            : undefined
          return {
            ...photo,
            thumbnailUrl
          }
        })

        console.log(`Successfully fetched ${processedPhotos.length} photos`)
        return processedPhotos
      } catch (parseError) {
        console.error('Error parsing photo response:', parseError)
        console.error('Raw response:', rawResponse)
        throw parseError
      }
    } catch (error) {
      console.error('Error fetching photos:', error)
      console.error('Full error details:', {
        ip: this.ip,
        fotoSpace: this.fotoSpace,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  private getThumbnailUrl(id: number, cacheKey: string, sid: string): string {
    return `${this.ip}/webapi/entry.cgi?api=SYNO.${this.fotoSpace}.Thumbnail&version=1&method=get&mode=download&id=${id}&type=unit&size=xl&cache_key=${cacheKey}&_sid=${sid}`
  }
}
