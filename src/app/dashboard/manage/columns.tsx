"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table-row-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

interface Material {
  code: string
  name: string
  unit: string
}

interface Product {
  name: string
  sku: string
}

export type StockHistory = {
  id: string
  materialId?: string
  productId?: string
  material?: Material
  product?: Product
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  description?: string
  reference?: string
  createdAt: string
}

export const columns: ColumnDef<StockHistory>[] = [
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
    id: "name",
    accessorFn: (row) => {
      if (row.material) return row.material.name
      if (row.product) return row.product.name
      return ""
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Item Name" />
    ),
    cell: ({ row }) => {
      const material = row.original.material
      const product = row.original.product
      return material ? material.name : product ? product.name : '-'
    },
    filterFn: (row, id, value) => {
      const materialName = row.original.material?.name || ""
      const productName = row.original.product?.name || ""
      const searchValue = value.toLowerCase()
      return materialName.toLowerCase().includes(searchValue) || 
             productName.toLowerCase().includes(searchValue)
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      const variants = {
        in: { variant: "default" as const, label: "Stock In" },
        out: { variant: "destructive" as const, label: "Stock Out" },
        adjustment: { variant: "secondary" as const, label: "Adjustment" }
      }
      const { variant, label } = variants[type] || { variant: "outline" as const, label: type }
      return (
        <Badge variant={variant}>
          {label}
        </Badge>
      )
    },
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" />
    ),
    cell: ({ row }) => {
      const quantity = parseInt(row.getValue("quantity"))
      const type = row.getValue("type") as string
      const data = row.original
      return (
        <span className={type === 'in' ? "text-green-500" : type === 'adjustment' ? "text-blue-500" : "text-red-500"}>
          {type === 'in' ? '+' : type === 'adjustment' ? '' : '-'}{quantity.toLocaleString()} {data.material?.unit || 'pcs'}
        </span>
      )
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => row.getValue("description") || '-'
  },
  {
    accessorKey: "reference",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reference" />
    ),
    cell: ({ row }) => row.getValue("reference") || '-'
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
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
