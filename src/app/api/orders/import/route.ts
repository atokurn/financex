import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import * as XLSX from 'xlsx'

// Field mappings for various possible formats
const orderFieldMappings: { [key: string]: string[] } = {
  'orderId': ['Order ID', 'OrderId', 'orderId', 'order_id'],
  'sku': ['SKU', 'sku', 'Sku'],
  'customer': ['Customer', 'customer', 'Customer Name', 'customerName'],
  'productName': ['Product Name', 'productName', 'Product'],
  'quantity': ['Quantity', 'quantity'],
  'totalOrder': ['Total Order', 'totalOrder', 'Total'],
  'status': ['Status', 'status'],
  'regency': ['Regency / City', 'regency', 'City', 'Regency'],
  'province': ['Province', 'province'],
  'orderAt': ['Order At', 'orderAt', 'Order Date'],
  'platform': ['Platform', 'platform'],
  'orderType': ['Order Type', 'orderType', 'Type'],
  'reference': ['Reference', 'reference', 'Ref']
}

function getFieldValue(row: any, field: string): any {
  const possibleNames = orderFieldMappings[field]
  if (!possibleNames) return undefined

  for (const name of possibleNames) {
    if (row[name] !== undefined) {
      return row[name]
    }
  }
  return undefined
}

function parseExcelDate(value: any): Date {
  if (!value) return new Date()

  // If it's already a Date object
  if (value instanceof Date) return value

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    // Excel's epoch starts from 1900-01-01
    const excelEpoch = new Date(1900, 0, 0)
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    return new Date(excelEpoch.getTime() + (value - 1) * millisecondsPerDay)
  }

  // If it's a string, try different formats
  if (typeof value === 'string') {
    // Remove any timezone information as it might cause issues
    value = value.replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '')
    
    // Try parsing as ISO string
    const date = new Date(value)
    if (!isNaN(date.getTime())) return date

    // Try parsing common date formats
    const formats = [
      'YYYY-MM-DD',
      'DD/MM/YYYY',
      'MM/DD/YYYY',
      'DD-MM-YYYY',
      'YYYY/MM/DD'
    ]

    for (const format of formats) {
      const parts = value.split(/[-/]/)
      if (parts.length !== 3) continue

      let year, month, day
      switch (format) {
        case 'YYYY-MM-DD':
        case 'YYYY/MM/DD':
          [year, month, day] = parts
          break
        case 'DD/MM/YYYY':
        case 'DD-MM-YYYY':
          [day, month, year] = parts
          break
        case 'MM/DD/YYYY':
          [month, day, year] = parts
          break
      }

      // Parse the parts as numbers
      const y = parseInt(year)
      const m = parseInt(month) - 1 // Months are 0-based
      const d = parseInt(day)

      // Validate the parts
      if (isNaN(y) || isNaN(m) || isNaN(d)) continue
      if (y < 1900 || y > 2100) continue
      if (m < 0 || m > 11) continue
      if (d < 1 || d > 31) continue

      const parsedDate = new Date(y, m, d)
      if (!isNaN(parsedDate.getTime())) return parsedDate
    }
  }

  // If all parsing attempts fail, return current date
  console.warn('Could not parse date value:', value, 'using current date instead')
  return new Date()
}

function parseNumber(value: any) {
  if (!value) return 0
  if (typeof value === 'number') return value
  // Handle currency format (e.g., "Rp 1.234,56" or "1,234.56")
  const cleanValue = value.toString()
    .replace(/[^0-9.,\-]/g, '') // Remove currency symbols and other non-numeric chars except . , -
    .replace(/\.(?=.*\.)/g, '') // Remove all dots except the last one (for thousands)
    .replace(',', '.') // Replace comma with dot for decimal
  return parseFloat(cleanValue) || 0
}

function transformOrderData(item: any) {
  // Check if any required field is empty
  const hasEmptyFields = [
    'orderId',
    'customer',
    'productName',
    'quantity',
    'totalOrder',
    'regency',
    'province',
    'orderAt',
    'platform',
    'orderType'
  ].some(field => {
    const value = getFieldValue(item, field)
    return value === undefined || value === null || value === ''
  })

  // Get values with empty string fallback
  const orderId = getFieldValue(item, 'orderId') || ''
  const rawSku = getFieldValue(item, 'sku')
  const sku = rawSku || 'NO SKU'
  const customer = getFieldValue(item, 'customer') || ''
  const productName = getFieldValue(item, 'productName') || ''
  const quantity = getFieldValue(item, 'quantity') || '0'
  const totalOrder = getFieldValue(item, 'totalOrder') || '0'
  const regency = getFieldValue(item, 'regency') || ''
  const province = getFieldValue(item, 'province') || ''
  const orderAt = getFieldValue(item, 'orderAt') || new Date()
  const rawPlatform = getFieldValue(item, 'platform') || ''
  const orderType = getFieldValue(item, 'orderType') || ''
  const reference = getFieldValue(item, 'reference') || ''
  
  // Get status from import data and normalize it
  let rawStatus = getFieldValue(item, 'status')
  let status = String(rawStatus || '').toLowerCase().trim()
  
  // Map various status values to standardized ones
  const statusMap: { [key: string]: string } = {
    'pending': 'pending',
    'menunggu': 'pending',
    'waiting': 'pending',
    'new': 'pending',
    'baru': 'pending',
    
    'processing': 'processing',
    'diproses': 'processing',
    'proses': 'processing',
    'dalam proses': 'processing',
    
    'shipped': 'shipped',
    'dikirim': 'shipped',
    'terkirim': 'shipped',
    'shipping': 'shipped',
    'pengiriman': 'shipped',
    
    'delivered': 'completed',
    'selesai': 'completed',
    'done': 'completed',
    'completed': 'completed',
    'finish': 'completed',
    'finished': 'completed',
    
    'cancelled': 'cancelled',
    'dibatalkan': 'cancelled',
    'batal': 'cancelled',
    'cancel': 'cancelled',
    
    'refunded': 'refunded',
    'refund': 'refunded',
    'dikembalikan': 'refunded',
    'return': 'refunded',
    'retur': 'refunded'
  }

  // Map status to standardized value or use 'pending' as default
  status = statusMap[status] || 'pending'

  // Normalize platform value
  let platform = String(rawPlatform).trim().toLowerCase()
  if (!platform) {
    // If platform is empty, try to infer from other data
    if (orderId.toLowerCase().includes('shopee')) {
      platform = 'shopee'
    } else if (orderId.toLowerCase().includes('tiktok')) {
      platform = 'tiktok'
    } else if (orderId.toLowerCase().includes('tokopedia')) {
      platform = 'tokopedia'
    } else if (orderId.toLowerCase().includes('lazada')) {
      platform = 'lazada'
    } else {
      platform = 'unknown'
    }
  }

  // Flag if SKU is empty
  const isSkuEmpty = !rawSku || rawSku.trim() === ''

  // Basic validation
  if (!orderId) {
    throw new Error('Order ID is required')
  }

  // Transform the data
  return {
    orderId: String(orderId),
    sku: String(sku),
    customer: String(customer),
    productName: String(productName),
    quantity: parseNumber(quantity),
    totalOrder: parseNumber(totalOrder),
    status: status,
    regency: String(regency),
    province: String(province),
    orderAt: parseExcelDate(orderAt),
    platform: platform,
    orderType: String(orderType),
    reference: String(reference),
    isSkuEmpty // Add flag to response
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded'
      }, { status: 400 })
    }

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file format. Please upload an Excel or CSV file'
      }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    if (!workbook.SheetNames.length) {
      return NextResponse.json({
        success: false,
        error: 'Excel file is empty'
      }, { status: 400 })
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    if (!jsonData.length) {
      return NextResponse.json({
        success: false,
        error: 'No data found in the Excel file'
      }, { status: 400 })
    }

    // First pass: validate all data
    const validatedData: Array<{ data: any; row: number }> = []
    const errors: Array<{ row: number; error: string }> = []

    for (const [index, row] of jsonData.entries()) {
      try {
        const orderData = transformOrderData(row)
        validatedData.push({ data: orderData, row: index + 2 })
      } catch (error) {
        errors.push({
          row: index + 2,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // If there are any validation errors, return them all
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed for some rows',
        details: {
          errors,
          totalRows: jsonData.length,
          failedRows: errors.length
        }
      }, { status: 400 })
    }

    // Process all valid data within a transaction
    const results = await db.$transaction(async (tx) => {
      const processResults = {
        success: 0,
        failed: 0,
        errors: [] as string[],
        rowErrors: [] as { row: number; error: string; data?: any }[]
      }

      // Group orders by orderId for checking duplicates
      const orderGroups = validatedData.reduce((acc, { data, row }) => {
        if (!acc[data.orderId]) {
          acc[data.orderId] = []
        }
        acc[data.orderId].push({ data, row })
        return acc
      }, {} as Record<string, Array<{ data: any; row: number }>>)

      for (const [orderId, orders] of Object.entries(orderGroups)) {
        try {
          // Check for duplicate SKUs within the same orderId
          const skus = orders.map(o => o.data.sku)
          const duplicateSKUs = skus.filter((sku, index) => 
            skus.indexOf(sku) !== index && sku !== 'NO SKU'
          )

          if (duplicateSKUs.length > 0) {
            // Add error for duplicate SKUs
            orders.forEach(({ row, data }) => {
              if (duplicateSKUs.includes(data.sku)) {
                processResults.failed++
                processResults.rowErrors.push({
                  row,
                  error: `Duplicate SKU ${data.sku} for Order ID ${orderId}`,
                  data
                })
              }
            })
            continue // Skip this orderId
          }

          // Process each unique order-SKU combination
          for (const { data, row } of orders) {
            // Add warning for empty SKU
            if (data.isSkuEmpty) {
              processResults.rowErrors.push({
                row,
                error: `Empty SKU for Order ID ${orderId} (using NO SKU)`,
                data
              })
            }

            // Check if exact combination exists
            const existingOrder = await tx.order.findFirst({
              where: {
                orderId: data.orderId,
                sku: data.sku
              }
            })

            const { isSkuEmpty, ...orderData } = data // Remove flag before saving

            if (existingOrder) {
              // Update existing order
              await tx.order.update({
                where: { id: existingOrder.id },
                data: {
                  ...orderData,
                  userId: user.id
                }
              })
            } else {
              // Create new order
              await tx.order.create({
                data: {
                  ...orderData,
                  userId: user.id
                }
              })
            }
            processResults.success++
          }
        } catch (error) {
          processResults.failed += orders.length
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          processResults.errors.push(errorMessage)
          orders.forEach(({ row }) => {
            processResults.rowErrors.push({
              row,
              error: errorMessage
            })
          })
        }
      }

      return processResults
    })

    // If no orders were processed successfully
    if (results.success === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to import any orders',
        details: results
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.success} orders, failed ${results.failed}`,
      results
    })

  } catch (error) {
    console.error('Orders import error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to import orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
