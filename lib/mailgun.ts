type MailgunRegion = 'us' | 'eu'

function getMailgunBaseUrl(): string {
  const region = (process.env.MAILGUN_REGION as MailgunRegion | undefined) || 'us'
  return region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
}

export async function sendMailgunEmail(opts: { to: string; subject: string; text: string; from?: string }) {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const from = opts.from || process.env.MAILGUN_FROM

  if (!apiKey || !domain || !from) {
    throw new Error('Mailgun is not configured (MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM required)')
  }

  // Mailgun expects username:api and password:apiKey for Basic Auth
  // Format: Authorization: Basic base64(api:apiKey)
  const auth = Buffer.from(`api:${apiKey}`).toString('base64')
  const url = `${getMailgunBaseUrl()}/v3/${encodeURIComponent(domain)}/messages`

  const formData = new URLSearchParams()
  formData.append('from', from)
  formData.append('to', opts.to)
  formData.append('subject', opts.subject)
  formData.append('text', opts.text)

  console.log('[Mailgun] Sending email:', { to: opts.to, subject: opts.subject, domain, from })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let errorMessage = `Mailgun send failed (${res.status}): ${text}`
    
    // Provide helpful guidance for common Mailgun errors
    if (res.status === 401) {
      errorMessage = 'Mailgun authentication failed. Please check your MAILGUN_API_KEY in .env file.'
    } else if (res.status === 403) {
      if (domain.includes('sandbox') || domain.includes('mg.') || domain.includes('mailgun.org')) {
        errorMessage = `Mailgun sandbox domain restriction: You're using a sandbox domain (${domain}). Sandbox domains can only send to authorized recipients. Please:\n1. Go to Mailgun Dashboard → Sending → Domains → Your Domain → Authorized Recipients\n2. Add the recipient email address, OR\n3. Use a verified custom domain instead of sandbox domain.\n\nOriginal error: ${text}`
      } else {
        errorMessage = `Mailgun send forbidden: ${text}`
      }
    }
    
    throw new Error(errorMessage)
  }

  return res.json().catch(() => ({}))
}


