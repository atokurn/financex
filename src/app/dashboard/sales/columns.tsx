"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table-row-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye } from "lucide-react"

export type Sale = {
  id: string
  orderId: string
  orderAt: Date
  income: number
  priceAfterDiscount: number
  totalFees: number
  platformFees: number
  affiliateCommission: number
  refund: number
  platform: string
  createdAt: Date
  updatedAt: Date
}

export const columns: ColumnDef<Sale>[] = [
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
    accessorKey: "orderId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order ID" />
    ),
  },
  {
    accessorKey: "orderAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order at" />
    ),
    cell: ({ row }) => formatDate(row.getValue("orderAt")),
  },
  {
    accessorKey: "income",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Income" />
    ),
    cell: ({ row }) => {
      const income = parseFloat(row.getValue("income"))
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(income)
      return formatted
    },
  },
  {
    accessorKey: "priceAfterDiscount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price after discount" />
    ),
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("priceAfterDiscount"))
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(price)
      return formatted
    },
  },
  {
    accessorKey: "totalFees",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Fees" />
    ),
    cell: ({ row }) => {
      const fees = parseFloat(row.getValue("totalFees"))
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(fees)
      return formatted
    },
  },
  {
    accessorKey: "platformFees",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Platform Fees" />
    ),
    cell: ({ row }) => {
      const fees = parseFloat(row.getValue("platformFees"))
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(fees)
      return formatted
    },
    isVisible: false,
  },
  {
    accessorKey: "affiliateCommission",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Affiliate Commission" />
    ),
    cell: ({ row }) => {
      const commission = parseFloat(row.getValue("affiliateCommission"))
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(commission)
      return formatted
    },
    isVisible: false,
  },
  {
    accessorKey: "refund",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Refund" />
    ),
    cell: ({ row }) => {
      const refund = parseFloat(row.getValue("refund"))
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(refund)
      return formatted
    },
    isVisible: false,
  },
  {
    accessorKey: "platform",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Platform" />
    ),
    cell: ({ row }) => {
      const platform = row.getValue("platform") as string
      
      const badgeVariants: { [key: string]: string } = {
        shopee: "bg-orange-500 hover:bg-orange-600 text-white",
        tokopedia: "bg-green-500 hover:bg-green-600 text-white",
        tiktok: "bg-zinc-700 hover:bg-zinc-800 text-white",
        lazada: "bg-purple-500 hover:bg-purple-600 text-white"
      }

      return (
        <Badge className={badgeVariants[platform.toLowerCase()] || "bg-gray-500 text-white"}>
          {platform}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const sale = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(sale.id)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                const viewDetailsEvent = new CustomEvent('viewSaleDetails', {
                  detail: { saleId: sale.id }
                });
                window.dispatchEvent(viewDetailsEvent);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
