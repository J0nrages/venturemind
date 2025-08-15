import { useEffect, useState, useRef } from 'react';
import { SSEEvent } from '../services/SSEService';

export interface SSEConnectionState {
  connected: boolean;
  events: SSEEvent[];
  error: string | null;
  activeActions: string[];
  retrievedClips: any[];
  updatedDocs: string[];
}

export function useSSEConnection(userId: string | null) {
  const [state, setState] = useState<SSEConnectionState>({
    connected: false,
    events: [],
    error: null,
    activeActions: [],
    retrievedClips: [],
    updatedDocs: []
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!userId || eventSourceRef.current) return;

    try {
      // Use VITE_API_URL if set, otherwise use relative path
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const sseUrl = `${baseUrl}/api/events?user_id=${userId}`;
      
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          error: null 
        }));
      };

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          
          setState(prev => {
            const newState = { ...prev };
            newState.events = [sseEvent, ...prev.events.slice(0, 99)]; // Keep last 100 events
            
            // Update specific state based on event type
            switch (sseEvent.type) {
              case 'action_start':
                if (!newState.activeActions.includes(sseEvent.data.action_type)) {
                  newState.activeActions = [...newState.activeActions, sseEvent.data.action_type];
                }
                break;
                
              case 'action_complete':
                newState.activeActions = newState.activeActions.filter(
                  action => action !== sseEvent.data.action_type
                );
                break;
                
              case 'clip_retrieved':
                newState.retrievedClips = [
                  sseEvent.data,
                  ...newState.retrievedClips.slice(0, 9)
                ]; // Keep last 10 clips
                break;
                
              case 'doc_updated':
                if (!newState.updatedDocs.includes(sseEvent.data.document_name)) {
                  newState.updatedDocs = [
                    sseEvent.data.document_name,
                    ...newState.updatedDocs.slice(0, 4)
                  ]; // Keep last 5 docs
                }
                break;
            }
            
            return newState;
          });
        } catch (parseError) {
          console.error('Error parsing SSE event:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setState(prev => ({ 
          ...prev, 
          connected: false,
          error: 'Connection lost, attempting to reconnect...' 
        }));
        
        // Attempt to reconnect after a delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          connect();
        }, 3000);
      };

    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to connect to real-time updates' 
      }));
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setState(prev => ({ 
      ...prev, 
      connected: false,
      activeActions: [],
      error: null
    }));
  };

  const clearEvents = () => {
    setState(prev => ({ 
      ...prev, 
      events: [],
      retrievedClips: [],
      updatedDocs: []
    }));
  };

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId]);

  return {
    ...state,
    connect,
    disconnect,
    clearEvents
  };
}