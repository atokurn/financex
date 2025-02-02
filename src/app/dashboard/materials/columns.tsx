"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table-row-actions"
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
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

export type Material = {
  id: string
  code: string
  name: string
  description: string | null
  unit: string
  price: number
  stock: number
  minStock: number
  category: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export const columns: ColumnDef<Material>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SKU" />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "unit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Unit" />
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"))
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(price)
      return formatted
    },
  },
  {
    accessorKey: "stock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
  },
  {
    id: "totalValue",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Value" />
    ),
    accessorFn: (row) => {
      const price = parseFloat(row.price) || 0
      const stock = parseInt(row.stock) || 0
      return price * stock
    },
    cell: ({ getValue }) => {
      const amount = getValue() as number
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(amount)
    },
    enableSorting: true,
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
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
          const response = await fetch(`/api/materials/${row.original.id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: selectedStatus }),
          })

          if (!response.ok) {
            throw new Error('Failed to update status')
          }

          toast.success('Status updated successfully')
          // Refresh the data
          window.location.reload()
        } catch (error) {
          console.error('Error updating status:', error)
          toast.error('Failed to update status')
          setSelectedStatus(status)
        } finally {
          setIsLoading(false)
          setIsOpen(false)
        }
      }

      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-8 p-0 hover:bg-transparent">
              <Badge variant={status === "active" ? "default" : "secondary"}>
                {status}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-3">
            <div className="space-y-4">
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
              <div className="flex justify-end space-x-2">
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
            </div>
          </PopoverContent>
        </Popover>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
