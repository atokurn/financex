import { NextResponse } from 'next/server'
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import * as XLSX from 'xlsx'

/**
 * Backup all user data and return it in the requested format
 */
export async function GET(request: Request) {
  try {
    // Authenticate user
    const user = await requireUser();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    // Fetch all user data
    const userData = await fetchAllUserData(user.id);
    
    // Return data based on format
    let response: NextResponse;
    let fileSize = 0;
    let filename = '';
    
    if (format === 'json') {
      const result = generateJsonBackup(userData);
      response = result.response;
      fileSize = result.size;
      filename = result.filename;
    } else if (format === 'xlsx') {
      const result = generateExcelBackup(userData);
      response = result.response;
      fileSize = result.size;
      filename = result.filename;
    } else if (format === 'sql') {
      const result = generateSqlBackup(userData);
      response = result.response;
      fileSize = result.size;
      filename = result.filename;
    } else {
      return NextResponse.json(
        { error: "Unsupported backup format" },
        { status: 400 }
      );
    }
    
    // Save backup history to database
    await db.backupHistory.create({
      data: {
        userId: user.id,
        filename: filename,
        format: format,
        fileSize: fileSize
      }
    });
    
    return response;
  } catch (error) {
    console.error("Error creating backup:", error);
    
    // Return error response
    return NextResponse.json(
      { 
        error: "Failed to create backup",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch all user data from the database
 */
async function fetchAllUserData(userId: string) {
  // Fetch all data models that belong to this user
  const [
    products,
    productMaterials,
    materials,
    orders,
    sales,
    purchases,
    purchaseItems,
    additionalCosts,
    expenses,
    expenseItems,
    stockHistories
  ] = await Promise.all([
    // Products and related data
    db.product.findMany({
      where: { userId },
      include: {
        materials: {
          include: {
            material: true
          }
        }
      }
    }),
    
    // Product materials (separate query for reference)
    db.productMaterials.findMany({
      where: { userId }
    }),
    
    // Materials
    db.material.findMany({
      where: { userId }
    }),
    
    // Orders
    db.order.findMany({
      where: { userId }
    }),
    
    // Sales
    db.sale.findMany({
      where: { userId }
    }),
    
    // Purchases with items
    db.purchase.findMany({
      where: { userId },
      include: {
        items: true,
        additionalCosts: true
      }
    }),
    
    // Purchase items (separate query for reference)
    db.purchaseItem.findMany({
      where: {
        purchase: {
          userId
        }
      }
    }),
    
    // Additional costs
    db.additionalCost.findMany({
      where: {
        purchase: {
          userId
        }
      }
    }),
    
    // Expenses with items
    db.expense.findMany({
      where: { userId },
      include: {
        items: true
      }
    }),
    
    // Expense items (separate query for reference)
    db.expenseItem.findMany({
      where: {
        expense: {
          userId
        }
      }
    }),
    
    // Stock histories
    db.stockHistory.findMany({
      where: { userId }
    })
  ]);
  
  // Return all data as a structured object
  return {
    products,
    productMaterials,
    materials,
    orders,
    sales,
    purchases,
    purchaseItems,
    additionalCosts,
    expenses,
    expenseItems,
    stockHistories,
    backupDate: new Date().toISOString(),
    userId
  };
}

/**
 * Generate a JSON backup file
 */
function generateJsonBackup(userData: any) {
  // Create JSON string with pretty formatting
  const jsonData = JSON.stringify(userData, null, 2);
  
  // Create filename
  const filename = `financex_backup_${new Date().toISOString().split('T')[0]}.json`;
  
  // Calculate file size in bytes
  const size = new TextEncoder().encode(jsonData).length;
  
  // Return JSON response
  return {
    response: new NextResponse(jsonData, {
      headers: {
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-Type': 'application/json',
      }
    }),
    size,
    filename
  };
}

/**
 * Generate an Excel backup file with multiple sheets
 */
function generateExcelBackup(userData: any) {
  const wb = XLSX.utils.book_new();
  
  // Create a sheet for each data type
  Object.entries(userData).forEach(([key, value]) => {
    // Skip userId and backupDate for separate sheets
    if (key === 'userId' || key === 'backupDate') return;
    
    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) return;
    
    // Process arrays of objects
    if (Array.isArray(value)) {
      // Flatten complex objects
      const flattenedData = (value as any[]).map(item => {
        const result: Record<string, any> = {};
        
        // Recursive function to flatten nested objects
        function flatten(obj: any, prefix = '') {
          for (const [k, v] of Object.entries(obj)) {
            // Skip complex nested objects but keep basic properties
            if (k === 'materials' || k === 'items' || k === 'additionalCosts') continue;
            
            if (typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)) {
              flatten(v, `${prefix}${k}_`);
            } else {
              result[`${prefix}${k}`] = v instanceof Date ? v.toISOString() : v;
            }
          }
        }
        
        flatten(item);
        return result;
      });
      
      // Create worksheet for this data
      const ws = XLSX.utils.json_to_sheet(flattenedData);
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, key.slice(0, 31)); // Excel sheet names limited to 31 chars
    }
  });
  
  // Add a summary sheet with backup metadata
  const summary = [{
    'Backup Date': userData.backupDate,
    'User ID': userData.userId,
    'Products Count': userData.products.length,
    'Materials Count': userData.materials.length,
    'Orders Count': userData.orders.length,
    'Sales Count': userData.sales.length,
    'Purchases Count': userData.purchases.length,
    'Expenses Count': userData.expenses.length,
    'Stock History Records': userData.stockHistories.length
  }];
  
  const summarySheet = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  
  // Convert to buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  // Generate filename
  const filename = `financex_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Calculate file size in bytes
  const size = buf.length;
  
  // Return Excel file
  return {
    response: new NextResponse(buf, {
      headers: {
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    }),
    size,
    filename
  };
}

/**
 * Generate a SQL backup file with INSERT statements
 */
function generateSqlBackup(userData: any) {
  let sqlStatements = `-- FinanceX Database Backup
-- Generated: ${userData.backupDate}
-- User ID: ${userData.userId}
-- Tables: products, product_materials, materials, orders, sales, purchases, purchase_items, additional_costs, expenses, expense_items, stock_histories

SET FOREIGN_KEY_CHECKS = 0;

`;

  // Helper to escape SQL strings
  const escapeSQL = (str: any): string => {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'number') return str.toString();
    if (typeof str === 'boolean') return str ? '1' : '0';
    if (str instanceof Date) return `'${str.toISOString().replace(/T/, ' ').replace(/\..+/, '')}'`;
    
    // Convert objects to JSON strings
    if (typeof str === 'object') return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
    
    // Escape string
    return `'${String(str).replace(/'/g, "''")}'`;
  };

  // Generate INSERT statements for products
  if (userData.products.length > 0) {
    sqlStatements += '\n-- Products\n';
    userData.products.forEach((product: any) => {
      const { materials, ...productData } = product; // Exclude materials relationship
      const columns = Object.keys(productData).join(', ');
      const values = Object.values(productData).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO products (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for materials
  if (userData.materials.length > 0) {
    sqlStatements += '\n-- Materials\n';
    userData.materials.forEach((material: any) => {
      const columns = Object.keys(material).join(', ');
      const values = Object.values(material).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO materials (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for product materials
  if (userData.productMaterials.length > 0) {
    sqlStatements += '\n-- Product Materials\n';
    userData.productMaterials.forEach((pm: any) => {
      const columns = Object.keys(pm).join(', ');
      const values = Object.values(pm).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO product_materials (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for orders
  if (userData.orders.length > 0) {
    sqlStatements += '\n-- Orders\n';
    userData.orders.forEach((order: any) => {
      const columns = Object.keys(order).join(', ');
      const values = Object.values(order).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO orders (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for sales
  if (userData.sales.length > 0) {
    sqlStatements += '\n-- Sales\n';
    userData.sales.forEach((sale: any) => {
      const columns = Object.keys(sale).join(', ');
      const values = Object.values(sale).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO sales (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for purchases
  if (userData.purchases.length > 0) {
    sqlStatements += '\n-- Purchases\n';
    userData.purchases.forEach((purchase: any) => {
      const { items, additionalCosts, ...purchaseData } = purchase; // Exclude relations
      const columns = Object.keys(purchaseData).join(', ');
      const values = Object.values(purchaseData).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO purchases (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for purchase items
  if (userData.purchaseItems.length > 0) {
    sqlStatements += '\n-- Purchase Items\n';
    userData.purchaseItems.forEach((item: any) => {
      const columns = Object.keys(item).join(', ');
      const values = Object.values(item).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO purchase_items (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for additional costs
  if (userData.additionalCosts.length > 0) {
    sqlStatements += '\n-- Additional Costs\n';
    userData.additionalCosts.forEach((cost: any) => {
      const columns = Object.keys(cost).join(', ');
      const values = Object.values(cost).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO additional_costs (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for expenses
  if (userData.expenses.length > 0) {
    sqlStatements += '\n-- Expenses\n';
    userData.expenses.forEach((expense: any) => {
      const { items, ...expenseData } = expense; // Exclude items relation
      const columns = Object.keys(expenseData).join(', ');
      const values = Object.values(expenseData).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO expenses (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for expense items
  if (userData.expenseItems.length > 0) {
    sqlStatements += '\n-- Expense Items\n';
    userData.expenseItems.forEach((item: any) => {
      const columns = Object.keys(item).join(', ');
      const values = Object.values(item).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO expense_items (${columns}) VALUES (${values});\n`;
    });
  }

  // Generate INSERT statements for stock histories
  if (userData.stockHistories.length > 0) {
    sqlStatements += '\n-- Stock Histories\n';
    userData.stockHistories.forEach((history: any) => {
      const columns = Object.keys(history).join(', ');
      const values = Object.values(history).map(escapeSQL).join(', ');
      
      sqlStatements += `INSERT INTO stock_histories (${columns}) VALUES (${values});\n`;
    });
  }

  sqlStatements += '\nSET FOREIGN_KEY_CHECKS = 1;\n';

  // Generate filename
  const filename = `financex_backup_${new Date().toISOString().split('T')[0]}.sql`;
  
  // Calculate file size in bytes
  const size = new TextEncoder().encode(sqlStatements).length;
  
  // Return SQL file
  return {
    response: new NextResponse(sqlStatements, {
      headers: {
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-Type': 'application/sql',
      }
    }),
    size,
    filename
  };
} 