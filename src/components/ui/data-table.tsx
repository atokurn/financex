"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
  OnChangeFn,
  PaginationState
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DataTablePagination } from "@/components/data-table-pagination"
import { DataTableToolbar } from "@/components/data-table-toolbar"
import { Skeleton } from "./skeleton"

// Import DateRange type from react-day-picker or define it
import { DateRange } from "react-day-picker"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  isRefreshing?: boolean
  pagination?: {
    pageIndex: number
    pageSize: number
  }
  setPagination?: (pagination: { pageIndex: number; pageSize: number }) => void
  onDataChange?: () => void
  onDelete?: (id: string) => Promise<void>
  onBulkDelete?: (ids: string[]) => Promise<void>
  date?: DateRange | undefined
  setDate?: (date: DateRange | undefined) => void
  columnVisibility?: VisibilityState
  setColumnVisibility?: (visibility: VisibilityState) => void
  tableId?: string // Unique ID for the table, used for persisting state
}

// Custom filter function that handles objects and arrays
const globalFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const searchValue = filterValue.toLowerCase()
  
  // Function to check if a value matches the search
  const matchesSearch = (value: unknown): boolean => {
    if (value == null) return false
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.some(matchesSearch)
      }
      return Object.values(value as Record<string, unknown>).some(matchesSearch)
    }
    
    return String(value).toLowerCase().includes(searchValue)
  }

  // Search through all values in the row
  return Object.values(row.original as Record<string, unknown>).some(matchesSearch)
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  isRefreshing = false,
  pagination,
  setPagination,
  onDataChange,
  onDelete,
  onBulkDelete,
  date,
  setDate,
  columnVisibility: initialColumnVisibility,
  setColumnVisibility: onColumnVisibilityChange,
  tableId = 'default-table',
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialColumnVisibility || {}
  )
  const prevDataRef = React.useRef<TData[]>([])

  React.useEffect(() => {
    if (initialColumnVisibility) {
      setColumnVisibility(initialColumnVisibility)
    }
  }, [initialColumnVisibility])

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [localPagination, setLocalPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    // Hanya reset local pagination jika:
    // 1. Component telah di-mount
    // 2. Ada data
    // 3. External pagination TIDAK disediakan
    // 4. Dan ini adalah render pertama kali (menghindari reset pada update data real-time)
    if (mounted && data.length && !pagination && !prevDataRef.current.length) {
      setLocalPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
    // Simpan data saat ini sebagai referensi untuk render berikutnya
    prevDataRef.current = data;
  }, [data, mounted, pagination]) // Add pagination to dependency array

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination: pagination || localPagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: (visibility) => {
      if (onColumnVisibilityChange) {
        onColumnVisibilityChange(visibility);
      } else {
        setColumnVisibility(visibility);
      }
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (value) => {
      if (setPagination) {
        // Convert Updater<PaginationState> to { pageIndex, pageSize }
        if (typeof value === 'function') {
          const currentPagination = pagination || localPagination;
          const newPagination = value(currentPagination);
          setPagination(newPagination);
        } else {
          setPagination(value);
        }
      } else {
        setLocalPagination(value as PaginationState);
      }
    },
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    // Disable auto reset of pagination index
    autoResetPageIndex: false,
  })

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-8 w-[200px]" />
        </div>
      ) : (
        <DataTableToolbar 
          table={table}
          onDataChange={onDataChange}
          date={date}
          setDate={setDate}
          onDelete={onDelete ? 
            () => {
              const selectedRows = table.getFilteredSelectedRowModel().rows
              const ids = selectedRows.map(row => {
                const original = row.original as Record<string, string>;
                return original.id || '';
              })
              if (ids.length === 1 && onDelete) {
                onDelete(ids[0])
              } else if (ids.length > 1 && onBulkDelete) {
                onBulkDelete(ids)
              }
            } : undefined
          }
        />
      )}
      <div className="rounded-md border relative">
        {isRefreshing && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">
              Refreshing...
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} tableId={tableId} />
    </div>
  )
}
