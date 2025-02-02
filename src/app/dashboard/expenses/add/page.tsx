'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Calendar as CalendarIcon, Plus, X, Upload, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "@radix-ui/react-icons"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

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

interface ExpenseItem {
  id: string
  description: string
  price: number | string
  totalPrice: number
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

export default function NewExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [payee, setPayee] = useState('')
  const [category, setCategory] = useState('operational')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState<Date>()
  const [dueTime, setDueTime] = useState('')
  const [paymentType, setPaymentType] = useState('cash')
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [newDescription, setNewDescription] = useState('')
  const [newDescriptionInput, setNewDescriptionInput] = useState('')
  const [newPrice, setNewPrice] = useState<string>('')
  const [attachments, setAttachments] = useState<FileList | null>(null)
  const [descriptions, setDescriptions] = useState<string[]>([])
  const [isLoadingDescriptions, setIsLoadingDescriptions] = useState(false)
  const [openCombobox, setOpenCombobox] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchDescriptions()
  }, [])

  const fetchDescriptions = async () => {
    try {
      setIsLoadingDescriptions(true)
      const response = await fetch('/api/expenses/descriptions')
      if (!response.ok) throw new Error('Failed to fetch descriptions')
      const data = await response.json()
      if (data?.descriptions && Array.isArray(data.descriptions)) {
        setDescriptions(data.descriptions)
      } else {
        setDescriptions([])
      }
    } catch (error) {
      console.error('Error fetching descriptions:', error)
      setDescriptions([])
    } finally {
      setIsLoadingDescriptions(false)
    }
  }

  const handleAddItem = () => {
    if (!newDescription) {
      toast.error('Please enter item description')
      return
    }

    if (!newPrice || Number(newPrice) <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    const price = Number(unformatNumber(newPrice))

    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      description: newDescription,
      price,
      totalPrice: price
    }

    setItems(prev => [...prev, newItem])
    setNewDescription('')
    setNewPrice('')
    toast.success('Item added successfully')
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
    toast.success('Item removed successfully')
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const price = Number(item.price) || 0
      return sum + price
    }, 0)

    return {
      subtotal,
      total: subtotal
    }
  }, [items])

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    setLoading(true)
    try {
      // Format items
      const formattedItems = items.map(item => ({
        description: item.description,
        price: parseFloat(item.price.toString())
      }))

      // Calculate total
      const total = formattedItems.reduce((sum, item) => sum + item.price, 0)

      // Format attachments
      let attachmentNames: string[] = []
      if (attachments) {
        attachmentNames = Array.from(attachments).map(file => file.name)
      }

      const expenseData = {
        payee: payee || null,
        category: category || 'operational',
        reference: reference || null,
        notes: notes || null,
        dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        dueTime: dueTime || null,
        paymentType: paymentType || 'cash',
        attachments: attachmentNames,
        items: formattedItems,
        total: total.toString() // Convert to string to avoid precision issues
      }

      console.log('Sending expense data:', expenseData)

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create expense')
      }

      toast.success('Expense created successfully')
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create expense')
    } finally {
      setLoading(false)
    }
  }

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
                  <BreadcrumbLink href="/dashboard/expenses">Expenses</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Expense</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-6 col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Payee (Optional)</label>
                        <Input
                          placeholder="Enter payee name"
                          value={payee}
                          onChange={(e) => setPayee(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operational">Operational</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="salary">Salary</SelectItem>
                            <SelectItem value="utilities">Utilities</SelectItem>
                            <SelectItem value="rent">Rent</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Reference (Optional)</label>
                        <Input
                          placeholder="Enter reference number"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Type</label>
                        <Select value={paymentType} onValueChange={setPaymentType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="transfer">Bank Transfer</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="debit_card">Debit Card</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Due Date (Optional)</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dueDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dueDate}
                              onSelect={setDueDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Due Time (Optional)</label>
                        <Input
                          type="time"
                          value={dueTime}
                          onChange={(e) => setDueTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes (Optional)</label>
                      <Input
                        placeholder="Enter notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Attachments (Optional)</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          onChange={(e) => setAttachments(e.target.files)}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: Images (JPG, PNG) and PDF. Max size: 5MB per file.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-medium">Items</h2>

                    <div className="grid grid-cols-[1fr,auto,auto] gap-4">
                      <div className="text-sm font-medium">Description</div>
                      <div className="text-sm font-medium">Price</div>
                      <div></div>
                    </div>

                    {items.map(item => (
                      <div key={item.id} className="grid grid-cols-[1fr,auto,auto] gap-4 items-center">
                        <div>{item.description}</div>
                        <div>{formatCurrency(item.price)}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="grid grid-cols-[1fr,auto,auto] gap-4 items-end">
                      <div className="space-y-2">
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openCombobox}
                              className="w-full justify-between"
                            >
                              {newDescription
                                ? newDescription
                                : "Select description..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search description..."
                                value={newDescriptionInput}
                                onValueChange={setNewDescriptionInput}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {isLoadingDescriptions ? (
                                    <div className="py-6 text-center text-sm">Loading descriptions...</div>
                                  ) : (
                                    <div className="py-6 text-center text-sm">
                                      No description found
                                    </div>
                                  )}
                                </CommandEmpty>
                                <CommandGroup>
                                  {descriptions.map((desc) => (
                                    <CommandItem
                                      key={desc}
                                      value={desc}
                                      onSelect={(currentValue) => {
                                        setNewDescription(currentValue === newDescription ? "" : currentValue)
                                        setOpenCombobox(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          newDescription === desc ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {desc}
                                    </CommandItem>
                                  ))}
                                  {newDescriptionInput && !descriptions.includes(newDescriptionInput) && (
                                    <CommandItem
                                      value={newDescriptionInput}
                                      onSelect={(currentValue) => {
                                        setNewDescription(currentValue)
                                        setOpenCombobox(false)
                                      }}
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Add "{newDescriptionInput}"
                                    </CommandItem>
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Price"
                          value={formatNumber(newPrice)}
                          onChange={(e) => {
                            const rawValue = unformatNumber(e.target.value)
                            if (rawValue === '' || /^\d*$/.test(rawValue)) {
                              setNewPrice(rawValue)
                            }
                          }}
                        />
                      </div>
                      <Button type="button" variant="outline" size="icon" onClick={handleAddItem}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="h-fit">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Summary</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Expense'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
