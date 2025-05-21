import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface SSEOptions {
  /**
   * URL endpoint untuk Server-Sent Events
   */
  sseUrl: string;
  /**
   * URL endpoint untuk fallback fetch data jika SSE gagal
   */
  fetchUrl: string;
  /**
   * Interval polling dalam milidetik jika SSE tidak didukung
   */
  pollingInterval?: number;
  /**
   * Enable atau disable SSE (default: true)
   */
  sseEnabled?: boolean;
}

/**
 * Custom hook untuk fetching data dengan React Query yang mendukung Server-Sent Events
 * @param key Query key untuk React Query
 * @param options SSE options
 * @param queryOptions React Query options
 */
export function useSSEQuery<TData>(
  key: string | readonly string[], 
  options: SSEOptions,
  queryOptions?: Omit<UseQueryOptions<TData, Error, TData, readonly string[]>, 'queryKey' | 'queryFn'>
) {
  const [sseData, setSSEData] = useState<TData | null>(null);
  const [sseConnected, setSSEConnected] = useState(false);
  const [sseError, setSSEError] = useState<Error | null>(null);
  
  const queryKey = Array.isArray(key) ? key : [key];
  const pollingInterval = sseConnected ? false : (options.pollingInterval || 5000);
  
  // Setup SSE connection
  useEffect(() => {
    if (!options.sseEnabled && options.sseEnabled !== undefined) return;
    
    let eventSource: EventSource | undefined;
    
    try {
      eventSource = new EventSource(options.sseUrl);
      
      eventSource.onopen = () => {
        setSSEConnected(true);
        setSSEError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setSSEData(data);
        } catch (error) {
          setSSEError(new Error('Failed to parse SSE data'));
        }
      };
      
      eventSource.onerror = () => {
        setSSEConnected(false);
        setSSEError(new Error('SSE connection error'));
        eventSource?.close();
      };
    } catch (error) {
      setSSEConnected(false);
      setSSEError(error instanceof Error ? error : new Error('Failed to create SSE connection'));
    }
    
    return () => {
      eventSource?.close();
      setSSEConnected(false);
    };
  }, [options.sseUrl, options.sseEnabled]);
  
  // Main data query with fallback to regular fetch if SSE fails
  const query = useQuery<TData, Error>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(options.fetchUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch data: ${res.status}`);
      }
      return res.json();
    },
    ...(queryOptions || {}),
    refetchInterval: pollingInterval,
    // Disabled when SSE is connected and providing data
    enabled: queryOptions?.enabled !== false && (!sseConnected || !!sseError)
  } as UseQueryOptions<TData, Error, TData, readonly string[]>);
  
  // Combine SSE data and query data
  const data = sseConnected && sseData ? sseData : query.data;
  const error = sseError || query.error;
  
  return {
    data,
    error,
    isLoading: query.isLoading && !sseData,
    isError: !!error,
    sseConnected,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    status: query.status,
  };
} 