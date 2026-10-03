import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ACCESS_COOKIE = 'sofar_team_access'

export function accessTokenFor(passcode: string) {
  return createHash('sha256').update(`sofar-show-calendar:${passcode}`).digest('hex')
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

// Passcode protection is temporarily off. Flip to true to require TEAM_PASSCODE again.
export const PASSCODE_ENABLED = false

export async function hasTeamAccess() {
  if (!PASSCODE_ENABLED) return true
  const passcode = process.env.TEAM_PASSCODE
  if (!passcode) return false
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  return Boolean(token && safeEqual(token, accessTokenFor(passcode)))
}
