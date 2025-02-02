import { hash } from "bcryptjs"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()
    const hashed = await hash(password, 12)

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return new NextResponse(
        JSON.stringify({
          error: "User with this email already exists",
        }),
        { status: 400 }
      )
    }

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashed,
      },
    })

    // Generate and store verification token
    const token = generateOTP()
    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + 15) // Token expires in 15 minutes

    await db.verificationToken.create({
      data: {
        token,
        expires,
        userId: user.id,
      },
    })

    // Send verification email
    await sendVerificationEmail(email, token)

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
      },
    })
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({
        error: error.message,
      }),
      { status: 500 }
    )
  }
}
