'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  price: number
  stock: number
}

export default function AddSalePage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  // Fetch products when component mounts
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products')
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error('Failed to fetch products:', error)
      }
    }

    fetchProducts()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return

    setLoading(true)

    try {
      const form = formRef.current
      const data = {
        orderId: form.orderId.value,
        orderAt: new Date(form.orderAt.value),
        income: parseFloat(form.income.value),
        priceAfterDiscount: parseFloat(form.priceAfterDiscount.value),
        totalFees: parseFloat(form.totalFees.value),
        platformFees: parseFloat(form.platformFees.value),
        affiliateCommission: parseFloat(form.affiliateCommission.value),
        refund: parseFloat(form.refund.value),
        platform: form.platform.value,
      }

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create sale')
      }

      router.push('/dashboard/sales')
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create sale')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-b px-4">
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
                  <BreadcrumbLink href="/dashboard/sales">Sales</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Add Sale</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex-1 space-y-4 p-4">
          <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sale Information</CardTitle>
                <CardDescription>Enter the sale details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="orderId">Order ID</Label>
                    <Input
                      id="orderId"
                      name="orderId"
                      placeholder="Enter order ID"
                      required
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="orderAt">Order Date</Label>
                    <Input
                      id="orderAt"
                      name="orderAt"
                      type="datetime-local"
                      required
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="platform">Platform</Label>
                    <Select name="platform">
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                       <SelectItem value="tiktok">Tiktok</SelectItem>
                        <SelectItem value="tokopedia">Tokopedia</SelectItem>
                        <SelectItem value="shopee">Shopee</SelectItem>
                        <SelectItem value="lazada">Lazada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="income">Income</Label>
                    <Input
                      id="income"
                      name="income"
                      type="number"
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="priceAfterDiscount">Price After Discount</Label>
                    <Input
                      id="priceAfterDiscount"
                      name="priceAfterDiscount"
                      type="number"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="totalFees">Total Fees</Label>
                    <Input
                      id="totalFees"
                      name="totalFees"
                      type="number"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="platformFees">Platform Fees</Label>
                    <Input
                      id="platformFees"
                      name="platformFees"
                      type="number"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="affiliateCommission">Affiliate Commission</Label>
                    <Input
                      id="affiliateCommission"
                      name="affiliateCommission"
                      type="number"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="refund">Refund</Label>
                    <Input
                      id="refund"
                      name="refund"
                      type="number"
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Sale"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
