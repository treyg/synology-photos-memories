import fetch from 'node-fetch'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import cron from 'node-cron'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

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
const hostPort = process.env.PORT
const port = 8080

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

async function authenticate() {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
  const authResponse = await fetch(
    `https://${ip}/photo/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${user}&passwd=${password}`
  )
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1;
  const authData = await authResponse.json()
  return authData.data.sid
}

async function fetchPhotos(sid) {
   process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
 
   let offset = 0;
   const limit = 5000;
   let allPhotos = [];
   let hasMore = true;
 
   while (hasMore) {
     const photosResponse = await fetch(
       `https://${ip}/photo/webapi/entry.cgi?api=SYNO.Foto.Browse.Item&version=1&method=list&type=photo&offset=${offset}&limit=${limit}&_sid=${sid}&additional=["thumbnail","resolution"]`
     );

     const photosData = await photosResponse.json();
     if (photosData.data && photosData.data.list && photosData.data.list.length > 0) {
       allPhotos = allPhotos.concat(photosData.data.list);
       offset += limit;
     } else {
       hasMore = false;
     }
   }
 
   process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1;
 
   console.log(`Found ${allPhotos.length} photos.`);
   return allPhotos;
 }
 

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
  return `https://${ip}/photo/webapi/entry.cgi?api=SYNO.Foto.Thumbnail&version=1&method=get&mode=download&id=${id == cache_key.split('_')[0] ? id : cache_key.split('_')[0]}&type=unit&size=xl&cache_key=${cache_key}&_sid=${sid}`
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

function returnPhotosInfo(photos, sid) {
  return photos.map(photo => {
    const { additional, ...rest } = photo;
    return {
      ...rest,
      resolution: additional.resolution,
      thumbBig: getThumbnailUrl(ip, sid, photo),
      thumbSmall: getThumbnailUrl(ip, sid, photo).replace('&size=xl', '&size=m'),
      date: retrieveData(photo)
    };
  });  
}
function retrieveData(photo) {
  const { time } = photo
  return new Date(time * 1000) 
}

const transporter = nodemailer.createTransport({
  service: serviceName,
  auth: {
    user: sendEmail,
    pass: sendEmailPassword
  }
})

let photosRawInfo
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
  photosRawInfo = returnPhotosInfo(filteredPhotos, sid)

  // Check if photoUrls is empty
  if (photoUrls.length === 0) {
    console.log('No photos to send.')
    return
  }

  const ipAddressWithoutPort = ip.split(':')[0];
  const mailHtml = `${photoUrls.join('<br>')}<br><a href="//${ipAddressWithoutPort}:${hostPort}" target="_blank">View all on web</a>`;
  
  const mailOptions = {
    from: sendEmail,
    to: receiveEmail,
    subject: emailSubject,
    html: mailHtml
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}

main().catch(console.error)

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

app.get('/', async (req, res) => {
  res.render('home', {urlList: photosRawInfo});
})

app.listen(port, () => {
  console.log(`Express port: ${port}`);
});
