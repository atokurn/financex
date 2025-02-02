"use client"

import { useCallback, useEffect, useState, use } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { X } from "lucide-react"

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

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  price: z.string().min(1, "Price is required"),
  stock: z.string().min(1, "Stock is required"),
  minStock: z.string().min(1, "Minimum stock is required"),
  category: z.string().min(1, "Category is required"),
})

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [useMaterial, setUseMaterial] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("")
  const [materialQuantity, setMaterialQuantity] = useState<string>("1.00")
  const [originalImage, setOriginalImage] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: "",
      stock: "",
      minStock: "",
      category: "",
    },
  })

  // Cleanup function for image previews
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview !== originalImage) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview, originalImage])

  // Update stock field when materials change
  useEffect(() => {
    if (useMaterial) {
      const maxStock = calculateMaxStock()
      form.setValue('stock', maxStock.toString())
    }
  }, [useMaterial, selectedMaterials, form])

  // Calculate maximum possible stock based on material quantities
  const calculateMaxStock = () => {
    if (!selectedMaterials.length) return 0
    return Math.min(...selectedMaterials.map(m => Math.floor(m.availableStock / m.quantity)))
  }

  // Fetch materials when component mounts
  useEffect(() => {
    async function fetchMaterials() {
      try {
        const response = await fetch('/api/materials')
        if (!response.ok) {
          throw new Error('Failed to fetch materials')
        }
        const data = await response.json()
        setMaterials(data)
      } catch (error) {
        console.error('Failed to fetch materials:', error)
        toast.error('Failed to load materials data')
      }
    }

    fetchMaterials()
  }, [])

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${resolvedParams.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch product')
        }
        const product = await response.json()
        
        // Update form values
        form.reset({
          name: product.name,
          sku: product.sku,
          price: product.price.toString(),
          stock: product.stock.toString(),
          minStock: product.minStock.toString(),
          category: product.category,
        })

        // Set image preview
        if (product.image) {
          setImagePreview(product.image)
          setOriginalImage(product.image)
        }

        // Set materials
        setUseMaterial(product.useMaterial)
        if (product.useMaterial && product.materials) {
          const materialsWithDetails = await Promise.all(
            product.materials.map(async (m: any) => {
              const material = materials.find(mat => mat.id === m.materialId)
              if (!material) return null
              return {
                materialId: m.materialId,
                name: material.name,
                quantity: m.quantity,
                availableStock: material.stock
              }
            })
          )
          setSelectedMaterials(materialsWithDetails.filter(Boolean) as SelectedMaterial[])
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Fetch error:', error)
        toast.error('Failed to fetch product details')
        router.push('/dashboard/products')
      }
    }

    if (materials.length > 0) {
      fetchProduct()
    }
  }, [resolvedParams.id, form, router, materials])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      // Cleanup previous preview if it exists
      if (imagePreview && imagePreview !== originalImage) {
        URL.revokeObjectURL(imagePreview)
      }
      setImageFile(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
    }
  }, [imagePreview, originalImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  })

  const addMaterial = () => {
    const quantity = parseFloat(materialQuantity)
    if (!selectedMaterialId || isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    const material = materials.find(m => m.id === selectedMaterialId)
    if (!material) {
      toast.error('Selected material not found')
      return
    }

    // Check if material already exists
    if (selectedMaterials.some(m => m.materialId === selectedMaterialId)) {
      toast.error('This material is already added')
      return
    }

    setSelectedMaterials(prev => [
      ...prev,
      {
        materialId: material.id,
        name: material.name,
        quantity: parseFloat(quantity.toFixed(2)),
        availableStock: material.stock
      }
    ])

    setSelectedMaterialId("")
    setMaterialQuantity("1.00")
  }

  const removeMaterial = (materialId: string) => {
    setSelectedMaterials(prev => prev.filter(m => m.materialId !== materialId))
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true)
      let imagePath = imagePreview

      // Only upload new image if it has changed
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append('file', imageFile)
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        })
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          let error
          try {
            error = JSON.parse(errorText)
            throw new Error(error.error || 'Failed to upload image')
          } catch (e) {
            throw new Error(errorText || 'Failed to upload image')
          }
        }
        
        const { path } = await uploadResponse.json()
        imagePath = path
      }

      // Validate material quantities
      if (useMaterial && selectedMaterials.length === 0) {
        throw new Error('Please add at least one material when using material mode')
      }

      // Calculate final stock value
      const finalStock = useMaterial ? calculateMaxStock() : parseInt(values.stock)

      const requestBody = {
        ...values,
        image: imagePath,
        price: parseFloat(values.price),
        stock: finalStock,
        minStock: parseInt(values.minStock),
        useMaterial,
        materials: useMaterial ? selectedMaterials.map(m => ({
          materialId: m.materialId,
          quantity: m.quantity
        })) : [],
      }

      const response = await fetch(`/api/products/${resolvedParams.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let error
        try {
          error = JSON.parse(errorText)
          throw new Error(error.error || 'Failed to update product')
        } catch (e) {
          throw new Error(errorText || 'Failed to update product')
        }
      }

      const updatedProduct = await response.json()
      
      toast.success("Product updated successfully")
      router.push("/dashboard/products")
      router.refresh()
    } catch (error) {
      console.error('Update error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to update product")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
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
                    <BreadcrumbPage>Edit Product</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <main className="flex-1 space-y-4 p-4 md:p-8">
            <Card>
              <CardHeader>
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
            </Card>
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
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
                  <BreadcrumbPage>Edit Product</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Edit Product</CardTitle>
              <CardDescription>
                Update product information in your inventory.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <CardContent className="space-y-4">
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
                    <div className="space-y-4">
                      <div className="grid grid-cols-[1fr,120px,auto] gap-2 items-end">
                        <div className="space-y-2">
                          <Label>Select Material</Label>
                          <Select
                            value={selectedMaterialId}
                            onValueChange={setSelectedMaterialId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a material" />
                            </SelectTrigger>
                            <SelectContent>
                              {materials
                                .filter(m => !selectedMaterials.some(sm => sm.materialId === m.id))
                                .map((material) => (
                                  <SelectItem key={material.id} value={material.id}>
                                    {material.name} (Stock: {material.stock})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={materialQuantity}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                                setMaterialQuantity(value)
                              }
                            }}
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                          />
                        </div>
                        <Button 
                          type="button"
                          onClick={addMaterial}
                          disabled={!selectedMaterialId}
                        >
                          Add Material
                        </Button>
                      </div>
                      
                      {selectedMaterials.length > 0 && (
                        <div className="border rounded-md p-4 space-y-2">
                          <Label>Selected Materials:</Label>
                          {selectedMaterials.map((material) => (
                            <div key={material.materialId} className="flex items-center justify-between bg-secondary/50 p-2 rounded">
                              <span>{material.name} (Qty: {material.quantity})</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMaterial(material.materialId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="text-sm text-muted-foreground">
                            Maximum possible stock: {calculateMaxStock()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Product name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="Product SKU" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="0"
                              min="0"
                              step="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="0"
                              min="0"
                              {...field}
                              disabled={useMaterial}
                              className={useMaterial ? "bg-muted" : ""}
                            />
                          </FormControl>
                          {useMaterial && (
                            <FormDescription>
                              Stock is automatically calculated based on available materials
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="minStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Stock</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="0"
                              min="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="Product category" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    disabled={useMaterial && selectedMaterials.length === 0 || isSubmitting}
                  >
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
