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
    
    // Fetch products with their materials
    const products = await db.product.findMany({
      where: {
        userId: user.id
      },
      include: {
        materials: {
          include: {
            material: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform data for export
    const exportData = products.map(product => {
      // Get materials details for display
      let materialsDetail = '';
      
      if (product.useMaterial && product.materials.length > 0) {
        product.materials.forEach(pm => {
          if (pm.material) {
            materialsDetail += `${pm.material.name} (${pm.quantity}), `;
          }
        });
        
        if (materialsDetail.endsWith(', ')) {
          materialsDetail = materialsDetail.slice(0, -2);
        }
      }
      
      return {
        SKU: product.sku,
        Name: product.name,
        Category: product.category,
        Price: product.price,
        Stock: product.stock,
        'Min Stock': product.minStock,
        'Uses Materials': product.useMaterial ? 'Yes' : 'No',
        'Materials': materialsDetail,
        'Created At': product.createdAt.toISOString().split('T')[0],
        'Updated At': product.updatedAt.toISOString().split('T')[0],
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    
    // Convert to buffer
    const buf = format === 'xlsx' 
      ? XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) 
      : XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
    
    // Generate filename
    const filename = `products_${new Date().toISOString().split('T')[0]}.${format}`;
    
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
    console.error("Error exporting products:", error);
    
    // Return error response
    return NextResponse.json(
      { error: "Failed to export products" },
      { status: 500 }
    );
  }
} 