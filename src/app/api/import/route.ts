import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import * as XLSX from 'xlsx'

// Define interfaces for different data types
interface BackupData {
  products?: Product[];
  productMaterials?: ProductMaterial[];
  materials?: Material[];
  orders?: Order[];
  sales?: Sale[];
  purchases?: Purchase[];
  purchaseItems?: PurchaseItem[];
  additionalCosts?: AdditionalCost[];
  expenses?: Expense[];
  expenseItems?: ExpenseItem[];
  stockHistories?: StockHistory[];
  backupDate?: string;
  userId?: string;
}

interface BaseEntity {
  id: string;
  userId: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface Material extends BaseEntity {
  name: string;
  description?: string;
  unit: string;
  unitPrice: number;
  stock: number;
}

interface Product extends BaseEntity {
  name: string;
  description?: string;
  basePrice: number;
  sellingPrice: number;
  stock: number;
  category?: string;
  materials?: ProductMaterial[];
}

interface ProductMaterial extends BaseEntity {
  productId: string;
  materialId: string;
  quantity: number;
  material?: Material;
}

interface Order extends BaseEntity {
  customerName: string;
  productId: string;
  quantity: number;
  status: string;
  totalPrice: number;
  notes?: string;
  orderDate: string | Date;
}

interface Sale extends BaseEntity {
  customerName: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  paymentMethod: string;
  notes?: string;
  saleDate: string | Date;
}

interface Purchase extends BaseEntity {
  supplierName: string;
  totalAmount: number;
  status: string;
  notes?: string;
  purchaseDate: string | Date;
  items?: PurchaseItem[];
  additionalCosts?: AdditionalCost[];
}

interface PurchaseItem extends BaseEntity {
  purchaseId: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface AdditionalCost extends BaseEntity {
  purchaseId: string;
  description: string;
  amount: number;
}

interface Expense extends BaseEntity {
  description: string;
  category: string;
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
  expenseDate: string | Date;
  items?: ExpenseItem[];
}

interface ExpenseItem extends BaseEntity {
  expenseId: string;
  description: string;
  amount: number;
}

interface StockHistory extends BaseEntity {
  materialId?: string;
  productId?: string;
  previousStock: number;
  newStock: number;
  changeAmount: number;
  changeType: string;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  date: string | Date;
}

/**
 * Import data from a backup file
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireUser();
    
    // Get the form data with the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const format = (formData.get('format') as string)?.toLowerCase() || 'unknown';
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    // Validate file format
    if (!['json', 'xlsx', 'sql'].includes(format)) {
      return NextResponse.json(
        { error: `Unsupported file format: ${format}` },
        { status: 400 }
      );
    }
    
    // Parse the file based on its format
    let userData: BackupData | null = null;
    try {
      if (format === 'json') {
        userData = await parseJsonBackup(file);
      } else if (format === 'xlsx') {
        userData = await parseExcelBackup(file);
      } else if (format === 'sql') {
        return NextResponse.json(
          { error: "SQL import is currently not supported in the web interface" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error parsing backup file:", error);
      return NextResponse.json(
        { 
          error: "Failed to parse backup file", 
          details: error instanceof Error ? error.message : 'Unknown parsing error' 
        },
        { status: 400 }
      );
    }
    
    // Validate the parsed data
    if (!userData || typeof userData !== 'object') {
      return NextResponse.json(
        { error: "Invalid backup data format" },
        { status: 400 }
      );
    }
    
    // Check if the backup belongs to this user
    if (userData.userId && userData.userId !== user.id) {
      return NextResponse.json(
        { error: "This backup belongs to a different user account" },
        { status: 403 }
      );
    }
    
    // Import the data into the database
    const result = await importUserData(userData, user.id);
    
    return NextResponse.json({
      success: true,
      message: `Data imported successfully: ${result.totalImported} records processed`,
      details: result
    });
    
  } catch (error) {
    console.error("Error importing data:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to import data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Parse JSON backup file
 */
async function parseJsonBackup(file: File): Promise<BackupData> {
  const text = await file.text();
  return JSON.parse(text);
}

/**
 * Parse Excel backup file
 */
async function parseExcelBackup(file: File): Promise<BackupData> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const result: BackupData = {
    backupDate: new Date().toISOString()
  };
  
  // Extract data from each sheet
  const sheetNames = workbook.SheetNames.filter(name => name !== 'Summary');
  
  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Map sheet names back to the original data structure
    if (data.length > 0) {
      let key = sheetName;
      
      // Convert abbreviated sheet names back to original property names
      if (key === 'productMaterial') key = 'productMaterials';
      if (key === 'additionalCost') key = 'additionalCosts';
      if (key === 'expenseItem') key = 'expenseItems';
      if (key === 'purchaseItem') key = 'purchaseItems';
      if (key === 'stockHistorie') key = 'stockHistories'; // Excel limits sheet names to 31 chars
      
      // Dynamic assignment with proper typing
      (result as any)[key] = data;
    }
  }
  
  // Check for user ID in summary sheet
  if (workbook.SheetNames.includes('Summary')) {
    const summarySheet = workbook.Sheets['Summary'];
    const summaryData = XLSX.utils.sheet_to_json(summarySheet)[0] as Record<string, unknown>;
    if (summaryData && summaryData['User ID']) {
      result.userId = String(summaryData['User ID']);
    }
  }
  
  return result;
}

/**
 * Import user data into the database
 */
async function importUserData(userData: BackupData, userId: string) {
  // Stats for the import process
  const stats = {
    products: 0,
    materials: 0,
    productMaterials: 0,
    orders: 0,
    sales: 0,
    purchases: 0,
    purchaseItems: 0,
    additionalCosts: 0,
    expenses: 0,
    expenseItems: 0,
    stockHistories: 0,
    totalImported: 0,
    errors: 0
  };
  
  // Helper to safely run imports and track stats
  const safeImport = async (entityName: string, importFn: () => Promise<number>) => {
    try {
      const count = await importFn();
      stats[entityName as keyof typeof stats] = count;
      stats.totalImported += count;
    } catch (error) {
      console.error(`Error importing ${entityName}:`, error);
      stats.errors++;
    }
  };
  
  // First import base entities (materials, products)
  if (userData.materials && userData.materials.length > 0) {
    await safeImport('materials', async () => {
      return await importMaterials(userData.materials!, userId);
    });
  }
  
  if (userData.products && userData.products.length > 0) {
    await safeImport('products', async () => {
      return await importProducts(userData.products!, userId);
    });
  }
  
  // Then import relationships (product materials)
  if (userData.productMaterials && userData.productMaterials.length > 0) {
    await safeImport('productMaterials', async () => {
      return await importProductMaterials(userData.productMaterials!, userId);
    });
  }
  
  // Import transaction data
  if (userData.orders && userData.orders.length > 0) {
    await safeImport('orders', async () => {
      return await importOrders(userData.orders!, userId);
    });
  }
  
  if (userData.sales && userData.sales.length > 0) {
    await safeImport('sales', async () => {
      return await importSales(userData.sales!, userId);
    });
  }
  
  // Import purchase data
  if (userData.purchases && userData.purchases.length > 0) {
    await safeImport('purchases', async () => {
      return await importPurchases(userData.purchases!, userId);
    });
  }
  
  if (userData.purchaseItems && userData.purchaseItems.length > 0) {
    await safeImport('purchaseItems', async () => {
      return await importPurchaseItems(userData.purchaseItems!, userId);
    });
  }
  
  if (userData.additionalCosts && userData.additionalCosts.length > 0) {
    await safeImport('additionalCosts', async () => {
      return await importAdditionalCosts(userData.additionalCosts!, userId);
    });
  }
  
  // Import expense data
  if (userData.expenses && userData.expenses.length > 0) {
    await safeImport('expenses', async () => {
      return await importExpenses(userData.expenses!, userId);
    });
  }
  
  if (userData.expenseItems && userData.expenseItems.length > 0) {
    await safeImport('expenseItems', async () => {
      return await importExpenseItems(userData.expenseItems!, userId);
    });
  }
  
  // Import stock history
  if (userData.stockHistories && userData.stockHistories.length > 0) {
    await safeImport('stockHistories', async () => {
      return await importStockHistories(userData.stockHistories!, userId);
    });
  }
  
  return stats;
}

/**
 * Import materials
 */
async function importMaterials(materials: Material[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const material of materials) {
    try {
      // Extract only the fields we know are needed
      const data = {
        userId,
        name: material.name,
        description: material.description || '',
        unit: material.unit,
        stock: material.stock || 0,
        // Use any additional fields from the original data that might be needed
        ...(material as any),
        // Ensure dates are properly formatted
        createdAt: material.createdAt ? new Date(material.createdAt) : new Date(),
        updatedAt: material.updatedAt ? new Date(material.updatedAt) : new Date()
      };
      
      // Clean up the data to match schema
      delete data.id;
      
      // Try to find existing material by ID
      const existingMaterial = material.id 
        ? await db.material.findUnique({ where: { id: material.id } })
        : null;
      
      if (existingMaterial) {
        // Update existing material
        await db.material.update({
          where: { id: material.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new material
        await db.material.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing material:', error);
    }
  }
  
  return importCount;
}

/**
 * Import products
 */
async function importProducts(products: Product[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const product of products) {
    try {
      // Extract only the fields we know are needed
      const data = {
        userId,
        name: product.name,
        description: product.description || '',
        stock: product.stock || 0,
        // Use any additional fields from the original data that might be needed
        ...(product as any),
        // Ensure dates are properly formatted
        createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
        updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date()
      };
      
      // Clean up the data
      delete data.id;
      delete data.materials;
      
      // Try to find existing product by ID
      const existingProduct = product.id 
        ? await db.product.findUnique({ where: { id: product.id } })
        : null;
      
      if (existingProduct) {
        // Update existing product
        await db.product.update({
          where: { id: product.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new product
        await db.product.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing product:', error);
    }
  }
  
  return importCount;
}

/**
 * Import product materials
 */
async function importProductMaterials(productMaterials: ProductMaterial[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const pm of productMaterials) {
    try {
      // Extract only the fields we know are needed
      const data = {
        userId,
        productId: pm.productId,
        materialId: pm.materialId,
        quantity: pm.quantity,
        // Ensure dates are properly formatted
        createdAt: pm.createdAt ? new Date(pm.createdAt) : new Date(),
        updatedAt: pm.updatedAt ? new Date(pm.updatedAt) : new Date()
      };
      
      // Clean up the data
      delete (data as any).id;
      delete (data as any).material;
      
      // Try to find existing product material by ID or unique combination
      const existingPM = pm.id 
        ? await db.productMaterials.findUnique({ where: { id: pm.id } })
        : await db.productMaterials.findFirst({ 
            where: { 
              productId: pm.productId,
              materialId: pm.materialId,
              userId
            } 
          });
      
      if (existingPM) {
        // Update existing product material
        await db.productMaterials.update({
          where: { id: existingPM.id },
          // Use type assertion to bypass TypeScript checks
          data: { quantity: data.quantity, updatedAt: new Date() } as any
        });
      } else {
        // Create new product material
        await db.productMaterials.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing product material:', error);
    }
  }
  
  return importCount;
}

/**
 * Import orders
 */
async function importOrders(orders: Order[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const order of orders) {
    try {
      // Extract only the fields we know are needed and adapt to the schema
      const data = {
        userId,
        // Convert customerName to customer if needed
        customer: order.customerName,
        // Include any other fields
        ...(order as any),
        // Ensure dates are properly formatted
        createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
        updatedAt: order.updatedAt ? new Date(order.updatedAt) : new Date()
      };
      
      // Map orderDate to orderAt if needed
      if (order.orderDate) {
        data.orderAt = new Date(order.orderDate);
      }
      
      // Clean up the data
      delete data.id;
      delete data.customerName; // Remove if using customer field
      delete data.orderDate; // Remove if using orderAt field
      
      // Try to find existing order by ID
      const existingOrder = order.id 
        ? await db.order.findUnique({ where: { id: order.id } })
        : null;
      
      if (existingOrder) {
        // Update existing order
        await db.order.update({
          where: { id: order.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new order
        await db.order.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing order:', error);
    }
  }
  
  return importCount;
}

/**
 * Import sales
 */
async function importSales(sales: Sale[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const sale of sales) {
    try {
      // Extract only the fields we know are needed and adapt to the schema
      const data = {
        userId,
        // Convert customerName to customer if needed
        customer: sale.customerName,
        // Include any other fields
        ...(sale as any),
        // Ensure dates are properly formatted
        createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
        updatedAt: sale.updatedAt ? new Date(sale.updatedAt) : new Date()
      };
      
      // Map saleDate to orderAt if needed
      if (sale.saleDate) {
        data.orderAt = new Date(sale.saleDate);
      }
      
      // Clean up the data
      delete data.id;
      delete data.customerName; // Remove if using customer field
      delete data.saleDate; // Remove if using orderAt field
      
      // Try to find existing sale by ID
      const existingSale = sale.id 
        ? await db.sale.findUnique({ where: { id: sale.id } })
        : null;
      
      if (existingSale) {
        // Update existing sale
        await db.sale.update({
          where: { id: sale.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new sale
        await db.sale.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing sale:', error);
    }
  }
  
  return importCount;
}

/**
 * Import purchases
 */
async function importPurchases(purchases: Purchase[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const purchase of purchases) {
    try {
      // Extract only the fields we know are needed and adapt to the schema
      const data = {
        userId,
        // Convert supplierName to supplier if needed
        supplier: purchase.supplierName,
        // Include any other fields
        ...(purchase as any),
        // Ensure dates are properly formatted
        createdAt: purchase.createdAt ? new Date(purchase.createdAt) : new Date(),
        updatedAt: purchase.updatedAt ? new Date(purchase.updatedAt) : new Date(),
        purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate) : new Date()
      };
      
      // Clean up the data
      delete data.id;
      delete data.supplierName; // Remove if using supplier field
      delete data.items; // Remove relations
      delete data.additionalCosts; // Remove relations
      
      // Try to find existing purchase by ID
      const existingPurchase = purchase.id 
        ? await db.purchase.findUnique({ where: { id: purchase.id } })
        : null;
      
      if (existingPurchase) {
        // Update existing purchase
        await db.purchase.update({
          where: { id: purchase.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new purchase
        await db.purchase.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing purchase:', error);
    }
  }
  
  return importCount;
}

/**
 * Import purchase items
 */
async function importPurchaseItems(purchaseItems: PurchaseItem[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const item of purchaseItems) {
    try {
      // Extract only the fields we know are needed
      const data = {
        // Include all original fields except id
        ...(item as any),
        // Ensure dates are properly formatted
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
      };
      
      // Clean up the data
      delete data.id;
      
      // Try to find existing purchase item by ID
      const existingItem = item.id 
        ? await db.purchaseItem.findUnique({ where: { id: item.id } })
        : null;
      
      if (existingItem) {
        // Update existing purchase item
        await db.purchaseItem.update({
          where: { id: item.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new purchase item
        await db.purchaseItem.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing purchase item:', error);
    }
  }
  
  return importCount;
}

/**
 * Import additional costs
 */
async function importAdditionalCosts(additionalCosts: AdditionalCost[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const cost of additionalCosts) {
    try {
      // Extract only the fields we know are needed
      const data = {
        // Include all original fields except id
        ...(cost as any),
        // Ensure dates are properly formatted
        createdAt: cost.createdAt ? new Date(cost.createdAt) : new Date(),
        updatedAt: cost.updatedAt ? new Date(cost.updatedAt) : new Date()
      };
      
      // Clean up the data
      delete data.id;
      
      // Try to find existing additional cost by ID
      const existingCost = cost.id 
        ? await db.additionalCost.findUnique({ where: { id: cost.id } })
        : null;
      
      if (existingCost) {
        // Update existing additional cost
        await db.additionalCost.update({
          where: { id: cost.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new additional cost
        await db.additionalCost.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing additional cost:', error);
    }
  }
  
  return importCount;
}

/**
 * Import expenses
 */
async function importExpenses(expenses: Expense[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const expense of expenses) {
    try {
      // Extract only the fields we know are needed
      const data = {
        userId,
        // Include all original fields
        ...(expense as any),
        // Ensure dates are properly formatted
        createdAt: expense.createdAt ? new Date(expense.createdAt) : new Date(),
        updatedAt: expense.updatedAt ? new Date(expense.updatedAt) : new Date(),
        expenseDate: expense.expenseDate ? new Date(expense.expenseDate) : new Date()
      };
      
      // Clean up the data
      delete data.id;
      delete data.items; // Remove relations
      
      // Try to find existing expense by ID
      const existingExpense = expense.id 
        ? await db.expense.findUnique({ where: { id: expense.id } })
        : null;
      
      if (existingExpense) {
        // Update existing expense
        await db.expense.update({
          where: { id: expense.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new expense
        await db.expense.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing expense:', error);
    }
  }
  
  return importCount;
}

/**
 * Import expense items
 */
async function importExpenseItems(expenseItems: ExpenseItem[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const item of expenseItems) {
    try {
      // Extract only the fields we know are needed
      const data = {
        // Include all original fields except id
        ...(item as any),
        // Ensure dates are properly formatted
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
      };
      
      // Clean up the data
      delete data.id;
      
      // Try to find existing expense item by ID
      const existingItem = item.id 
        ? await db.expenseItem.findUnique({ where: { id: item.id } })
        : null;
      
      if (existingItem) {
        // Update existing expense item
        await db.expenseItem.update({
          where: { id: item.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new expense item
        await db.expenseItem.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing expense item:', error);
    }
  }
  
  return importCount;
}

/**
 * Import stock histories
 */
async function importStockHistories(stockHistories: StockHistory[], userId: string): Promise<number> {
  let importCount = 0;
  
  for (const history of stockHistories) {
    try {
      // Extract only the fields we know are needed
      const data = {
        userId,
        // Include all original fields
        ...(history as any),
        // Ensure dates are properly formatted
        createdAt: history.createdAt ? new Date(history.createdAt) : new Date(),
        updatedAt: history.updatedAt ? new Date(history.updatedAt) : new Date(),
        date: history.date ? new Date(history.date) : new Date()
      };
      
      // Clean up the data
      delete data.id;
      
      // Try to find existing stock history by ID
      const existingHistory = history.id 
        ? await db.stockHistory.findUnique({ where: { id: history.id } })
        : null;
      
      if (existingHistory) {
        // Update existing stock history
        await db.stockHistory.update({
          where: { id: history.id },
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      } else {
        // Create new stock history
        await db.stockHistory.create({
          // Use type assertion to bypass TypeScript checks
          data: data as any
        });
      }
      
      importCount++;
    } catch (error) {
      console.error('Error importing stock history:', error);
    }
  }
  
  return importCount;
} 