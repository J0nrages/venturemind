/**
 * React Hook for Unified WebSocket Manager
 * Provides easy component integration with automatic cleanup
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { wsManager, WebSocketMessage, ChannelType } from '../services/UnifiedWebSocketManager';
import { supabase } from '../lib/supabase';

export interface UseUnifiedWebSocketOptions {
  channel: ChannelType;
  contextId?: string;
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface UseUnifiedWebSocketReturn {
  connected: boolean;
  connecting?: boolean;
  error?: string;
  send: (type: string, payload: any) => void;
  sendMessage: (content: string, metadata?: any) => void;
  controlAgent: (agentId: string, action: 'pause' | 'resume' | 'stop') => void;
  editDocument: (documentId: string, operation: any) => void;
  requestPrefetch: (agentId: string, message: string) => void;
  status: {
    connected: boolean;
    sessionId: string | null;
    subscriptions: number;
    queuedMessages: number;
  };
}

export function useUnifiedWebSocket(
  options: UseUnifiedWebSocketOptions
): UseUnifiedWebSocketReturn {
  const { channel, contextId, autoConnect = true, onMessage } = options;
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(wsManager.getStatus());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const subscriptionId = useRef<string | null>(null);
  const callbackRef = useRef<typeof onMessage | undefined>(onMessage);

  // Keep latest onMessage without resubscribing
  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  // Initialize connection
  useEffect(() => {
    if (!autoConnect) return;

    const initConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setConnecting(true);
          await wsManager.connect(user.id);
          setConnecting(false);
        }
      } catch (error) {
        console.error('[useUnifiedWebSocket] Failed to connect:', error);
        setError(error instanceof Error ? error.message : 'connect failed');
        setConnecting(false);
      }
    };

    initConnection();
  }, [autoConnect]);

  // Subscribe to channel
  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      const cb = callbackRef.current;
      if (cb) cb(message);
    };

    // Subscribe to channel
    subscriptionId.current = wsManager.subscribe(channel, handleMessage, contextId);

    // Listen to connection status updates directly
    const removeStatusListener = wsManager.addStatusListener((next) => {
      setConnected(next.connected);
      setStatus(next);
    });

    return () => {
      // Unsubscribe on cleanup
      if (subscriptionId.current) {
        wsManager.unsubscribe(subscriptionId.current);
      }
      removeStatusListener();
    };
  }, [channel, contextId]);

  // Send generic message
  const send = useCallback((type: string, payload: any) => {
    wsManager.send({
      id: crypto.randomUUID(),
      channel,
      type,
      payload,
      contextId,
      timestamp: new Date().toISOString()
    });
  }, [channel, contextId]);

  // Send conversation message
  const sendMessage = useCallback((content: string, metadata?: any) => {
    if (!contextId) {
      console.error('[useUnifiedWebSocket] contextId required for conversation messages');
      return;
    }
    wsManager.sendConversationMessage(content, contextId, metadata);
  }, [contextId]);

  // Control agent
  const controlAgent = useCallback((
    agentId: string, 
    action: 'pause' | 'resume' | 'stop'
  ) => {
    wsManager.sendAgentControl(agentId, action, contextId);
  }, [contextId]);

  // Edit document
  const editDocument = useCallback((documentId: string, operation: any) => {
    wsManager.sendDocumentEdit(documentId, operation, contextId);
  }, [contextId]);

  // Request prefetch
  const requestPrefetch = useCallback((agentId: string, message: string) => {
    if (!contextId) {
      console.error('[useUnifiedWebSocket] contextId required for prefetch');
      return;
    }
    wsManager.requestPrefetch(agentId, message, contextId);
  }, [contextId]);

  return {
    connected,
    send,
    sendMessage,
    controlAgent,
    editDocument,
    requestPrefetch,
    status
  };
}