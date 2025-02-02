import { prisma } from '@/lib/prisma'
import { requireUser } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const itemType = searchParams.get('itemType')
    const type = searchParams.get('type')
    const materialId = searchParams.get('materialId')
    const productId = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build where clause based on filters
    const where: any = {
      userId: user.id
    }

    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(`${startDate}T00:00:00Z`),
        lte: new Date(`${endDate}T23:59:59Z`)
      }
    }

    // Item type filter
    if (itemType === 'material') {
      where.materialId = { not: null }
      where.productId = null
    } else if (itemType === 'product') {
      where.productId = { not: null }
      where.materialId = null
    }

    // Change type filter
    if (type && type !== 'all') {
      where.type = type
    }

    // Material ID filter
    if (materialId) {
      where.materialId = materialId
    }

    // Product ID filter
    if (productId) {
      where.productId = productId
    }

    // Get total count for pagination
    const total = await prisma.stockHistory.count({ where })

    // Get paginated results with relations
    const stockHistory = await prisma.stockHistory.findMany({
      where,
      include: {
        material: {
          select: {
            code: true,
            name: true,
            unit: true
          }
        },
        product: {
          select: {
            sku: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    return Response.json({
      data: stockHistory,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching stock history:', error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return Response.json(
      { error: "Failed to fetch stock history" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    let body
    try {
      body = await request.json()
      console.log('Received request body:', body)
    } catch (e) {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    
    const { materialId, productId, type, quantity, description, reference } = body
    console.log('Parsed request data:', { materialId, productId, type, quantity, description, reference })

    // Validate required fields
    if (quantity === undefined || !type || !(materialId || productId)) {
      console.error('Validation error:', { quantity, type, materialId, productId })
      return Response.json({ 
        error: 'Missing required fields', 
        details: { quantity, type, materialId, productId } 
      }, { status: 400 })
    }

    // Validate type
    if (!['in', 'out', 'adjustment'].includes(type)) {
      console.error('Invalid type:', type)
      return Response.json({ 
        error: 'Invalid type. Must be either "in", "out", or "adjustment"',
        received: type 
      }, { status: 400 })
    }

    // Validate quantity based on type
    if (type !== 'adjustment' && quantity <= 0) {
      console.error('Invalid quantity for type:', { type, quantity })
      return Response.json({ 
        error: 'Quantity must be greater than 0 for stock in/out',
        details: { type, quantity }
      }, { status: 400 })
    }

    try {
      if (materialId) {
        const result = await prisma.$transaction(async (tx) => {
          const material = await tx.material.findUnique({
            where: { id: materialId },
          })

          if (!material) {
            throw new Error(`Material not found: ${materialId}`)
          }

          let newStock
          if (type === 'adjustment') {
            newStock = quantity
          } else {
            newStock = type === 'in' ? material.stock + quantity : material.stock - quantity
          }

          console.log('Calculated new stock:', { oldStock: material.stock, newStock })

          if (newStock < 0) {
            throw new Error('Stock cannot be negative')
          }

          // Create stock history entry first
          const stockHistory = await tx.stockHistory.create({
            data: {
              userId: user.id,
              materialId,
              type,
              quantity,
              description,
              reference
            }
          })
          console.log('Created stock history:', stockHistory)

          // Then update the stock
          await tx.material.update({
            where: { id: materialId },
            data: { stock: newStock }
          })
          console.log('Updated material stock')

          return stockHistory
        })

        console.log('Successfully processed stock change:', result)
        return Response.json(result, { status: 200 })
      } else if (productId) {
        const result = await prisma.$transaction(async (tx) => {
          const product = await tx.product.findUnique({
            where: { id: productId },
          })

          if (!product) {
            throw new Error(`Product not found: ${productId}`)
          }

          let newStock
          if (type === 'adjustment') {
            newStock = quantity
          } else {
            newStock = type === 'in' ? product.stock + quantity : product.stock - quantity
          }

          console.log('Calculated new stock:', { oldStock: product.stock, newStock })

          if (newStock < 0) {
            throw new Error('Stock cannot be negative')
          }

          // Create stock history entry first
          const stockHistory = await tx.stockHistory.create({
            data: {
              userId: user.id,
              productId,
              type,
              quantity,
              description,
              reference
            }
          })
          console.log('Created stock history:', stockHistory)

          // Then update the stock
          await tx.product.update({
            where: { id: productId },
            data: { stock: newStock }
          })
          console.log('Updated product stock')

          return stockHistory
        })

        console.log('Successfully processed stock change:', result)
        return Response.json(result, { status: 200 })
      }
    } catch (txError) {
      console.error('Transaction error:', txError)
      throw txError
    }
  } catch (error) {
    console.error('Error processing stock change:', error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return Response.json(
      { error: "Failed to process stock change" },
      { status: 500 }
    )
  }
}
