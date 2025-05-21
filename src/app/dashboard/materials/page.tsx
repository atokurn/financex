'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
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
import { PaginationState } from '@tanstack/react-table'

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

export default function MaterialsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [materials, setMaterials] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Read pagination state from URL
  const pagination = useMemo<PaginationState>(() => ({
    pageIndex: Number(searchParams.get('page') ?? '0'),
    pageSize: Number(searchParams.get('pageSize') ?? '10'),
  }), [searchParams])

  // Function to update URL search params for pagination
  const setPagination = useCallback((updater: React.SetStateAction<PaginationState>) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPagination.pageIndex));
    params.set('pageSize', String(newPagination.pageSize));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname, pagination]);

  // Wrap setPagination with useCallback to ensure stable reference
  // const stableSetPagination = useCallback(setPagination, [setPagination]); // No longer needed as setPagination is already stable with useCallback

  const fetchMaterials = useCallback(async () => {
    // Note: setIsLoading(true) removed from here to avoid flicker during polling
    try {
      // setError(null) // Reset error later on success
      const response = await fetch('/api/materials')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const text = await response.text()
      if (!text) {
        throw new Error('Empty response received')
      }
      
      try {
        const data = JSON.parse(text)
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format: expected an array')
        }
        setMaterials(data)
        setError(null) // Reset error on successful fetch and parse
      } catch (parseError) {
        console.error('JSON parsing error:', parseError, 'Response text:', text)
        throw new Error('Failed to parse response as JSON')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred'
      console.error('Failed to fetch materials:', error)
      setError(message)
      setMaterials([]) // Reset to empty array on error
    } finally {
      // Only set isLoading to false after the initial load potentially?
      // For now, keep it simple and always set it false after fetch attempt.
      setIsLoading(false)
    }
  }, []) // Empty dependency array for useCallback as fetchMaterials doesn't depend on component state/props

  useEffect(() => {
    setIsLoading(true); // Set loading true only for the initial fetch
    fetchMaterials() // Initial fetch

    // Set up polling for updates every 5 seconds
    const interval = setInterval(() => {
      // Don't set isLoading(true) during polling fetches
      fetchMaterials()
    }, 5000)

    return () => clearInterval(interval) // Cleanup interval on unmount
  }, [fetchMaterials]) // Depend on the stable fetchMaterials function

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
                  <BreadcrumbPage>Materials</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8">
          <div className="flex items-center justify-between">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
          </div>
          <DataTable 
            data={materials} 
            columns={columns}
            isLoading={isLoading}
            pagination={pagination}
            setPagination={setPagination} // Use the URL-based setter
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
