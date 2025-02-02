import * as XLSX from 'xlsx'
import Papa from 'papaparse'

// Template for order import
export const orderImportTemplate = {
  headers: [
    'Order ID',
    'SKU',
    'Customer',
    'Product Name',
    'Quantity',
    'Total Order',
    'Status',
    'Regency / City',
    'Province',
    'Order At',
    'Platform',
    'Order Type ( Optional )',
    'Reference ( Optional )'
  ],
  example: [
    'ORD-001',
    'SKU001',
    'John Doe',
    'Gaming Mouse RGB',
    '2',
    '450000',
    'pending',
    'Jakarta Selatan',
    'DKI Jakarta',
    '2025-01-10 13:36',
    'shopee',
    'regular',
    'SHP123'
  ],
  descriptions: [
    'Unique order identifier',
    'Product SKU (Stock Keeping Unit)',
    'Customer name',
    'Product name',
    'Order quantity',
    'Total order amount',
    'Order status (pending/processing/completed/cancelled)',
    'City or regency',
    'Province',
    'Order date and time (YYYY-MM-DD HH:mm)',
    'Platform (shopee/tokopedia/lazada/tiktok)',
    'Order type (regular/dropship)',
    'Platform reference number'
  ]
}

// Template for sales import
export const salesImportTemplate = {
  headers: [
    'Order ID',
    'Order Date',
    'Income',
    'Price After Discount',
    'Total Fees',
    'Platform Fees',
    'Affiliate Commission',
    'Refund',
    'Platform',
  ],
  example: [
    'ORD-001',
    '2025-01-10 13:36',
    '450000',
    '400000',
    '50000',
    '30000',
    '20000',
    '0',
    'shopee',
  ],
  descriptions: [
    'Unique order identifier',
    'Order date and time (YYYY-MM-DD HH:mm)',
    'Total income from the sale',
    'Price after applying discounts',
    'Total fees (platform + affiliate)',
    'Platform fees',
    'Affiliate commission',
    'Refund amount',
    'Platform (shopee/tokopedia/lazada/tiktok)',
  ],
}

// Template for material import
export const materialImportTemplate = {
  headers: [
    'Code',
    'Name',
    'Description',
    'Unit',
    'Price',
    'Stock',
    'Min Stock',
    'Category',
    'Status'
  ],
  example: [
    'MAT001',
    'Raw Material A',
    'Description of material A',
    'pcs',
    '10000',
    '100',
    '10',
    'raw',
    'active'
  ],
}

export function generateImportTemplate(type: 'orders' | 'sales' | 'materials' = 'orders') {
  const template = type === 'orders' ? orderImportTemplate : type === 'sales' ? salesImportTemplate : materialImportTemplate
  const workbook = XLSX.utils.book_new()
  
  // Create template sheet
  const templateSheet = XLSX.utils.aoa_to_sheet([
    template.headers,
    template.example,
  ])

  // Set column widths
  const colWidths = template.headers.map(header => ({
    wch: Math.max(15, header.length + 5)
  }))
  templateSheet['!cols'] = colWidths

  // Add template sheet
  XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template')

  // Create instructions sheet
  if (template.descriptions) {
    const instructionsData = template.headers.map((header, index) => [
      header,
      template.descriptions[index]
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

    // Add instructions sheet
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')
  }

  return workbook
}

export async function parseFileData(file: File) {
  if (file.name.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data)
        },
        error: (error) => {
          reject(error)
        }
      })
    })
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    return XLSX.utils.sheet_to_json(worksheet)
  }
  
  throw new Error('Unsupported file format')
}

export function validateSaleData(data: any[]) {
  // Field mappings for various possible formats
  const fieldMappings: { [key: string]: string[] } = {
    'order_id': ['Order ID', 'OrderId', 'orderId', 'order_id', 'orderid'],
    'order_at': ['Order At', 'OrderAt', 'orderAt', 'order_at', 'Order Date', 'OrderDate', 'orderDate'],
    'income': ['Income', 'income'],
    'price_after_discount': ['Price After Discount', 'PriceAfterDiscount', 'priceAfterDiscount', 'price_after_discount'],
    'total_fees': ['Total Fees', 'TotalFees', 'totalFees', 'total_fees'],
    'platform_fees': ['Platform Fees', 'PlatformFees', 'platformFees', 'platform_fees'],
    'affiliate_commission': ['Affiliate Commission', 'AffiliateCommission', 'affiliateCommission', 'affiliate_commission'],
    'refund': ['Refund', 'refund'],
    'platform': ['Platform', 'platform'],
  }

  const errors: string[] = []

  // Function to get value using field mappings
  const getValue = (row: any, field: string): any => {
    const possibleNames = fieldMappings[field]
    for (const name of possibleNames) {
      if (row[name] !== undefined) {
        return row[name]
      }
    }
    return undefined
  }

  data.forEach((row, index) => {
    const rowNumber = index + 2 // Add 2 to account for header row and 1-based indexing

    // Check for missing required fields
    Object.keys(fieldMappings).forEach(field => {
      const value = getValue(row, field)
      if (value === undefined || value === '') {
        errors.push(`Row ${rowNumber}: Missing ${field.replace(/_/g, ' ')}`)
      }
    })

    // Validate numeric fields that must be non-negative
    const nonNegativeFields = ['income', 'price_after_discount', 'refund']
    nonNegativeFields.forEach(field => {
      const value = getValue(row, field)
      if (value !== undefined && value !== '') {
        const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
        if (isNaN(numValue) || numValue < 0) {
          errors.push(`Row ${rowNumber}: ${field.replace(/_/g, ' ')} must be a non-negative number`)
        }
      }
    })

    // Validate numeric fields that can be negative
    const numericFields = ['total_fees', 'platform_fees', 'affiliate_commission']
    numericFields.forEach(field => {
      const value = getValue(row, field)
      if (value !== undefined && value !== '') {
        const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
        if (isNaN(numValue)) {
          errors.push(`Row ${rowNumber}: ${field.replace(/_/g, ' ')} must be a valid number`)
        }
      }
    })

    // Validate platform
    const validPlatforms = ['tokopedia', 'shopee', 'lazada', 'tiktok']
    const platform = String(getValue(row, 'platform') || '').toLowerCase()
    if (!validPlatforms.includes(platform)) {
      errors.push(`Row ${rowNumber}: Invalid platform. Must be one of: ${validPlatforms.join(', ')}`)
    }

    // Validate order_at date format
    const orderAt = getValue(row, 'order_at')
    if (orderAt) {
      let date: Date | null = null;
      
      // Try parsing different date formats
      if (typeof orderAt === 'number') {
        // Handle Excel date serial number
        date = XLSX.SSF.parse_date_code(orderAt);
      } else if (orderAt instanceof Date) {
        date = orderAt;
      } else {
        // Handle string date
        const cleanDate = String(orderAt).trim();
        // Try parsing with different formats
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          // YYYY-MM-DD format
          date = new Date(`${cleanDate}T00:00:00`);
        } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleanDate)) {
          // YYYY/MM/DD format
          date = new Date(cleanDate.replace(/\//g, '-') + 'T00:00:00');
        } else {
          // Try standard date parsing
          date = new Date(cleanDate);
        }
      }

      if (!date || isNaN(date.getTime())) {
        errors.push(`Row ${rowNumber}: Invalid date format for Order Date. Use format: YYYY-MM-DD or YYYY-MM-DD HH:mm`);
      }
    }
  })

  return errors
}

export function validateOrderData(data: any[]) {
  const requiredFields = orderImportTemplate.headers.map(header => 
    header.toLowerCase().replace(/ \/ /g, '_').replace(/ /g, '_')
  )
  
  const errors: string[] = []

  data.forEach((row, index) => {
    const rowNumber = index + 2 // Add 2 to account for header row and 1-based indexing
    
    // Check for missing required fields
    requiredFields.forEach(field => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`Row ${rowNumber}: Missing ${field}`)
      }
    })

    // Validate quantity is a positive number
    if (row.quantity && (isNaN(row.quantity) || Number(row.quantity) <= 0)) {
      errors.push(`Row ${rowNumber}: Quantity must be a positive number`)
    }

    // Validate total_order is a non-negative number
    if (row.total_order && (isNaN(row.total_order) || Number(row.total_order) < 0)) {
      errors.push(`Row ${rowNumber}: Total order must be a non-negative number`)
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled']
    if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
      errors.push(`Row ${rowNumber}: Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }

    // Validate platform
    const validPlatforms = ['tokopedia', 'shopee', 'lazada', 'tiktok']
    if (row.platform && !validPlatforms.includes(row.platform.toLowerCase())) {
      errors.push(`Row ${rowNumber}: Invalid platform. Must be one of: ${validPlatforms.join(', ')}`)
    }

    // Validate order_at date format
    if (row.order_at) {
      const date = new Date(row.order_at)
      if (isNaN(date.getTime())) {
        errors.push(`Row ${rowNumber}: Invalid date format for Order At. Use format: YYYY-MM-DD HH:mm`)
      }
    }
  })

  return errors
}
