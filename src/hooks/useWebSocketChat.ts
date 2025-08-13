/**
 * React hook for WebSocket chat with multi-agent orchestration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService, WebSocketMessage, AgentState } from '../services/WebSocketService';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  agentId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UseWebSocketChatOptions {
  sessionId: string;
  onAgentMessage?: (agentId: string, content: string) => void;
  onDocumentUpdate?: (documentId: string, edit: any) => void;
  onConnectionChange?: (event: any) => void;
  autoConnect?: boolean;
}

export function useWebSocketChat(options: UseWebSocketChatOptions) {
  const { sessionId, onAgentMessage, onDocumentUpdate, onConnectionChange, autoConnect = true } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentStates, setAgentStates] = useState<Map<string, AgentState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    if (!autoConnect) return;

    const handleConnected = () => {
      setIsConnected(true);
      console.log('WebSocket connected in hook');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected in hook');
    };

    const handleAgentMessage = ({ agentId, content, metadata }: any) => {
      const newMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        content,
        sender: 'agent',
        agentId,
        timestamp: new Date(),
        metadata
      };
      
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(null);
      
      if (onAgentMessage) {
        onAgentMessage(agentId, content);
      }
    };

    const handleAgentStatus = ({ agentId, status }: any) => {
      setAgentStates(prev => {
        const newStates = new Map(prev);
        const currentState = newStates.get(agentId) || { id: agentId, status: 'disconnected' };
        currentState.status = status;
        newStates.set(agentId, currentState);
        return newStates;
      });

      // Show typing indicator for active agents
      if (status === 'active') {
        setIsTyping(agentId);
      } else if (status === 'paused' || status === 'disconnected') {
        setIsTyping(current => current === agentId ? null : current);
      }
    };

    const handleDocumentUpdateEvent = (event: any) => {
      if (onDocumentUpdate) {
        onDocumentUpdate(event.documentId, event.edit);
      }
    };

    const handleConnectionChangeEvent = (event: any) => {
      if (onConnectionChange) {
        onConnectionChange(event);
      }
    };

    const handleServerError = (error: string) => {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: `System error: ${error}`,
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    };

    // Set up event listeners
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('agent:message', handleAgentMessage);
    websocketService.on('agent:status', handleAgentStatus);
    websocketService.on('document:update', handleDocumentUpdateEvent);
    websocketService.on('connection:change', handleConnectionChangeEvent);
    websocketService.on('server:error', handleServerError);

    // Connect to WebSocket
    websocketService.connect(sessionId);

    // Cleanup
    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('agent:message', handleAgentMessage);
      websocketService.off('agent:status', handleAgentStatus);
      websocketService.off('document:update', handleDocumentUpdateEvent);
      websocketService.off('connection:change', handleConnectionChangeEvent);
      websocketService.off('server:error', handleServerError);
      
      // Don't disconnect here as other components might be using it
      // websocketService.disconnect();
    };
  }, [sessionId, autoConnect, onAgentMessage, onDocumentUpdate, onConnectionChange]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send a message
  const sendMessage = useCallback((content: string, context?: Record<string, any>) => {
    if (!content.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date(),
      metadata: context
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send via WebSocket
    websocketService.sendMessage(content, context);
  }, []);

  // Pause an agent
  const pauseAgent = useCallback((agentId: string) => {
    websocketService.pauseAgent(agentId);
  }, []);

  // Resume an agent
  const resumeAgent = useCallback((agentId: string) => {
    websocketService.resumeAgent(agentId);
  }, []);

  // Send document edit
  const sendDocumentEdit = useCallback((documentId: string, edit: any) => {
    websocketService.sendDocumentEdit(documentId, edit);
  }, []);

  // Sync context
  const syncContext = useCallback((context: Record<string, any>) => {
    websocketService.syncContext(context);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Get active agents
  const getActiveAgents = useCallback(() => {
    return Array.from(agentStates.values()).filter(agent => 
      agent.status === 'active' || agent.status === 'paused'
    );
  }, [agentStates]);

  return {
    // State
    messages,
    agentStates,
    isConnected,
    isTyping,
    messagesEndRef,
    
    // Actions
    sendMessage,
    pauseAgent,
    resumeAgent,
    sendDocumentEdit,
    syncContext,
    clearMessages,
    getActiveAgents,
    
    // Utilities
    scrollToBottom
  };
}