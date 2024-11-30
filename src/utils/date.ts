import { Photo } from '../types/index.js'

export function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function filterPhotosByMonth(photos: Photo[], month: number): Photo[] {
  return photos.filter(photo => {
    const photoDate = new Date(photo.time * 1000)
    return photoDate.getMonth() + 1 === month
  })
}

export function filterPhotosByWeek(photos: Photo[], week: number): Photo[] {
  return photos.filter(photo => {
    const photoDate = new Date(photo.time * 1000)
    return getWeekNumber(photoDate) === week
  })
}

export function filterPhotosByDay(
  photos: Photo[],
  day: number,
  month: number
): Photo[] {
  return photos.filter(photo => {
    const photoDate = new Date(photo.time * 1000)
    return photoDate.getDate() === day && photoDate.getMonth() + 1 === month
  })
}
