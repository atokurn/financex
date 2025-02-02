import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params

    // Get authenticated user first
    const user = await requireUser()
    if (!user || !user.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Parse request body
    let body: { status?: string }
    try {
      const text = await request.text()
      console.log('Raw request body:', text)
      body = JSON.parse(text)
    } catch (error) {
      console.error('Failed to parse request:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request format'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Validate request body
    if (!body || typeof body !== 'object') {
      console.error('Invalid body:', body)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request body'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const { status } = body
    if (!status || typeof status !== 'string') {
      console.error('Invalid status:', status)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Status is required and must be a string'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      console.error('Invalid status value:', status)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    console.log('Finding purchase:', id)
    // Get current purchase with items
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!purchase) {
      console.error('Purchase not found:', id)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Purchase not found'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    console.log('Found purchase:', purchase)

    // Check ownership
    if (purchase.userId !== user.id) {
      console.error('Permission denied. User:', user.id, 'Purchase owner:', purchase.userId)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You do not have permission to update this purchase'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    try {
      console.log('Starting transaction')
      // Update purchase status in a transaction
      const updatedPurchase = await db.$transaction(async (tx) => {
        console.log('Updating purchase status to:', status)
        
        // Update the purchase status first
        const updated = await tx.purchase.update({
          where: { id },
          data: { status },
          include: {
            items: {
              include: {
                material: true,
                product: true
              }
            },
            additionalCosts: true
          }
        })

        if (!updated) {
          throw new Error('Failed to update purchase status')
        }

        console.log('Purchase updated:', updated)

        // Handle stock and price updates when status changes to completed
        if (status === 'completed' && purchase.status !== 'completed') {
          console.log('Processing updates for completed purchase:', {
            autoUpdatePrice: updated.autoUpdatePrice,
            items: updated.items.length,
            additionalCosts: updated.additionalCosts.length
          })

          // Calculate and update prices if autoUpdatePrice was enabled
          if (updated.autoUpdatePrice) {
            console.log('Auto-updating prices for completed purchase')
            
            // Group items by material/product ID to handle multiple items of the same type
            const itemsByMaterial = new Map()
            const itemsByProduct = new Map()

            for (const item of updated.items) {
              if (item.type === 'material' && item.materialId) {
                if (!itemsByMaterial.has(item.materialId)) {
                  itemsByMaterial.set(item.materialId, {
                    currentStock: item.material?.stock || 0,
                    items: []
                  })
                }
                itemsByMaterial.get(item.materialId).items.push(item)
              } else if (item.type === 'product' && item.productId) {
                if (!itemsByProduct.has(item.productId)) {
                  itemsByProduct.set(item.productId, {
                    currentStock: item.product?.stock || 0,
                    items: []
                  })
                }
                itemsByProduct.get(item.productId).items.push(item)
              }
            }

            // Calculate total additional costs per unit
            const totalQuantity = updated.items.reduce((sum, item) => sum + item.quantity, 0)
            const totalAdditionalCosts = updated.additionalCosts.reduce((sum, cost) => sum + cost.amount, 0)
            const additionalCostPerUnit = totalAdditionalCosts / totalQuantity

            // Update material prices using weighted average
            for (const [materialId, data] of itemsByMaterial) {
              try {
                const { currentStock, items } = data
                
                // Calculate new weighted average price
                let totalValue = currentStock * (items[0].material?.price || 0) // Current stock value
                let totalQuantity = currentStock

                // Add new purchases to the calculation
                for (const item of items) {
                  const priceWithAdditional = item.price + additionalCostPerUnit
                  totalValue += item.quantity * priceWithAdditional
                  totalQuantity += item.quantity
                }

                const newAveragePrice = totalValue / totalQuantity

                console.log('Updating material price:', {
                  materialId,
                  currentStock,
                  newPurchases: items.map(i => ({ quantity: i.quantity, price: i.price })),
                  additionalCostPerUnit,
                  newAveragePrice
                })

                await tx.material.update({
                  where: { id: materialId },
                  data: { 
                    price: newAveragePrice,
                    updatedAt: new Date()
                  }
                })
              } catch (error) {
                console.error('Error updating material price:', {
                  materialId,
                  error
                })
                throw error
              }
            }

            // Update product prices using weighted average
            for (const [productId, data] of itemsByProduct) {
              try {
                const { currentStock, items } = data
                
                // Calculate new weighted average price
                let totalValue = currentStock * (items[0].product?.price || 0) // Current stock value
                let totalQuantity = currentStock

                // Add new purchases to the calculation
                for (const item of items) {
                  const priceWithAdditional = item.price + additionalCostPerUnit
                  totalValue += item.quantity * priceWithAdditional
                  totalQuantity += item.quantity
                }

                const newAveragePrice = totalValue / totalQuantity

                console.log('Updating product price:', {
                  productId,
                  currentStock,
                  newPurchases: items.map(i => ({ quantity: i.quantity, price: i.price })),
                  additionalCostPerUnit,
                  newAveragePrice
                })

                await tx.product.update({
                  where: { id: productId },
                  data: { 
                    price: newAveragePrice,
                    updatedAt: new Date()
                  }
                })
              } catch (error) {
                console.error('Error updating product price:', {
                  productId,
                  error
                })
                throw error
              }
            }
          } else {
            console.log('Auto-update price is disabled for this purchase')
          }

          // Process stock updates
          console.log('Processing stock updates')
          for (const item of updated.items) {
            if (item.type === 'material' && item.materialId) {
              console.log('Updating material stock:', item.materialId)
              await tx.material.update({
                where: { id: item.materialId },
                data: { stock: { increment: item.quantity } }
              })

              await tx.stockHistory.create({
                data: {
                  userId: user.id,
                  materialId: item.materialId,
                  type: 'in',
                  quantity: item.quantity,
                  description: `Purchase completed: ${purchase.reference || purchase.invoiceNumber}`,
                  reference: purchase.invoiceNumber || ''
                }
              })
            } else if (item.type === 'product' && item.productId) {
              console.log('Updating product stock:', item.productId)
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } }
              })

              await tx.stockHistory.create({
                data: {
                  userId: user.id,
                  productId: item.productId,
                  type: 'in',
                  quantity: item.quantity,
                  description: `Purchase completed: ${purchase.reference || purchase.invoiceNumber}`,
                  reference: purchase.invoiceNumber || ''
                }
              })
            }
          }
        } else if (status === 'cancelled' && purchase.status === 'completed') {
          console.log('Processing stock updates for cancelled purchase')
          for (const item of purchase.items) {
            if (item.type === 'material' && item.materialId) {
              console.log('Reverting material stock:', item.materialId)
              await tx.material.update({
                where: { id: item.materialId },
                data: { stock: { decrement: item.quantity } }
              })

              await tx.stockHistory.create({
                data: {
                  userId: user.id,
                  materialId: item.materialId,
                  type: 'out',
                  quantity: item.quantity,
                  description: `Purchase cancelled: ${purchase.reference || purchase.invoiceNumber}`,
                  reference: purchase.invoiceNumber || ''
                }
              })
            } else if (item.type === 'product' && item.productId) {
              console.log('Reverting product stock:', item.productId)
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } }
              })

              await tx.stockHistory.create({
                data: {
                  userId: user.id,
                  productId: item.productId,
                  type: 'out',
                  quantity: item.quantity,
                  description: `Purchase cancelled: ${purchase.reference || purchase.invoiceNumber}`,
                  reference: purchase.invoiceNumber || ''
                }
              })
            }
          }
        }

        console.log('Transaction completed successfully')
        return updated
      })

      console.log('Sending success response:', updatedPurchase)
      return new Response(
        JSON.stringify({
          success: true,
          data: updatedPurchase
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    } catch (error) {
      console.error('Transaction error:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Database error: ${error.message}`
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update purchase status'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  } catch (error) {
    console.error('Request error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
