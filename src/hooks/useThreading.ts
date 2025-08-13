import { useState, useEffect, useCallback } from 'react';
import { ConversationMessage, ConversationThread, ConversationService } from '../services/ConversationService';
import { threadingApi } from '../lib/api';
import { websocketService } from '../services/WebSocketService';
import { useWebSocket } from './useWebSocket';
import toast from 'react-hot-toast';

export interface ThreadingState {
  messages: ConversationMessage[];
  threads: ConversationThread[];
  activeThreadId: string | null;
  loading: boolean;
  showArchived: boolean;
  error: string | null;
}

export function useThreading(userId: string | null) {
  const [state, setState] = useState<ThreadingState>({
    messages: [],
    threads: [],
    activeThreadId: null,
    loading: false,
    showArchived: false,
    error: null
  });

  // WebSocket connection for real-time updates
  const { connected } = useWebSocket(userId);

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadThreads();
    }
  }, [userId]);

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (!connected) return;

    const handleThreadTitleUpdate = (data: any) => {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === data.messageId
            ? {
                ...msg,
                thread_title: data.title,
                thread_summary: data.summary,
                thread_title_status: data.status
              }
            : msg
        )
      }));
      
      if (data.status === 'completed') {
        toast.success(`Thread title updated: "${data.title}"`);
      }
    };

    const handleMessageArchived = (data: any) => {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === data.messageId
            ? { ...msg, archived_at: data.timestamp, archived_by: data.archivedBy }
            : msg
        )
      }));
      toast.success('Message archived');
    };

    const handleMessageRestored = (data: any) => {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === data.messageId
            ? { ...msg, archived_at: undefined, archived_by: undefined }
            : msg
        )
      }));
      toast.success('Message restored');
    };

    const handleBranchCreated = (data: any) => {
      toast.success('New discussion branch created');
      // Refresh threads to include new branch
      loadThreads();
    };

    const handleReplyCreated = (data: any) => {
      // Add new reply to current messages if in same thread
      if (data.threadId === state.activeThreadId) {
        loadThreadMessages(data.threadId);
      }
    };

    const handleSummarizationUpdate = (data: any) => {
      const { status, messageId, title, summary, error } = data;
      
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                thread_title_status: status,
                thread_title: title || msg.thread_title,
                thread_summary: summary || msg.thread_summary
              }
            : msg
        )
      }));

      if (status === 'failed') {
        toast.error(`Title generation failed: ${error || 'Unknown error'}`);
      }
    };

    // Subscribe to WebSocket events
    websocketService.on('thread:title_updated', handleThreadTitleUpdate);
    websocketService.on('message:archived', handleMessageArchived);
    websocketService.on('message:restored', handleMessageRestored);
    websocketService.on('thread:branch_created', handleBranchCreated);
    websocketService.on('message:reply_created', handleReplyCreated);
    websocketService.on('summarization:update', handleSummarizationUpdate);

    return () => {
      websocketService.off('thread:title_updated', handleThreadTitleUpdate);
      websocketService.off('message:archived', handleMessageArchived);
      websocketService.off('message:restored', handleMessageRestored);
      websocketService.off('thread:branch_created', handleBranchCreated);
      websocketService.off('message:reply_created', handleReplyCreated);
      websocketService.off('summarization:update', handleSummarizationUpdate);
    };
  }, [connected, state.activeThreadId]);

  const loadThreads = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await threadingApi.getThreads({ limit: 50 });
      if (response.data?.threads) {
        setState(prev => ({ ...prev, threads: response.data.threads }));
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
      setState(prev => ({ ...prev, error: 'Failed to load threads' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [userId]);

  const loadThreadMessages = useCallback(async (threadId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await threadingApi.getThreadMessages(threadId, state.showArchived);
      if (response.data?.messages) {
        setState(prev => ({ 
          ...prev, 
          messages: response.data.messages,
          activeThreadId: threadId
        }));
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      setState(prev => ({ ...prev, error: 'Failed to load messages' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.showArchived]);

  const archiveMessage = useCallback(async (messageId: string) => {
    try {
      const response = await threadingApi.archiveMessage(messageId);
      if (!response.data?.success) {
        throw new Error('Archive failed');
      }
      // Real-time update will be handled by WebSocket
    } catch (error) {
      console.error('Failed to archive message:', error);
      toast.error('Failed to archive message');
    }
  }, []);

  const restoreMessage = useCallback(async (messageId: string) => {
    try {
      const response = await threadingApi.restoreMessage(messageId);
      if (!response.data?.success) {
        throw new Error('Restore failed');
      }
      // Real-time update will be handled by WebSocket
    } catch (error) {
      console.error('Failed to restore message:', error);
      toast.error('Failed to restore message');
    }
  }, []);

  const createReply = useCallback(async (replyToMessageId: string, content: string, quotedText?: string) => {
    try {
      const response = await threadingApi.createReply({
        replyToMessageId,
        content,
        quotedText
      });
      
      if (response.data?.message) {
        // Real-time update will be handled by WebSocket
        return response.data.message;
      }
      
      throw new Error('Reply creation failed');
    } catch (error) {
      console.error('Failed to create reply:', error);
      toast.error('Failed to create reply');
      return null;
    }
  }, []);

  const createBranch = useCallback(async (parentMessageId: string, selectedText: string, initialMessage: string) => {
    try {
      const response = await threadingApi.createBranch({
        parentMessageId,
        selectedText,
        initialMessage
      });
      
      if (response.data?.message) {
        // Real-time update will be handled by WebSocket
        return response.data.message;
      }
      
      throw new Error('Branch creation failed');
    } catch (error) {
      console.error('Failed to create branch:', error);
      toast.error('Failed to create branch');
      return null;
    }
  }, []);

  const toggleShowArchived = useCallback(() => {
    setState(prev => ({ ...prev, showArchived: !prev.showArchived }));
    
    // Reload current thread messages if active
    if (state.activeThreadId) {
      loadThreadMessages(state.activeThreadId);
    }
  }, [state.activeThreadId, loadThreadMessages]);

  const selectThread = useCallback((threadId: string) => {
    loadThreadMessages(threadId);
  }, [loadThreadMessages]);

  const newThread = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      messages: [], 
      activeThreadId: null 
    }));
  }, []);

  return {
    ...state,
    // Actions
    loadThreads,
    loadThreadMessages,
    archiveMessage,
    restoreMessage,
    createReply,
    createBranch,
    toggleShowArchived,
    selectThread,
    newThread,
    // WebSocket status
    connected
  };
}