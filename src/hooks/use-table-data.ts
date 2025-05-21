import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { isEqual } from 'lodash';

interface TableDataOptions<T> {
  /**
   * URL untuk mengambil data
   */
  url: string;
  /**
   * Interval polling dalam milidetik
   */
  pollingInterval?: number;
  /**
   * Fungsi transformasi data (opsional)
   */
  transformData?: (data: unknown) => T[];
  /**
   * Aktifkan real-time updates dengan SSE
   */
  enableSSE?: boolean;
  /**
   * URL untuk SSE (jika berbeda dari fetch URL)
   */
  sseUrl?: string;
  /**
   * Jika true, hanya update data jika ada perubahan (default: true)
   */
  skipEqualUpdates?: boolean;
}

/**
 * Hook untuk mengambil dan mengelola data tabel dengan dukungan real-time
 */
export function useTableData<T>(
  queryKey: string,
  options: TableDataOptions<T>
) {
  const [sseData, setSSEData] = useState<T[] | null>(null);
  const [sseConnected, setSSEConnected] = useState(false);
  const previousDataRef = useRef<T[] | null>(null);
  const skipEqualUpdates = options.skipEqualUpdates !== false;
  
  // Default transformasi data (tidak ada transformasi)
  const defaultTransform = useCallback((data: unknown) => {
    if (Array.isArray(data)) {
      return data as T[];
    }
    return [] as T[];
  }, []);
  
  const transformData = options.transformData || defaultTransform;
  
  // Fungsi untuk memperbarui data hanya jika berbeda dari data sebelumnya
  const updateDataIfChanged = useCallback((newData: T[]) => {
    if (!skipEqualUpdates) {
      setSSEData(newData);
      previousDataRef.current = newData;
      return;
    }

    // Hanya update jika data berubah (mencegah reset pagination yang tidak perlu)
    if (!isEqual(previousDataRef.current, newData)) {
      setSSEData(newData);
      previousDataRef.current = newData;
    }
  }, [skipEqualUpdates]);
  
  // Setup SSE jika diaktifkan
  useEffect(() => {
    if (!options.enableSSE) return;
    
    const sseUrl = options.sseUrl || options.url;
    let eventSource: EventSource | undefined;
    
    try {
      eventSource = new EventSource(sseUrl);
      
      eventSource.onopen = () => {
        setSSEConnected(true);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          const transformedData = transformData(rawData);
          updateDataIfChanged(transformedData);
        } catch (error) {
          console.error('Failed to parse SSE data:', error);
        }
      };
      
      eventSource.onerror = () => {
        setSSEConnected(false);
        eventSource?.close();
      };
    } catch (error) {
      console.error('SSE connection failed:', error);
      setSSEConnected(false);
    }
    
    return () => {
      eventSource?.close();
      setSSEConnected(false);
    };
  }, [options.enableSSE, options.sseUrl, options.url, transformData, updateDataIfChanged]);
  
  // Menggunakan React Query untuk data fetching
  const query = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const response = await fetch(options.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      const rawData = await response.json();
      const transformedData = transformData(rawData);
      
      // Update previousData ref untuk pembandingan selanjutnya
      if (skipEqualUpdates && !sseConnected) {
        if (!isEqual(previousDataRef.current, transformedData)) {
          previousDataRef.current = transformedData;
        }
      }
      
      return transformedData;
    },
    refetchInterval: sseConnected ? false : options.pollingInterval,
    enabled: !sseConnected || !sseData,
    // Tambahkan opsi untuk menjaga hasil query meskipun query di-invalidate
    staleTime: 10000, // Data dianggap "fresh" selama 10 detik
    structuralSharing: true, // Mempertahankan referensi yang sama jika data tidak berubah
  });
  
  // Menggunakan data dari SSE jika tersedia, jika tidak dari React Query
  const data = sseConnected && sseData ? sseData : query.data;
  
  return {
    data: data || [],
    isLoading: query.isLoading && !sseData,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    sseConnected,
  };
} 