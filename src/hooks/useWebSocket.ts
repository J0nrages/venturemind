import { useEffect, useState, useRef, useCallback } from 'react';
import { WebSocketMessage, DocumentPresence, CollaborationState } from '../services/WebSocketService';

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  documentState: CollaborationState | null;
  activeUsers: DocumentPresence[];
  aiActions: any[];
  toolCalls: any[];
  documentOperations: any[];
}

export function useWebSocket(userId: string | null, sessionId?: string) {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
    documentState: null,
    activeUsers: [],
    aiActions: [],
    toolCalls: [],
    documentOperations: []
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Interval | null>(null);
  const currentDocumentRef = useRef<string | null>(null);

  const generateSessionId = useCallback(() => {
    return sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [sessionId]);

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      // In production, this would be your actual WebSocket endpoint
      // For now, we'll simulate the connection
      const mockWs = {
        readyState: WebSocket.OPEN,
        send: (data: string) => {
          console.log('WebSocket send (simulated):', data);
        },
        close: () => {
          console.log('WebSocket close (simulated)');
        },
        onopen: null as any,
        onmessage: null as any,
        onclose: null as any,
        onerror: null as any
      };

      wsRef.current = mockWs as any;

      // Simulate connection established
      setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false 
        }));
        
        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          sendMessage({
            type: 'ping',
            payload: {},
            timestamp: new Date().toISOString(),
            user_id: userId,
            session_id: generateSessionId()
          });
        }, 30000); // Ping every 30 seconds
      }, 100);

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setState(prev => ({ 
        ...prev, 
        connecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      }));
    }
  }, [userId, generateSessionId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      connected: false, 
      connecting: false,
      activeUsers: [],
      aiActions: [],
      toolCalls: []
    }));
  }, []);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'user_id' | 'session_id'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !userId) return;

    const fullMessage: WebSocketMessage = {
      ...message,
      user_id: userId,
      session_id: generateSessionId()
    };

    try {
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, [userId, generateSessionId]);

  const joinDocument = useCallback((documentId: string) => {
    currentDocumentRef.current = documentId;
    
    return sendMessage({
      type: 'join_document',
      payload: { document_id: documentId },
      timestamp: new Date().toISOString(),
      document_id: documentId
    });
  }, [sendMessage]);

  const leaveDocument = useCallback(() => {
    const documentId = currentDocumentRef.current;
    if (!documentId) return;

    const success = sendMessage({
      type: 'leave_document',
      payload: { document_id: documentId },
      timestamp: new Date().toISOString(),
      document_id: documentId
    });

    if (success) {
      currentDocumentRef.current = null;
      setState(prev => ({
        ...prev,
        documentState: null,
        activeUsers: []
      }));
    }

    return success;
  }, [sendMessage]);

  const sendDocumentEdit = useCallback((operation: any, version: number, checksum: string) => {
    const documentId = currentDocumentRef.current;
    if (!documentId) return false;

    return sendMessage({
      type: 'document_edit',
      payload: { operation, version, checksum },
      timestamp: new Date().toISOString(),
      document_id: documentId
    });
  }, [sendMessage]);

  const sendCursorMove = useCallback((cursorPosition: any, selectionRange?: any) => {
    const documentId = currentDocumentRef.current;
    if (!documentId) return false;

    return sendMessage({
      type: 'cursor_move',
      payload: { cursor_position: cursorPosition, selection_range: selectionRange },
      timestamp: new Date().toISOString(),
      document_id: documentId
    });
  }, [sendMessage]);

  const updatePresence = useCallback((status: 'viewing' | 'editing' | 'idle') => {
    const documentId = currentDocumentRef.current;
    if (!documentId) return false;

    return sendMessage({
      type: 'presence_update',
      payload: { status },
      timestamp: new Date().toISOString(),
      document_id: documentId
    });
  }, [sendMessage]);

  // Auto-connect when userId is available
  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // Handle incoming messages (simulated for now)
  useEffect(() => {
    if (!wsRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        setState(prev => ({ ...prev, lastMessage: message }));

        switch (message.type) {
          case 'document_state':
            setState(prev => ({ 
              ...prev, 
              documentState: message.payload 
            }));
            break;

          case 'user_joined':
            setState(prev => ({
              ...prev,
              activeUsers: [
                ...prev.activeUsers.filter(u => u.user_id !== message.payload.user_id),
                {
                  user_id: message.payload.user_id,
                  user_info: message.payload.user_info,
                  status: 'viewing',
                  cursor_position: {},
                  selection_range: {},
                  session_id: message.payload.session_id,
                  last_seen_at: message.timestamp
                }
              ]
            }));
            break;

          case 'user_left':
            setState(prev => ({
              ...prev,
              activeUsers: prev.activeUsers.filter(u => 
                u.user_id !== message.payload.user_id || 
                u.session_id !== message.payload.session_id
              )
            }));
            break;

          case 'cursor_update':
            setState(prev => ({
              ...prev,
              activeUsers: prev.activeUsers.map(user =>
                user.user_id === message.payload.user_id
                  ? {
                      ...user,
                      cursor_position: message.payload.cursor_position,
                      selection_range: message.payload.selection_range,
                      last_seen_at: message.timestamp
                    }
                  : user
              )
            }));
            break;

          case 'document_operation':
            setState(prev => ({
              ...prev,
              documentOperations: [message.payload, ...prev.documentOperations.slice(0, 49)]
            }));
            break;

          case 'ai_action':
            setState(prev => ({
              ...prev,
              aiActions: [message.payload, ...prev.aiActions.slice(0, 19)]
            }));
            break;

          case 'tool_call':
            setState(prev => ({
              ...prev,
              toolCalls: [message.payload, ...prev.toolCalls.slice(0, 19)]
            }));
            break;

          case 'document_sync':
            setState(prev => ({
              ...prev,
              documentState: message.payload
            }));
            break;
        }
      } catch (parseError) {
        console.error('Error parsing WebSocket message:', parseError);
      }
    };

    // For simulation, we'll attach this handler
    if (wsRef.current.onmessage) {
      wsRef.current.onmessage = handleMessage;
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    joinDocument,
    leaveDocument,
    sendDocumentEdit,
    sendCursorMove,
    updatePresence,
    currentDocument: currentDocumentRef.current
  };
}