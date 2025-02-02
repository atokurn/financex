'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
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
import { toast } from "sonner"
import { DataTableViewOptions } from "@/components/data-table-view-options"
import Link from "next/link"
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { DateRange } from "react-day-picker"

const statuses = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
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

export default function PurchasesPage() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [date, setDate] = useState<DateRange | undefined>(undefined)
  const fetchingRef = useRef(false)

  const filteredData = useMemo(() => {
    if (!mounted) return []
    
    return data.filter((item: any) => {
      // Date range filter
      if (date?.from && date?.to) {
        const purchaseDate = new Date(item.createdAt)
        if (!(purchaseDate >= date.from && purchaseDate <= date.to)) {
          return false
        }
      }

      // Status filter
      if (selectedStatus !== "all" && item.status !== selectedStatus) {
        return false
      }

      return true
    })
  }, [data, date, selectedStatus, mounted])

  const fetchPurchases = useCallback(async () => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setIsRefreshing(true)
      const response = await fetch('/api/purchases')
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response not ok:', errorText)
        throw new Error(`Failed to fetch purchases: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      if (Array.isArray(result)) {
        setData(result)
      } else if (result.error) {
        throw new Error(result.error)
      } else {
        console.error('Received data is not an array:', result)
        setData([])
      }
    } catch (error) {
      console.error('Failed to fetch purchases:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch purchases')
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
      fetchingRef.current = false;
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setIsRefreshing(true);
      const response = await fetch(`/api/purchases?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete purchase: ${response.status} ${errorText}`);
      }

      toast.success('Purchase deleted successfully');
      fetchPurchases();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchase');
    } finally {
      setIsRefreshing(false);
      fetchingRef.current = false;
    }
  }, [fetchPurchases]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setIsRefreshing(true);
      const response = await fetch('/api/purchases/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete purchases: ${response.status} ${errorText}`);
      }

      toast.success('Purchases deleted successfully');
      fetchPurchases();
    } catch (error) {
      console.error('Error deleting purchases:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchases');
    } finally {
      setIsRefreshing(false);
      fetchingRef.current = false;
    }
  }, [fetchPurchases]);

  useEffect(() => {
    setMounted(true)
    fetchPurchases()
    
    const interval = setInterval(() => {
      if (!fetchingRef.current) {
        fetchPurchases()
      }
    }, 30000)
    
    return () => {
      clearInterval(interval)
      fetchingRef.current = false
    }
  }, [fetchPurchases])

  if (!mounted) {
    return null
  }

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
                  <BreadcrumbPage>Purchases</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
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
                      {statuses.map((status) => (
                        <TabsTrigger
                          key={status.value}
                          value={status.value}
                          className="relative"
                        >
                          {status.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-4">
                    </div>
                  </div>
                </Tabs>
              </div>

              {mounted && (
                <DataTable 
                  data={filteredData} 
                  columns={columns}
                  isLoading={!mounted}
                  date={date}
                  setDate={setDate}
                />
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
