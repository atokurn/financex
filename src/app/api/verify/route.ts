import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { email, token } = await req.json()

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      include: { verificationToken: true },
    })

    if (!user || !user.verificationToken) {
      return new NextResponse(
        JSON.stringify({
          error: "Invalid verification attempt",
        }),
        { status: 400 }
      )
    }

    // Check if token matches and hasn't expired
    if (
      user.verificationToken.token !== token ||
      user.verificationToken.expires < new Date()
    ) {
      return new NextResponse(
        JSON.stringify({
          error: "Invalid or expired verification code",
        }),
        { status: 400 }
      )
    }

    // Update user verification status and remove verification token
    await db.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerified: new Date(),
        verificationToken: {
          delete: true,
        },
      },
    })

    return NextResponse.json({
      message: "Email verified successfully",
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
