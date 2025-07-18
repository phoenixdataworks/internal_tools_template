import { useEffect, useRef } from 'react';

type AsyncCallback = (signal: AbortSignal) => Promise<void>;

/**
 * A hook that wraps useEffect to handle abortable async operations.
 * Provides cleanup and mounted state tracking to prevent memory leaks and race conditions.
 */
export function useAbortableEffect(callback: AsyncCallback, deps: React.DependencyList) {
  useEffect(() => {
    const controller = new AbortController();
    const mounted = { current: true };

    const execute = async () => {
      try {
        if (!mounted.current) return;
        await callback(controller.signal);
      } catch (error) {
        if (!mounted.current) return;
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            // Request was aborted, do nothing
            return;
          }
          console.error('Error in abortable effect:', error);
        }
      }
    };

    execute();

    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, deps);
}

/**
 * A hook that provides an AbortController that is automatically cleaned up.
 * Useful for manual control over abortable operations.
 */
export function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    controllerRef.current = new AbortController();
    return () => controllerRef.current?.abort();
  }, []);

  return controllerRef;
}
