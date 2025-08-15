/**
 * ConversationSpine Refactored to use Unified WebSocket Manager
 * This is an example of how to migrate components
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUnifiedWebSocket } from '../hooks/useUnifiedWebSocket';
import { Context } from '../types/context';
import { supabase } from '../lib/supabase';
import { ConversationMessage, ConversationService } from '../services/ConversationService';
import { WebSocketMessage } from '../services/UnifiedWebSocketManager';

interface ConversationSpineProps {
  context: Context;
  isActive: boolean;
}

export const ConversationSpine: React.FC<ConversationSpineProps> = ({ 
  context, 
  isActive 
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use unified WebSocket with context-specific subscription
  const { 
    connected, 
    sendMessage, 
    controlAgent,
    requestPrefetch,
    status 
  } = useUnifiedWebSocket({
    channel: 'conversation',
    contextId: context.id, // This will be a proper UUID
    autoConnect: isActive,
    onMessage: handleWebSocketMessage
  });

  // Handle incoming WebSocket messages
  function handleWebSocketMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'ai_message':
        const aiMessage: ConversationMessage = {
          id: message.id,
          user_id: user?.id || '',
          content: message.payload.content,
          sender: 'ai',
          created_at: message.timestamp,
          thread_id: context.id, // Using proper UUID
          document_updates: [],
          context_confidence: 0
        };
        setMessages(prev => [...prev, aiMessage]);
        setLoading(false);
        break;

      case 'agent_status':
        console.log(`Agent ${message.agentId} status:`, message.payload);
        break;

      case 'prefetch_complete':
        console.log(`Prefetch data ready:`, message.payload);
        // Handle prefetch data if needed
        break;

      default:
        console.log(`Unhandled message type: ${message.type}`);
    }
  }

  // Initialize user and load messages
  useEffect(() => {
    const initializeChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user && isActive) {
        await loadMessages(user.id);
      }
    };

    initializeChat();
  }, [isActive, context.id]);

  // Load existing messages for context
  const loadMessages = async (userId: string) => {
    try {
      // Now using proper UUID for context.id
      const messagesData = await ConversationService.getConversationHistory(
        userId, 
        30, 
        context.id // This is now a valid UUID
      );
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Send user message
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || loading || !user || !connected) return;
    
    setLoading(true);
    const userMessageContent = currentMessage;
    setCurrentMessage('');

    // Add user message to UI immediately
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      content: userMessageContent,
      sender: 'user',
      created_at: new Date().toISOString(),
      thread_id: context.id, // Using proper UUID
      document_updates: [],
      context_confidence: 0
    };
    setMessages(prev => [...prev, userMessage]);

    // Save to database
    try {
      await ConversationService.saveMessage(userMessage);
    } catch (error) {
      console.error('Failed to save message:', error);
    }

    // Request prefetch for potential agent activation
    if (context.activeAgents.length > 0) {
      context.activeAgents.forEach(agent => {
        requestPrefetch(agent.id, userMessageContent);
      });
    }

    // Send through WebSocket
    sendMessage(userMessageContent, {
      contextType: context.type,
      activeAgents: context.activeAgents.map(a => a.id)
    });
  };

  // Control agents
  const handleAgentControl = (agentId: string, action: 'pause' | 'resume' | 'stop') => {
    controlAgent(agentId, action);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Context: {context.id.substring(0, 8)}...
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.sender === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Active Agents */}
      {context.activeAgents.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Active Agents:</span>
            {context.activeAgents.map(agent => (
              <div key={agent.id} className="flex items-center gap-1">
                <span className="text-xs font-medium">{agent.name}</span>
                <button
                  onClick={() => handleAgentControl(agent.id, agent.status === 'active' ? 'pause' : 'resume')}
                  className="text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300"
                >
                  {agent.status === 'active' ? '⏸' : '▶'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={connected ? "Type a message..." : "Connecting..."}
            disabled={!connected || loading}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!connected || loading || !currentMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        
        {/* WebSocket Status (Debug) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-500">
            Session: {status.sessionId} | 
            Subscriptions: {status.subscriptions} | 
            Queued: {status.queuedMessages}
          </div>
        )}
      </div>
    </div>
  );
};