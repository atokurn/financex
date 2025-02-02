"use client"

import { Cross2Icon, TrashIcon, ReloadIcon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/data-table-view-options"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { DateRange } from "react-day-picker"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  onDataChange?: () => void
  onDelete?: () => void
  date?: DateRange | undefined
  setDate?: (date: DateRange | undefined) => void
}

export function DataTableToolbar<TData>({
  table,
  onDataChange,
  onDelete,
  date,
  setDate,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const hasSelection = table.getState().rowSelection && Object.keys(table.getState().rowSelection).length > 0
  const hasSearchFilter = table.getState().globalFilter?.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="flex items-center space-x-1">
          <Input
            placeholder="Search..."
            value={table.getState().globalFilter ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="h-8 w-[150px] lg:w-[250px]"
          />
          {hasSearchFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setGlobalFilter("")}
              className="h-8 w-8 p-0"
            >
              <Cross2Icon className="h-4 w-4" />
              <span className="sr-only">Reset search</span>
            </Button>
          )}
        </div>
        {setDate && (
          <DatePickerWithRange date={date} setDate={setDate} />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
        {hasSelection && onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8"
          >
            <TrashIcon className="h-4 w-4" />
            <span className="ml-2">Delete Selected</span>
          </Button>
        )}
        {onDataChange && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDataChange}
            className="h-8"
          >
            <ReloadIcon className="h-4 w-4" />
            
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
