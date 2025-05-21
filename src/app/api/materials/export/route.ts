import { NextResponse } from 'next/server'
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  try {
    // Authenticate user
    const user = await requireUser();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    
    // Fetch materials
    const materials = await db.material.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform data for export
    const exportData = materials.map(material => {
      return {
        Code: material.code,
        Name: material.name,
        Description: material.description || '',
        Unit: material.unit,
        Price: material.price,
        Stock: material.stock,
        'Min Stock': material.minStock,
        Category: material.category,
        Status: material.status,
        'Created At': material.createdAt.toISOString().split('T')[0],
        'Updated At': material.updatedAt.toISOString().split('T')[0],
      };
    });
    
    // Generate workbook/CSV
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths for better readability
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...(exportData.map(row => String(row[key as keyof typeof row]).length)))
    }));
    
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Materials');
    
    // Convert to buffer
    const buf = format === 'xlsx' 
      ? XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) 
      : XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
    
    // Generate filename
    const filename = `materials_${new Date().toISOString().split('T')[0]}.${format}`;
    
    // Return file
    return new NextResponse(buf, {
      headers: {
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-Type': format === 'xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'text/csv',
      }
    });
  } catch (error) {
    console.error("Error exporting materials:", error);
    
    // Return error response
    return NextResponse.json(
      { error: "Failed to export materials" },
      { status: 500 }
    );
  }
} 