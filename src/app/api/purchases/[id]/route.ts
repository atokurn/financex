import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const purchase = await db.purchase.findUnique({
      where: {
        id: params.id,
      },
      include: {
        items: {
          include: {
            material: {
              select: {
                code: true,
                name: true,
                unit: true,
              },
            },
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          }
        }
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Failed to fetch purchase:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser()
    const { id } = params
    const body = await request.json()

    // Validate status
    const { status } = body
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Get the purchase
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      )
    }

    if (purchase.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Handle stock updates in a transaction
    const updatedPurchase = await db.$transaction(async (tx) => {
      // If changing from pending to completed, increase stock
      if (status === 'completed' && purchase.status === 'pending') {
        for (const item of purchase.items) {
          if (item.type === 'material' && item.materialId) {
            // Update material stock
            await tx.material.update({
              where: { id: item.materialId },
              data: {
                stock: { increment: item.quantity }
              }
            })

            // Create stock history
            await tx.stockHistory.create({
              data: {
                userId: user.id,
                materialId: item.materialId,
                type: 'in',
                quantity: item.quantity,
                description: `Purchase completed: ${purchase.reference || purchase.invoiceNumber}`,
                reference: purchase.invoiceNumber
              }
            })
          } else if (item.type === 'product' && item.productId) {
            // Update product stock
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.quantity }
              }
            })

            // Create stock history
            await tx.stockHistory.create({
              data: {
                userId: user.id,
                productId: item.productId,
                type: 'in',
                quantity: item.quantity,
                description: `Purchase completed: ${purchase.reference || purchase.invoiceNumber}`,
                reference: purchase.invoiceNumber
              }
            })
          }
        }
      }
      // If changing from completed to cancelled, decrease stock
      else if (status === 'cancelled' && purchase.status === 'completed') {
        for (const item of purchase.items) {
          if (item.type === 'material' && item.materialId) {
            // Update material stock
            await tx.material.update({
              where: { id: item.materialId },
              data: {
                stock: { decrement: item.quantity }
              }
            })

            // Create stock history
            await tx.stockHistory.create({
              data: {
                userId: user.id,
                materialId: item.materialId,
                type: 'out',
                quantity: item.quantity,
                description: `Purchase cancelled: ${purchase.reference || purchase.invoiceNumber}`,
                reference: purchase.invoiceNumber
              }
            })
          } else if (item.type === 'product' && item.productId) {
            // Update product stock
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: item.quantity }
              }
            })

            // Create stock history
            await tx.stockHistory.create({
              data: {
                userId: user.id,
                productId: item.productId,
                type: 'out',
                quantity: item.quantity,
                description: `Purchase cancelled: ${purchase.reference || purchase.invoiceNumber}`,
                reference: purchase.invoiceNumber
              }
            })
          }
        }
      }

      // Update the purchase status
      return tx.purchase.update({
        where: { id },
        data: { status },
        include: {
          items: {
            include: {
              material: {
                select: {
                  code: true,
                  name: true,
                  unit: true,
                },
              },
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            }
          }
        }
      })
    })

    return NextResponse.json(updatedPurchase)
  } catch (error) {
    console.error("Error updating purchase:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update purchase" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser()
    const { id } = params

    // Get the purchase
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            material: true,
            product: true
          }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      )
    }

    if (purchase.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Delete the purchase and update stock in a transaction
    await db.$transaction(async (tx) => {
      // Revert stock changes if status is completed
      if (purchase.status === 'completed') {
        for (const item of purchase.items) {
          if (item.type === 'material' && item.materialId) {
            await tx.material.update({
              where: { id: item.materialId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            })

            // Create stock history
            await tx.stockHistory.create({
              data: {
                userId: user.id,
                materialId: item.materialId,
                type: 'out',
                quantity: item.quantity,
                description: `Purchase deleted: ${purchase.reference || purchase.invoiceNumber}`,
                reference: purchase.invoiceNumber
              }
            })
          } else if (item.type === 'product' && item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            })

            // Create stock history
            await tx.stockHistory.create({
              data: {
                userId: user.id,
                productId: item.productId,
                type: 'out',
                quantity: item.quantity,
                description: `Purchase deleted: ${purchase.reference || purchase.invoiceNumber}`,
                reference: purchase.invoiceNumber
              }
            })
          }
        }
      }

      // Delete the purchase
      await tx.purchase.delete({
        where: { id }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting purchase:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to delete purchase" },
      { status: 500 }
    )
  }
}
