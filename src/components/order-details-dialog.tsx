"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface OrderDetailsDialogProps {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface OrderDetails {
  id: string
  orderId: string
  customer: string
  productName: string
  quantity: number
  totalOrder: number
  status: string
  platform: string
  orderType: string
  reference: string
  orderAt: string
  regency: string
  province: string
  notes: string | null
}

interface SalesDetails {
  id: string
  orderId: string
  amount: number
  paymentMethod: string
  status: string
  createdAt: string
  updatedAt: string
}

export function OrderDetailsDialog({
  orderId,
  open,
  onOpenChange,
}: OrderDetailsDialogProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [salesDetails, setSalesDetails] = useState<SalesDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDetails() {
      if (!orderId) return

      setIsLoading(true)
      try {
        // Fetch order details
        const orderResponse = await fetch(`/api/orders/${orderId}`)
        if (!orderResponse.ok) {
          throw new Error('Failed to fetch order details')
        }
        const orderData = await orderResponse.json()
        setOrderDetails(orderData)

        // Fetch sales details
        const salesResponse = await fetch(`/api/sales/by-order/${orderId}`)
        if (salesResponse.ok) {
          const salesData = await salesResponse.json()
          setSalesDetails(salesData)
        } else {
          setSalesDetails(null)
        }
      } catch (error) {
        console.error('Error fetching details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (open && orderId) {
      fetchDetails()
    }
  }, [orderId, open])

  if (!open || !orderId) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case 'completed':
        return 'bg-green-500 hover:bg-green-600'
      case 'processing':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            Complete information about the order
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : orderDetails ? (
          <ScrollArea className="max-h-[600px]" aria-labelledby="order-details-title">
            <div className="space-y-6">
              {/* Order Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Order Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-medium">{orderDetails.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(orderDetails.status)}>
                      {orderDetails.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{orderDetails.customer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">
                      {format(new Date(orderDetails.orderAt), "dd MMMM yyyy HH:mm", { locale: id })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Platform</p>
                    <p className="font-medium">{orderDetails.platform}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Type</p>
                    <p className="font-medium">{orderDetails.orderType}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Shipping Address</p>
                    <p className="font-medium">{orderDetails.regency}, {orderDetails.province}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Product Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Product Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product Name</p>
                    <p className="font-medium">{orderDetails.productName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Quantity</p>
                      <p className="font-medium">{orderDetails.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Order</p>
                      <p className="font-medium">{formatCurrency(orderDetails.totalOrder)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Information (if available) */}
              {salesDetails && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Sales Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-medium">{formatCurrency(salesDetails.amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{salesDetails.paymentMethod}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Status</p>
                        <Badge className={getStatusColor(salesDetails.status)}>
                          {salesDetails.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Date</p>
                        <p className="font-medium">
                          {format(new Date(salesDetails.createdAt), "dd MMMM yyyy HH:mm", { locale: id })}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notes (if available) */}
              {orderDetails.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Notes</h3>
                    <p className="text-sm">{orderDetails.notes}</p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            No order details found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
