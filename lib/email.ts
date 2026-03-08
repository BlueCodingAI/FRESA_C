/**
 * Email sending service using custom SMTP microservice
 * Replaces Mailgun implementation
 */

import { prisma } from './prisma'

const BODY_PREVIEW_MAX_LEN = 2000

export interface EmailOptions {
  to: string
  subject: string
  text: string
  from?: string
}

async function logSentEmail(to: string, subject: string, body: string) {
  try {
    const emailLog = (prisma as any).emailLog
    if (!emailLog) return
    const bodyPreview = body.slice(0, BODY_PREVIEW_MAX_LEN)
    await emailLog.create({
      data: { to, subject, bodyPreview },
    })
  } catch (e) {
    console.error('[Email Service] Failed to log sent email:', e)
  }
}

export async function sendEmail(opts: EmailOptions) {
  console.log('[Email Service] ========== sendEmail FUNCTION CALLED ==========')
  console.log('[Email Service] Options received:', { to: opts.to, subject: opts.subject, from: opts.from })
  
  const smtpServer = process.env.SMTP_SERVER_URL
  const defaultFrom = process.env.SMTP_FROM || 'admin@63hours.com'
  const smtpUser = process.env.SMTP_USER || 'admin@63hours.com'
  const smtpPass = process.env.SMTP_PASS
  const smtpServerHost = process.env.SMTP_SERVER_HOST || 'mail.floridalistingsrealestate.com'

  console.log('[Email Service] Environment check:', {
    hasSmtpServer: !!smtpServer,
    hasSmtpPass: !!smtpPass,
    smtpServer: smtpServer,
    smtpServerHost: smtpServerHost,
    smtpUser: smtpUser,
    defaultFrom: defaultFrom,
  })

  if (!smtpServer || !smtpPass) {
    const missing = []
    if (!smtpServer) missing.push('SMTP_SERVER_URL')
    if (!smtpPass) missing.push('SMTP_PASS')
    const errorMsg = `SMTP service is not configured. Missing environment variables: ${missing.join(', ')}. Please check your .env file and restart the server.`
    console.error('[Email Service] ❌ Configuration error:', errorMsg)
    console.error('[Email Service] Current env values:', {
      SMTP_SERVER_URL: smtpServer ? 'SET (hidden)' : 'NOT SET',
      SMTP_PASS: smtpPass ? 'SET (hidden)' : 'NOT SET',
      SMTP_SERVER_HOST: smtpServerHost,
      SMTP_USER: smtpUser,
      SMTP_FROM: defaultFrom,
    })
    throw new Error(errorMsg)
  }

  const from = opts.from || defaultFrom

  const requestBody = {
    smtp_server: smtpServerHost,
    smtp_user: smtpUser,
    smtp_pass: smtpPass,
    to: opts.to,
    from: from,
    subject: opts.subject,
    body: opts.text,
  }

  console.log('[Email Service] Sending email:', { 
    to: opts.to, 
    subject: opts.subject, 
    from,
    smtpServerHost 
  })

  try {
    console.log('[Email Service] ========== MAKING HTTP REQUEST ==========')
    console.log('[Email Service] URL:', smtpServer)
    console.log('[Email Service] Request body (without password):', {
      smtp_server: requestBody.smtp_server,
      smtp_user: requestBody.smtp_user,
      to: requestBody.to,
      from: requestBody.from,
      subject: requestBody.subject,
      body_length: requestBody.body.length,
    })

    console.log('[Email Service] Sending POST request to SMTP server...')
    const res = await fetch(smtpServer, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    console.log('[Email Service] HTTP request completed')

    console.log('[Email Service] Response status:', res.status, res.statusText)

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error')
      console.error('[Email Service] SMTP error response:', errorText)
      throw new Error(`SMTP send failed (${res.status}): ${errorText}`)
    }

    const responseText = await res.text().catch(() => '')
    console.log('[Email Service] Email sent successfully. Response:', responseText)

    await logSentEmail(opts.to, opts.subject, opts.text)

    return { success: true, message: responseText }
  } catch (error: any) {
    console.error('[Email Service] Error sending email:', error)
    console.error('[Email Service] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
    // Re-throw with more context
    if (error.message.includes('fetch')) {
      throw new Error(`Failed to connect to SMTP server at ${smtpServer}. Please check SMTP_SERVER_URL in .env file.`)
    }
    
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

// Alias for backward compatibility (if any code still uses sendMailgunEmail)
export const sendMailgunEmail = sendEmail

