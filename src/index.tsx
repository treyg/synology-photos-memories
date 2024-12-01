import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { FC } from 'hono/jsx'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import cron from 'node-cron'
import dotenv from 'dotenv'
import { SynologyService } from './services/synology.js'
import { EmailService } from './services/email.js'
import { Photo } from './types/index.js'
import {
  filterPhotosByDay,
  filterPhotosByMonth,
  filterPhotosByWeek,
  getWeekNumber,
  groupPhotosByPeriod
} from './utils/date.js'
// import type { Env } from './types.js'

dotenv.config()

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', secureHeaders())
app.use('/public/*', serveStatic({ root: './' }))

// Initialize services
const synoService = new SynologyService(
  process.env.NAS_IP!,
  process.env.USER_ID!,
  process.env.USER_PASSWORD!,
  process.env.FOTO_TEAM === 'true'
)

const emailService = new EmailService(
  process.env.SERVICE_NAME!,
  process.env.SEND_EMAIL!,
  process.env.SEND_EMAIL_PASSWORD!,
  process.env.RECEIVE_EMAIL!,
  process.env.EMAIL_SUBJECT!
)

// Define the layout component
const Layout: FC = ({ children }) => (
  <html>
    <head>
      <title>Synology Photo Memories</title>
      <link rel="stylesheet" href="/public/styles.css" />
      <meta name="color-scheme" content="dark light" />
    </head>
    <body>
      <div class="container">
        <button
          id="theme-toggle"
          class="theme-toggle"
          aria-label="Toggle theme">
          <img
            src="/public/icon-sun.svg"
            class="theme-icon sun"
            alt="Light mode"
          />
          <img
            src="/public/icon-moon.svg"
            class="theme-icon moon"
            alt="Dark mode"
          />
        </button>
        <div class="header">
          <h1>Synology Photo Memories</h1>
        </div>
        {children}
      </div>
      <div id="lightbox" class="lightbox">
        <button class="lightbox-close">&times;</button>
        <button class="lightbox-prev">&lt;</button>
        <button class="lightbox-next">&gt;</button>
        <div class="lightbox-content">
          <img id="lightbox-img" src="" alt="" />
        </div>
      </div>
      <script src="/public/main.js"></script>
    </body>
  </html>
)

// Routes
app.get('/', c => {
  return c.html(
    <Layout>
      <div id="photos"></div>
    </Layout>
  )
})

app.get('/api/photos', async c => {
  try {
    const sid = await synoService.authenticate()
    const photos = await synoService.fetchPhotos(sid)
    console.log(`Total photos fetched: ${photos.length}`)

    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const week = getWeekNumber(today)
    const sendBy = process.env.SEND_BY?.trim() as 'day' | 'week' | 'month'

    console.log(`Current date - Month: ${month}, Day: ${day}, Week: ${week}`)
    console.log(`Send by: ${sendBy}`)

    let filteredPhotos
    switch (sendBy) {
      case 'month':
        filteredPhotos = filterPhotosByMonth(photos, month)
        break
      case 'week':
        filteredPhotos = filterPhotosByWeek(photos, week)
        break
      case 'day':
        filteredPhotos = filterPhotosByDay(photos, day, month)
        break
      default:
        throw new Error(`Invalid sendBy value: ${sendBy}`)
    }

    console.log(`Photos after period filtering: ${filteredPhotos.length}`)

    // Filter out photos without thumbnail URLs and group them
    const photosWithThumbnails = filteredPhotos.filter(
      (photo): photo is Photo & { thumbnailUrl: string } =>
        photo.thumbnailUrl !== undefined
    )

    console.log(`Photos with thumbnails: ${photosWithThumbnails.length}`)
    console.log('Sample photo:', photosWithThumbnails[0])

    const groupedPhotos = groupPhotosByPeriod(photosWithThumbnails, sendBy)
    console.log(`Number of groups: ${groupedPhotos.length}`)
    console.log(
      'Groups:',
      groupedPhotos.map(g => ({ title: g.title, photoCount: g.photos.length }))
    )

    return c.json({ groups: groupedPhotos })
  } catch (error) {
    console.error('Error fetching photos:', error)
    return c.json({ error: 'Failed to fetch photos' }, 500)
  }
})

// Email scheduler
const schedule = process.env.SEND_BY?.trim()
console.log('Setting up email schedule:', schedule)

switch (schedule) {
  case 'month':
    console.log('Scheduling monthly email at 9:00 AM on the 1st of each month')
    cron.schedule('0 9 1 * *', sendPhotoEmail) // At 09:00 on day-of-month 1
    break
  case 'week':
    console.log('Scheduling weekly email at 9:00 AM every Monday')
    cron.schedule('0 9 * * 1', sendPhotoEmail) // At 09:00 on Monday
    break
  case 'day':
    console.log('Scheduling daily email at 9:00 AM')
    cron.schedule('0 9 * * *', sendPhotoEmail) // At 09:00 every day
    break
  default:
    console.error(`Invalid schedule: ${schedule}`)
}

// Add test endpoint to trigger email manually
app.get('/api/test-email', async c => {
  try {
    console.log('Manual email trigger requested')
    await sendPhotoEmail()
    return c.json({ success: true, message: 'Email sent successfully' })
  } catch (error) {
    console.error('Error in test email endpoint:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    )
  }
})

async function sendPhotoEmail() {
  try {
    console.log('Starting photo email process...')
    const sid = await synoService.authenticate()
    console.log('Successfully authenticated with Synology')

    const photos = await synoService.fetchPhotos(sid)
    console.log(`Fetched ${photos.length} photos total`)

    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const week = getWeekNumber(today)
    console.log('Date info:', { month, day, week })

    let filteredPhotos
    const sendBy = process.env.SEND_BY?.trim()
    console.log('Send by:', sendBy)

    switch (sendBy) {
      case 'month':
        filteredPhotos = filterPhotosByMonth(photos, month)
        break
      case 'week':
        filteredPhotos = filterPhotosByWeek(photos, week)
        break
      case 'day':
        filteredPhotos = filterPhotosByDay(photos, day, month)
        break
      default:
        throw new Error(`Invalid sendBy value: ${sendBy}`)
    }

    console.log(
      `Filtered to ${filteredPhotos.length} photos for the current ${sendBy}`
    )

    // Filter out photos without thumbnail URLs
    const photosWithThumbnails = filteredPhotos.filter(
      (photo): photo is Photo & { thumbnailUrl: string } =>
        photo.thumbnailUrl !== undefined
    )

    console.log(
      `Found ${photosWithThumbnails.length} photos with valid thumbnail URLs`
    )

    if (photosWithThumbnails.length === 0) {
      console.log('No photos to send for this period')
      return
    }

    console.log('Attempting to send email with configuration:', {
      nasIp: process.env.NAS_IP,
      port: process.env.PORT,
      serviceName: process.env.SERVICE_NAME
    })

    await emailService.sendPhotoEmail(
      photosWithThumbnails,
      process.env.NAS_IP!,
      process.env.PORT!
    )
    console.log('Email sent successfully')
  } catch (error) {
    console.error('Error in sendPhotoEmail:', error)
    if (error instanceof Error) {
      console.error('Full error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    // Re-throw the error to ensure it's not silently caught
    throw error
  }
}

// Start the server
const port = parseInt(process.env.PORT || '8080', 10)
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
