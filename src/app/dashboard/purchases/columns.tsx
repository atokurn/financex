"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table-row-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { toast } from "sonner"

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

export type Purchase = {
  id: string
  type: string
  invoiceNumber: string
  items: {
    id: string
    type: string
    materialId?: string
    productId?: string
    material?: {
      code: string
      name: string
      unit: string
    } | null
    product?: {
      name: string
      sku: string
    } | null
    quantity: number
    price: number
    totalPrice: number
  }[]
  supplier: string
  reference?: string
  status: string
  createdAt: string
}

export const columns: ColumnDef<Purchase>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Invoice" />
    ),
    cell: ({ row }) => {
      const invoiceNumber = row.getValue("invoiceNumber") as string
      return <span className="font-medium">{invoiceNumber}</span>
    },
  },
  {
    id: "items",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" />
    ),
    cell: ({ row }) => {
      const [isExpanded, setIsExpanded] = useState(false);
      const items = row.original.items;
      
      // Get the first item to show in collapsed state
      const firstItem = items[0];
      const firstItemName = firstItem.material ? firstItem.material.name : firstItem.product ? firstItem.product.name : '-';
      
      return (
        <div className="w-[500px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "−" : "+"}
              </Button>
              <span>{firstItemName} {items.length > 1 ? `(+${items.length - 1} more)` : ''}</span>
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-2 space-y-2">
              {items.map((item) => {
                const itemName = item.material ? item.material.name : item.product ? item.product.name : '-';
                const itemCode = item.material ? item.material.code : item.product ? item.product.sku : '-';
                
                return (
                  <div key={item.id} className="pl-10 py-2 border-t">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{itemName}</div>
                        <div className="text-sm text-muted-foreground">{itemCode}</div>
                      </div>
                      <div className="text-right">
                        <div>{item.quantity} x {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0
                        }).format(item.price)}</div>
                        <div className="text-sm text-muted-foreground">{new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0
                        }).format(item.totalPrice)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: "supplier",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Supplier" />
    ),
  },
  {
    accessorKey: "reference",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reference" />
    ),
    cell: ({ row }) => row.getValue("reference") || "-"
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const variant = status === 'pending' ? 'outline' :
                   status === 'completed' ? 'default' :
                   'destructive'

      const [isOpen, setIsOpen] = useState(false)
      const [selectedStatus, setSelectedStatus] = useState(status)
      const [isLoading, setIsLoading] = useState(false)

      const handleSave = async () => {
        if (selectedStatus === status) {
          setIsOpen(false)
          return
        }

        setIsLoading(true)
        try {
          const payload = {
            status: selectedStatus
          }
          
          console.log('Sending status update:', {
            id: row.original.id,
            ...payload
          })

          const response = await fetch(`/api/purchases/${row.original.id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          })

          const text = await response.text()
          console.log('Response:', {
            status: response.status,
            text: text
          })

          // Try to parse the response
          let data
          try {
            data = JSON.parse(text)
          } catch (e) {
            console.error('Failed to parse response:', text)
            throw new Error('Invalid response from server')
          }

          // Validate response format
          if (!data || typeof data !== 'object') {
            console.error('Invalid response data:', data)
            throw new Error('Invalid response format from server')
          }

          // Check for errors
          if (!response.ok || data.success === false) {
            const errorMessage = data.error || response.statusText || 'Failed to update status'
            console.error('Error response:', errorMessage)
            throw new Error(errorMessage)
          }

          // Validate returned data
          if (!data.data || typeof data.data !== 'object' || !('status' in data.data)) {
            console.error('Invalid success response:', data)
            throw new Error('Invalid success response from server')
          }

          console.log('Update successful:', data.data)
          
          // Update was successful
          toast.success("Status updated successfully")
          
          // Close the dialog
          setIsOpen(false)
          
          // Refresh the page to get updated data
          window.location.reload()
        } catch (error) {
          console.error('Error updating status:', error)
          toast.error(error instanceof Error ? error.message : "Failed to update status")
          setSelectedStatus(status) // Reset to original status
        } finally {
          setIsLoading(false)
        }
      }

      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-full justify-start p-2 font-normal"
            >
              <Badge variant={variant}>{status}</Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-2 w-[200px]" align="start">
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStatus(status)
                  setIsOpen(false)
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading || selectedStatus === status}
              >
                Save
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )
    }
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => formatDate(row.getValue("createdAt"))
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />
  },
]
