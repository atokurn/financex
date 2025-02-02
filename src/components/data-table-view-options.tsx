import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MixerHorizontalIcon, PlusIcon, TrashIcon, UploadIcon, DownloadIcon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog"
import { toast } from "sonner"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { parseFileData } from "@/lib/import-helpers"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  onDataChange?: () => void
}

export function DataTableViewOptions<TData>({
  table,
  onDataChange,
}: DataTableViewOptionsProps<TData>) {
  const pathname = usePathname()
  const router = useRouter()
  const isProductsPage = pathname === "/dashboard/products"
  const isMaterialsPage = pathname === "/dashboard/materials"
  const isSalesPage = pathname === "/dashboard/sales"
  const isOrdersPage = pathname === "/dashboard/orders"
  const isStockHistory = pathname === "/dashboard/manage"
  const isPurchasesPage = pathname === "/dashboard/purchases"
  const isExpensesPage = pathname.includes('expenses')
  const hasSelectedRows = table.getSelectedRowModel().rows.length > 0
  const selectedCount = table.getSelectedRowModel().rows.length
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileData, setFileData] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const getImportType = () => {
    if (isProductsPage) return 'products'
    if (isMaterialsPage) return 'materials'
    if (isSalesPage) return 'sales'
    if (isOrdersPage) return 'orders'
    if (isPurchasesPage) return 'purchases'
    return ''
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    try {
      setSelectedFile(file)
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
        throw new Error('Please upload an Excel or CSV file')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error processing file")
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first")
      return
    }

    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/${getImportType()}/import`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      if (result.results) {
        const { success = 0, failed = 0, rowErrors = [] } = result.results || {}
        const totalRows = success + failed
        
        // Cek path URL untuk menentukan jenis import
        const isOrderImport = window.location.pathname.includes('/orders')
        
        // Hanya cek Empty SKU untuk import orders
        const emptySkuErrors = isOrderImport && Array.isArray(rowErrors)
          ? rowErrors.filter(error => error?.error?.includes('Empty SKU'))
          : []

        const copyEmptySkus = (errors: any[]) => {
          if (!Array.isArray(errors)) return
          const text = errors
            .filter(error => error?.data?.orderId && error?.data?.productName)
            .map(error => 
              `Order ID: ${error.data.orderId}, Product: ${error.data.productName}`
            )
            .join('\n')
          if (text) {
            navigator.clipboard.writeText(text)
            toast.success('Empty SKU list copied to clipboard')
          }
        }

        if ((failed && failed > 0) || (Array.isArray(rowErrors) && rowErrors.length > 0)) {
          toast.warning(
            <div className="space-y-2">
              <div className="font-medium">Import completed with warnings</div>
              <div className="text-sm text-muted-foreground">
                Successfully imported: {success} rows
                <br />
                {failed > 0 && `Failed to import: ${failed} rows`}
                {isOrderImport && emptySkuErrors.length > 0 && (
                  <>
                    <br />
                    Empty SKU found in {emptySkuErrors.length} orders
                  </>
                )}
              </div>
              {isOrderImport && emptySkuErrors.length > 0 && (
                <div className="flex items-center justify-between gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                  <div className="flex-1">
                    <span className="text-sm font-medium">Multiple orders with empty SKU detected</span>
                    <div className="text-sm text-muted-foreground mt-1">
                      {emptySkuErrors.length} orders need SKU
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyEmptySkus(emptySkuErrors)}
                    >
                      Copy List
                    </Button>
                  </div>
                </div>
              )}
              {Array.isArray(rowErrors) && rowErrors.length > 0 && (
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                  {rowErrors.map((error: any, index: number) => {
                    if (!error) return null
                    const isEmptySku = isOrderImport && error?.error?.includes('Empty SKU')
                    return (
                      <div 
                        key={index} 
                        className={`text-sm flex items-center justify-between gap-2 p-2 rounded ${
                          isEmptySku ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-red-50 dark:bg-red-950'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            Row {error.row || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {isEmptySku && error?.data ? (
                              <>
                                <span className="font-medium">Order ID:</span> {error.data.orderId || 'N/A'}
                                <br />
                                <span className="font-medium">Product:</span> {error.data.productName || 'N/A'}
                              </>
                            ) : (
                              error.error || 'Unknown error'
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>,
            {
              duration: 0, // Toast tidak akan hilang otomatis
              dismissible: true, // Bisa ditutup manual
              important: true, // Prioritaskan toast ini
            }
          )
        } else {
          toast.success(`Successfully imported ${totalRows} rows`)
        }

        // Refresh data setelah import
        if (onDataChange) {
          setTimeout(onDataChange, 500) // Give the database a moment to update
        }
      }

      setImportDialogOpen(false)
      setFileData(null)
      setSelectedFile(null)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to import data")
    } finally {
      setImporting(false)
    }
  }

  const handleClearFile = () => {
    setFileData(null)
    setSelectedFile(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  })

  const handleBulkDelete = async () => {
    try {
      const selectedRows = table.getSelectedRowModel().rows
      const ids = selectedRows.map((row) => row.original.id)

      if (ids.length === 0) {
        toast.error("Please select items to delete")
        return
      }

      const isStockHistory = pathname === "/dashboard/manage"
      const isPurchases = pathname === "/dashboard/purchases"
      const isSales = pathname === "/dashboard/sales"
      const isOrders = pathname === "/dashboard/orders"
      const isProducts = pathname === "/dashboard/products"

      const endpoint = isStockHistory ? "/api/stock-history/bulk-delete" :
                      isPurchases ? "/api/purchases/bulk-delete" :
                      isSales ? "/api/sales/bulk-delete" :
                      isOrders ? "/api/orders/bulk-delete" :
                      isProducts ? "/api/products/bulk-delete" :
                      "/api/materials/bulk-delete"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete items")
      }

      toast.success(data.message || `Successfully deleted ${ids.length} ${ids.length === 1 ? 'item' : 'items'}`)
      
      // Clear table selection
      table.toggleAllRowsSelected(false)
      
      // Refresh the data
      if (onDataChange) {
        onDataChange()
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete items")
    }
  }

  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    const type = getImportType()
    window.open(`/api/template/${type}?format=${format}`, '_blank')
  }

  const handleDownload = async (format: 'xlsx' | 'csv') => {
    try {
      const type = getImportType()
      const response = await fetch(`/api/${type}/export?format=${format}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${type}_${new Date().toISOString().split('T')[0]}.${format}`
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition)
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '')
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Download completed')
    } catch (error) {
      console.error('Download error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to download data')
    }
  }

  const copyEmptySkus = (errors: any[]) => {
    const header = `=== Orders with Empty SKU (${errors.length} items) ===\n`
    const timestamp = new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium'
    })
    
    const text = errors.map((error, index) => {
      const order = error.data
      const total = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
      }).format(order.totalOrder)

      return `${index + 1}. Order ID: ${order.orderId} (Row ${error.row})
   Product: ${order.productName}
   Customer: ${order.customer}
   Total: ${total}
   Platform: ${order.platform || '-'}
   Order Type: ${order.orderType || '-'}
   Reference: ${order.reference || '-'}
   Order Date: ${new Date(order.orderAt).toLocaleDateString('id-ID')}
   Shipping to: ${order.regency}, ${order.province}
`
    }).join('\n')

    const footer = `\nExported at: ${timestamp}`

    navigator.clipboard.writeText(header + text + footer).then(() => {
      toast.success('Empty SKUs list copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }

  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="flex flex-1 items-center space-x-2">
        {hasSelectedRows && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 px-3 lg:px-4"
              >
                <TrashIcon className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline-block">
                  Delete Selected ({selectedCount} {selectedCount === 1 ? 'item' : 'items'})
                </span>
                <span className="ml-2 sm:hidden">
                  Delete ({selectedCount})
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete {selectedCount} {selectedCount === 1 ? 
                    (isProductsPage ? 'product' : isMaterialsPage ? 'material' : isSalesPage ? 'sale' : isPurchasesPage ? 'purchase' : 'order') : 
                    (isProductsPage ? 'products' : isMaterialsPage ? 'materials' : isSalesPage ? 'sales' : isPurchasesPage ? 'purchases' : 'orders')
                  } from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleBulkDelete} 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="flex items-center ml-auto gap-2">
        {isStockHistory && (
          <Button
            onClick={() => router.push('/dashboard/manage/add')}
            className="h-8"
            size="sm"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Stock Change
          </Button>
        )}
        {isProductsPage && (
          <Button
            onClick={() => router.push('/dashboard/products/add')}
            className="h-8"
            size="sm"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
        {isMaterialsPage && (
          <Button asChild size="sm" className="h-8">
            <Link href="/dashboard/materials/add">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Material
            </Link>
          </Button>
        )}
        {isSalesPage && (
          <Button
            onClick={() => router.push('/dashboard/sales/add')}
            className="h-8"
            size="sm"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Sale
          </Button>
        )}
        {isOrdersPage && (
          <Button
            onClick={() => router.push('/dashboard/orders/add')}
            className="h-8"
            size="sm"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Order
          </Button>
        )}
        {isPurchasesPage && (
          <Button
            onClick={() => router.push('/dashboard/purchases/add')}
            className="h-8"
            size="sm"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Purchase
          </Button>
        )}
        {isExpensesPage && (
          <Button
            onClick={() => router.push('/dashboard/expenses/add')}
            className="h-8"
            size="sm"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
        {(isProductsPage || isMaterialsPage || isSalesPage || isOrdersPage || isPurchasesPage) && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <DownloadIcon/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload('xlsx')}>
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('csv')}>
                  CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
              size="sm"
              className="h-8"
              disabled={importing}
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Import"}
            </Button>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Data</DialogTitle>
                  <DialogDescription>
                    Upload a CSV or Excel file to import data
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div
                    {...getRootProps()}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary"
                  >
                    <input {...getInputProps()} />
                    {isDragActive ? (
                      <p>Drop the file here...</p>
                    ) : selectedFile ? (
                      <div className="space-y-2">
                        <p>Selected file: {selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">Click or drag a new file to change</p>
                      </div>
                    ) : (
                      <p>Drag and drop a file here, or click to select a file</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          Download Template
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => downloadTemplate('xlsx')}>
                          Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadTemplate('csv')}>
                          CSV (.csv)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {selectedFile && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFile}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          Remove File
                        </Button>
                        <Button
                          onClick={handleUpload}
                          disabled={importing}
                          size="sm"
                        >
                          {importing ? (
                            <>Importing...</>
                          ) : (
                            <>
                              <UploadIcon className="mr-2 h-4 w-4" />
                              Upload Data
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
              >
                <MixerHorizontalIcon className="mr-2 h-4 w-4" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
             
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
