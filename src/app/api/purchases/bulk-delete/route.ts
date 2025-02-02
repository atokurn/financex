import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const { ids } = await request.json()
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: 'ids must be a non-empty array' 
      }, { status: 400 })
    }

    // Get all completed purchases that will be deleted
    const completedPurchases = await db.purchase.findMany({
      where: {
        id: {
          in: ids
        },
        status: 'completed',
        userId: user.id
      },
      include: {
        items: {
          include: {
            material: true,
            product: true
          }
        }
      }
    })

    // Start a transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // Process each completed purchase to revert stock
      for (const purchase of completedPurchases) {
        // Process each item in the purchase
        for (const item of purchase.items) {
          if (item.type === 'material' && item.material) {
            // Decrease material stock
            await tx.material.update({
              where: { id: item.materialId! },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            })

            // Create stock history entry
            await tx.stockHistory.create({
              data: {
                materialId: item.materialId!,
                type: 'out',
                quantity: item.quantity,
                description: `Purchase deleted: ${purchase.reference || purchase.invoiceNumber}`,
                reference: `Bulk delete - Purchase: ${purchase.reference || purchase.invoiceNumber}`,
                userId: user.id
              }
            })
          } else if (item.type === 'product' && item.product) {
            // Decrease product stock
            await tx.product.update({
              where: { id: item.productId! },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            })

            // Create stock history entry
            await tx.stockHistory.create({
              data: {
                productId: item.productId!,
                type: 'out',
                quantity: item.quantity,
                description: `Purchase deleted: ${purchase.reference || purchase.invoiceNumber}`,
                reference: `Bulk delete - Purchase: ${purchase.reference || purchase.invoiceNumber}`,
                userId: user.id
              }
            })
          }
        }
      }

      // Delete all selected purchases (both completed and non-completed)
      const result = await tx.purchase.deleteMany({
        where: {
          id: {
            in: ids
          },
          userId: user.id
        }
      })

      return result
    })

    revalidatePath('/dashboard/purchases')
    return NextResponse.json({ 
      message: `Successfully deleted ${ids.length} purchases, reverted stock for ${completedPurchases.length} completed purchases`,
      count: ids.length,
      completedCount: completedPurchases.length
    })
  } catch (error) {
    console.error('Bulk delete purchases error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete purchases',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
