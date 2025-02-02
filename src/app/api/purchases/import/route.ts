import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import * as XLSX from 'xlsx'
import { z } from "zod"
import { revalidatePath } from "next/cache"

// Function to convert Excel date number to Date object
function excelDateToJSDate(excelDate: number) {
  const date = new Date((excelDate - 25569) * 86400 * 1000)
  return date
}

// Function to format date to YYYY-MM-DD
function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

// Schema for validating imported data
const ImportItemSchema = z.object({
  name: z.string(),
  code: z.string(),
  type: z.enum(['material', 'product']),
  quantity: z.number().positive(),
  unit: z.string(),
  price: z.number().positive(),
})

const ImportRowSchema = z.object({
  'Invoice Number': z.string(),
  'Date': z.union([
    z.string(),
    z.number().transform(val => formatDate(excelDateToJSDate(val)))
  ]),
  'Supplier': z.string(),
  'Reference': z.string().optional(),
  'Order Type': z.enum(['online', 'offline']).default('offline'),
  'Status': z.enum(['pending', 'processing', 'completed', 'cancelled']).default('pending'),
  'Items': z.string(),
  'Subtotal': z.number().or(z.string()).transform(val => Number(val)),
  'Discount': z.number().or(z.string()).transform(val => Number(val)).default(0),
  'Discount Type': z.enum(['percentage', 'nominal']).default('nominal'),
  'Additional Costs': z.string().optional(),
  'Total': z.number().or(z.string()).transform(val => Number(val)),
  'Notes': z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse Excel/CSV file
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    console.log('Imported data:', JSON.stringify(jsonData, null, 2))

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      purchases: [] as any[],
    }

    // Process each row
    for (const row of jsonData) {
      try {
        // Validate row data
        const validatedData = ImportRowSchema.parse(row)
        console.log('Validated data:', validatedData)

        // Parse items string into array
        const itemsStr = validatedData.Items
        const itemsList = await Promise.all(itemsStr.split(';').map(async (item): Promise<{
          name: string
          code: string
          type: 'material' | 'product'
          quantity: number
          unit: string
          price: number
        }> => {
          // Try old format and auto-detect type: "Name (CODE) - Quantity Unit @ Price"
          const match = item.trim().match(/^(.+?)\s*\(([^)]+)\)\s*-\s*(\d+)\s+(\w+)\s*@\s*(\d+)$/)
          if (!match) {
            throw new Error('Invalid item format: ' + item)
          }

          const [, name, code, quantity, unit, price] = match
          const trimmedCode = code.trim()

          // Try to find in materials first
          const material = await db.material.findFirst({
            where: {
              userId: user.id,
              code: trimmedCode,
            },
          })

          if (material) {
            return {
              name: name.trim(),
              code: trimmedCode,
              type: 'material',
              quantity: Number(quantity),
              unit: unit.trim(),
              price: Number(price),
            }
          }

          // If not found in materials, try products
          const product = await db.product.findFirst({
            where: {
              userId: user.id,
              sku: trimmedCode,
            },
          })

          if (product) {
            return {
              name: name.trim(),
              code: trimmedCode,
              type: 'product',
              quantity: Number(quantity),
              unit: unit.trim(),
              price: Number(price),
            }
          }

          throw new Error(`Item with code/SKU "${trimmedCode}" not found in materials or products`)
        }))

        console.log('Parsed items:', itemsList)

        // Find materials/products for each item and prepare purchase items
        const purchaseItems = await Promise.all(
          itemsList.map(async item => {
            if (item.type === 'material') {
              const material = await db.material.findFirst({
                where: {
                  userId: user.id,
                  code: item.code,
                },
              })

              if (!material) {
                throw new Error(`Material not found with code: ${item.code}`)
              }

              return {
                type: 'material' as const,
                materialId: material.id,
                productId: null,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price,
                itemDiscount: 0,
                itemDiscountType: 'percentage' as const,
                totalPrice: item.quantity * item.price,
                originalItem: material,
              }
            } else {
              const product = await db.product.findFirst({
                where: {
                  userId: user.id,
                  sku: item.code,
                },
              })

              if (!product) {
                throw new Error(`Product not found with SKU: ${item.code}`)
              }

              return {
                type: 'product' as const,
                materialId: null,
                productId: product.id,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price,
                itemDiscount: 0,
                itemDiscountType: 'percentage' as const,
                totalPrice: item.quantity * item.price,
                originalItem: product,
              }
            }
          })
        )

        console.log('Purchase items:', purchaseItems)

        // Create purchase with items
        const purchase = await db.purchase.create({
          data: {
            userId: user.id,
            invoiceNumber: validatedData['Invoice Number'],
            supplier: validatedData.Supplier,
            reference: validatedData.Reference || '',
            notes: validatedData.Notes || '',
            orderType: validatedData['Order Type'],
            status: validatedData.Status,
            discount: validatedData.Discount,
            discountType: validatedData['Discount Type'],
            subtotal: validatedData.Subtotal,
            total: validatedData.Total,
            createdAt: new Date(validatedData.Date),
            items: {
              create: purchaseItems.map(({ originalItem, ...item }) => item)
            }
          },
          include: {
            items: true
          }
        })

        console.log('Created purchase:', purchase)
        results.purchases.push(purchase)

        // Update stock and prices if status is completed
        if (validatedData.Status === 'completed') {
          console.log('Updating stock for completed purchase:', purchase.id)
          
          for (const item of purchaseItems) {
            try {
              if (item.type === 'material' && item.materialId) {
                console.log('Updating material stock:', {
                  materialId: item.materialId,
                  quantity: item.quantity,
                  price: item.price
                })

                const updated = await db.material.update({
                  where: { id: item.materialId },
                  data: { 
                    price: item.price,
                    stock: {
                      increment: item.quantity
                    }
                  },
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    stock: true,
                    price: true
                  }
                })

                // Add stock history for material
                await db.stockHistory.create({
                  data: {
                    userId: user.id,
                    type: 'in',
                    quantity: item.quantity,
                    description: `Purchase import: ${validatedData['Invoice Number']}`,
                    materialId: item.materialId,
                    productId: null,
                    reference: purchase.id
                  }
                })

                console.log('Updated material:', updated)

              } else if (item.type === 'product' && item.productId) {
                console.log('Updating product stock:', {
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price
                })

                const updated = await db.product.update({
                  where: { id: item.productId },
                  data: { 
                    price: item.price,
                    stock: {
                      increment: item.quantity
                    }
                  },
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    stock: true,
                    price: true
                  }
                })

                // Add stock history for product
                await db.stockHistory.create({
                  data: {
                    userId: user.id,
                    type: 'in',
                    quantity: item.quantity,
                    description: `Purchase import: ${validatedData['Invoice Number']}`,
                    materialId: null,
                    productId: item.productId,
                    reference: purchase.id
                  }
                })

                console.log('Updated product:', updated)
              }
            } catch (error) {
              console.error('Error updating stock for item:', {
                itemType: item.type,
                itemId: item.type === 'material' ? item.materialId : item.productId,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
              throw new Error(`Failed to update stock for ${item.type} with id ${item.type === 'material' ? item.materialId : item.productId}`)
            }
          }
        }

        results.success++
      } catch (error) {
        console.error('Error processing row:', error)
        results.failed++
        results.errors.push(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    revalidatePath('/dashboard/purchases')
    return NextResponse.json({ 
      success: true,
      results: {
        ...results,
        purchases: results.purchases.map(p => p.id)
      }
    })
  } catch (error) {
    console.error("Error importing purchases:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to import purchases",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
