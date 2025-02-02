'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { toast } from "sonner"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

export default function AddStockChangePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    itemId: '',
    itemType: 'product',
    changeType: 'in',
    changeAmount: '',
    notes: ''
  })
  const changeTypes = [
    { value: 'in', label: 'Stock In' },
    { value: 'out', label: 'Stock Out' },
    { value: 'adjustment', label: 'Adjustment' }
  ]
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/' + formData.itemType + 's')
        if (!response.ok) {
          throw new Error('Failed to fetch items')
        }
        const data = await response.json()
        setItems(data)
      } catch (error) {
        console.error('Error fetching items:', error)
      }
    }

    fetchItems()
  }, [formData.itemType])

  useEffect(() => {
    // Update selected item when itemId changes
    const item = items.find((item: any) => item.id === formData.itemId)
    setSelectedItem(item)
  }, [formData.itemId, items])

  const calculateNewStock = () => {
    if (!selectedItem || !formData.changeAmount) return null

    const amount = parseInt(formData.changeAmount)
    const currentStock = selectedItem.stock

    switch (formData.changeType) {
      case 'in':
        return currentStock + amount
      case 'out':
        return currentStock - amount
      case 'adjustment':
        return amount
      default:
        return currentStock
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!selectedItem) {
      toast.error("Please select an item")
      setIsLoading(false)
      return
    }

    if (formData.changeAmount === '') {
      toast.error("Please enter a change amount")
      setIsLoading(false)
      return
    }

    const newStock = calculateNewStock()
    if (newStock === null) {
      toast.error("Invalid stock change amount")
      setIsLoading(false)
      return
    }

    if (newStock < 0) {
      toast.error("Cannot set stock below 0")
      setIsLoading(false)
      return
    }

    try {
      const payload = {
        materialId: formData.itemType === 'material' ? formData.itemId : undefined,
        productId: formData.itemType === 'product' ? formData.itemId : undefined,
        type: formData.changeType,
        quantity: parseInt(formData.changeAmount),
        description: formData.notes,
        reference: `${formData.changeType.toUpperCase()}-${Date.now()}`
      }
      console.log('Sending payload:', payload)

      const historyResponse = await fetch('/api/stock-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('Response status:', historyResponse.status)
      const responseText = await historyResponse.text()
      console.log('Response text:', responseText)

      let errorData
      try {
        errorData = responseText ? JSON.parse(responseText) : null
      } catch (e) {
        console.error('Failed to parse response:', e)
        errorData = { error: 'Invalid server response' }
      }

      if (!historyResponse.ok) {
        console.error('Server response:', errorData)
        toast.error(errorData?.error || `Server error: ${historyResponse.status}`)
        throw new Error(errorData?.error || `Server error: ${historyResponse.status}`)
      }

      const result = errorData
      console.log('Success response:', result)

      toast.success("Stock change saved successfully")
      router.push('/dashboard/manage')
    } catch (error) {
      console.error('Error saving stock change:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save stock change')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/manage">Stock History</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Add Stock Change</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="pr-4">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Add Stock Change</h1>
          </div>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Stock Change Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Item Type</Label>
                    <Select
                      value={formData.itemType}
                      onValueChange={(value) => handleChange('itemType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select
                      value={formData.itemId}
                      onValueChange={(value) => handleChange('itemId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Change Type</Label>
                    <Select
                      value={formData.changeType}
                      onValueChange={(value) => handleChange('changeType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select change type" />
                      </SelectTrigger>
                      <SelectContent>
                        {changeTypes.map((changeType) => (
                          <SelectItem key={changeType.value} value={changeType.value}>
                            {changeType.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="changeAmount">Amount</Label>
                    <Input
                      id="changeAmount"
                      name="changeAmount"
                      type="number"
                      placeholder="Change amount"
                      value={formData.changeAmount}
                      onChange={(e) => handleChange('changeAmount', e.target.value)}
                    />
                  </div>
                </div>
                {selectedItem && (
                  <div className="space-y-2">
                    <Label>Current Stock Information</Label>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Current Stock:</span>
                        <span className="font-medium">{selectedItem.stock}</span>
                      </div>
                      {formData.changeAmount && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm">Change Amount:</span>
                            <span className={formData.changeType === 'out' ? 'text-red-500' : 'text-green-500'}>
                              {formData.changeType === 'out' ? '-' : '+'}{formData.changeAmount}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm">New Stock:</span>
                            <span className="font-medium">{calculateNewStock()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Add notes about this stock change"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/manage')}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
