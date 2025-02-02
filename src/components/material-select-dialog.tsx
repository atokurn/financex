'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"

interface Material {
  id: string
  name: string
  stock: number
}

interface SelectedMaterial {
  materialId: string
  name: string
  quantity: number
  availableStock: number
}

interface MaterialSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: Material[]
  selectedMaterials: SelectedMaterial[]
  onSelect: (materials: SelectedMaterial[]) => void
}

export function MaterialSelectDialog({
  open,
  onOpenChange,
  materials,
  selectedMaterials,
  onSelect,
}: MaterialSelectDialogProps) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [quantities, setQuantities] = useState<{ [key: string]: string }>({})

  // Initialize selected materials and quantities
  useEffect(() => {
    if (open) {
      setSelected(selectedMaterials.map(m => m.materialId))
      const initialQuantities: { [key: string]: string } = {}
      selectedMaterials.forEach(m => {
        initialQuantities[m.materialId] = m.quantity.toString()
      })
      setQuantities(initialQuantities)
    }
  }, [open, selectedMaterials])

  // Filter materials based on search
  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (materialId: string) => {
    setSelected(prev => {
      const isSelected = prev.includes(materialId)
      if (isSelected) {
        return prev.filter(id => id !== materialId)
      } else {
        if (!quantities[materialId]) {
          setQuantities(prev => ({
            ...prev,
            [materialId]: "1.00"
          }))
        }
        return [...prev, materialId]
      }
    })
  }

  const handleQuantityChange = (materialId: string, value: string) => {
    // Allow empty input for typing
    if (value === "") {
      setQuantities(prev => ({
        ...prev,
        [materialId]: value
      }))
      return
    }

    // Validate decimal format (up to 2 decimal places)
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setQuantities(prev => ({
        ...prev,
        [materialId]: value
      }))
    }
  }

  const handleSave = () => {
    const selectedMaterialsList = selected.map(materialId => {
      const material = materials.find(m => m.id === materialId)
      if (!material) return null

      const quantity = parseFloat(quantities[materialId] || "1.00")
      if (isNaN(quantity) || quantity <= 0) return null

      return {
        materialId: material.id,
        name: material.name,
        quantity: parseFloat(quantity.toFixed(2)),
        availableStock: material.stock
      }
    }).filter((m): m is SelectedMaterial => m !== null)

    onSelect(selectedMaterialsList)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle id="material-select-title">Select Materials</DialogTitle>
          <DialogDescription>
            Choose materials to add to your product
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <ScrollArea className="h-[400px]" aria-labelledby="material-select-title">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Available Stock</TableHead>
                <TableHead className="w-32">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(material.id)}
                      onCheckedChange={() => handleSelect(material.id)}
                    />
                  </TableCell>
                  <TableCell>{material.name}</TableCell>
                  <TableCell>{material.stock}</TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={quantities[material.id] || "1.00"}
                      onChange={(e) => handleQuantityChange(material.id, e.target.value)}
                      disabled={!selected.includes(material.id)}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
