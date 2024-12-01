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

function getWeekNumberInMonth(date: Date): number {
  // Get the day of the month (1-31)
  const dayOfMonth = date.getDate()
  // Convert to week number (1-4/5)
  return Math.ceil(dayOfMonth / 7)
}

function getMonthWeekRange(weekNum: number): { start: number; end: number } {
  const start = (weekNum - 1) * 7 + 1
  const end = weekNum * 7
  console.log(`Week ${weekNum} range: ${start}-${end}`)
  return { start, end }
}

export function filterPhotosByWeek(photos: Photo[], week: number): Photo[] {
  const today = new Date()
  const currentMonth = today.getMonth()
  const { start, end } = getMonthWeekRange(Math.ceil(today.getDate() / 7))

  console.log(`Current month: ${currentMonth + 1}, Date range: ${start}-${end}`)

  const filtered = photos.filter(photo => {
    const photoDate = new Date(photo.time * 1000)
    const dayOfMonth = photoDate.getDate()
    const photoMonth = photoDate.getMonth()

    const matches =
      photoMonth === currentMonth && dayOfMonth >= start && dayOfMonth <= end

    if (matches) {
      console.log(`Matched photo from ${photoDate.toLocaleDateString()}`)
    }

    return matches
  })

  console.log(
    `Found ${filtered.length} photos for week ${week} (${start}-${end})`
  )
  return filtered
}

export function filterPhotosByMonth(photos: Photo[], month: number): Photo[] {
  console.log(`Filtering for month: ${month}`)

  const filtered = photos.filter(photo => {
    const photoDate = new Date(photo.time * 1000)
    const photoMonth = photoDate.getMonth() + 1
    const matches = photoMonth === month

    if (matches) {
      console.log(`Matched photo from ${photoDate.toLocaleDateString()}`)
    }

    return matches
  })

  console.log(`Found ${filtered.length} photos for month ${month}`)
  return filtered
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

interface PhotoGroup {
  title: string
  photos: Photo[]
}

export function groupPhotosByPeriod(
  photos: Photo[],
  period: 'day' | 'week' | 'month'
): PhotoGroup[] {
  // Sort photos by time in descending order (newest first)
  const sortedPhotos = [...photos].sort((a, b) => b.time - a.time)
  console.log('Total photos to group:', sortedPhotos.length)

  // Group photos by year
  const photosByYear = new Map<number, Photo[]>()

  sortedPhotos.forEach(photo => {
    const date = new Date(photo.time * 1000)
    const year = date.getFullYear()

    if (!photosByYear.has(year)) {
      photosByYear.set(year, [])
    }
    photosByYear.get(year)!.push(photo)
  })

  console.log('Years with photos:', Array.from(photosByYear.keys()))

  // Convert to groups with titles
  const groups: PhotoGroup[] = []

  // Sort years in descending order
  const years = Array.from(photosByYear.keys()).sort((a, b) => b - a)

  years.forEach(year => {
    const yearPhotos = photosByYear.get(year)!
    console.log(`Processing year ${year} with ${yearPhotos.length} photos`)

    if (yearPhotos.length > 0) {
      const date = new Date(yearPhotos[0].time * 1000)
      let title: string

      switch (period) {
        case 'day': {
          title = `${date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
          })}, ${year}`
          break
        }
        case 'week': {
          const weekNum = Math.ceil(date.getDate() / 7)
          const { start, end } = getMonthWeekRange(weekNum)
          const month = date.toLocaleDateString('en-US', { month: 'long' })
          title = `${month} ${start}-${end}, ${year}`
          break
        }
        case 'month': {
          title = `${date.toLocaleDateString('en-US', {
            month: 'long'
          })}, ${year}`
          break
        }
      }

      groups.push({
        title,
        photos: yearPhotos
      })
      console.log(`Added group: ${title} with ${yearPhotos.length} photos`)
    }
  })

  return groups
}
