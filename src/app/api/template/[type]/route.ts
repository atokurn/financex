import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { orderImportTemplate, salesImportTemplate } from '@/lib/import-helpers'

const templates = {
  products: [
    ['Name', 'SKU', 'Stock', 'Min Stock', 'Price', 'Category'],
    ['Example Product', 'PRD001', '100', '10', '150000', 'Electronics']
  ],
  materials: [
    ['Code', 'Name', 'Description', 'Unit', 'Price', 'Stock', 'Min Stock', 'Category', 'Status'],
    ['MTR001', 'Example Material', 'Description here', 'pcs', '50000', '100', '10', 'raw', 'active']
  ],
  sales: [
    salesImportTemplate.headers,
    salesImportTemplate.example
  ],
  orders: [
    orderImportTemplate.headers,
    orderImportTemplate.example
  ]
}

export async function GET(
  request: Request,
  { params }: { params: { type: keyof typeof templates } }
) {
  try {
    const type = params.type
    const searchParams = new URL(request.url).searchParams
    const format = searchParams.get('format') as 'xlsx' | 'csv'

    if (!templates[type]) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    const template = templates[type]
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(template)

    // Set column widths
    const colWidths = template[0].map(header => ({
      wch: Math.max(15, header.length + 5)
    }))
    worksheet['!cols'] = colWidths

    // Add instructions sheet for sales template
    if (type === 'sales' && salesImportTemplate.descriptions) {
      const instructionsData = salesImportTemplate.headers.map((header, index) => [
        header,
        salesImportTemplate.descriptions[index]
      ])
      
      const instructionsSheet = XLSX.utils.aoa_to_sheet([
        ['Column', 'Description'],
        ...instructionsData
      ])

      // Set column widths for instructions
      instructionsSheet['!cols'] = [
        { wch: 20 }, // Column name
        { wch: 50 }, // Description
      ]

      // Add sheets
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')
    } else {
      XLSX.utils.book_append_sheet(workbook, worksheet, type)
    }

    let buffer: Buffer
    let filename: string
    let contentType: string

    if (format === 'xlsx') {
      buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
      filename = `${type}_template.xlsx`
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else {
      buffer = Buffer.from(XLSX.utils.sheet_to_csv(worksheet))
      filename = `${type}_template.csv`
      contentType = 'text/csv'
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Template generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate template',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
