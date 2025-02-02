import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Ensure user is authenticated
    await requireUser()

    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request', 
        details: 'ids must be a non-empty array' 
      }, { status: 400 })
    }

    // Get all orders that will be deleted
    const orders = await db.order.findMany({
      where: {
        id: {
          in: ids
        }
      },
      select: {
        id: true,
        orderId: true,
        sku: true
      }
    })

    if (orders.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Orders not found',
        details: 'No orders found with the provided IDs'
      }, { status: 404 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Delete orders
      const deleteResult = await tx.order.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      })

      return {
        count: deleteResult.count,
        orders: orders.map(order => ({
          id: order.id,
          orderId: order.orderId,
          sku: order.sku
        }))
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} orders`,
      details: {
        count: result.count,
        deletedOrders: result.orders
      }
    })

  } catch (error) {
    console.error('Bulk delete orders error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete orders',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
