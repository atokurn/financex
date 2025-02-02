import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    const user = await requireUser()

    const purchases = await db.purchase.findMany({
      where: {
        userId: user.id
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
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error("Error fetching purchases:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    let body
    try {
      const text = await request.text()
      console.log('Raw request body:', text)
      body = JSON.parse(text)
      console.log('Parsed request body:', body)
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request format - not valid JSON' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body - must be an object' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate required fields
    const requiredFields = ['supplier', 'items']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate items array
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Items must be a non-empty array' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate each item
    for (const item of body.items) {
      // Validate item type
      if (!item.type || !['material', 'product'].includes(item.type)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invalid item type: ${item.type}. Must be either 'material' or 'product'` 
          }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Validate IDs based on type
      if (item.type === 'material') {
        if (!item.materialId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Material items must have a materialId' }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        // Verify material exists
        const material = await db.material.findUnique({
          where: { id: item.materialId }
        })
        if (!material) {
          return new Response(
            JSON.stringify({ success: false, error: `Material with ID ${item.materialId} not found` }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } else if (item.type === 'product') {
        if (!item.productId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Product items must have a productId' }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        // Verify product exists
        const product = await db.product.findUnique({
          where: { id: item.productId }
        })
        if (!product) {
          return new Response(
            JSON.stringify({ success: false, error: `Product with ID ${item.productId} not found` }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }

      // Validate quantity
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Each item must have a valid quantity greater than 0' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Validate price
      if (typeof item.price !== 'number' || item.price < 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Each item must have a valid price' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    try {
      // Generate invoice number if not provided
      const invoiceNumber = body.invoiceNumber || await generateInvoiceNumber()

      // Calculate totals if not provided
      const subtotal = body.subtotal || body.items.reduce((sum: number, item: any) => sum + (Number(item.totalPrice) || (Number(item.quantity) * Number(item.price))), 0)
      const discount = Number(body.discount || 0)
      const additionalCostsTotal = Array.isArray(body.additionalCosts) 
        ? body.additionalCosts.reduce((sum: number, cost: any) => sum + (Number(cost.amount) || 0), 0)
        : 0
      const total = body.total || (subtotal - discount + additionalCostsTotal)

      // Create purchase with items
      const purchase = await db.purchase.create({
        data: {
          userId: user.id,
          invoiceNumber,
          supplier: body.supplier,
          reference: body.reference || '',
          notes: body.notes || '',
          orderType: body.orderType || 'offline',
          status: body.status || 'pending',
          discount: Number(discount),
          discountType: body.discountType || 'nominal',
          subtotal: Number(subtotal),
          total: Number(total),
          autoUpdatePrice: body.autoUpdatePrice || false,
          createdAt: body.date && body.time 
            ? new Date(`${body.date}T${body.time}`) 
            : new Date(),
          items: {
            create: body.items.map((item: any) => ({
              type: item.type,
              materialId: item.type === 'material' ? item.materialId : null,
              productId: item.type === 'product' ? item.productId : null,
              quantity: Number(item.quantity),
              unit: item.unit || 'pcs',
              price: Number(item.price),
              itemDiscount: Number(item.itemDiscount || 0),
              itemDiscountType: item.itemDiscountType || 'percentage',
              totalPrice: Number(item.totalPrice || (item.quantity * item.price)),
            }))
          },
          additionalCosts: Array.isArray(body.additionalCosts) && body.additionalCosts.length > 0 ? {
            create: body.additionalCosts.map((cost: any) => ({
              description: cost.description,
              amount: Number(cost.amount)
            }))
          } : undefined
        },
        include: {
          items: {
            include: {
              material: true,
              product: true,
            }
          },
          additionalCosts: true
        }
      })

      // If autoUpdatePrice is enabled and status is completed, update material and product prices
      if (body.autoUpdatePrice && purchase.status === 'completed') {
        const updatePromises = []

        for (const item of purchase.items) {
          if (item.materialId) {
            updatePromises.push(
              db.material.update({
                where: { id: item.materialId },
                data: { price: item.price }
              })
            )
          } else if (item.productId) {
            updatePromises.push(
              db.product.update({
                where: { id: item.productId },
                data: { price: item.price }
              })
            )
          }
        }

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises)
        }
      }

      revalidatePath('/dashboard/purchases')
      
      return new Response(
        JSON.stringify({ success: true, data: purchase }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Database error:', error)
      
      // Handle specific database errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        let errorMessage = 'Database error'
        
        // Handle specific error codes
        switch (error.code) {
          case 'P2002':
            errorMessage = 'A unique constraint would be violated.'
            break
          case 'P2003':
            errorMessage = 'Foreign key constraint failed.'
            break
          case 'P2025':
            errorMessage = 'Record not found.'
            break
          default:
            errorMessage = `Database error: ${error.message}`
        }
        
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to create purchase' 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function generateInvoiceNumber(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  
  // Get count of purchases today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const count = await db.purchase.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    }
  })
  
  const sequence = (count + 1).toString().padStart(3, '0')
  return `INV/PO/${year}${month}${day}/${sequence}`
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: "Purchase ID is required" },
        { status: 400 }
      )
    }

    // Get the purchase first to check ownership and get items
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
        { error: "Unauthorized to delete this purchase" },
        { status: 403 }
      )
    }

    // Delete the purchase and all related records
    await db.purchase.delete({
      where: { id }
    })

    revalidatePath('/dashboard/purchases')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting purchase:", error)
    return NextResponse.json(
      { error: "Failed to delete purchase" },
      { status: 500 }
    )
  }
}
