import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Context, 
  ContextAction, 
  createNewContext, 
  createMainContext,
  createBranchContext,
  createThreadContext,
  createAgentWorkstream,
  createListenerContext,
  AVAILABLE_AGENTS,
  ContextType,
  ContextVisibility 
} from '../types/context';
import { UserSettingsService, UserSettings } from '../services/UserSettingsService';
import { supabase } from '../lib/supabase';
import { AgentOrchestrator, PrefetchData } from '../services/AgentOrchestrator';
import toast from 'react-hot-toast';

interface ContextState {
  contexts: Context[];
  currentContextIndex: number;
  currentContext: Context;
  expandedMode: 'compact' | 'expanded' | 'full';
  documentSurfaceVisible: boolean;
  agentRailVisible: boolean;
  userSettings: UserSettings | null;
  isLoading: boolean;
}

interface ContextContextType extends ContextState {
  switchContext: (index: number) => void;
  createNewContext: (title: string) => string; // Returns new context ID
  archiveContext: (contextId: string) => void;
  branchContext: (contextId: string, title: string, selectedText?: string, branchPoint?: any) => string; // Returns new context ID
  threadContext: (contextId: string, title: string, selectedText: string) => string; // Returns new context ID
  spawnAgentWorkstream: (agentId: string, parentContextId: string, prefetchData?: PrefetchData, title?: string) => string; // Returns new context ID
  createListenerContext: (agentId: string, parentContextId: string) => string; // Returns new context ID
  renameContext: (contextId: string, title: string) => void;
  addAgentToContext: (contextId: string, agentId: string) => void;
  removeAgentFromContext: (contextId: string, agentId: string) => void;
  toggleDocumentSurface: () => void;
  toggleAgentRail: () => void;
  toggleExpandedMode: () => void;
  updateContextSurface: (contextId: string, surfaceType: string, updates: any) => void;
  updateAgentStatus: (contextId: string, agentId: string, status: any) => void;
  dispatchAction: (action: ContextAction) => void;
  getActiveContexts: () => Context[];
  getContextsByType: (type: ContextType) => Context[];
  getMainContext: () => Context | undefined;
  saveUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  loadUserContexts: () => Promise<void>;
}

const ContextContext = createContext<ContextContextType | null>(null);

interface ContextProviderProps {
  children: ReactNode;
}

export function ContextProvider({ children }: ContextProviderProps) {
  const [state, setState] = useState<ContextState>(() => {
    // Natural session management - check for existing session state
    const sessionState = getSessionState();
    
    if (sessionState && !hasExplicitLogout()) {
      // Natural resume - restore previous state
      return {
        ...sessionState,
        isLoading: true,
      };
    } else {
      // Clean start - single main context
      const mainContext = {
        ...createMainContext(),
        conversationHistory: []
      };
      
      return {
        contexts: [mainContext],
        currentContextIndex: 0,
        currentContext: mainContext,
        expandedMode: 'compact',
        documentSurfaceVisible: false,
        agentRailVisible: false,
        userSettings: null,
        isLoading: true,
      };
    }
  });

  // Load user settings only (not all contexts)
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const settings = await UserSettingsService.loadUserSettings(user.id);
          
          setState(prev => ({
            ...prev,
            userSettings: settings,
            expandedMode: settings.ui_preferences.expanded_mode,
            isLoading: false,
          }));
          
          // Initialize agent listeners for main context
          initializeAgentListeners(state.currentContext.id);
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    loadUserData();
  }, []);
  
  // Session state persistence
  useEffect(() => {
    // Save session state on changes (debounced)
    const timeoutId = setTimeout(() => {
      saveSessionState(state);
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [state]);

  // Initialize agent listeners for background prefetching
  const initializeAgentListeners = (mainContextId: string) => {
    // Use existing AgentOrchestrator instead of creating listener contexts
    AgentOrchestrator.enableBackgroundListening(mainContextId);
    
    // Initialize prefetch handlers
    AgentOrchestrator.initializePrefetchHandlers();
  };

  // Update current context when index changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentContext: prev.contexts[prev.currentContextIndex]
    }));
  }, [state.currentContextIndex]);

  const switchContext = (index: number) => {
    if (index >= 0 && index < state.contexts.length) {
      setState(prev => ({
        ...prev,
        currentContextIndex: index,
        currentContext: prev.contexts[index]
      }));
    }
  };

  const toggleDocumentSurface = () => {
    setState(prev => ({
      ...prev,
      documentSurfaceVisible: !prev.documentSurfaceVisible,
      expandedMode: !prev.documentSurfaceVisible ? 'expanded' : 'compact'
    }));

    // Update current context's document surface visibility
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(context => 
        context.id === prev.currentContext.id
          ? {
              ...context,
              surfaces: {
                ...context.surfaces,
                document: {
                  ...context.surfaces.document!,
                  visible: !prev.documentSurfaceVisible
                }
              }
            }
          : context
      )
    }));
  };

  const toggleAgentRail = () => {
    setState(prev => ({
      ...prev,
      agentRailVisible: !prev.agentRailVisible,
      expandedMode: !prev.agentRailVisible 
        ? (prev.documentSurfaceVisible ? 'full' : 'expanded')
        : (prev.documentSurfaceVisible ? 'expanded' : 'compact')
    }));

    // Update current context's agent surface visibility
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(context => 
        context.id === prev.currentContext.id
          ? {
              ...context,
              surfaces: {
                ...context.surfaces,
                agents: {
                  ...context.surfaces.agents!,
                  visible: !prev.agentRailVisible
                }
              }
            }
          : context
      )
    }));
  };

  const toggleExpandedMode = () => {
    setState(prev => {
      const modes: Array<'compact' | 'expanded' | 'full'> = ['compact', 'expanded', 'full'];
      const currentIndex = modes.indexOf(prev.expandedMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      
      return {
        ...prev,
        expandedMode: modes[nextIndex]
      };
    });
  };

  const updateContextSurface = (contextId: string, surfaceType: string, updates: any) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(context =>
        context.id === contextId
          ? {
              ...context,
              surfaces: {
                ...context.surfaces,
                [surfaceType]: {
                  ...context.surfaces[surfaceType],
                  ...updates
                }
              }
            }
          : context
      )
    }));
  };

  const updateAgentStatus = (contextId: string, agentId: string, status: any) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(context =>
        context.id === contextId
          ? {
              ...context,
              agents: context.agents.map(agent =>
                agent.id === agentId
                  ? { ...agent, ...status }
                  : agent
              )
            }
          : context
      )
    }));
  };

  const createNewContextFunc = (title: string): string => {
    const newContext = {
      ...createNewContext(title),
      conversationHistory: []
    };
    
    setState(prev => ({
      ...prev,
      contexts: [...prev.contexts, newContext],
      currentContextIndex: prev.contexts.length, // Switch to new context
      currentContext: newContext
    }));

    // Save to database if user is logged in
    const saveContext = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await UserSettingsService.saveUserContext(user.id, newContext);
        }
      } catch (error) {
        console.error('Error saving context:', error);
      }
    };
    saveContext();
    
    return newContext.id;
  };

  const archiveContext = (contextId: string) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(ctx => 
        ctx.id === contextId 
          ? { ...ctx, archived: true, isActive: false }
          : ctx
      )
    }));

    // Archive in database
    const archiveInDB = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await UserSettingsService.archiveUserContext(user.id, contextId);
        }
      } catch (error) {
        console.error('Error archiving context:', error);
      }
    };
    archiveInDB();
  };

  // Enhanced branch creation with shared context
  const branchContext = (contextId: string, title: string, selectedText?: string, branchPoint?: any): string => {
    const sourceContext = state.contexts.find(ctx => ctx.id === contextId);
    if (!sourceContext) return '';
    
    const branchedContext = {
      ...createBranchContext(title, contextId, selectedText),
      conversationHistory: [...sourceContext.conversationHistory],
      activeAgents: [...sourceContext.activeAgents],
      metadata: {
        ...createBranchContext(title, contextId, selectedText).metadata,
        branchPoint: branchPoint || {
          messageId: `msg_${Date.now()}`,
          timestamp: new Date()
        },
        selectedText
      }
    };
    
    setState(prev => ({
      ...prev,
      contexts: [...prev.contexts, branchedContext],
      // Keep parent active for branches
      currentContextIndex: prev.contexts.length,
      currentContext: branchedContext
    }));
    
    return branchedContext.id;
  };
  
  // Thread creation (fresh conversation)
  const threadContext = (contextId: string, title: string, selectedText: string): string => {
    const sourceContext = state.contexts.find(ctx => ctx.id === contextId);
    if (!sourceContext) return '';
    
    const threadedContext = {
      ...createThreadContext(title, contextId, selectedText),
      conversationHistory: [], // Fresh start - no inherited history
      activeAgents: [], // Fresh agent state
      metadata: {
        conversationType: 'thread',
        inspirationLink: {
          messageId: `msg_${Date.now()}`,
          selectedText,
          parentContextId: contextId
        }
      }
    };
    
    setState(prev => {
      // Auto-minimize parent for threads
      const updatedContexts = prev.contexts.map(ctx =>
        ctx.id === contextId 
          ? { ...ctx, visibility: ContextVisibility.BACKGROUND }
          : ctx
      );
      
      return {
        ...prev,
        contexts: [...updatedContexts, threadedContext],
        currentContextIndex: updatedContexts.length,
        currentContext: threadedContext
      };
    });
    
    return threadedContext.id;
  };

  // Enhanced agent workstream with prefetched data
  const spawnAgentWorkstream = (agentId: string, parentContextId: string, prefetchData?: PrefetchData, title?: string): string => {
    const agentContext = {
      ...createAgentWorkstream(agentId, parentContextId, title),
      conversationHistory: [],
      metadata: {
        conversationType: 'agent_workstream',
        prefetchData: prefetchData || AgentOrchestrator.getPrefetchedData(agentId, parentContextId),
        suggestedBy: agentId,
        workstreamStatus: 'initializing'
      }
    };
    
    setState(prev => ({
      ...prev,
      contexts: [...prev.contexts, agentContext]
      // Don't change active context - agent runs in background
    }));
    
    return agentContext.id;
  };

  const createListenerContextFunc = (agentId: string, parentContextId: string): string => {
    const listenerContext = {
      ...createListenerContext(agentId, parentContextId),
      conversationHistory: []
    };
    
    setState(prev => ({
      ...prev,
      contexts: [...prev.contexts, listenerContext]
    }));
    
    return listenerContext.id;
  };

  const renameContext = (contextId: string, title: string) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(ctx => 
        ctx.id === contextId 
          ? { ...ctx, title, updatedAt: new Date() }
          : ctx
      )
    }));
  };

  const addAgentToContext = (contextId: string, agentId: string) => {
    const agent = AVAILABLE_AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(ctx => 
        ctx.id === contextId && !ctx.activeAgents.find(a => a.id === agentId)
          ? { 
              ...ctx, 
              activeAgents: [...ctx.activeAgents, { ...agent, status: 'idle' }],
              updatedAt: new Date()
            }
          : ctx
      )
    }));
  };

  const removeAgentFromContext = (contextId: string, agentId: string) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(ctx => 
        ctx.id === contextId 
          ? { 
              ...ctx, 
              activeAgents: ctx.activeAgents.filter(a => a.id !== agentId),
              updatedAt: new Date()
            }
          : ctx
      )
    }));
  };

  const getActiveContexts = (): Context[] => {
    return state.contexts.filter(ctx => ctx.isActive && !ctx.archived);
  };

  const getContextsByType = (type: ContextType): Context[] => {
    return state.contexts.filter(ctx => ctx.type === type && ctx.isActive && !ctx.archived);
  };

  const getMainContext = (): Context | undefined => {
    return state.contexts.find(ctx => ctx.type === ContextType.MAIN);
  };

  const saveUserSettings = async (settings: Partial<UserSettings>): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await UserSettingsService.saveUserSettings(user.id, settings);
        setState(prev => ({
          ...prev,
          userSettings: { ...prev.userSettings!, ...settings }
        }));
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
      throw error;
    }
  };

  const loadUserContexts = async (): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const savedContexts = await UserSettingsService.loadUserContexts(user.id);
        if (savedContexts.length > 0) {
          const contexts = savedContexts.map(sc => ({
            ...UserSettingsService.savedContextToContext(sc),
            conversationHistory: []
          }));
          
          setState(prev => ({
            ...prev,
            contexts,
            currentContextIndex: 0,
            currentContext: contexts[0]
          }));
        }
      }
    } catch (error) {
      console.error('Error loading contexts:', error);
      toast.error('Failed to load contexts');
    }
  };

  const dispatchAction = (action: ContextAction) => {
    switch (action.type) {
      case 'switch':
        switchContext(action.payload);
        break;
      case 'create_context':
        createNewContextFunc(action.payload.title);
        break;
      case 'archive_context':
        archiveContext(action.payload.contextId);
        break;
      case 'branch_context':
        branchContext(action.payload.contextId, action.payload.title);
        break;
      case 'toggle_surface':
        if (action.payload === 'document') {
          toggleDocumentSurface();
        } else if (action.payload === 'agents') {
          toggleAgentRail();
        }
        break;
      case 'expand_mode':
        toggleExpandedMode();
        break;
      case 'agent_action':
        updateAgentStatus(
          action.payload.contextId,
          action.payload.agentId,
          action.payload.status
        );
        break;
      default:
        break;
    }
  };

  const contextValue: ContextContextType = {
    ...state,
    switchContext,
    createNewContext: createNewContextFunc,
    archiveContext,
    branchContext,
    threadContext,
    spawnAgentWorkstream,
    createListenerContext: createListenerContextFunc,
    renameContext,
    addAgentToContext,
    removeAgentFromContext,
    toggleDocumentSurface,
    toggleAgentRail,
    toggleExpandedMode,
    updateContextSurface,
    updateAgentStatus,
    dispatchAction,
    getActiveContexts,
    getContextsByType,
    getMainContext,
    saveUserSettings,
    loadUserContexts,
  };

  return (
    <ContextContext.Provider value={contextValue}>
      {children}
    </ContextContext.Provider>
  );
}

export function useContexts() {
  const context = useContext(ContextContext);
  if (!context) {
    throw new Error('useContexts must be used within a ContextProvider');
  }
  return context;
}

// Hook for accessing current context data
export function useCurrentContext() {
  const { currentContext } = useContexts();
  return currentContext;
}

// Hook for context switching
export function useContextSwitching() {
  const { switchContext, currentContextIndex, contexts } = useContexts();
  
  const switchToNext = () => {
    const nextIndex = (currentContextIndex + 1) % contexts.length;
    switchContext(nextIndex);
  };
  
  const switchToPrevious = () => {
    const prevIndex = (currentContextIndex - 1 + contexts.length) % contexts.length;
    switchContext(prevIndex);
  };
  
  return {
    switchContext,
    switchToNext,
    switchToPrevious,
    currentContextIndex,
    totalContexts: contexts.length
  };
}

// Session state management helpers
function getSessionState(): ContextState | null {
  try {
    const saved = sessionStorage.getItem('syna_session_state');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveSessionState(state: ContextState) {
  try {
    // Only save essential state, not full conversation history
    const stateToSave = {
      ...state,
      contexts: state.contexts.map(ctx => ({
        ...ctx,
        conversationHistory: ctx.conversationHistory.slice(-10) // Keep recent messages only
      }))
    };
    sessionStorage.setItem('syna_session_state', JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save session state:', error);
  }
}

function hasExplicitLogout(): boolean {
  return localStorage.getItem('syna_explicit_logout') === 'true';
}

// Utility to clear session state on explicit logout
export function clearSessionState() {
  sessionStorage.removeItem('syna_session_state');
  localStorage.setItem('syna_explicit_logout', 'true');
}

// Utility to reset logout flag on new session
export function resetLogoutFlag() {
  localStorage.removeItem('syna_explicit_logout');
}