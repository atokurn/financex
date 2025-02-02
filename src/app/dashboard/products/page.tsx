'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table"

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

export default function ProductsPage() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const fetchingRef = useRef(false)

  const fetchProducts = useCallback(async () => {
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setIsRefreshing(true)
      const response = await fetch('/api/products')
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response not ok:', errorText)
        throw new Error(`Failed to fetch products: ${response.status} ${errorText}`)
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
      console.error('Failed to fetch products:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch products')
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
      fetchingRef.current = false;
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchProducts()
    
    const interval = setInterval(() => {
      if (!fetchingRef.current) {
        fetchProducts()
      }
    }, 30000)
    
    return () => {
      clearInterval(interval)
      fetchingRef.current = false
    }
  }, [fetchProducts])

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
                  <BreadcrumbPage>Products</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between">
          </div>
          {mounted && (
            <DataTable 
              data={data} 
              columns={columns}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              onDataChange={() => {
                if (!fetchingRef.current) {
                  fetchProducts()
                }
              }}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
