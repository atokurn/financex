'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { columns, Product } from "./columns"
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
import { DataTableWithQuery } from "@/components/data-table-with-query"

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

// Fungsi untuk mengubah data produk dari API ke format yang dibutuhkan oleh tabel
const transformProductData = (data: unknown): Product[] => {
  if (!Array.isArray(data)) return [];
  
  return data.map((item: Record<string, unknown>) => {
    // Persiapkan nilai default dan konversi yang aman
    const id = String(item.id || '');
    const image = String(item.image || '/placeholder.png');
    const name = String(item.name || '');
    const sku = String(item.sku || '');
    const stock = Number(item.stock || 0);
    const price = Number(item.price || 0);
    const category = String(item.category || 'Uncategorized');
    
    // Tangani nilai tanggal dengan aman
    let createdAt: Date;
    try {
      createdAt = new Date(item.createdAt as string | number | Date);
    } catch (_) {
      createdAt = new Date();
    }
    
    let updatedAt: Date;
    try {
      updatedAt = new Date(item.updatedAt as string | number | Date || createdAt);
    } catch (_) {
      updatedAt = createdAt;
    }
    
    return {
      id,
      image,
      name,
      sku,
      stock,
      price,
      category,
      createdAt,
      updatedAt
    };
  });
};

export default function ProductsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
          {mounted && (
            <DataTableWithQuery<Product>
              dataUrl="/api/products"
              columns={columns}
              queryKey="products"
              title="Products"
              transformData={transformProductData}
              enableSSE={true}
              sseUrl="/api/sse/products" 
              pollingInterval={10000}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
