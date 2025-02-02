import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await requireUser()

    // Get unique suppliers from purchases
    const purchases = await db.purchase.findMany({
      where: {
        userId: user.id
      },
      select: {
        supplier: true
      },
      distinct: ['supplier']
    })

    // Extract and sort supplier names
    const suppliers = purchases
      .map(p => p.supplier)
      .sort((a, b) => a.localeCompare(b))

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}
