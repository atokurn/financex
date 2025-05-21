'use client'

import { useState, useEffect, useRef } from 'react'
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ReloadIcon } from "@radix-ui/react-icons"
import { useTableData } from '@/hooks/use-table-data'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

interface DataTableWithQueryProps<TData, TValue> {
  /**
   * URL untuk mengambil data
   */
  dataUrl: string;
  /**
   * Kolom untuk tabel
   */
  columns: ColumnDef<TData, TValue>[];
  /**
   * Interval untuk polling (ms)
   */
  pollingInterval?: number;
  /**
   * Fungsi untuk transformasi data
   */
  transformData?: (data: unknown) => TData[];
  /**
   * Aktifkan SSE untuk real-time updates
   */
  enableSSE?: boolean;
  /**
   * URL khusus untuk SSE (jika berbeda dari dataUrl)
   */
  sseUrl?: string;
  /**
   * Judul tabel (opsional)
   */
  title?: string;
  /**
   * Unique key untuk query
   */
  queryKey: string;
  /**
   * Page size awal
   */
  initialPageSize?: number;
}

/**
 * Komponen DataTable dengan React Query dan dukungan real-time
 */
export function DataTableWithQuery<TData, TValue = unknown>({
  dataUrl,
  columns,
  pollingInterval = 5000,
  transformData,
  enableSSE = true,
  sseUrl,
  title,
  queryKey,
  initialPageSize = 10
}: DataTableWithQueryProps<TData, TValue>) {
  // Untuk menghindari error hydration
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DataTableWithQueryInner<TData, TValue>
        dataUrl={dataUrl}
        columns={columns}
        pollingInterval={pollingInterval}
        transformData={transformData}
        enableSSE={enableSSE}
        sseUrl={sseUrl}
        title={title}
        queryKey={queryKey}
        initialPageSize={initialPageSize}
      />
    </QueryClientProvider>
  )
}

// Unique key untuk setiap tabel, untuk menyimpan state pagination di localStorage
const getTableKey = (queryKey: string) => `datatable-${queryKey}-pagination`;

function DataTableWithQueryInner<TData, TValue>({
  dataUrl,
  columns,
  pollingInterval,
  transformData,
  enableSSE,
  sseUrl,
  title,
  queryKey,
  initialPageSize
}: DataTableWithQueryProps<TData, TValue>) {
  // State untuk pagination
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize || 10
  });
  
  // Referensi untuk mencegah re-render berlebihan
  const paginationRef = useRef(pagination);
  
  // Mengambil pagination dari localStorage pada saat mount
  useEffect(() => {
    try {
      const savedPagination = localStorage.getItem(getTableKey(queryKey));
      if (savedPagination) {
        const parsed = JSON.parse(savedPagination);
        setPagination(parsed);
        paginationRef.current = parsed;
      }
    } catch (e) {
      console.error('Error loading pagination state:', e);
    }
  }, [queryKey]);
  
  // Menyimpan pagination ke localStorage saat berubah
  useEffect(() => {
    // Hanya simpan jika benar-benar berubah
    if (pagination.pageIndex !== paginationRef.current.pageIndex || 
        pagination.pageSize !== paginationRef.current.pageSize) {
      
      paginationRef.current = pagination;
      localStorage.setItem(getTableKey(queryKey), JSON.stringify(pagination));
    }
  }, [pagination, queryKey]);
  
  // Gunakan skipEqualUpdates untuk mencegah re-render saat data tidak berubah
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
    sseConnected,
  } = useTableData<TData>(queryKey, {
    url: dataUrl,
    pollingInterval,
    transformData,
    enableSSE,
    sseUrl,
    skipEqualUpdates: true, // Mencegah reset pagination yang tidak perlu
  });

  // Handler untuk pagination
  const handlePaginationChange = (newPagination: typeof pagination) => {
    setPagination(newPagination);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {title && <h2 className="text-xl font-semibold">{title}</h2>}
        <div className="flex items-center gap-2">
          {sseConnected && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-sm text-muted-foreground">Real-time</span>
            </div>
          )}
          <Button 
            onClick={() => refetch()}
            size="sm"
            variant="outline"
            disabled={isRefetching}
          >
            {isRefetching ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </div>
      
      {isError && (
        <div className="rounded-md border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          Error: {error instanceof Error ? error.message : 'Failed to load data'}
        </div>
      )}
      
      <DataTable 
        data={data} 
        columns={columns}
        isLoading={isLoading}
        isRefreshing={isRefetching}
        onDataChange={() => refetch()}
        // Sediakan state pagination untuk mempertahankan posisi halaman
        pagination={pagination}
        setPagination={handlePaginationChange}
        // Berikan key unik berdasarkan queryKey ke DataTable
        tableId={queryKey}
      />
    </div>
  )
} 