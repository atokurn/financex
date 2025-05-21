'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Switch } from "@/components/ui/switch"
import { X } from "lucide-react"
import { MaterialSelectDialog } from "@/components/material-select-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface Material {
  id: string
  name: string
  stock: number
  price: number
}

interface SelectedMaterial {
  materialId: string
  name: string
  quantity: number
  availableStock: number
}

export default function AddProductPage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [useMaterial, setUseMaterial] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([])
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [materialInputs, setMaterialInputs] = useState<{ [key: string]: string }>({})
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Calculate maximum possible stock based on material quantities
  const calculateMaxStock = () => {
    if (!selectedMaterials.length) return 0
    return Math.min(...selectedMaterials.map(m => Math.floor(m.availableStock / m.quantity)))
  }

  // Calculate price based on materials
  const calculatePrice = () => {
    if (!selectedMaterials.length) return 0
    return selectedMaterials.reduce((total, material) => {
      const materialPrice = materials.find(m => m.id === material.materialId)?.price || 0
      return total + (materialPrice * material.quantity)
    }, 0)
  }

  // Fetch materials when component mounts
  useEffect(() => {
    async function fetchMaterials() {
      try {
        const response = await fetch('/api/materials')
        const data = await response.json()
        setMaterials(data)
      } catch (error) {
        console.error('Failed to fetch materials:', error)
      }
    }

    fetchMaterials()
  }, [])

  // Update stock and price fields when materials change
  useEffect(() => {
    if (useMaterial && formRef.current) {
      const maxStock = calculateMaxStock()
      const price = calculatePrice()
      formRef.current.stock.value = maxStock.toString()
      formRef.current.price.value = price.toFixed(2)
    }
  }, [selectedMaterials, useMaterial, materials])

  // Initialize material inputs when materials change
  useEffect(() => {
    const inputs: { [key: string]: string } = {}
    selectedMaterials.forEach(m => {
      inputs[m.materialId] = m.quantity.toFixed(2)
    })
    setMaterialInputs(inputs)
  }, [selectedMaterials])

  const addMaterial = () => {
    setMaterialDialogOpen(true)
  }

  const handleMaterialSelect = (selectedMats: SelectedMaterial[]) => {
    setSelectedMaterials(selectedMats)
  }

  const removeMaterial = (materialId: string) => {
    setSelectedMaterials(prev => prev.filter(m => m.materialId !== materialId))
  }

  const updateMaterialQuantity = (materialId: string, value: string) => {
    // Update the input value
    setMaterialInputs(prev => ({
      ...prev,
      [materialId]: value
    }))

    // Allow empty input for typing
    if (value === "") return

    // Validate decimal format
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      const quantity = parseFloat(value)
      if (!isNaN(quantity) && quantity > 0) {
        setSelectedMaterials(prev => prev.map(material => {
          if (material.materialId === materialId) {
            return {
              ...material,
              quantity: quantity
            }
          }
          return material
        }))
      }
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setImageFile(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return

    setLoading(true)
    setError(null)

    try {
      let imagePath = '/images/products/placeholder.jpg'
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append('file', imageFile)
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        })
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => null);
          throw new Error(errorData?.error || 'Failed to upload image');
        }
        
        const { path } = await uploadResponse.json()
        imagePath = path
      }

      const form = formRef.current
      const data = {
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
        sku: (form.elements.namedItem('sku') as HTMLInputElement).value,
        price: parseFloat((form.elements.namedItem('price') as HTMLInputElement).value),
        stock: parseInt((form.elements.namedItem('stock') as HTMLInputElement).value),
        minStock: parseInt((form.elements.namedItem('minStock') as HTMLInputElement).value),
        category: (form.elements.namedItem('category') as HTMLInputElement).value,
        image: imagePath,
        useMaterial,
        materials: useMaterial ? selectedMaterials.map(m => ({
          materialId: m.materialId,
          quantity: m.quantity
        })) : [],
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const responseData = await response.json();

      if (!response.ok) {
        // Extract detailed error information
        const errorMessage = responseData.error || 'Failed to create product';
        const errorDetails = responseData.details ? `: ${responseData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      toast({
        title: "Success!",
        description: "Product created successfully",
        duration: 3000,
      });

      router.push('/dashboard/products')
      router.refresh()
    } catch (error) {
      console.error('Error creating product:', error)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create product';
      
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error creating product",
        description: errorMessage,
        duration: 5000,
      });
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
                  <BreadcrumbLink href="/dashboard/products">Products</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Add Product</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Product</CardTitle>
            </CardHeader>
            <form ref={formRef} onSubmit={onSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <input {...getInputProps()} />
                  {imagePreview ? (
                    <div className="relative w-40 h-40 mx-auto">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="py-8">
                      {isDragActive ? (
                        <p>Drop the image here ...</p>
                      ) : (
                        <p>Drag & drop product image here, or click to select</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-material"
                    checked={useMaterial}
                    onCheckedChange={setUseMaterial}
                  />
                  <Label htmlFor="use-material">Use Materials for Stock</Label>
                </div>
                {useMaterial && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardDescription>Add materials used to make this product</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button type="button" onClick={addMaterial}>
                        Add Material
                      </Button>
                      {selectedMaterials.length > 0 && (
                        <ScrollArea className="h-[200px] rounded-md border p-4">
                          <div className="space-y-2 pr-4">
                            {selectedMaterials.map((material) => (
                              <div key={material.materialId} className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium leading-none">{material.name}</p>
                                  <div className="flex items-center gap-2 mt-1 py-1">
                                    <Input
                                      type="text"
                                      value={materialInputs[material.materialId] || material.quantity.toFixed(2)}
                                      onChange={(e) => updateMaterialQuantity(material.materialId, e.target.value)}
                                      className="w-24 h-8"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      Available: {material.availableStock}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMaterial(material.materialId)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" placeholder="Product name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" name="sku" placeholder="Product SKU" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input 
                      id="price" 
                      name="price" 
                      type="number" 
                      placeholder="0" 
                      min="0"
                      step="0.01"
                      required 
                      defaultValue="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input 
                      id="stock" 
                      name="stock" 
                      type="number" 
                      placeholder="0" 
                      min="0"
                      required 
                      readOnly={useMaterial}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Minimum Stock</Label>
                    <Input 
                      id="minStock" 
                      name="minStock" 
                      type="number" 
                      placeholder="0" 
                      min="0"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" placeholder="Product category" required />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.push('/dashboard/products')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || (useMaterial && selectedMaterials.length === 0)}
                >
                  {loading ? 'Creating...' : 'Create Product'}
                </Button>
              </CardFooter>
            </form>
          </Card>
          <MaterialSelectDialog
            open={materialDialogOpen}
            onOpenChange={setMaterialDialogOpen}
            materials={materials}
            selectedMaterials={selectedMaterials}
            onSelect={handleMaterialSelect}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
