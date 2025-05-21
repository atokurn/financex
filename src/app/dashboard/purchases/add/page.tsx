'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ProductSelectionDialog } from "@/components/product-selection-dialog"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Plus, Save, Download, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { TimeField } from "@/components/ui/time-field"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generateInvoice } from "@/lib/generate-invoice"

interface Material {
  id: string
  code: string
  name: string
  unit: string
  price: number
  buyPrice?: number
  type: 'material'
}

interface Product {
  id: string
  name: string
  sku: string
  price: number
  buyPrice?: number
  type: 'product'
}

interface AdditionalCost {
  id: string
  description: string
  amount: number
}

const formatNumber = (value: string | number) => {
  if (!value && value !== 0) return ''
  return Number(value).toLocaleString('id-ID')
}

const formatCurrency = (value: string | number) => {
  if (!value && value !== 0) return 'Rp 0'
  return `Rp ${Number(value).toLocaleString('id-ID')}`
}

const unformatNumber = (value: string) => {
  if (!value) return ''
  return value.replace(/[,.]/g, '')
}

export default function NewPurchasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedItems, setSelectedItems] = useState<(Product | Material)[]>([])
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({})
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, number>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showAdditionalCost, setShowAdditionalCost] = useState(false)
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([])
  const [newCostDescription, setNewCostDescription] = useState("")
  const [newCostAmount, setNewCostAmount] = useState("")
  const [discountType, setDiscountType] = useState("nominal")
  const [discountValue, setDiscountValue] = useState("")
  const [supplier, setSupplier] = useState('')
  const [supplierInput, setSupplierInput] = useState("")
  const [reference, setReference] = useState('')
  const [orderType, setOrderType] = useState('offline')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState(format(new Date(), "HH:mm:ss"))
  const [autoUpdatePrice, setAutoUpdatePrice] = useState(true)
  const [showTooltip, setShowTooltip] = useState(true)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [purchaseData, setPurchaseData] = useState<any>(null)
  const [tempPurchaseId, setTempPurchaseId] = useState<string | null>(null)
  
  useEffect(() => {
    if (!invoiceNumber) {
      const date = new Date()
      const year = date.getFullYear().toString().slice(-2)
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      setInvoiceNumber(`INV/PO/${year}${month}${day}/${random}`)
    }
  }, [invoiceNumber])

  useEffect(() => {
    const newQuantities: Record<string, number> = {}
    const newDiscounts: Record<string, number> = {}
    const newPrices: Record<string, number> = {}

    selectedItems.forEach(item => {
      if (!(item.id in itemQuantities)) {
        newQuantities[item.id] = 1
      }
      if (!(item.id in itemDiscounts)) {
        newDiscounts[item.id] = 0
      }
      if (!(item.id in itemPrices)) {
        newPrices[item.id] = 'price' in item ? item.price : (item.buyPrice || 0)
      }
    })

    setItemQuantities(prev => ({ ...prev, ...newQuantities }))
    setItemDiscounts(prev => ({ ...prev, ...newDiscounts }))
    setItemPrices(prev => ({ ...prev, ...newPrices }))
  }, [selectedItems])

  const calculateItemTotal = (itemId: string) => {
    const quantity = itemQuantities[itemId]
    const price = itemPrices[itemId]
    const discount = itemDiscounts[itemId] || 0

    if (quantity === '' || price === '') return 0
    return Number(quantity) * Number(price) * (1 - Number(discount) / 100)
  }

  // Calculate totals
  const totals = useMemo(() => {
    const itemsTotal = selectedItems.reduce((sum, item) => {
      return sum + calculateItemTotal(item.id)
    }, 0)

    const additionalCostsTotal = additionalCosts.reduce((sum, cost) => sum + cost.amount, 0)
    
    let discount = 0
    if (discountValue) {
      if (discountType === 'percentage') {
        discount = (itemsTotal * Number(discountValue)) / 100
      } else {
        discount = Number(discountValue)
      }
    }

    const subtotal = itemsTotal - discount
    const total = subtotal + additionalCostsTotal

    return {
      items: itemsTotal,
      discount,
      subtotal,
      additionalCosts: additionalCostsTotal,
      total
    }
  }, [selectedItems, itemQuantities, itemPrices, itemDiscounts, additionalCosts, discountType, discountValue])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [materialsRes, productsRes] = await Promise.all([
          fetch('/api/materials'),
          fetch('/api/products')
        ])

        if (!materialsRes.ok) throw new Error('Failed to fetch materials')
        if (!productsRes.ok) throw new Error('Failed to fetch products')

        const materialsData = await materialsRes.json()
        const productsData = await productsRes.json()

        // Add type field to each material and product
        const materialsWithType = materialsData.map((m: any) => ({ ...m, type: 'material' as const }))
        const productsWithType = productsData.map((p: any) => ({ ...p, type: 'product' as const }))

        setMaterials(materialsWithType)
        setProducts(productsWithType)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to fetch items')
      }
    }

    fetchData()
    const fetchSuppliers = async () => {
      try {
        setIsLoadingSuppliers(true)
        const response = await fetch('/api/purchases/suppliers')
        if (!response.ok) throw new Error('Failed to fetch suppliers')
        const data = await response.json()
        setSuppliers(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching suppliers:', error)
        toast.error('Failed to fetch suppliers')
        setSuppliers([])
      } finally {
        setIsLoadingSuppliers(false)
      }
    }
    fetchSuppliers()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    if (!supplier) {
      toast.error('Please enter supplier name')
      return
    }

    // Validate quantities and prices
    const invalidItems = selectedItems.filter(item => {
      const quantity = itemQuantities[item.id]
      const price = itemPrices[item.id]
      return quantity === '' || price === '' || Number(quantity) <= 0 || Number(price) < 0
    })

    if (invalidItems.length > 0) {
      toast.error('Please enter valid quantity and price for all items')
      return
    }

    // Prepare purchase data but don't send it yet
    const preparedPurchaseData = {
      invoiceNumber,
      supplier,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
      items: selectedItems.map(item => {
        const itemId = item.id
        const itemQuantity = itemQuantities[itemId] || 1
        const storedPrice = itemPrices[itemId]
        
        let itemPrice = storedPrice
        if (!storedPrice) {
          itemPrice = item.type === 'material' ? item.price : (item.buyPrice || 0)
        }

        return {
          materialId: item.type === 'material' ? itemId : null,
          productId: item.type === 'product' ? itemId : null,
          type: item.type,
          quantity: itemQuantity,
          price: itemPrice,
          unit: 'unit' in item ? item.unit : 'pcs',
          itemDiscount: itemDiscounts[itemId] || 0,
          itemDiscountType: 'percentage',
          totalPrice: calculateItemTotal(itemId)
        }
      }),
      additionalCosts: additionalCosts.map(cost => ({
        description: cost.description,
        amount: Number(cost.amount)
      })),
      autoUpdatePrice,
      status: 'pending',
      orderType,
      reference,
      notes: reference,
      discount: discountValue ? Number(discountValue) : 0,
      discountType: discountType || 'nominal',
      subtotal: totals.items,
      total: totals.total
    }

    // Store the data temporarily and show the save dialog
    setPurchaseData(preparedPurchaseData)
    setSaveDialogOpen(true)
  }

  // Function to save purchase with or without downloading invoice
  const savePurchase = async (downloadInvoiceAfterSave = false) => {
    if (!purchaseData) return
    
    setLoading(true)
    try {
      console.log('Sending purchase data:', JSON.stringify(purchaseData, null, 2))

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseData),
      })

      let data
      try {
        const responseText = await response.text()
        console.log('Raw response:', responseText)
        data = JSON.parse(responseText)
        console.log('Parsed response:', data)
      } catch (error) {
        console.error('Failed to parse response:', error)
        toast.error('Server returned invalid response')
        throw new Error('Server returned invalid JSON response')
      }

      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Failed to create purchase')
      }

      // Download invoice if requested and purchaseId is available
      if (downloadInvoiceAfterSave && data.purchaseId) {
        try {
          await downloadInvoice(data.purchaseId)
          toast.success('Purchase created and invoice downloaded')
        } catch (error) {
          console.error('Failed to download invoice:', error)
          toast.error('Purchase created but invoice download failed')
        }
      } else {
        toast.success('Purchase created successfully')
      }

      router.push('/dashboard/purchases')
    } catch (error) {
      console.error('Error creating purchase:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create purchase')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    if (!selectedItems || selectedItems.length === 0) {
      toast.error('Please select an item')
      return
    }

    const item = selectedItems[selectedItems.length - 1]
    const itemId = item.id
    const quantity = itemQuantities[itemId]
    const price = itemPrices[itemId]

    if (!quantity || quantity <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    if (!price || price <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    toast.success('Item added successfully')
  }

  const handleRemoveItem = (itemToRemove: Product | Material) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemToRemove.id))
    toast.success('Item removed successfully')
  }

  const handleAddCost = () => {
    if (!newCostDescription) {
      toast.error('Please enter cost description')
      return
    }

    if (!newCostAmount || Number(newCostAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const newCost = {
      id: Date.now().toString(),
      description: newCostDescription,
      amount: Number(newCostAmount)
    }

    setAdditionalCosts(prev => [...prev, newCost])
    setNewCostDescription('')
    setNewCostAmount('')
    toast.success('Additional cost added successfully')
  }

  const handleRemoveCost = (costId: string) => {
    setAdditionalCosts(prev => prev.filter(cost => cost.id !== costId))
    toast.success('Additional cost removed successfully')
  }

  // Function to download invoice
  const downloadInvoice = async (purchaseId: string) => {
    try {
      // Fetch invoice data
      const response = await fetch(`/api/purchases/download?id=${purchaseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice data');
      }
      
      const invoiceData = await response.json();
      
      // Generate PDF invoice
      const pdfBlob = await generateInvoice(invoiceData);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceData.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

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
                  <BreadcrumbLink href="/dashboard/purchases">Purchases</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Purchase</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-2">
          <Card className="bg-background">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Purchase Details</CardTitle>
              <Button 
                variant="outline" 
                className="bg-primary/20 text-primary hover:bg-primary/30"
                onClick={() => setDialogOpen(true)}
              >
                Manage Items
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Item Details</h3>
                    <div className="flex items-center gap-4">
                      <TooltipProvider>
                        <Tooltip open={showTooltip}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={autoUpdatePrice}
                                onCheckedChange={setAutoUpdatePrice}
                                id="auto-update-price"
                              />
                              <label
                                htmlFor="auto-update-price"
                                className="text-sm text-muted-foreground"
                              >
                                Auto-update prices
                              </label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>When enabled, material and product prices will be automatically updated based on the purchase price</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium leading-none">Select Date & Time</h4>
                              <div className="text-sm text-muted-foreground">
                                {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: id })}
                                <br />
                                {selectedTime}
                              </div>
                            </div>
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => date && setSelectedDate(date)}
                              locale={id}
                              className="rounded-md border"
                            />
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Time</label>
                              <input
                                type="time"
                                step="1"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {format(selectedDate, "dd/MM/yyyy", { locale: id })} {selectedTime}
                        </span>
                        |
                        Invoice: <span className="font-medium text-foreground">{invoiceNumber}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,1.5fr,0.2fr] gap-4 items-center bg-muted/50 p-3 rounded-lg">
                    <div className="font-medium text-sm text-muted-foreground">ITEM</div>
                    <div className="font-medium text-sm text-muted-foreground">QUANTITY</div>
                    <div className="font-medium text-sm text-muted-foreground">UNIT</div>
                    <div className="font-medium text-sm text-muted-foreground">UNIT PRICE</div>
                    <div className="font-medium text-sm text-muted-foreground">DISCOUNT</div>
                    <div className="font-medium text-sm text-muted-foreground">TOTAL</div>
                    <div></div>
                  </div>

                  <ScrollArea className="h-[300px] rounded-md border border-border">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,1.5fr,0.2fr] gap-4 items-center p-2 hover:bg-muted/50">
                        <div>{item.name}</div>
                        <Input
                          type="text"
                          value={formatNumber(itemQuantities[item.id] || '')}
                          onChange={(e) => {
                            const rawValue = unformatNumber(e.target.value)
                            if (rawValue === '' || /^\d*$/.test(rawValue)) {
                              setItemQuantities(prev => ({
                                ...prev,
                                [item.id]: rawValue === '' ? '' : Number(rawValue)
                              }))
                            }
                          }}
                          className="w-24"
                        />
                        <div className="text-sm text-muted-foreground px-3">
                          {'unit' in item ? item.unit : 'pcs'}
                        </div>
                        <Input
                          type="text"
                          value={formatNumber(itemPrices[item.id] || '')}
                          onChange={(e) => {
                            const rawValue = unformatNumber(e.target.value)
                            if (rawValue === '' || /^\d*$/.test(rawValue)) {
                              setItemPrices(prev => ({
                                ...prev,
                                [item.id]: rawValue === '' ? '' : Number(rawValue)
                              }))
                            }
                          }}
                          className="w-32"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={itemDiscounts[item.id] || 0}
                            onChange={(e) => setItemDiscounts(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                            className="w-16 text-right"
                          />
                          <span>%</span>
                        </div>
                        <div className="text-right">
                          {formatCurrency(calculateItemTotal(item.id))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setSelectedItems(selectedItems.filter(i => i.id !== item.id))
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Order Type</label>
                    <Select value={orderType} onValueChange={setOrderType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select order type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {orderType === "online" && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Reference Number</label>
                      <Input
                        placeholder="Enter reference number"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Supplier</label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                          {supplier
                            ? supplier
                            : "Select supplier..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search supplier..." 
                            value={supplierInput}
                            onValueChange={setSupplierInput}
                          />
                          <CommandList>
                            <CommandEmpty>No supplier found.</CommandEmpty>
                            <CommandGroup>
                              {isLoadingSuppliers ? (
                                <div className="p-2 text-sm text-muted-foreground">Loading suppliers...</div>
                              ) : suppliers.map((sup) => (
                                <CommandItem
                                  key={sup}
                                  value={sup}
                                  onSelect={(currentValue) => {
                                    setSupplier(currentValue === supplier ? "" : currentValue)
                                    setOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      supplier === sup ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {sup}
                                </CommandItem>
                              ))}
                              {supplierInput && (
                                <CommandItem
                                  value={supplierInput}
                                  onSelect={(currentValue) => {
                                    setSupplier(currentValue)
                                    setOpen(false)
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add "{supplierInput}"
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      placeholder="Enter notes"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Discount</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Discount Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nominal">Amount (Rp)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder={discountType === 'nominal' ? 'Rp 0' : '0%'} 
                        className="text-right"
                        value={discountValue}
                        onChange={(e) => {
                          const value = e.target.value
                          if (discountType === 'percentage' && Number(value) > 100) {
                            setDiscountValue('100')
                          } else {
                            setDiscountValue(value)
                          }
                        }}
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? 100 : undefined}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Tax</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Select defaultValue="none">
                        <SelectTrigger>
                          <SelectValue placeholder="Tax Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Tax</SelectItem>
                          <SelectItem value="ppn">VAT</SelectItem>
                          <SelectItem value="custom">Custom Tax</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Rp 0" className="text-right" readOnly />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Additional Costs</h3>
                    <Switch
                      checked={showAdditionalCost}
                      onCheckedChange={setShowAdditionalCost}
                    />
                  </div>
                  {additionalCosts.map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span>{cost.description}</span>
                      <div className="flex items-center gap-2">
                        <span>Rp {cost.amount.toLocaleString()}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                          onClick={() => setAdditionalCosts(costs => costs.filter(c => c.id !== cost.id))}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {showAdditionalCost && (
                    <div className="grid grid-cols-[2fr,1fr,auto] gap-4 items-end">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Description</label>
                        <Input
                          placeholder="Enter cost description"
                          value={newCostDescription}
                          onChange={(e) => setNewCostDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Amount</label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Rp 0"
                          className="text-right"
                          value={newCostAmount}
                          onChange={(e) => setNewCostAmount(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-primary/50 hover:border-primary hover:bg-primary/20 text-primary"
                        disabled={!newCostDescription || !newCostAmount}
                        onClick={() => {
                          setAdditionalCosts(costs => [...costs, {
                            id: Math.random().toString(36).substring(7),
                            description: newCostDescription,
                            amount: Number(newCostAmount)
                          }])
                          setNewCostDescription("")
                          setNewCostAmount("")
                          toast.success('Additional cost added successfully')
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(totals.items)}</span>
                    </div>
                    {discountValue && (
                      <div className="flex justify-between text-sm">
                        <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Nominal'}):</span>
                        <span>-{formatCurrency(totals.discount)}</span>
                      </div>
                    )}
                    {additionalCosts.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Additional Costs:</span>
                        <span>{formatCurrency(totals.additionalCosts)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                
                <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Simpan Pembelian</AlertDialogTitle>
                      <AlertDialogDescription>
                        Data pembelian telah disiapkan. Silakan pilih cara yang Anda inginkan untuk melanjutkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => savePurchase(false)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Simpan Saja
                      </AlertDialogAction>
                      <AlertDialogAction 
                        onClick={() => savePurchase(true)}
                        className="bg-green-600 text-white hover:bg-green-700 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Simpan & Unduh Invoice
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </form>
            </CardContent>
          </Card>

          <ProductSelectionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSave={(items) => {
              console.log('Selected items:', items)
              setSelectedItems(items)
              setDialogOpen(false)
            }}
            products={products}
            materials={materials}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
