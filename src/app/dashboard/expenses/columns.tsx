"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { DataTableRowActions } from "@/components/data-table-row-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { formatIDR } from "@/lib/utils"

export type Expense = {
  id: string
  payee: string | null
  category: string
  reference: string | null
  notes: string | null
  dueDate: string | null
  dueTime: string | null
  paymentType: string
  attachments: string[]
  items: {
    id: string
    description: string
    price: number
  }[]
  total: number
  createdAt: string
}

export const columns: ColumnDef<Expense>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
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
    accessorKey: "dueDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Due Date" />
    ),
    cell: ({ row }) => {
      const dueDate = row.getValue("dueDate") as string | null
      const dueTime = row.original.dueTime

      return (
        <div className="w-[120px]">
          {dueDate ? (
            <div>
              <div>{format(new Date(dueDate), "PPP")}</div>
              {dueTime && (
                <div className="text-sm text-muted-foreground">
                  {dueTime}
                </div>
              )}
            </div>
          ) : (
            "-"
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "payee",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payee" />
    ),
    cell: ({ row }) => (
      <div className="w-[140px]">{row.getValue("payee") || "-"}</div>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => {
      const category = row.getValue("category") as string

      return (
        <div className="w-[120px]">
          <Badge variant="outline">
            {category}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "paymentType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Type" />
    ),
    cell: ({ row }) => {
      const paymentType = row.getValue("paymentType") as string

      return (
        <div className="w-[120px]">
          <Badge variant="secondary">
            {paymentType}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "items",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => {
      const items = row.original.items

      return (
        <div className="min-w-[200px]">
          {items.map((item) => (
            <div key={item.id} className="text-sm">
              {item.description}
            </div>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total"))
      const formatted = formatIDR(amount)

      return <div className="text-right font-medium w-[140px]">{formatted}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
