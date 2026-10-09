import { cookies } from 'next/headers'
import { TOUR_SEEN_COOKIE } from '@/lib/tour-cookie'

export async function POST() {
  ;(await cookies()).set(TOUR_SEEN_COOKIE, '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return new Response(null, { status: 204 })
}
