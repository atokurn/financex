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
import { formatDate } from "@/lib/utils"

interface SalesDetailsDialogProps {
  saleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SaleDetails {
  id: string
  orderId: string
  orderAt: Date
  income: number
  priceAfterDiscount: number
  totalFees: number
  platformFees: number
  affiliateCommission: number
  refund: number
  platform: string
  createdAt: Date
  updatedAt: Date
}

export function SalesDetailsDialog({
  saleId,
  open,
  onOpenChange,
}: SalesDetailsDialogProps) {
  const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDetails() {
      if (!saleId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/sales/${saleId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch sale details')
        }
        const data = await response.json()
        setSaleDetails(data)
      } catch (error) {
        console.error('Error fetching details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (open && saleId) {
      fetchDetails()
    }
  }, [saleId, open])

  if (!open || !saleId) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sales Details</DialogTitle>
          <DialogDescription>
            View detailed information about this sale
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : !saleDetails ? (
          <div>Sale not found</div>
        ) : (
          <ScrollArea className="max-h-[600px] pr-4" aria-labelledby="sales-details-title">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Basic Information</h3>
                <Separator className="my-2" />
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Order ID</dt>
                    <dd>{saleDetails.orderId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Platform</dt>
                    <dd>
                      <Badge variant="outline">{saleDetails.platform}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Order Date</dt>
                    <dd>{formatDate(saleDetails.orderAt)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium">Financial Details</h3>
                <Separator className="my-2" />
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Income</dt>
                    <dd>{formatCurrency(saleDetails.income)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Price After Discount</dt>
                    <dd>{formatCurrency(saleDetails.priceAfterDiscount)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Fees</dt>
                    <dd>{formatCurrency(saleDetails.totalFees)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Platform Fees</dt>
                    <dd>{formatCurrency(saleDetails.platformFees)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Affiliate Commission</dt>
                    <dd>{formatCurrency(saleDetails.affiliateCommission)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Refund</dt>
                    <dd>{formatCurrency(saleDetails.refund)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium">Timestamps</h3>
                <Separator className="my-2" />
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd>{formatDate(saleDetails.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                    <dd>{formatDate(saleDetails.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
