import { NextRequest, NextResponse } from 'next/server'

import { getIpHashFromRequest } from '@/lib/security/ipHash'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim() : ''

    if (!email) {
      return NextResponse.json({ status: 'error', error: 'Email is required' }, { status: 400 })
    }

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return NextResponse.json({ status: 'error', error: 'Invalid email format' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const ipHash = getIpHashFromRequest(request)

    const { data, error } = await supabase.rpc('subscribe_newsletter', {
      p_email: email,
      p_ip_hash: ipHash,
    })

    if (error) {
      return NextResponse.json({ status: 'error', error: 'Failed to subscribe' }, { status: 500 })
    }

    const status = (data as any)?.status as string | undefined
    const message = (data as any)?.message as string | undefined

    if (status === 'rate_limited') {
      return NextResponse.json({ status, error: message || 'Please wait before subscribing again' }, { status: 429 })
    }

    if (status === 'exists') {
      return NextResponse.json({ status, message: message || 'You are already subscribed' }, { status: 200 })
    }

    if (status === 'subscribed') {
      return NextResponse.json({ status, message: 'Subscribed successfully' }, { status: 200 })
    }

    return NextResponse.json({ status: 'error', error: message || 'Failed to subscribe' }, { status: 500 })
  } catch {
    return NextResponse.json({ status: 'error', error: 'Failed to subscribe' }, { status: 500 })
  }
}
