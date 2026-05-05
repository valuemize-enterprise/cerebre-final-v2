'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type EventCallback = (data: any) => void;

interface UseSocketOptions {
  token: string | null;
  onFileProgress?: EventCallback;
  onFileExtracted?: EventCallback;
  onFileFailed?: EventCallback;
  onAnalysisProgress?: EventCallback;
  onAnalysisComplete?: EventCallback;
  onAnalysisFailed?: EventCallback;
}

export const useSocket = ({
  token,
  onFileProgress,
  onFileExtracted,
  onFileFailed,
  onAnalysisProgress,
  onAnalysisComplete,
  onAnalysisFailed,
}: UseSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000', {
      path: '/ws',
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('[WS] Connected'));
    socket.on('disconnect', () => console.log('[WS] Disconnected'));
    socket.on('connect_error', (err) => console.error('[WS] Error', err.message));

    if (onFileProgress) socket.on('file:progress', onFileProgress);
    if (onFileExtracted) socket.on('file:extracted', onFileExtracted);
    if (onFileFailed) socket.on('file:failed', onFileFailed);
    if (onAnalysisProgress) socket.on('analysis:progress', onAnalysisProgress);
    if (onAnalysisComplete) socket.on('analysis:complete', onAnalysisComplete);
    if (onAnalysisFailed) socket.on('analysis:failed', onAnalysisFailed);

    socketRef.current = socket;
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return { socket: socketRef.current };
};
