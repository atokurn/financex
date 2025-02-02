import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const row of jsonData) {
      try {
        // Convert Excel date number to JavaScript Date
        const orderAtExcel = row['Order Date']
        let orderAt: Date
        
        if (typeof orderAtExcel === 'number') {
          // Excel dates are number of days since 1900-01-01
          orderAt = XLSX.SSF.parse_date_code(orderAtExcel)
        } else if (typeof orderAtExcel === 'string') {
          orderAt = new Date(orderAtExcel)
        } else {
          orderAt = new Date() // Default to current date if invalid
        }

        // Map Excel column names to database fields
        const saleData = {
          orderId: String(row['Order ID'] || '').trim(),
          orderAt,
          income: parseFloat(String(row['Income']).replace(/[^0-9.-]+/g, '')) || 0,
          priceAfterDiscount: parseFloat(String(row['Price After Discount']).replace(/[^0-9.-]+/g, '')) || 0,
          totalFees: parseFloat(String(row['Total Fees']).replace(/[^0-9.-]+/g, '')) || 0,
          platformFees: parseFloat(String(row['Platform Fees']).replace(/[^0-9.-]+/g, '')) || 0,
          affiliateCommission: parseFloat(String(row['Affiliate Commission']).replace(/[^0-9.-]+/g, '')) || 0,
          refund: parseFloat(String(row['Refund']).replace(/[^0-9.-]+/g, '')) || 0,
          platform: String(row['Platform'] || '').toLowerCase(),
          userId: user.id
        }

        // Validate required fields
        if (!saleData.orderId) {
          throw new Error('Order ID is required')
        }

        // Check for existing sale with same orderId
        const existingSale = await db.sale.findUnique({
          where: { orderId: saleData.orderId }
        })

        if (existingSale) {
          // Update existing sale
          await db.sale.update({
            where: { orderId: saleData.orderId },
            data: saleData
          })
        } else {
          // Create new sale
          await db.sale.create({ data: saleData })
        }

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    return NextResponse.json({
      message: `Successfully processed ${results.success} sales, failed ${results.failed}`,
      results
    })
  } catch (error) {
    console.error('Sales import error:', error)
    return NextResponse.json({
      error: 'Failed to import sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
