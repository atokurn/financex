import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const templates = {
  sales: [
    {
      'SKU': '',
      'Order ID': '',
      'Order at': '',
      'Income': '',
      'Price after discount': '',
      'Total Fees': '',
      'Platform Fees': '',
      'Affiliate commission': '',
      'Refund': '',
      'Platform': ''
    }
  ],
  products: [
    {
      'SKU': '',
      'Name': '',
      'Stock': '',
      'Min Stock': '',
      'Price': '',
      'Category': ''
    }
  ],
  materials: [
    {
      'SKU': '',
      'Name': '',
      'Stock': '',
      'Min Stock': '',
      'Price': '',
      'Unit': ''
    }
  ]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const format = searchParams.get('format') || 'xlsx'

    if (!type || !templates[type as keyof typeof templates]) {
      return new NextResponse('Invalid template type', { status: 400 })
    }

    const template = templates[type as keyof typeof templates]

    if (format === 'csv') {
      // Create CSV
      const headers = Object.keys(template[0]).join(',')
      const csv = headers + '\\n' + Array(15).fill(Object.values(template[0]).join(',')).join('\\n')
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=template_${type}.csv`
        }
      })
    } else {
      // Create Excel
      const ws = XLSX.utils.json_to_sheet([])
      XLSX.utils.sheet_add_json(ws, template, { origin: 'A1' })

      // Add 15 empty rows
      for (let i = 2; i <= 16; i++) {
        const row = {}
        Object.keys(template[0]).forEach((key, index) => {
          row[XLSX.utils.encode_col(index)] = ''
        })
        XLSX.utils.sheet_add_json(ws, [row], { origin: `A${i}` })
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Template')

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=template_${type}.xlsx`
        }
      })
    }
  } catch (error) {
    console.error('Template error:', error)
    return new NextResponse('Failed to generate template', { status: 500 })
  }
}
