import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
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

export type Order = {
  id: string
  orderId: string
  sku: string
  customer: string
  productName: string
  quantity: number
  totalOrder: number
  status: "pending" | "processing" | "completed" | "cancelled"
  regency: string
  province: string
  orderAt: Date
  platform: string
  createdAt: Date
  updatedAt: Date
}

export const columns: ColumnDef<Order>[] = [
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
    accessorKey: "sku",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SKU" />
    ),
    isVisible: false,
  },
  {
    accessorKey: "orderId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order ID" />
    ),
  },
  {
    accessorKey: "customer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
  },
  {
    accessorKey: "productName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product Name" />
    ),
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" />
    ),
    cell: ({ row }) => {
      const quantity = parseInt(row.getValue("quantity"))
      return <div className="text-right font-medium">{quantity}</div>
    },
  },
  {
    accessorKey: "totalOrder",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Order" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalOrder"))
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const colorMap: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        processing: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        completed: "bg-green-100 text-green-800 hover:bg-green-200",
        cancelled: "bg-red-100 text-red-800 hover:bg-red-200"
      }
      return (
        <Badge className={`${colorMap[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    },
  },
  {
    accessorKey: "regency",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Regency / City" />
    ),
    isVisible: false,
  },
  {
    accessorKey: "province",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Province" />
    ),
    isVisible: false,
  },
  {
    accessorKey: "orderAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Date" />
    ),
    cell: ({ row }) => {
      return format(new Date(row.getValue("orderAt")), "PPP")
    },
  },
  {
    accessorKey: "platform",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Platform" />
    ),
    cell: ({ row }) => {
      const platform = row.getValue("platform") as string
      return (
        <div className="flex items-center">
          {platform === "tokopedia" && (
            <Badge variant="outline" className="bg-[#42B549] text-white">
              Tokopedia
            </Badge>
          )}
          {platform === "shopee" && (
            <Badge variant="outline" className="bg-[#EE4D2D] text-white">
              Shopee
            </Badge>
          )}
          {platform === "lazada" && (
            <Badge variant="outline" className="bg-[#0F146E] text-white">
              Lazada
            </Badge>
          )}
          {platform === "tiktok" && (
            <Badge variant="outline" className="bg-[#000000] text-white">
              TikTok
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original
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
              onClick={() => navigator.clipboard.writeText(order.orderId)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                const viewDetailsEvent = new CustomEvent('viewOrderDetails', {
                  detail: { orderId: order.id }
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
