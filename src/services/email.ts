import nodemailer from 'nodemailer'
import { Photo } from '../types/index.js'

export class EmailService {
  private transporter: nodemailer.Transporter
  private fromEmail: string
  private toEmail: string
  private subject: string

  constructor(
    service: string,
    fromEmail: string,
    password: string,
    toEmail: string,
    subject: string
  ) {
    console.log(`Initializing email service with service: ${service}, from: ${fromEmail}, to: ${toEmail}`)
    this.transporter = nodemailer.createTransport({
      service,
      auth: {
        user: fromEmail,
        pass: password
      }
    })
    this.fromEmail = fromEmail
    this.toEmail = toEmail
    this.subject = subject
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  async sendPhotoEmail(
    photos: Photo[],
    hostIp: string,
    port: string
  ): Promise<void> {
    if (photos.length === 0) {
      console.log('No photos to send.')
      return
    }

    console.log(`Preparing to send email with ${photos.length} photos`)
    console.log('Host IP:', hostIp)
    console.log('Port:', port)

    const ipAddressWithoutPort = hostIp.split(':')[0]
    
    // Create HTML links for each photo with formatted date
    const photoLinks = photos
      .filter(photo => photo.thumbnailUrl)
      .map(photo => {
        const dateStr = this.formatDate(photo.time)
        return `<div style="margin: 10px 0;"><a href="${photo.thumbnailUrl}" style="color: #0066cc; text-decoration: none; font-family: Arial, sans-serif;">${dateStr}</a></div>`
      })
      .join('\n')

    const mailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #2c3e50;">Your Photo Memories</h2>
        ${photoLinks}
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <a href="//${ipAddressWithoutPort}:${port}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;" target="_blank">View all on web</a>
        </div>
      </div>
    `

    const mailOptions = {
      from: this.fromEmail,
      to: this.toEmail,
      subject: this.subject,
      html: mailHtml
    }

    try {
      console.log('Attempting to send email with options:', {
        from: this.fromEmail,
        to: this.toEmail,
        subject: this.subject,
        numberOfPhotos: photos.length
      })
      
      // Verify SMTP connection first
      const verifyResult = await this.transporter.verify()
      console.log('SMTP connection verified:', verifyResult)
      
      const info = await this.transporter.sendMail(mailOptions)
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      })
    } catch (error) {
      console.error('Error sending email:', error)
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
      throw error
    }
  }
}
