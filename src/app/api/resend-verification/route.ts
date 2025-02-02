import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/mail'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return new NextResponse('Email is required', { status: 400 })
    }

    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (!existingUser) {
      return new NextResponse('Email not found', { status: 404 })
    }

    const verificationToken = await generateVerificationToken(email)
    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('RESEND_VERIFICATION_ERROR:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
