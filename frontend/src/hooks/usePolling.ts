'use client';
import { useEffect, useRef, useCallback } from 'react';
import { uploadApi } from '../lib/api';

type StatusCallback = (status: {
  fileId: string;
  status: string;
  progress: number;
  platformsDetected: number;
  error?: string;
}) => void;

const TERMINAL_STATES = new Set(['analyzed', 'failed']);
const INTERVAL_MS = 3000;

/**
 * Poll a file's processing status every 3 seconds until it reaches
 * a terminal state (analyzed | failed). Calls onUpdate on each tick.
 */
export const usePolling = (fileId: string | null, onUpdate: StatusCallback) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!fileId || !activeRef.current) return;
    try {
      const { data } = await uploadApi.status(fileId);
      onUpdate(data);
      if (TERMINAL_STATES.has(data.status)) stop();
    } catch {
      // Silently ignore network errors — keep polling
    }
  }, [fileId, onUpdate, stop]);

  useEffect(() => {
    if (!fileId) return;
    activeRef.current = true;

    // Initial fetch immediately
    poll();

    intervalRef.current = setInterval(poll, INTERVAL_MS);

    return () => {
      activeRef.current = false;
      stop();
    };
  }, [fileId, poll, stop]);

  return { stop };
};

/**
 * Poll multiple files concurrently.
 */
export const useBatchPolling = (
  fileIds: string[],
  onUpdate: (fileId: string, status: any) => void
) => {
  const activeIds = useRef<Set<string>>(new Set());
  const intervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    const newIds = fileIds.filter(
      (id) => !activeIds.current.has(id) && id
    );

    newIds.forEach((fileId) => {
      activeIds.current.add(fileId);

      const fetchStatus = async () => {
        try {
          const { data } = await uploadApi.status(fileId);
          onUpdate(fileId, data);
          if (TERMINAL_STATES.has(data.status)) {
            const iv = intervals.current.get(fileId);
            if (iv) clearInterval(iv);
            intervals.current.delete(fileId);
            activeIds.current.delete(fileId);
          }
        } catch {
          // keep polling
        }
      };

      fetchStatus();
      const iv = setInterval(fetchStatus, INTERVAL_MS);
      intervals.current.set(fileId, iv);
    });

    return () => {
      intervals.current.forEach((iv) => clearInterval(iv));
      intervals.current.clear();
      activeIds.current.clear();
    };
  }, [fileIds.join(',')]);
};
