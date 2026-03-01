/**
 * Default email templates and helper to resolve template (DB or default) with placeholder replacement.
 * Placeholders use {{placeholderName}} and are replaced when sending.
 */

import { PrismaClient } from '@prisma/client'

export const EMAIL_TEMPLATE_KEYS = [
  'contact_confirmation',
  'contact_admin',
  'signup_verification',
  'signup_admin',
  'forgot_password',
  'resend_verification',
  'quiz_passed',
  'exam_passed',
  'payment_completed',
] as const

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number]

export const DEFAULT_EMAIL_TEMPLATES: Record<
  EmailTemplateKey,
  { name: string; subject: string; body: string }
> = {
  contact_confirmation: {
    name: 'Contact form – confirmation (to submitter)',
    subject: 'Contact Request on 63Hours.com',
    body: `Hello {{name}},

Thanks for contacting 63hours.com.

We have received your message and will respond back ASAP.

This is an automated notification from the 63Hours.com Contact Form System.

63Hours.com
https://63hours.com`,
  },
  contact_admin: {
    name: 'Contact form – notification (to admin)',
    subject: 'Contact Form on 63Hours.com from {{name}}',
    body: `Dear Administrator,

You have received a new contact form submission on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contact Form filled out by: {{name}}
Email Address:              {{email}}
Phone Number:               {{phone}}
Registration Date:           {{registrationDate}}
Date Submitted:              {{submittedAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{message}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com contact form system.

Best regards,
63Hours.com System`,
  },
  signup_verification: {
    name: 'Registration – email verification (to user)',
    subject: 'Verify your email - 63Hours.com',
    body: `Welcome to 63Hours.com!

Please verify your email address by clicking the link below:

{{verificationLink}}

This link will expire in 24 hours.

If you did not create this account, you can safely ignore this email.`,
  },
  signup_admin: {
    name: 'Registration – new user notification (to admin)',
    subject: 'New Registration on 63Hours.com',
    body: `Dear Administrator,

A new user has registered on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGISTRATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:              {{name}}
Email Address:     {{email}}
Registration Date: {{registrationDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com registration system.

Best regards,
63Hours.com System`,
  },
  forgot_password: {
    name: 'Forgot password – reset link (to user)',
    subject: 'Reset your 63Hours.com password',
    body: `You requested a password reset.

Reset link:
{{resetLink}}

This link expires in 1 hour. If you did not request this, you can ignore this email.`,
  },
  resend_verification: {
    name: 'Resend verification – verification link (to user)',
    subject: 'Verify your email - 63Hours.com',
    body: `Please verify your email address by clicking the link below:

{{verificationLink}}

This link will expire in 24 hours.

If you did not request this, you can safely ignore this email.`,
  },
  quiz_passed: {
    name: 'Quiz passed – notification (to admin)',
    subject: '{{studentName}} passed quiz: {{chapterName}} on 63Hours.com',
    body: `Dear Administrator,

A student has passed a chapter quiz on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:              {{studentName}}
Email Address:     {{email}}
Registration Date: {{registrationDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUIZ PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chapter:           {{chapterName}}
Finish Date:       {{finishDate}}
Score:             {{score}} out of {{total}} ({{percentage}}%)
Status:            PASSED ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com quiz system.

Best regards,
63Hours.com System`,
  },
  exam_passed: {
    name: 'End-of-Course exam passed – notification (to admin)',
    subject: '{{studentName}} passed End-of-Course Exam on 63Hours.com',
    body: `Dear Administrator,

A student has passed the End-of-Course Exam on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:              {{studentName}}
Email Address:     {{email}}
Registration Date: {{registrationDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END-OF-COURSE EXAM COMPLETION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Finish Date:       {{finishDate}}
Score:             {{score}} out of {{total}} ({{percentage}}%)
Status:            PASSED ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com exam system.

Best regards,
63Hours.com System`,
  },
  payment_completed: {
    name: 'Certificate payment – notification (to admin)',
    subject: '{{studentName}} – Certificate payment completed on 63Hours.com',
    body: `Dear Administrator,

A student has completed payment for the certificate on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:              {{studentName}}
Email Address:     {{email}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date:              {{paidAt}}
Amount:            $200 (Certificate of Completion)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com certification system.

Best regards,
63Hours.com System`,
  },
}

function replacePlaceholders(text: string, vars: Record<string, string | number | undefined>): string {
  let out = text
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`
    out = out.split(placeholder).join(value != null ? String(value) : '')
  }
  return out
}

/**
 * Get subject and body for an email template. Uses DB if a row exists for key, otherwise defaults.
 * Replaces {{placeholders}} with values from vars.
 */
export async function getEmailTemplate(
  prisma: PrismaClient,
  key: EmailTemplateKey,
  vars: Record<string, string | number | undefined>
): Promise<{ subject: string; body: string }> {
  const template = await prisma.emailTemplate.findUnique({
    where: { key },
  })
  const subject = template?.subject ?? DEFAULT_EMAIL_TEMPLATES[key].subject
  const body = template?.body ?? DEFAULT_EMAIL_TEMPLATES[key].body
  return {
    subject: replacePlaceholders(subject, vars),
    body: replacePlaceholders(body, vars),
  }
}
