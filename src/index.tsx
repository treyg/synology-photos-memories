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
import {
  filterPhotosByDay,
  filterPhotosByMonth,
  filterPhotosByWeek,
  getWeekNumber
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
    </head>
    <body>
      <div class="container">
        <h1>Synology Photo Memories</h1>
        {children}
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
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const week = getWeekNumber(today)

    let filteredPhotos
    const sendBy = process.env.SEND_BY?.trim()

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

    // Only include photos that have thumbnail URLs
    const photoUrls = filteredPhotos
      .map(photo => photo.thumbnailUrl)
      .filter((url): url is string => url !== undefined)

    return c.json({ photos: filteredPhotos, urls: photoUrls })
  } catch (error) {
    console.error('Error fetching photos:', error)
    return c.json({ error: 'Failed to fetch photos' }, 500)
  }
})

// Email scheduler
const schedule = process.env.SEND_BY?.trim()
switch (schedule) {
  case 'month':
    cron.schedule('0 9 1 * *', sendPhotoEmail) // At 09:00 on day-of-month 1
    break
  case 'week':
    cron.schedule('0 9 * * 1', sendPhotoEmail) // At 09:00 on Monday
    break
  case 'day':
    cron.schedule('0 9 * * *', sendPhotoEmail) // At 09:00 every day
    break
  default:
    console.error(`Invalid schedule: ${schedule}`)
}

async function sendPhotoEmail() {
  try {
    const sid = await synoService.authenticate()
    const photos = await synoService.fetchPhotos(sid)
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const week = getWeekNumber(today)

    let filteredPhotos
    const sendBy = process.env.SEND_BY?.trim()

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

    // Only include photos that have thumbnail URLs
    const photoUrls = filteredPhotos
      .map(photo => photo.thumbnailUrl)
      .filter((url): url is string => url !== undefined)

    await emailService.sendPhotoEmail(
      photoUrls,
      process.env.NAS_IP!,
      process.env.PORT!
    )
  } catch (error) {
    console.error('Error sending photo email:', error)
  }
}

// Start the server
const port = parseInt(process.env.PORT || '8080', 10)
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
