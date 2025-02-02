"use client"

import { Row } from "@tanstack/react-table"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { Purchase } from "@/app/dashboard/purchases/columns"
import { Expense } from "@/app/dashboard/expenses/columns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog"
import { useState } from "react"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  onDataChange?: () => void
}

async function handleDelete(id: string, type: 'product' | 'purchase' | 'expense' | 'material') {
  try {
    const endpoint = type === 'product' ? `/api/products/${id}` :
                    type === 'purchase' ? `/api/purchases/${id}` :
                    type === 'expense' ? `/api/expenses/${id}` :
                    `/api/materials/${id}`

    const response = await fetch(endpoint, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || `Failed to delete ${type}`)
    }

    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`)
    return true
  } catch (error) {
    console.error(`Error deleting ${type}:`, error)
    toast.error(error instanceof Error ? error.message : `Failed to delete ${type}`)
    return false
  }
}

export function DataTableRowActions<TData>({
  row,
  onDataChange
}: DataTableRowActionsProps<TData>) {
  const router = useRouter()
  const pathname = usePathname()
  const [isDeleting, setIsDeleting] = useState(false)
  
  const isPurchase = 'invoiceNumber' in row.original
  const isExpense = 'payee' in row.original
  const isProduct = pathname.includes('/products')
  const isMaterial = pathname.includes('/materials')
  
  const id = row.original.id as string

  const handleDeleteClick = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    try {
      let type: 'product' | 'purchase' | 'expense' | 'material'
      if (isProduct) type = 'product'
      else if (isPurchase) type = 'purchase'
      else if (isExpense) type = 'expense'
      else if (isMaterial) type = 'material'
      else return

      const success = await handleDelete(id, type)
      if (success) {
        if (onDataChange) {
          onDataChange()
        } else {
          router.refresh()
        }
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const getEditPath = () => {
    if (isProduct) return `/dashboard/products/edit/${id}`
    if (isPurchase) return `/dashboard/purchases/edit/${id}`
    if (isExpense) return `/dashboard/expenses/edit/${id}`
    if (isMaterial) return `/dashboard/materials/edit/${id}`
    return '#'
  }

  const getItemType = () => {
    if (isProduct) return 'product'
    if (isPurchase) return 'purchase'
    if (isExpense) return 'expense'
    if (isMaterial) return 'material'
    return 'item'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem
          onClick={() => router.push(getEditPath())}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-red-600"
              onSelect={(e) => e.preventDefault()}
            >
              Delete
              <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this {getItemType()}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteClick}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
