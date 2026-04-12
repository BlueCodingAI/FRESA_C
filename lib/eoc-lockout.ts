const LOCKOUT_DAYS = 30

export type EocLockoutPayload = {
  locked: boolean
  daysRemaining: number
  nextEligibleDate: string | null
}

/**
 * Shared 30-day End-of-Course retake rule (after a failed attempt).
 * Staff roles are exempt for admin/testing workflows.
 */
export function getEocLockoutPayload(
  role: string,
  endOfCourseFailedAt: Date | null,
  endOfCoursePassedAt: Date | null
): EocLockoutPayload {
  if (role === 'Admin' || role === 'Developer' || role === 'Editor') {
    return { locked: false, daysRemaining: 0, nextEligibleDate: null }
  }

  if (endOfCoursePassedAt) {
    return { locked: false, daysRemaining: 0, nextEligibleDate: null }
  }

  if (!endOfCourseFailedAt) {
    return { locked: false, daysRemaining: 0, nextEligibleDate: null }
  }

  const nextEligible = new Date(endOfCourseFailedAt)
  nextEligible.setDate(nextEligible.getDate() + LOCKOUT_DAYS)
  const now = new Date()
  if (now >= nextEligible) {
    return { locked: false, daysRemaining: 0, nextEligibleDate: null }
  }

  const msRemaining = nextEligible.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
  const nextEligibleDate = nextEligible.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  })

  return { locked: true, daysRemaining, nextEligibleDate }
}

export function isEocRetakeBlocked(
  role: string,
  endOfCourseFailedAt: Date | null,
  endOfCoursePassedAt: Date | null
): boolean {
  return getEocLockoutPayload(role, endOfCourseFailedAt, endOfCoursePassedAt).locked
}
