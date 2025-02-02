import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: 'ids must be a non-empty array' 
      }, { status: 400 })
    }

    // Delete all stock history entries with the given ids
    const result = await db.stockHistory.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    return NextResponse.json({
      message: `Successfully deleted ${result.count} stock history entries`,
      count: result.count
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete stock history entries',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
