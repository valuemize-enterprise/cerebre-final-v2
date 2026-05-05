import { useState, useEffect } from 'react';

/**
 * Debounces a value — useful for search inputs and filter controls.
 * Only updates after the delay has elapsed without a new value.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Debounced callback — throttles a function call.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delayMs = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
