import { NextResponse } from 'next/server'
import { db } from "@/lib/db"
import { requireUser } from '@/lib/auth'

interface MaterialInput {
  materialId: string;
  quantity: number;
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
    // Verifikasi user terlebih dahulu
    const user = await requireUser()
    
    // Pastikan user memiliki ID yang valid
    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      console.error('Invalid user ID in session', user);
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 401 }
      );
    }
    
    // Parse request body dengan error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request data format' },
        { status: 400 }
      );
    }
    
    console.log('Creating product with data:', JSON.stringify({
      ...body,
      userId: user.id,
      materials: body.materials?.length || 0
    }, null, 2))

    // Validasi data produk yang diterima
    if (!body.name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }
    if (!body.sku) {
      return NextResponse.json({ error: 'Product SKU is required' }, { status: 400 })
    }
    if (body.price === undefined || isNaN(body.price)) {
      return NextResponse.json({ error: 'Valid product price is required' }, { status: 400 })
    }
    
    // Validasi tambahan untuk stock dan minStock
    if (body.stock !== undefined && (isNaN(body.stock) || body.stock < 0)) {
      return NextResponse.json({ error: 'Stock must be a non-negative number' }, { status: 400 });
    }
    
    if (body.minStock !== undefined && (isNaN(body.minStock) || body.minStock < 0)) {
      return NextResponse.json({ error: 'Minimum stock must be a non-negative number' }, { status: 400 });
    }

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

    // Jika menggunakan materials, validasi materials data
    if (body.useMaterial && (!Array.isArray(body.materials) || body.materials.length === 0)) {
      return NextResponse.json(
        { error: 'Materials are required when useMaterial is true' },
        { status: 400 }
      )
    }

    // Validasi materials jika ada
    if (body.useMaterial && Array.isArray(body.materials)) {
      for (const material of body.materials) {
        if (!material.materialId || typeof material.materialId !== 'string') {
          return NextResponse.json(
            { error: 'Each material must have a valid materialId' },
            { status: 400 }
          );
        }
        
        if (material.quantity === undefined || isNaN(material.quantity) || material.quantity <= 0) {
          return NextResponse.json(
            { error: 'Each material must have a positive quantity' },
            { status: 400 }
          );
        }
      }
    }

    // Handle materials dengan benar
    let materialCreateData: { materialId: string; quantity: number; userId: string }[] = [];
    if (body.useMaterial && Array.isArray(body.materials)) {
      materialCreateData = body.materials.map((material: MaterialInput) => ({
        materialId: material.materialId,
        quantity: material.quantity,
        userId: user.id
      }));
    }

    // Buat produk dengan transaction agar semua operasi selesai atau tidak ada yang selesai
    const product = await db.$transaction(async (tx) => {
      // Create product
      const newProduct = await tx.product.create({
        data: {
          name: body.name,
          sku: body.sku,
          price: body.price,
          stock: body.stock || 0,
          minStock: body.minStock || 0,
          category: body.category || 'Uncategorized',
          image: body.image || '/images/products/placeholder.jpg',
          useMaterial: body.useMaterial || false,
          userId: user.id,
        },
      })

      // Jika ada materials, buat relasi productMaterials
      if (materialCreateData.length > 0) {
        for (const material of materialCreateData) {
          try {
            await tx.productMaterials.create({
              data: {
                productId: newProduct.id,
                materialId: material.materialId,
                quantity: material.quantity,
                userId: user.id
              }
            })
          } catch (materialError) {
            console.error(`Failed to create product material relation:`, materialError);
            // Jika dalam transaction, error akan secara otomatis roll back semua operasi
            throw new Error(`Failed to link material: ${material.materialId}`);
          }
        }
      }

      // Fetch complete product with materials
      return await tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          materials: {
            include: {
              material: true
            }
          }
        }
      })
    })

    console.log('Product created successfully:', product?.id)
    return NextResponse.json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    
    // Log detail error stack trace jika tersedia
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }
    
    // Error khusus untuk masalah database
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        {
          error: 'Database constraint error',
          details: 'One or more materials do not exist or cannot be linked to this product'
        },
        { status: 400 }
      )
    }
    
    // Berikan detail error yang lebih spesifik
    return NextResponse.json(
      { 
        error: 'Failed to create product',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
