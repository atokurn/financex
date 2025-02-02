'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VisibilityState } from "@tanstack/react-table"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { DateRange } from "react-day-picker"
import { SalesDetailsDialog } from "@/components/sales-details-dialog"

const platforms = [
  { value: "all", label: "All Platforms" },
  { value: "tokopedia", label: "Tokopedia" },
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "tiktok", label: "TikTok Shop" },
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

export default function SalesPage() {
  const [data, setData] = useState([])
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedRows, setSelectedRows] = useState([])
  const [columnVisibility] = useState<VisibilityState>({
    refund: false,
    affiliateCommission: false,
    platformFees: false,
  })
  const [date, setDate] = useState<DateRange | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const filteredSales = useMemo(() => {
    return data.filter((item: any) => {
      // Date range filter
      if (date?.from && date?.to) {
        const saleDate = new Date(item.orderAt)
        if (!(saleDate >= date.from && saleDate <= date.to)) {
          return false
        }
      }

      // Platform filter
      if (selectedPlatform !== "all" && item.platform.toLowerCase() !== selectedPlatform) {
        return false
      }

      return true
    })
  }, [data, date, selectedPlatform])

  const handleRowSelection = (selectedRows: any) => {
    setSelectedRows(selectedRows)
  }

  const fetchSales = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sales')
      const data = await response.json()
      setData(data)
    } catch (error) {
      console.error('Failed to fetch sales:', error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [])

  useEffect(() => {
    const handleViewDetails = (event: CustomEvent<{ saleId: string }>) => {
      setSelectedSaleId(event.detail.saleId)
      setDetailsDialogOpen(true)
    }

    window.addEventListener('viewSaleDetails', handleViewDetails as EventListener)
    return () => {
      window.removeEventListener('viewSaleDetails', handleViewDetails as EventListener)
    }
  }, [])

  const handleBulkDelete = async () => {
    try {
      const response = await fetch('/api/sales/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRows.map((row) => row.id) }),
      })
      if (!response.ok) {
        throw new Error('Failed to delete sales')
      }
      await fetchSales()
    } catch (error) {
      console.error('Failed to delete sales:', error)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex flex-col border-b">
          <div className="flex h-16 shrink-0 items-center px-4">
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
                    <BreadcrumbPage>Sales</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8">
          <div className="flex flex-col">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <Tabs 
                  value={selectedPlatform} 
                  onValueChange={setSelectedPlatform}
                  className="w-full"
                >
                  <div className="flex items-center justify-between">
                    <TabsList>
                      {platforms.map((platform) => (
                        <TabsTrigger
                          key={platform.value}
                          value={platform.value}
                          className="relative"
                        >
                          {platform.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-4">
                      {selectedRows.length > 0 && (
                        <Button variant="danger" onClick={handleBulkDelete}>
                          Delete Selected
                        </Button>
                      )}
                    </div>
                  </div>
                </Tabs>
              </div>

              <DataTable 
                data={filteredSales} 
                columns={columns}
                isLoading={isLoading}
                onRowSelection={handleRowSelection}
                date={date}
                setDate={setDate}
                columnVisibility={columnVisibility}
              />
            </div>
          </div>
        </main>
      </SidebarInset>
      <SalesDetailsDialog
        saleId={selectedSaleId}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </SidebarProvider>
  )
}
