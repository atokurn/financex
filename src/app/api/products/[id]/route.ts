import { NextResponse } from 'next/server'
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await db.product.findUnique({
      where: {
        id: params.id
      },
      include: {
        materials: {
          include: {
            material: true
          }
        }
      }
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    if (error instanceof Error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch product' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    console.log('Update product request:', { id: params.id, body })

    // First check if the product exists
    const existingProduct = await db.product.findUnique({
      where: {
        id: params.id
      },
      include: {
        materials: true,
        user: true
      }
    })

    if (!existingProduct) {
      console.log('Product not found:', params.id)
      return new NextResponse(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If SKU is being changed, check if new SKU already exists
    if (body.sku && body.sku !== existingProduct.sku) {
      const skuExists = await db.product.findFirst({
        where: {
          sku: body.sku,
          id: {
            not: params.id
          }
        }
      })

      if (skuExists) {
        console.log('SKU already exists:', body.sku)
        return new NextResponse(
          JSON.stringify({ error: 'A product with this SKU already exists' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Delete existing materials if they exist
    if (body.materials) {
      console.log('Deleting existing materials for product:', params.id)
      await db.productMaterials.deleteMany({
        where: {
          productId: params.id
        }
      })
    }

    // Prepare update data
    const updateData = {
      name: body.name,
      sku: body.sku,
      description: body.description,
      price: Number(body.price),
      stock: Number(body.stock),
      minStock: Number(body.minStock),
      category: body.category,
      useMaterial: body.useMaterial || false,
      image: body.image || existingProduct.image,
      ...(body.materials && {
        materials: {
          create: body.materials.map((m: any) => ({
            materialId: m.materialId,
            quantity: Number(m.quantity),
            userId: existingProduct.userId // Add userId from the existing product
          }))
        }
      })
    }

    console.log('Updating product with data:', updateData)

    // Update the product
    const updatedProduct = await db.product.update({
      where: {
        id: params.id
      },
      data: updateData,
      include: {
        materials: {
          include: {
            material: true
          }
        }
      }
    })

    console.log('Product updated successfully:', updatedProduct.id)
    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Error updating product:', error)
    if (error instanceof Error) {
      return new NextResponse(
        JSON.stringify({ 
          error: error.message,
          details: error.stack 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to update product',
        details: String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // First check if the product exists
    const product = await db.product.findUnique({
      where: {
        id: params.id
      }
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    // Delete the product and its relations
    await db.product.delete({
      where: {
        id: params.id
      }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting product:', error)
    if (error instanceof Error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new NextResponse(
      JSON.stringify({ error: 'Failed to delete product' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
