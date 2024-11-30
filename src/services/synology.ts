import { Photo, SynoResponse } from '../types';
import fetch from 'node-fetch';

export class SynologyService {
  private ip: string;
  private userId: string;
  private password: string;
  private fotoSpace: string;

  constructor(ip: string, userId: string, password: string, isFotoTeam: boolean) {
    this.ip = ip;
    this.userId = userId;
    this.password = password;
    this.fotoSpace = isFotoTeam ? 'FotoTeam' : 'Foto';
  }

  async authenticate(): Promise<string> {
    const url = `${this.ip}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${this.userId}&passwd=${this.password}&session=FileStation&format=cookie`;
    
    try {
      const response = await fetch(url);
      const data = await response.json() as SynoResponse<{ sid: string }>;
      
      if (!data.success) {
        throw new Error('Authentication failed');
      }
      
      return data.data.sid;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  async fetchPhotos(sid: string): Promise<Photo[]> {
    const url = `${this.ip}/webapi/${this.fotoSpace}/api/photo/list?api=SYNO.${this.fotoSpace}.Browse.Item&version=1&method=list&offset=0&limit=500&type=photo&sid=${sid}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json() as SynoResponse<{ list: Photo[] }>;
      
      if (!data.success) {
        throw new Error('Failed to fetch photos');
      }
      
      return data.data.list;
    } catch (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }
  }

  getThumbnailUrl(sid: string, photo: Photo): string {
    return `${this.ip}/webapi/${this.fotoSpace}/api/photo/thumbnail?api=SYNO.${this.fotoSpace}.Thumbnail&version=1&method=get&id=${photo.id}&type=unit&size=xl&sid=${sid}`;
  }
}
