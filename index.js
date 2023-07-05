import fetch from 'node-fetch'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import cron from 'node-cron'

dotenv.config()

const ip = process.env.NAS_IP
const user = process.env.USER_ID
const password = process.env.USER_PASSWORD
const sendBy = process.env.SEND_BY.trim()
const serviceName = process.env.SERVICE_NAME
const sendEmail = process.env.SEND_EMAIL
const sendEmailPassword = process.env.SEND_EMAIL_PASSWORD
const receiveEmail = process.env.RECEIVE_EMAIL
const emailSubject = process.env.EMAIL_SUBJECT

async function authenticate() {
  const authResponse = await fetch(
    `https://${ip}/photo/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${user}&passwd=${password}`
  )
  const authData = await authResponse.json()
  return authData.data.sid
}

async function fetchPhotos(sid) {
  const photosResponse = await fetch(
    `https://${ip}/photo/webapi/entry.cgi?api=SYNO.Foto.Browse.Item&version=1&method=list&type=photo&offset=0&limit=5000&_sid=${sid}&additional=["thumbnail"]`
  )
  const photosData = await photosResponse.json()
  //console.log(photosData.data.list[0])
  return photosData.data.list
}
;``
function filterPhotosByMonth(photos, month) {
  const currentYear = new Date().getFullYear()
  return photos.filter(photo => {
    const takenDate = new Date(photo.time * 1000)
    return takenDate.getMonth() + 1 === month && takenDate.getFullYear() < currentYear
  })
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date - firstDayOfYear + 86400000) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function filterPhotosByWeek(photos, week) {
  const currentYear = new Date().getFullYear()
  return photos.filter(photo => {
    const takenDate = new Date(photo.time * 1000)
    return getWeekNumber(takenDate) === week && takenDate.getFullYear() < currentYear
  })
}

function filterPhotosByDay(photos, day, month) {
  const currentYear = new Date().getFullYear()
  return photos.filter(photo => {
    const takenDate = new Date(photo.time * 1000)
    return (
      takenDate.getDate() === day &&
      takenDate.getMonth() + 1 === month &&
      takenDate.getFullYear() < currentYear
    )
  })
}

function getThumbnailUrl(ip, sid, photo) {
  const {
    id,
    additional: {
      thumbnail: { cache_key }
    }
  } = photo
  return `https://${ip}/webapi/entry.cgi?api=SYNO.Foto.Thumbnail&version=1&method=get&mode=download&id=${id}&type=unit&size=xl&cache_key=${cache_key}&_sid=${sid}`
}

function returnPhotoUrls(photos, sid) {
  return photos.map(photo => {
    const { time } = photo
    const takenDate = new Date(time * 1000)
    const formattedDate = takenDate.toLocaleDateString()
    const formattedTime = takenDate.toLocaleTimeString()

    const thumbnailUrl = getThumbnailUrl(ip, sid, photo)
    const linkText = `${formattedDate} ${formattedTime}`
    return `<a href="${thumbnailUrl}">${linkText}</a>`
  })
}

const transporter = nodemailer.createTransport({
  service: serviceName,
  auth: {
    user: sendEmail,
    pass: sendEmailPassword
  }
})

async function main() {
  const sid = await authenticate()
  const photos = await fetchPhotos(sid)
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const week = getWeekNumber(today)

  let filteredPhotos

  console.log(`Sending ${sendBy} photos...`)
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

  const photoUrls = returnPhotoUrls(filteredPhotos, sid)

  // Check if photoUrls is empty
  if (photoUrls.length === 0) {
    console.log('No photos to send.')
    return
  }

  const mailOptions = {
    from: sendEmail,
    to: receiveEmail,
    subject: emailSubject,
    html: photoUrls.join('<br>')
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}

//main().catch(console.error)

let schedule
switch (sendBy) {
  case 'day':
    schedule = '0 8 * * *' // Every day at 8am
    break
  case 'week':
    schedule = '0 8 * * 1' // Every Monday at 8am
    break
  case 'month':
    schedule = '0 8 1 * *' // The 1st of every month at 8am
    break
  default:
    throw new Error(`Invalid sendBy value: ${sendBy}`)
}

cron.schedule(schedule, main)
