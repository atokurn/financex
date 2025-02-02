'use client'

import { useEffect, useState, useMemo } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { OrderDetailsDialog } from "@/components/order-details-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { MoonIcon, SunIcon, PlusIcon } from "@radix-ui/react-icons"
import { DataTableViewOptions } from "@/components/data-table-view-options"
import Link from "next/link"
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { DateRange } from "react-day-picker"

const statuses = [
  { value: "all", label: "All Status", count: 0 },
  { value: "pending", label: "Pending", count: 0 },
  { value: "processing", label: "Processing", count: 0 },
  { value: "completed", label: "Completed", count: 0 },
  { value: "cancelled", label: "Cancelled", count: 0 },
]

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return <div className="w-9 h-9" />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export default function OrdersPage() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    sku: false,
    regency: false,
    province: false,
    orderAt: false,
  })
  const [rowSelection, setRowSelection] = useState({})
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [date, setDate] = useState<DateRange | undefined>(undefined)
  const [statusCounts, setStatusCounts] = useState(statuses.map(s => ({ ...s })))
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchOrders()
    
    // Set initial column visibility
    setColumnVisibility({
      sku: false,
      regency: false,
      province: false,
      orderAt: false,
    })
  }, [date])

  useEffect(() => {
    // Listen for view details event
    const handleViewDetails = (event: CustomEvent<{ orderId: string }>) => {
      setSelectedOrderId(event.detail.orderId);
      setDetailsDialogOpen(true);
    };

    window.addEventListener('viewOrderDetails', handleViewDetails as EventListener);

    return () => {
      window.removeEventListener('viewOrderDetails', handleViewDetails as EventListener);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      let url = '/api/orders'
      
      // Add date range parameters if set
      if (date?.from && date?.to) {
        const params = new URLSearchParams()
        // Format tanggal dengan timezone yang benar
        const startDate = new Date(date.from)
        const endDate = new Date(date.to)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        
        params.append('startDate', startDate.toISOString())
        params.append('endDate', endDate.toISOString())
        url = `${url}?${params.toString()}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Oops, we haven't got JSON!")
      }
      const result = await response.json()
      if (Array.isArray(result)) {
        setData(result)
      } else {
        console.error('Received data is not an array:', result)
        setData([])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      setData([])
    }
  }

  // Update status counts when data changes
  useEffect(() => {
    const counts = statuses.map(status => {
      const filteredData = data.filter((item: any) => {
        if (status.value === 'all') return true
        return item.status.toLowerCase() === status.value
      })
      return { ...status, count: filteredData.length }
    })
    setStatusCounts(counts)
  }, [data])

  // Fetch data when date changes
  useEffect(() => {
    fetchOrders()
  }, [date])

  // Polling for updates
  useEffect(() => {
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [date])

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      // Status filter
      if (selectedStatus !== "all" && item.status.toLowerCase() !== selectedStatus) {
        return false
      }
      return true
    })
  }, [data, selectedStatus])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Orders</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8">
          <div className="flex flex-col">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <Tabs 
                  value={selectedStatus} 
                  onValueChange={setSelectedStatus}
                  className="w-full"
                >
                  <div className="flex items-center justify-between">
                    <TabsList>
                      {statusCounts.map((status) => (
                        <TabsTrigger
                          key={status.value}
                          value={status.value}
                          className="relative"
                        >
                          {status.label}
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {status.count}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                  </div>
                </Tabs>
              </div>

              <DataTable 
                data={filteredData} 
                columns={columns}
                isLoading={!mounted}
                date={date}
                setDate={setDate}
                columnVisibility={columnVisibility}
                setColumnVisibility={setColumnVisibility}
              />
            </div>
          </div>
        </main>
      </SidebarInset>
      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </SidebarProvider>
  )
}
