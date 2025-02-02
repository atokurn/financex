import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { ids } = await request.json()
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: 'ids must be a non-empty array' 
      }, { status: 400 })
    }

    const result = await db.sale.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    return NextResponse.json({ 
      message: `Successfully deleted ${result.count} sales`,
      count: result.count
    })
  } catch (error) {
    console.error('Bulk delete sales error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
