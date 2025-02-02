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

    console.log('Received data:', jsonData) // Debug log

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const row of jsonData) {
      try {
        // Map Excel column names to database fields
        const materialData = {
          code: String(row['Code'] || ''),
          name: String(row['Name'] || ''),
          description: String(row['Description'] || ''),
          unit: String(row['Unit'] || 'pcs'),
          price: parseFloat(String(row['Price']).replace(/[^0-9.-]+/g, '')) || 0,
          stock: parseInt(String(row['Stock']).replace(/[^0-9-]+/g, '')) || 0,
          minStock: parseInt(String(row['Min Stock']).replace(/[^0-9-]+/g, '')) || 0,
          category: String(row['Category'] || 'raw').toLowerCase(),
          status: String(row['Status'] || 'active').toLowerCase(),
        }

        console.log('Processing material:', materialData) // Debug log

        // Validate required fields
        if (!materialData.code || !materialData.name) {
          throw new Error('Code and Name are required')
        }

        // Check if material exists
        const existingMaterial = await db.material.findFirst({
          where: {
            code: materialData.code,
            userId: user.id
          }
        })

        if (existingMaterial) {
          results.failed++
          results.errors.push(`Material with code ${materialData.code} already exists`)
          continue
        }

        // Create material
        await db.material.create({
          data: {
            ...materialData,
            userId: user.id,
          }
        })

        console.log('Created material:', materialData.code) // Debug log
        results.success++
      } catch (error) {
        console.error('Error processing row:', row, error) // Debug log
        results.failed++
        results.errors.push(
          `Error importing ${row['Code'] || 'unknown'}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }

    console.log('Import results:', results) // Debug log

    return NextResponse.json({
      message: 'Import completed',
      results
    })
  } catch (error) {
    console.error('Error in import route:', error) // Debug log
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to import materials', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
