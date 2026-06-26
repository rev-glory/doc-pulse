'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiError } from '../api/client';

export interface UseApiQueryOptions<T> {
  queryKey: unknown[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  initialData?: T;
  isEmpty?: (data: T) => boolean;
}

export interface UseApiQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  isEmpty: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>(options: UseApiQueryOptions<T>): UseApiQueryResult<T> {
  const { queryKey, queryFn, enabled = true, initialData, isEmpty: customIsEmpty } = options;
  const serializedKey = JSON.stringify(queryKey);

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !initialData);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await queryFnRef.current();
      setData(result);
    } catch (err: any) {
      setError(err?.message ? err : { message: String(err) });
    } finally {
      setIsLoading(false);
    }
  }, [enabled, serializedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isEmpty =
    !isLoading &&
    !error &&
    (data === undefined ||
      data === null ||
      (customIsEmpty ? customIsEmpty(data) : Array.isArray(data) && data.length === 0));

  const isSuccess = !isLoading && !error && data !== undefined;

  return {
    data,
    isLoading,
    error,
    isEmpty,
    isSuccess,
    refetch: fetchData,
  };
}
