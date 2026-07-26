import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { message, category } = await req.json()

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set — skipping feedback email')
      return NextResponse.json({ ok: true })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: 'Compound Games <onboarding@resend.dev>',
      to: 'cbolson2012@gmail.com',
      subject: `[Feedback] ${category}`,
      text: `Category: ${category}\n\n${message}`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('send-feedback error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
