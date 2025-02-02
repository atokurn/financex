"use client"

import { useSession } from 'next-auth/react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Image from "next/image"

export default function IntegrationsPage() {
  const { data: session } = useSession()

  if (!session) return null

  const handleConnect = (platform: string) => {
    // In a real app, this would redirect to the platform's OAuth flow
    toast.info(`Connecting to ${platform}...`)
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
                  <BreadcrumbPage>Integrations</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
              <p className="text-muted-foreground">
                Connect your store with various e-commerce platforms
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* TikTok Shop Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12">
                    <Image
                      src="/images/tiktok.png"
                      alt="TikTok Shop"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <CardTitle>TikTok Shop</CardTitle>
                    <CardDescription>
                      Sync your TikTok Shop products and orders
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect your TikTok Shop account to:
                </p>
                <ul className="mt-2 list-disc pl-4 text-sm text-muted-foreground">
                  <li>Import products automatically</li>
                  <li>Sync inventory across platforms</li>
                  <li>Track orders in real-time</li>
                  <li>Manage fulfillment status</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={() => handleConnect('TikTok Shop')}
                >
                  Connect TikTok Shop
                </Button>
              </CardFooter>
            </Card>

            {/* Shopee Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12">
                    <Image
                      src="/images/shopee.png"
                      alt="Shopee"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <CardTitle>Shopee</CardTitle>
                    <CardDescription>
                      Sync your Shopee products and orders
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect your Shopee account to:
                </p>
                <ul className="mt-2 list-disc pl-4 text-sm text-muted-foreground">
                  <li>Import products automatically</li>
                  <li>Sync inventory across platforms</li>
                  <li>Track orders in real-time</li>
                  <li>Manage fulfillment status</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={() => handleConnect('Shopee')}
                >
                  Connect Shopee
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
