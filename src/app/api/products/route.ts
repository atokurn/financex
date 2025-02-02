import { NextResponse } from 'next/server'
import { db } from "@/lib/db"
import { requireUser } from '@/lib/auth'

interface Product {
  id: string
  image: string
  name: string
  sku: string
  stock: number
  minStock: number
  price: number
  category: string
  useMaterial: boolean
  materials: { materialId: string; quantity: number }[]
  createdAt: Date
  updatedAt: Date
  userId: string
}

export async function GET() {
  try {
    const user = await requireUser()

    const products = await db.product.findMany({
      where: {
        userId: user.id
      },
      include: {
        materials: {
          include: {
            material: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()

    // Check if SKU already exists for this user
    const existingProduct = await db.product.findFirst({
      where: {
        sku: body.sku,
        userId: user.id
      }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: {
        ...body,
        userId: user.id,
        materials: {
          create: body.materials?.map((material: any) => ({
            materialId: material.materialId,
            quantity: material.quantity,
            userId: user.id
          })) || []
        }
      },
      include: {
        materials: {
          include: {
            material: true
          }
        }
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { 
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
