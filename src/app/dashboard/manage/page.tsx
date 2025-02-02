'use client'

import { useEffect, useState } from 'react'
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
import { MoonIcon, SunIcon } from "@radix-ui/react-icons"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { DateRange } from "react-day-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const itemTypes = [
  { value: "all", label: "All Items" },
  { value: "material", label: "Materials" },
  { value: "product", label: "Products" }
]

const changeTypes = [
  { value: "all", label: "All Changes" },
  { value: "in", label: "Stock In" },
  { value: "out", label: "Stock Out" },
  { value: "adjustment", label: "Adjustment" }
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

export default function ManagePage() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [date, setDate] = useState<DateRange | undefined>()
  const [itemType, setItemType] = useState("all")
  const [changeType, setChangeType] = useState("all")
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const fetchStockHistory = async () => {
    try {
      setIsLoading(true)
      let params = new URLSearchParams()
      
      if (date?.from && date?.to) {
        params.append('startDate', date.from.toISOString().split('T')[0])
        params.append('endDate', date.to.toISOString().split('T')[0])
      }
      
      if (itemType !== 'all') {
        params.append('itemType', itemType)
      }
      
      if (changeType !== 'all') {
        params.append('type', changeType)
      }

      const response = await fetch('/api/stock-history?' + params.toString())
      if (!response.ok) {
        throw new Error('Failed to fetch stock history')
      }
      const result = await response.json()
      setData(result.data || [])
    } catch (error) {
      console.error('Error fetching stock history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStockHistory()
  }, [date, itemType, changeType])

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
                  <BreadcrumbPage>Stock History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8">
          <div className="flex items-center gap-4">
            <DatePickerWithRange date={date} setDate={setDate} />
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select item type" />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={changeType} onValueChange={setChangeType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select change type" />
              </SelectTrigger>
              <SelectContent>
                {changeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable 
            data={data} 
            columns={columns} 
            isLoading={isLoading}
            pagination={pagination}
            setPagination={setPagination}
            onDataChange={fetchStockHistory}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
