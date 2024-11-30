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

  async sendPhotoEmail(
    photoUrls: string[],
    hostIp: string,
    port: string
  ): Promise<void> {
    if (photoUrls.length === 0) {
      console.log('No photos to send.')
      return
    }

    const ipAddressWithoutPort = hostIp.split(':')[0]
    const mailHtml = `${photoUrls.join(
      '<br>'
    )}<br><a href="//${ipAddressWithoutPort}:${port}" target="_blank">View all on web</a>`

    const mailOptions = {
      from: this.fromEmail,
      to: this.toEmail,
      subject: this.subject,
      html: mailHtml
    }

    try {
      const info = await this.transporter.sendMail(mailOptions)
      console.log('Email sent:', info.response)
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }
}
