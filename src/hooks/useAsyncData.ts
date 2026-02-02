import { useState, useEffect, useRef } from 'react'

// In-memory cache for fetched data
const cache = new Map<string, unknown>()

export interface UseAsyncDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Hook for fetching and caching async data.
 * - Caches fetched data by URL to avoid duplicate requests
 * - Supports abort on unmount
 * - Returns { data, loading, error } state
 */
export function useAsyncData<T>(url: string): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(() => {
    // Initialize from cache if available
    const cached = cache.get(url)
    return cached ? (cached as T) : null
  })
  const [loading, setLoading] = useState(!cache.has(url))
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // If already cached, skip fetch
    if (cache.has(url)) {
      setData(cache.get(url) as T)
      setLoading(false)
      return
    }

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(url, { signal })
        if (!response.ok) {
          throw new Error('Failed to load data')
        }

        const jsonData = await response.json()

        // Store in cache
        cache.set(url, jsonData)

        if (!signal.aborted) {
          setData(jsonData)
        }
      } catch (err) {
        if (!signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    // Cleanup: abort fetch on unmount
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [url])

  return { data, loading, error }
}

/**
 * Clear the data cache (useful for testing or forced refresh)
 */
export function clearAsyncDataCache(): void {
  cache.clear()
}

/**
 * Remove a specific URL from the cache
 */
export function invalidateAsyncData(url: string): void {
  cache.delete(url)
}
