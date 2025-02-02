'use client'

import { useSession } from 'next-auth/react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import { MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Label, Bar, BarChart, Legend, AreaChart, Area } from 'recharts'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Package, AlertCircle, XCircle, Wallet, Truck, RefreshCcw, DollarSign, Users} from "lucide-react"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { DatePickerWithRange } from "@/components/date-range-picker"
import {
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  differenceInDays
} from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { prisma } from "@/lib/prisma"
import Image from "next/image"
import { ScrollToTop } from "@/components/scroll-to-top"

const financeData = [
  { type: "Income", value: 75000, fill: "hsl(var(--chart-1))" },
  { type: "Expense", value: 25000, fill: "hsl(var(--chart-2))" },
]

const financeConfig = {
  value: {
    label: "Amount",
  },
  Income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  Expense: {
    label: "Expense",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const COLORS = ['#4F46E5', '#EF4444']

const revenueDataUpdated = [
  { month: "January", revenue: 75000 },
  { month: "February", revenue: 82000 },
  { month: "March", revenue: 68000 },
  { month: "April", revenue: 92000 },
  { month: "May", revenue: 85000 },
  { month: "June", revenue: 98000 },
]

const totalRevenue = revenueDataUpdated.reduce((acc, curr) => acc + curr.revenue, 0)
const lastMonthRevenue = revenueDataUpdated[revenueDataUpdated.length - 2].revenue
const currentMonthRevenue = revenueDataUpdated[revenueDataUpdated.length - 1].revenue
const revenueGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)

const revenueConfigUpdated = {
  revenue: {
    label: "Sales Income",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

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

export default function DashboardPage() {
  // 1. Context hooks
  const { data: session } = useSession()

  // 2. State hooks - all useState declarations
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [stockFilter, setStockFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<string>("sales")
  const [salesData, setSalesData] = useState<any[]>([])
  const [ordersData, setOrdersData] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<Array<{
    sku: string;
    name: string;
    sales: number;
    progress: number;
    image: string;
  }>>([])
  const [totalSales, setTotalSales] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalProducts, setTotalProducts] = useState(0)
  const [salesGrowth, setSalesGrowth] = useState(0)
  const [orderGrowth, setOrderGrowth] = useState(0)
  const [productGrowth, setProductGrowth] = useState(0)
  const [materialsData, setMaterialsData] = useState([])
  const [productsData, setProductsData] = useState([])
  const [stockStats, setStockStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    stockValue: 0
  })
  const [chartData, setChartData] = useState<any[]>([]);

  // 3. Callback hooks - group ALL useCallback hooks together
  const getPreviousPeriod = useCallback(() => {
    if (!date?.from || !date?.to) return { from: new Date(), to: new Date() }

    const currentDays = differenceInDays(date.to, date.from)
    
    if (currentDays === 0) {
      return {
        from: subDays(date.from, 1),
        to: subDays(date.to, 1)
      }
    } else if (currentDays === 6) {
      return {
        from: startOfWeek(subWeeks(date.from, 1)),
        to: endOfWeek(subWeeks(date.to, 1))
      }
    } else if (currentDays === 29 || currentDays === 30 || currentDays === 31) {
      return {
        from: startOfMonth(subMonths(date.from, 1)),
        to: endOfMonth(subMonths(date.to, 1))
      }
    } else if (currentDays === 364 || currentDays === 365) {
      return {
        from: startOfYear(subYears(date.from, 1)),
        to: endOfYear(subYears(date.to, 1))
      }
    }
    
    return {
      from: subDays(date.from, currentDays + 1),
      to: subDays(date.to, currentDays + 1)
    }
  }, [date])

  const getDateRangeLabel = useCallback(() => {
    if (!date?.from || !date?.to) return ''
    
    const days = differenceInDays(date.to, date.from)
    
    if (days === 0) {
      return 'Today vs Yesterday'
    } else if (days === 6) {
      return 'This Week vs Last Week'
    } else if (days === 29 || days === 30 || days === 31) {
      return 'This Month vs Last Month'
    } else if (days === 364 || days === 365) {
      return 'This Year vs Last Year'
    }
    
    return `${format(date.from, 'PP')} - ${format(date.to, 'PP')}`
  }, [date])

  const processChartData = useCallback((data: any[]) => {
    if (!date?.from || !date?.to) return [];

    const daysDiff = differenceInDays(date.to, date.from);
    
    if (daysDiff === 0) {
      // Group by hour for single day
      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourData = data.filter(item => {
          const itemDate = new Date(item.orderAt);
          return itemDate.getHours() === hour;
        });
        
        return {
          date: `${hour.toString().padStart(2, '0')}:00`,
          income: hourData.reduce((sum, item) => sum + item.income, 0)
        };
      });
      return hourlyData;
    } else if (daysDiff >= 365) {
      // Group by month for year or longer
      const monthlyData = data.reduce((acc: any[], item) => {
        const date = new Date(item.orderAt);
        const monthYear = format(date, 'MMM yyyy');
        
        const existingMonth = acc.find(d => d.date === monthYear);
        if (existingMonth) {
          existingMonth.income += item.income;
        } else {
          acc.push({ date: monthYear, income: item.income });
        }
        
        return acc;
      }, []);
      return monthlyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      // Group by day for multiple days
      const dailyData = data.reduce((acc: any[], item) => {
        const date = format(new Date(item.orderAt), 'dd MMM');
        
        const existingDay = acc.find(d => d.date === date);
        if (existingDay) {
          existingDay.income += item.income;
        } else {
          acc.push({ date, income: item.income });
        }
        
        return acc;
      }, []);
      return dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [date])

  const fetchTopProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (date?.from) {
        params.append('from', date.from.toISOString());
      }
      if (date?.to) {
        params.append('to', date.to.toISOString());
      }

      const response = await fetch(`/api/dashboard/top-products?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch top products');
      }
      
      if (Array.isArray(data)) {
        setTopProducts(data);
      } else {
        setTopProducts([]);
      }
    } catch (error) {
      console.error('Error fetching top products:', error);
      setTopProducts([]);
    }
  }, [date]);

  // 4. Effect hooks
  useEffect(() => {
    const fetchData = async () => {
      try {
        // If date range is not set, fetch all data
        const currentPeriod = date?.from && date?.to ? {
          startDate: (() => {
            const start = new Date(date.from)
            start.setHours(0, 0, 0, 0)
            return format(start, 'yyyy-MM-dd HH:mm:ss')
          })(),
          endDate: (() => {
            const end = new Date(date.to)
            end.setHours(23, 59, 59, 999)
            return format(end, 'yyyy-MM-dd HH:mm:ss')
          })()
        } : {
          // If no date range, don't send date parameters to fetch all data
          startDate: undefined,
          endDate: undefined
        }

        const previousPeriod = getPreviousPeriod()
        const prevStartDate = format(previousPeriod.from, 'yyyy-MM-dd HH:mm:ss')
        const prevEndDate = format(previousPeriod.to, 'yyyy-MM-dd HH:mm:ss')

        // Build URL parameters only if dates are defined
        const currentParams = new URLSearchParams()
        if (currentPeriod.startDate && currentPeriod.endDate) {
          currentParams.append('startDate', currentPeriod.startDate)
          currentParams.append('endDate', currentPeriod.endDate)
        }

        const [currentSalesRes, currentOrdersRes] = await Promise.all([
          fetch('/api/sales?' + currentParams.toString()),
          fetch('/api/orders?' + currentParams.toString())
        ])

        if (!currentSalesRes.ok || !currentOrdersRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const [currentSalesData, currentOrdersData] = await Promise.all([
          currentSalesRes.json(),
          currentOrdersRes.json()
        ])

        // Filter both orders and sales based on date range if it exists
        const filteredOrders = currentOrdersData.filter((order: any) => {
          if (!date?.from || !date?.to) return true;
          const orderDate = new Date(order.orderAt);
          return orderDate >= date.from && orderDate <= date.to;
        });

        const filteredSales = currentSalesData.filter((sale: any) => {
          if (!date?.from || !date?.to) return true;
          const saleDate = new Date(sale.orderAt);
          return saleDate >= date.from && saleDate <= date.to;
        });

        setSalesData(filteredSales)
        setOrdersData(filteredOrders)
        
        const currentSalesTotal = filteredSales.reduce((acc: number, curr: any) => acc + curr.income, 0)
        const currentOrdersTotal = filteredOrders.length
        
        setTotalSales(currentSalesTotal)
        setTotalOrders(currentOrdersTotal)
        
        // Only fetch previous period if we have a current date range
        if (currentPeriod.startDate && currentPeriod.endDate) {
          const [prevSalesRes, prevOrdersRes] = await Promise.all([
            fetch('/api/sales?' + new URLSearchParams({
              startDate: prevStartDate,
              endDate: prevEndDate
            })),
            fetch('/api/orders?' + new URLSearchParams({
              startDate: prevStartDate,
              endDate: prevEndDate
            }))
          ])

          if (!prevSalesRes.ok || !prevOrdersRes.ok) {
            throw new Error('Failed to fetch previous period data')
          }

          const [prevSalesData, prevOrdersData] = await Promise.all([
            prevSalesRes.json(),
            prevOrdersRes.json()
          ])

          // Filter previous period orders based on date range
          const filteredPrevOrders = prevOrdersData.filter((order: any) => {
            const orderDate = new Date(order.orderAt);
            return orderDate >= previousPeriod.from && orderDate <= previousPeriod.to;
          });

          const prevSalesTotal = prevSalesData.reduce((acc: number, curr: any) => acc + curr.income, 0)
          const prevOrdersTotal = filteredPrevOrders.length

          // Calculate sales growth percentage
          let salesGrowthCalc = 0
          if (prevSalesTotal === 0) {
            salesGrowthCalc = currentSalesTotal > 0 ? 100 : 0
          } else {
            salesGrowthCalc = ((currentSalesTotal - prevSalesTotal) / prevSalesTotal) * 100
          }

          // Calculate order growth percentage
          let orderGrowthCalc = 0
          if (prevOrdersTotal === 0) {
            orderGrowthCalc = currentOrdersTotal > 0 ? 100 : 0
          } else {
            orderGrowthCalc = ((currentOrdersTotal - prevOrdersTotal) / prevOrdersTotal) * 100
          }

          // Round to 1 decimal place and ensure it's a number
          setSalesGrowth(salesGrowthCalc ? Number(salesGrowthCalc.toFixed(1)) : 0)
          setOrderGrowth(orderGrowthCalc ? Number(orderGrowthCalc.toFixed(1)) : 0)

          console.log('Growth Calculation:', {
            currentOrdersTotal,
            prevOrdersTotal,
            orderGrowthCalc,
            currentSalesTotal,
            prevSalesTotal,
            salesGrowthCalc,
            dateRange: {
              current: { from: date?.from, to: date?.to },
              previous: { from: previousPeriod.from, to: previousPeriod.to }
            },
            finalOrderGrowth: orderGrowthCalc ? Number(orderGrowthCalc.toFixed(1)) : 0,
            finalSalesGrowth: salesGrowthCalc ? Number(salesGrowthCalc.toFixed(1)) : 0
          })
        } else {
          // Reset growth when showing all data
          setSalesGrowth(0)
          setOrderGrowth(0)
        }

      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [date, getPreviousPeriod])

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const [materialsRes, productsRes] = await Promise.all([
          fetch('/api/materials'),
          fetch('/api/products')
        ])

        if (!materialsRes.ok || !productsRes.ok) {
          throw new Error('Failed to fetch stock data')
        }

        const [materials, products] = await Promise.all([
          materialsRes.json(),
          productsRes.json()
        ])

        setMaterialsData(materials)
        setProductsData(products)

        // Calculate stock statistics
        const stats = {
          totalItems: materials.length + products.length,
          lowStock: [...materials, ...products].filter(item => 
            (item.stock || 0) <= (item.minStock || 0)
          ).length,
          outOfStock: [...materials, ...products].filter(item => 
            (item.stock || 0) === 0
          ).length,
          stockValue: [...materials, ...products].reduce((acc, item) => 
            acc + ((item.stock || 0) * (item.price || 0)), 0
          )
        }

        setStockStats(stats)

      } catch (error) {
        console.error('Error fetching stock data:', error)
      }
    }

    fetchStockData()
  }, [])

  useEffect(() => {
    if (salesData.length > 0) {
      const processedData = processChartData(salesData);
      setChartData(processedData);
    }
  }, [salesData, date, processChartData]);

  useEffect(() => {
    fetchTopProducts();
  }, [fetchTopProducts]);

  // Calculate order statistics
  const orderStats = useMemo(() => {
    return {
      totalOrders: ordersData.length,
      completedOrders: ordersData.filter(order => order.status === 'completed').length,
      returnedOrders: salesData.reduce((count, sale) => count + (sale.refund ? 1 : 0), 0),
      totalQuantity: ordersData.reduce((sum, order) => sum + (order.totalOrder || 0), 0)
    }
  }, [ordersData, salesData])

  // Calculate filtered data based on current filter
  const getFilteredData = () => {
    const filterItems = (items: any[]) => items.filter(item => 
      stockFilter === 'low' ? (item.stock > 0 && item.stock <= item.minStock) :
      stockFilter === 'out' ? item.stock === 0 :
      true
    );

    let filteredProducts = stockFilter === 'material' ? [] : filterItems(productsData);
    let filteredMaterials = stockFilter === 'product' ? [] : filterItems(materialsData);
    
    return [...filteredProducts, ...filteredMaterials];
  };

  const filteredItems = getFilteredData();
  const totalItems = filteredItems.length;
  const lowStockItems = filteredItems.filter(item => item.stock > 0 && item.stock <= item.minStock).length;
  const outOfStockItems = filteredItems.filter(item => item.stock === 0).length;
  const totalStockValue = filteredItems.reduce((total, item) => 
    total + (item.stock * (item.price || 0)), 0
  );

  // Add number formatter function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
      .replace('IDR', 'Rp')
  }

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat('id-ID').format(number);
  };

  // Early return after all hooks
  if (!session) return null

  // Rest of the component (render logic)
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between px-4 transition-[width,height] ease-linear">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden sm:block">
                    <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Overview</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div>
              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
            <Tabs 
              defaultValue="sales" 
              className="w-full"
              onValueChange={(value) => setActiveTab(value)}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="sales" className="relative">
                    Sales Overview
                  </TabsTrigger>
                  <TabsTrigger value="stock">
                    Stock Overview
                  </TabsTrigger>
                  <TabsTrigger value="projection">
                    Projection
                  </TabsTrigger>
                </TabsList>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                  {/* Only show filter when stock tab is active */}
                  <div className={cn(
                    "transition-all duration-200 w-full sm:w-auto",
                    activeTab === "stock" ? "opacity-100 visible" : "opacity-0 invisible h-0 sm:h-auto"
                  )}>
                    <Select
                      value={stockFilter}
                      onValueChange={(value: 'all' | 'product' | 'material') => setStockFilter(value)}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="product">Products</SelectItem>
                        <SelectItem value="material">Materials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DatePickerWithRange
                    date={date}
                    setDate={setDate}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>

              <TabsContent value="sales" className="space-y-4 mt-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <div className="flex items-start justify-between p-6 ">
                      <div className="rounded-lg bg-primary/10 p-2 ">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          className="h-4 w-4"
                        >
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </div>
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ",
                        Number(salesGrowth) > 0 
                          ? "bg-green-500/20 text-green-400"
                          : Number(salesGrowth) < 0
                            ? "bg-red-500/20 text-red-400"
                            : "bg-foreground/20 text-foreground"
                      )}>
                        {salesGrowth > 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
                      <p className="mt-2 text-2xl font-bold">Rp {formatNumber(totalSales).toLocaleString()}</p>
                      {getDateRangeLabel() && (
                        <p className="mt-1 text-sm text-muted-foreground">{getDateRangeLabel()}</p>
                      )}
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between p-6">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          className="h-4 w-4"
                        >
                          <path d="M8 3h8l2 14H6L8 3Z" />
                          <path d="M10 3v0a2 2 0 1 1 4 0v0" />
                        </svg>
                      </div>
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                        Number(orderGrowth) > 0 
                          ? "bg-green-500/20 text-green-400"
                          : Number(orderGrowth) < 0
                            ? "bg-red-500/20 text-red-400"
                            : "bg-foreground/20 text-foreground"
                      )}>
                        {Number(orderGrowth) > 0 ? '+' : ''}{Number(orderGrowth).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <h3 className="text-sm font-medium text-muted-foreground">Amount Sold</h3>
                      <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                          <div className="text-2xl font-bold mt-2 truncate">
                            {formatCurrency(orderStats.totalQuantity)}
                          </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-align-center">Total amount products sold </p>
                          <p className="text-align-center">{formatCurrency(orderStats.totalQuantity)}</p>
                          </TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                      {getDateRangeLabel() && (
                        <p className="mt-1 text-sm text-muted-foreground">{getDateRangeLabel()}</p>
                      )}
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between p-6">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          className="h-4 w-4"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                        Number(orderGrowth) > 0 
                          ? "bg-green-500/20 text-green-400"
                          : Number(orderGrowth) < 0
                            ? "bg-red-500/20 text-red-400"
                            : "bg-foreground/20 text-foreground"
                      )}>
                        {Number(orderGrowth) > 0 ? '+' : ''}{Number(orderGrowth).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <h3 className="text-sm font-medium text-muted-foreground">Total Orders</h3>
                      <p className="mt-2 text-2xl font-bold">{formatNumber(orderStats.totalOrders)}</p>
                      {getDateRangeLabel() && (
                        <p className="mt-1 text-sm text-muted-foreground">{getDateRangeLabel()}</p>
                      )}
                    </div>
                  </Card>
                  
                  <Card>
                    <div className="flex items-start justify-between p-6">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          className="h-4 w-4"
                        >
                          <rect width="20" height="14" x="2" y="5" rx="2" />
                          <path d="M2 10h20" />
                        </svg>
                      </div>
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                        Number(salesGrowth) > 0 
                          ? "bg-green-500/20 text-green-400"
                          : Number(salesGrowth) < 0
                            ? "bg-red-500/20 text-red-400"
                            : "bg-foreground/20 text-foreground"
                      )}>
                        {Number(salesGrowth) > 0 ? '+' : ''}{Number(salesGrowth).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <h3 className="text-sm font-medium text-muted-foreground">Average Order Value</h3>
                      <p className="mt-2 text-2xl font-bold">
                        Rp {totalOrders ? Math.round(totalSales / totalOrders).toLocaleString() : 0}
                      </p>
                      {getDateRangeLabel() && (
                        <p className="mt-1 text-sm text-muted-foreground">{getDateRangeLabel()}</p>
                      )}
                    </div>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
                  {/* Sales Overview Chart */}
                  <Card className="lg:col-span-4">
                    <CardHeader>
                      <CardTitle>Sales Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer 
                        //className="h-[240px]"
                        config={{
                          income: {
                            label: "Income",
                            color: "#8884d8"
                          }
                        }}
                      >
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" 
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value.slice(0, 3)}
                          />
                          <YAxis 
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => {
                              if (value >= 1000000) {
                                return `${(value / 1000000).toFixed(1)}M`;
                              } else if (value >= 1000) {
                                return `${(value / 1000).toFixed(1)}k`;
                              }
                              return value;
                            }}
                          />
                          <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
                          <Area 
                            type="monotone" 
                            dataKey="income" 
                            stroke="#8884d8" 
                            fillOpacity={1} 
                            fill="url(#colorIncome)" 
                          />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Sales Activity */}
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle>Sales Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[hsl(var(--activity-blue-bg))] p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-[hsl(var(--activity-blue-text))]" />
                            <span className="text-sm font-medium text-[hsl(var(--activity-blue-text))]">Packed</span>
                          </div>
                          <div className="text-2xl font-bold mt-2 text-[hsl(var(--activity-blue-text))]">{formatNumber(orderStats.totalOrders)}</div>
                        </div>
                        <div className="bg-[hsl(var(--activity-yellow-bg))] p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-[hsl(var(--activity-yellow-text))]" />
                            <span className="text-sm font-medium text-[hsl(var(--activity-yellow-text))]">Delivered</span>
                          </div>
                          <div className="text-2xl font-bold mt-2 text-[hsl(var(--activity-yellow-text))]">{formatNumber(orderStats.completedOrders)}</div>
                        </div>
                        <div className="bg-[hsl(var(--activity-purple-bg))] p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <RefreshCcw className="h-4 w-4 text-[hsl(var(--activity-purple-text))]" />
                            <span className="text-sm font-medium text-[hsl(var(--activity-purple-text))]">Returns</span>
                          </div>
                          <div className="text-2xl font-bold mt-2 text-[hsl(var(--activity-purple-text))]">{formatNumber(orderStats.returnedOrders)}</div>
                        </div>
                        <div className="bg-[hsl(var(--activity-gray-bg))] p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-[hsl(var(--activity-gray-text))]" />
                            <span className="text-sm font-medium text-[hsl(var(--activity-gray-text))]">Products Sold</span>
                          </div>
                          <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                          <div className="text-2xl font-bold mt-2 text-[hsl(var(--activity-gray-text))] truncate">
                            {formatCurrency(orderStats.totalQuantity)}
                          </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-align-center">Total amount products sold </p>
                          <p className="text-align-center">{formatCurrency(orderStats.totalQuantity)}</p>
                          </TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      {/* Customer Growth */}
                      <div className="bg-[hsl(var(--activity-purple-bg))] p-4 rounded-lg mt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-[hsl(var(--activity-purple-text))]">Customer Growth</div>
                            <div className="text-2xl font-bold mt-2 text-[hsl(var(--activity-purple-text))]">83%</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            185,854 <span className="text-green-500">(+1,250)</span>
                          </div>
                        </div>
                        <div className="w-full bg-[hsl(var(--activity-purple-text)/0.2)] rounded-full h-2.5 mt-4">
                          <div
                            className="bg-[hsl(var(--activity-purple-text))] h-2.5 rounded-full"
                            style={{ width: "83%" }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-10">
                  {/* Financial Overview - Pie Chart */}
                  <Card className="lg:col-span-3">
                    <CardHeader className="items-center pb-0">
                      <CardTitle>Financial Overview</CardTitle>
                      <CardDescription>Income vs Expense</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pb-0">
                      <ChartContainer
                        className="mx-auto aspect-square max-h-[250px]"
                        config={{
                          income: {
                            label: "Income",
                            color: "#8884d8"
                          },
                          expenses: {
                            label: "Expenses",
                            color: "#82ca9d"
                          }
                        }}
                      >
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={financeData}
                            dataKey="value"
                            nameKey="type"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                          >
                            <Label
                              content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                  const total = financeData.reduce((acc, curr) => acc + curr.value, 0)
                                  return (
                                    <text
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                    >
                                      <tspan
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        className="fill-foreground text-3xl font-bold"
                                      >
                                        ${total.toLocaleString()}
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 24}
                                        className="fill-muted-foreground"
                                      >
                                        Total
                                      </tspan>
                                    </text>
                                  )
                                }
                              }}
                            />
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2 font-medium leading-none">
                        {salesGrowth > 0 ? 'Income up' : salesGrowth < 0 ? 'Income down' : 'Income unchanged'} 
                        by {Math.abs(salesGrowth)}% {date?.from ? 'this period' : ''} 
                        <TrendingUp className={cn("h-4 w-4", salesGrowth < 0 && "rotate-180")} />
                      </div>
                      <div className="leading-none text-muted-foreground">
                        {date?.from ? `Showing financial overview from ${format(date.from, 'PP')} to ${format(date.to, 'PP')}` : 'Showing all-time financial overview'}
                      </div>
                    </CardFooter>
                  </Card>

                  {/* Revenue Chart */}
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle>Sales Income Overview</CardTitle>
                      <CardDescription>
                        January - June 2024
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={revenueConfigUpdated} className="aspect-[4/3]">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={revenueDataUpdated}>
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              horizontal={true}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="month"
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => value.slice(0, 3)}
                              fontSize={12}
                              tickMargin={8}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              fontSize={12}
                              tickFormatter={(value) => {
                                if (value >= 1000000) {
                                  return `${(value / 1000000).toFixed(1)}M`;
                                } else if (value >= 1000) {
                                  return `${(value / 1000).toFixed(1)}k`;
                                }
                                return value;
                              }}
                            />
                            <ChartTooltip
                              cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                              contentStyle={{ display: 'none' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                                            Income
                                          </span>
                                          <span className="font-bold text-muted-foreground">
                                            ${payload[0].value?.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <Bar 
                              dataKey="revenue" 
                              fill="hsl(217.2 91.2% 59.8%)" 
                              radius={[4, 4, 0, 0]}
                              maxBarSize={50}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                      <div className="flex gap-2 font-medium leading-none">
                        {salesGrowth > 0 ? 'Income up' : salesGrowth < 0 ? 'Income down' : 'Income unchanged'} 
                        by {Math.abs(salesGrowth)}% {date?.from ? 'this period' : ''} 
                        <TrendingUp className={cn("h-4 w-4", salesGrowth < 0 && "rotate-180")} />
                      </div>
                      <div className="leading-none text-muted-foreground">
                        Total Sales Income: Rp{totalSales.toLocaleString()}
                      </div>
                    </CardFooter>
                  </Card>

                  {/* Top Products */}
                  <Card className="col-span-4">
                    <CardHeader>
                      <CardTitle>Top Products</CardTitle>
                      <CardDescription>Based on quantity sold</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-6">
                          {topProducts.length > 0 ? (
                            topProducts.map((product) => (
                              <div className="flex items-center gap-4" key={product.sku}>
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                                  {product.image ? (
                                    <Image
                                      src={product.image}
                                      alt={product.name}
                                      width={48}
                                      height={48}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-medium leading-none">
                                    {product.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    SKU: {product.sku} | {formatNumber(product.sales)} sales
                                  </p>
                                </div>
                                <div className="ml-auto">
                                  <div className="flex items-center gap-2">
                                    <Progress value={product.progress} className="w-[60px]" />
                                    <span className="text-sm font-medium">{product.progress}%</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-sm text-muted-foreground py-4">
                              No sales data available
                            </div>
                          )}
                        </div>
                        <ScrollBar orientation="vertical" />
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stock" className="space-y-4 mt-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Products
                      </CardTitle>
                      <Package className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalItems}</div>
                      <p className="text-xs text-muted-foreground">
                        {totalItems} items {stockFilter === 'low' ? 'in low stock' : 
                                         stockFilter === 'out' ? 'out of stock' : 
                                         stockFilter === 'product' ? 'products' :
                                         stockFilter === 'material' ? 'materials' : 'in stock'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Low Stock Items
                      </CardTitle>
                      <AlertCircle className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{lowStockItems}</div>
                      <p className="text-xs text-muted-foreground">
                        Items need restock
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Out of Stock
                      </CardTitle>
                      <XCircle className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{outOfStockItems}</div>
                      <p className="text-xs text-muted-foreground">
                        Products out of stock
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Stock Value
                      </CardTitle>
                      <Wallet className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">Rp{totalStockValue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Total inventory value
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Stock Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={productsData}
                              dataKey="stock"
                              nameKey="name"
                              innerRadius={60}
                              outerRadius={80}
                              fill="#8884d8"
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Stock Movement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={materialsData}>
                            <Line type="monotone" dataKey="stock" stroke="#8884d8" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <CartesianGrid stroke="#ccc" />
                            <Tooltip />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                  <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Recent Stock Movement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px] w-full">
                        <div className="h-[300px] space-y-4">
                          {(stockFilter === 'all' || stockFilter === 'product' || stockFilter === 'low' || stockFilter === 'out') && (
                            <div>
                              <h4 className="mb-4 text-sm font-medium flex items-center justify-between bg-neutral-800 px-2 py-2 rounded">
                                <span>Products</span>
                                <Badge variant="secondary" className="text-xs bg-blue-700 font-bold">
                                  {productsData.filter(product => 
                                    stockFilter === 'low' ? (product.stock > 0 && product.stock <= product.minStock) :
                                    stockFilter === 'out' ? product.stock === 0 :
                                    true
                                  ).length}
                                </Badge>
                              </h4>
                              <div className="space-y-2">
                                {productsData
                                  .filter(product => 
                                    stockFilter === 'low' ? (product.stock > 0 && product.stock <= product.minStock) :
                                    stockFilter === 'out' ? product.stock === 0 :
                                    true
                                  )
                                  .map((product: any) => (
                                    <div key={product.id} className="flex items-center">
                                      <div className="w-[180px] truncate">
                                        <span className="font-medium">{product.name}</span>
                                      </div>
                                      <div className="ml-auto flex w-[160px] items-center">
                                        <div className="w-full">
                                          <div className="flex items-center justify-between text-sm tabular-nums">
                                            <span>{product.stock}</span>
                                            <span className="text-gray-500">{product.minStock} min</span>
                                          </div>
                                          <Progress
                                            value={product.stock > 0 ? (product.stock / (product.minStock * 2)) * 100 : 0}
                                            className="h-2"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                          
                          {(stockFilter === 'all' || stockFilter === 'material' || stockFilter === 'low' || stockFilter === 'out') && (
                            <div>
                              <h4 className="mb-4 text-sm font-medium flex items-center justify-between bg-neutral-800 px-2 py-2 rounded">
                                <span>Materials</span>
                                <Badge variant="secondary" className="text-xs bg-blue-700 font-bold">
                                  {materialsData.filter(material => 
                                    stockFilter === 'low' ? (material.stock > 0 && material.stock <= material.minStock) :
                                    stockFilter === 'out' ? material.stock === 0 :
                                    true
                                  ).length}
                                </Badge>
                              </h4>
                              <div className="space-y-2">
                                {materialsData
                                  .filter(material => 
                                    stockFilter === 'low' ? (material.stock > 0 && material.stock <= material.minStock) :
                                    stockFilter === 'out' ? material.stock === 0 :
                                    true
                                  )
                                  .map((material: any) => (
                                    <div key={material.id} className="flex items-center">
                                      <div className="w-[180px] truncate">
                                        <span className="font-medium">{material.name}</span>
                                      </div>
                                      <div className="ml-auto flex w-[160px] items-center">
                                        <div className="w-full">
                                          <div className="flex items-center justify-between text-sm tabular-nums">
                                            <span>{material.stock}</span>
                                            <span className="text-gray-500">{material.minStock} min</span>
                                          </div>
                                          <Progress
                                            value={material.stock > 0 ? (material.stock / (material.minStock * 2)) * 100 : 0}
                                            className="h-2"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Low Stock Alert</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        {topProducts.map((product) => (
                          <div className="flex items-center" key={product.name}>
                            <div className="ml-4 space-y-1">
                              <p className="text-sm font-medium leading-none">
                                {product.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {product.sales} units left
                              </p>
                            </div>
                            <div className="ml-auto font-medium">
                              {product.progress}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <ScrollToTop />
    </NextThemesProvider>
  )
}