/**
 * Chat State - Centralized state management for chat
 * Single source of truth for messages, UI preferences, and active panels
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ConversationMessage } from '@/services/ChatService';
import { MentionPill } from './Mentions';

export type ChatPanel = 'now' | 'clips' | 'tasks' | 'docs' | 'none';

export interface ChatUIPreferences {
  showStats: boolean;
  showModelSelector: boolean;
  showWebSearch: boolean;
  webSearchEnabled: boolean;
  selectedModel: string;
  showSettingsBar: boolean;
  compactMode: boolean;
  soundEnabled: boolean;
}

export interface ChatSelection {
  messageId?: string;
  text?: string;
  startIndex?: number;
  endIndex?: number;
}

export interface ChatState {
  // Messages
  messages: ConversationMessage[];
  loading: boolean;
  error: string | null;
  
  // UI State
  activePanel: ChatPanel;
  uiPreferences: ChatUIPreferences;
  selection: ChatSelection | null;
  
  // Input State
  inputValue: string;
  mentionPills: MentionPill[];
  cursorPosition: number;
  
  // Workspace Context
  workspaceId: string | null;
  documentId: string | null;
  userId: string | null;
  
  // Actions
  setMessages: (messages: ConversationMessage[]) => void;
  addMessage: (message: ConversationMessage) => void;
  updateMessage: (id: string, updates: Partial<ConversationMessage>) => void;
  deleteMessage: (id: string) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  setActivePanel: (panel: ChatPanel) => void;
  updateUIPreferences: (prefs: Partial<ChatUIPreferences>) => void;
  setSelection: (selection: ChatSelection | null) => void;
  
  setInputValue: (value: string) => void;
  setMentionPills: (pills: MentionPill[]) => void;
  setCursorPosition: (position: number) => void;
  
  setWorkspaceId: (id: string | null) => void;
  setDocumentId: (id: string | null) => void;
  setUserId: (id: string | null) => void;
  
  // Computed
  getMessageById: (id: string) => ConversationMessage | undefined;
  getThreadMessages: (parentId: string) => ConversationMessage[];
  getRecentMessages: (limit?: number) => ConversationMessage[];
  
  // Persistence
  saveState: () => void;
  loadState: () => void;
  clearState: () => void;
}

const DEFAULT_UI_PREFERENCES: ChatUIPreferences = {
  showStats: false,
  showModelSelector: true,
  showWebSearch: true,
  webSearchEnabled: true,
  selectedModel: 'gemini-2.5-flash',
  showSettingsBar: false,
  compactMode: false,
  soundEnabled: true
};

/**
 * Create the chat store with Zustand
 */
export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    messages: [],
    loading: false,
    error: null,
    
    activePanel: 'none',
    uiPreferences: DEFAULT_UI_PREFERENCES,
    selection: null,
    
    inputValue: '',
    mentionPills: [],
    cursorPosition: 0,
    
    workspaceId: null,
    documentId: null,
    userId: null,
    
    // Message actions
    setMessages: (messages) => set({ messages }),
    
    addMessage: (message) => set((state) => ({
      messages: [...state.messages, message]
    })),
    
    updateMessage: (id, updates) => set((state) => ({
      messages: state.messages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    })),
    
    deleteMessage: (id) => set((state) => ({
      messages: state.messages.filter(msg => msg.id !== id)
    })),
    
    // Loading/error actions
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    
    // UI actions
    setActivePanel: (panel) => set({ activePanel: panel }),
    
    updateUIPreferences: (prefs) => set((state) => ({
      uiPreferences: { ...state.uiPreferences, ...prefs }
    })),
    
    setSelection: (selection) => set({ selection }),
    
    // Input actions
    setInputValue: (value) => set({ inputValue: value }),
    setMentionPills: (pills) => set({ mentionPills: pills }),
    setCursorPosition: (position) => set({ cursorPosition: position }),
    
    // Context actions
    setWorkspaceId: (id) => set({ workspaceId: id }),
    setDocumentId: (id) => set({ documentId: id }),
    setUserId: (id) => set({ userId: id }),
    
    // Computed getters
    getMessageById: (id) => {
      return get().messages.find(msg => msg.id === id);
    },
    
    getThreadMessages: (parentId) => {
      return get().messages.filter(msg => msg.parent_message_id === parentId);
    },
    
    getRecentMessages: (limit = 10) => {
      const messages = get().messages;
      return messages.slice(-limit);
    },
    
    // Persistence
    saveState: () => {
      const state = get();
      const stateToSave = {
        uiPreferences: state.uiPreferences,
        activePanel: state.activePanel,
        workspaceId: state.workspaceId,
        documentId: state.documentId
      };
      
      try {
        localStorage.setItem('chat-state', JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Failed to save chat state:', error);
      }
    },
    
    loadState: () => {
      try {
        const saved = localStorage.getItem('chat-state');
        if (saved) {
          const state = JSON.parse(saved);
          set({
            uiPreferences: { ...DEFAULT_UI_PREFERENCES, ...state.uiPreferences },
            activePanel: state.activePanel || 'none',
            workspaceId: state.workspaceId,
            documentId: state.documentId
          });
        }
      } catch (error) {
        console.error('Failed to load chat state:', error);
      }
    },
    
    clearState: () => {
      set({
        messages: [],
        loading: false,
        error: null,
        activePanel: 'none',
        uiPreferences: DEFAULT_UI_PREFERENCES,
        selection: null,
        inputValue: '',
        mentionPills: [],
        cursorPosition: 0
      });
      
      try {
        localStorage.removeItem('chat-state');
      } catch (error) {
        console.error('Failed to clear chat state:', error);
      }
    }
  }))
);

/**
 * Selectors for common state queries
 */
export const chatSelectors = {
  // Get unread message count
  getUnreadCount: (state: ChatState) => {
    // TODO: Track read status
    return 0;
  },
  
  // Get messages for current workspace
  getWorkspaceMessages: (state: ChatState) => {
    if (!state.workspaceId) return [];
    return state.messages.filter(msg => msg.thread_id === state.workspaceId);
  },
  
  // Check if user has scrolled to bottom
  isAtBottom: (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    return scrollHeight - scrollTop - clientHeight < 100;
  },
  
  // Get active agent mentions
  getAgentMentions: (state: ChatState) => {
    return state.mentionPills.filter(pill => pill.type === 'agent');
  }
};

/**
 * Subscribe to specific state changes
 */
export const subscribeToChatState = (
  selector: (state: ChatState) => any,
  callback: (value: any) => void
) => {
  return useChatStore.subscribe(selector, callback);
};

// Auto-save UI preferences
useChatStore.subscribe(
  (state) => state.uiPreferences,
  () => {
    useChatStore.getState().saveState();
  }
);