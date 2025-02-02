import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Test database connection
    console.log('Testing database connection...')
    await db.$connect()
    console.log('Database connection successful')

    // Test query
    const count = await db.material.count()
    console.log('Current material count:', count)

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      materialCount: count
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    }, { status: 500 })
  } finally {
    await db.$disconnect()
  }
}
