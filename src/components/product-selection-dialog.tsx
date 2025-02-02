'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

interface Product {
  id: string
  sku: string
  name: string
  category: string
  type: string
  stock: number
  buyPrice: number
  sellPrice: number
}

interface Material {
  id: string
  code: string
  name: string
  category: string
  type: string
  stock: number
  price: number
}

interface ProductSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (selectedItems: (Product | Material)[]) => void
  products: Product[]
  materials: Material[]
}

export function ProductSelectionDialog({
  open,
  onOpenChange,
  onSave,
  products,
  materials
}: ProductSelectionDialogProps) {
  const [search, setSearch] = useState("")
  const [productType, setProductType] = useState("all")
  const [category, setCategory] = useState("all")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [reference, setReference] = useState("")

  const items = [...products.map(p => ({
    ...p,
    itemType: 'product' as const,
    code: p.sku, // Map sku to code for consistent filtering
    buyPrice: p.price, // Use price as buyPrice if not provided
    sellPrice: p.price
  })), ...materials.map(m => ({
    ...m,
    itemType: 'material' as const,
    buyPrice: m.price,
    sellPrice: 0
  }))].filter(item => item !== null)

  console.log('Available items:', items)

  const filteredItems = items.filter(item => {
    const matchesSearch = search === "" || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code)?.toLowerCase().includes(search.toLowerCase())
    const matchesType = productType === "all" || 
      (productType === "product" && item.itemType === "product") ||
      (productType === "material" && item.itemType === "material")
    const matchesCategory = category === "all" || item.category === category

    return matchesSearch && matchesType && matchesCategory
  })

  const categories = Array.from(new Set(items.map(item => item.category)))

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (selectedItems.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleSave = () => {
    const selectedProducts = items.filter(item => selectedItems.has(item.id))
    onSave(selectedProducts)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle id="product-select-title">Select Products</DialogTitle>
          <DialogDescription>
            Choose products to add to your purchase order
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={productType} onValueChange={setProductType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="material">Materials</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <ScrollArea className="h-[400px]" aria-labelledby="product-select-title">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>CODE/SKU</TableHead>
                    <TableHead>NAME</TableHead>
                    <TableHead>CATEGORY</TableHead>
                    <TableHead>TYPE</TableHead>
                    <TableHead className="text-right">STOCK</TableHead>
                    <TableHead className="text-right">BUY PRICE</TableHead>
                    <TableHead className="text-right">SELL PRICE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                        </TableCell>
                        <TableCell>{item.code}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.itemType}</TableCell>
                        <TableCell className="text-right">{item.stock}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(item.buyPrice || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(item.sellPrice || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
