import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return new NextResponse(
        JSON.stringify({
          error: "SKU is required"
        }),
        { status: 400 }
      )
    }

    const material = await db.material.findUnique({
      where: { code },
      select: { id: true }
    })

    return NextResponse.json({ exists: !!material })
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        error: "Failed to check SKU"
      }),
      { status: 500 }
    )
  }
}
