'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

/**
 * Hook personnalisé pour les appels API avec gestion automatique du loading et des erreurs
 */
export function useApi<T = any>(
  url: string | null,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(options.initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    mutate,
  };
}

/**
 * Hook pour les mutations (POST, PATCH, DELETE)
 */
export function useMutation<TData = any, TVariables = any>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT' = 'POST'
) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(variables),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [url, method]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    data,
    loading,
    error,
    reset,
  };
}

/**
 * Hook pour le debounce (utile pour les recherches)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour la pagination
 */
export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return {
    currentItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
