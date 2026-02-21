import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { ContactEmail } from '@/emails/ContactEmail'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getIpHashFromRequest } from '@/lib/security/ipHash'

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 100
const MAX_MESSAGE_LENGTH = 5000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const projectType = typeof body?.projectType === 'string' ? body.projectType.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!name || !email || !projectType || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (name.length > MAX_NAME_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'Input exceeds maximum allowed length' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const supabase = await getSupabaseServerClient()
    const ipHash = getIpHashFromRequest(request)

    const { data: canSubmit, error: canSubmitError } = await supabase.rpc('can_submit_contact', {
      p_email: email,
      p_ip_hash: ipHash,
    })

    if (canSubmitError) {
      return NextResponse.json(
        { status: 'error', error: 'Failed to validate request' },
        { status: 500 }
      )
    }

    if (!(canSubmit as any)?.ok) {
      const status = (canSubmit as any)?.status as string | undefined
      const msg = (canSubmit as any)?.message as string | undefined

      if (status === 'rate_limited') {
        return NextResponse.json(
          { status: 'rate_limited', error: msg || 'Please wait before submitting again' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { status: 'error', error: msg || 'Invalid request' },
        { status: 400 }
      )
    }

    const data = await resend.emails.send({
      from: 'Knighty Builds <onboarding@resend.dev>',
      to: ['zhishnagy@gmail.com'],
      subject: `New Project Inquiry: ${projectType} from ${name}`,
      react: ContactEmail({
        name,
        email,
        projectType,
        message,
      }),
    })

    const { data: insertResult, error: insertError } = await supabase.rpc('insert_contact_submission', {
      p_name: name,
      p_email: email,
      p_project_type: projectType,
      p_message: message,
      p_ip_hash: ipHash,
    })

    if (insertError) {
      return NextResponse.json(
        { status: 'error', error: 'Message sent, but failed to save. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { status: 'success', email: data, saved: insertResult },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to send email. Please try again later.' },
      { status: 500 }
    )
  }
}
