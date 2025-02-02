import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'xlsx'

    // Fetch all purchases with their items
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
        },
        additionalCosts: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform data for export
    const exportData = purchases.map(purchase => {
      const itemsInfo = purchase.items.map(item => {
        const itemName = item.type === 'material' 
          ? item.material?.name 
          : item.product?.name
        const itemCode = item.type === 'material'
          ? item.material?.code
          : item.product?.sku
        return `${itemName} (${itemCode}) - ${item.quantity} ${item.unit} @ ${item.price}`
      }).join('; ')

      const additionalCostsInfo = purchase.additionalCosts
        .map(cost => `${cost.description}: ${cost.amount}`)
        .join('; ')

      return {
        'Invoice Number': purchase.invoiceNumber,
        'Date': purchase.createdAt.toISOString().split('T')[0],
        'Supplier': purchase.supplier,
        'Reference': purchase.reference,
        'Order Type': purchase.orderType,
        'Status': purchase.status,
        'Items': itemsInfo,
        'Subtotal': purchase.subtotal,
        'Discount': purchase.discount,
        'Discount Type': purchase.discountType,
        'Additional Costs': additionalCostsInfo,
        'Total': purchase.total,
        'Notes': purchase.notes,
      }
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...exportData.map(row => String(row[key]).length))
    }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Purchases')

    // Generate buffer
    const buf = format === 'csv' 
      ? XLSX.write(wb, { type: 'buffer', bookType: 'csv' })
      : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Set headers for file download
    const filename = `purchases_${new Date().toISOString().split('T')[0]}.${format}`
    const headers = new Headers()
    headers.set('Content-Type', format === 'csv' 
      ? 'text/csv' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    return new Response(buf, {
      headers,
    })
  } catch (error) {
    console.error("Error exporting purchases:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: "Failed to export purchases" },
      { status: 500 }
    )
  }
}
