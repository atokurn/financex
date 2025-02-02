import { NextResponse } from "next/server"
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'xlsx'

    // Create sample data
    const sampleData = [
      {
        'Invoice Number': 'INV/PO/250118/001',
        'Date': '2025-01-18',
        'Supplier': 'Sample Supplier',
        'Reference': 'REF123',
        'Order Type': 'offline',
        'Status': 'pending',
        'Items': 'Sample Material (MAT001) - 10 pcs @ 5000; Sample Product (PRD001) - 5 pcs @ 10000',
        'Subtotal': 100000,
        'Discount': 5000,
        'Discount Type': 'nominal',
        'Additional Costs': 'Shipping: 10000; Handling: 5000',
        'Total': 110000,
        'Notes': 'Sample purchase order'
      }
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(sampleData)

    // Auto-size columns
    const colWidths = Object.keys(sampleData[0]).map(key => ({
      wch: Math.max(key.length, String(sampleData[0][key]).length)
    }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Template')

    // Generate buffer
    const buf = format === 'csv' 
      ? XLSX.write(wb, { type: 'buffer', bookType: 'csv' })
      : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Set headers for file download
    const filename = `purchase_template.${format}`
    const headers = new Headers()
    headers.set('Content-Type', format === 'csv' 
      ? 'text/csv' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    return new Response(buf, {
      headers,
    })
  } catch (error) {
    console.error("Error generating template:", error)
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    )
  }
}
