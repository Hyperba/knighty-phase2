import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]
    return first?.trim() || ''
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return ''
}

export function getIpHashFromRequest(request: NextRequest) {
  const ip = getClientIp(request)
  if (!ip) return ''

  const salt = process.env.IP_HASH_SALT || ''
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}
