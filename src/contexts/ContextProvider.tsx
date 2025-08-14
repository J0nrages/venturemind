import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Context, DEFAULT_CONTEXTS, ContextAction, createNewContext, AVAILABLE_AGENTS } from '../types/context';
import { UserSettingsService, UserSettings } from '../services/UserSettingsService';
import { supabase } from '../lib/supabase';
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
  branchContext: (contextId: string, title: string) => string; // Returns new context ID
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
  saveUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  loadUserContexts: () => Promise<void>;
}

const ContextContext = createContext<ContextContextType | null>(null);

interface ContextProviderProps {
  children: ReactNode;
}

export function ContextProvider({ children }: ContextProviderProps) {
  const [state, setState] = useState<ContextState>(() => {
    // Initialize contexts with empty conversation history
    const initialContexts = DEFAULT_CONTEXTS.map(context => ({
      ...context,
      conversationHistory: []
    }));

    return {
      contexts: initialContexts,
      currentContextIndex: 0, // Start with first context
      currentContext: initialContexts[0],
      expandedMode: 'compact',
      documentSurfaceVisible: false,
      agentRailVisible: false,
      userSettings: null,
      isLoading: true,
    };
  });

  // Load user settings and contexts on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Load user settings
          const settings = await UserSettingsService.loadUserSettings(user.id);
          
          // Load saved contexts
          const savedContexts = await UserSettingsService.loadUserContexts(user.id);
          
          if (savedContexts.length > 0) {
            // Convert saved contexts to Context objects
            const contexts = savedContexts.map(sc => ({
              ...UserSettingsService.savedContextToContext(sc),
              conversationHistory: []
            }));
            
            setState(prev => ({
              ...prev,
              contexts,
              currentContextIndex: 0,
              currentContext: contexts[0],
              userSettings: settings,
              expandedMode: settings.ui_preferences.expanded_mode,
              isLoading: false,
            }));
          } else {
            // First time user, start with default context
            setState(prev => ({
              ...prev,
              userSettings: settings,
              expandedMode: settings.ui_preferences.expanded_mode,
              isLoading: false,
            }));
          }
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

  const branchContext = (contextId: string, title: string): string => {
    const sourceContext = state.contexts.find(ctx => ctx.id === contextId);
    if (!sourceContext) return '';

    const branchedContext = {
      ...createNewContext(title),
      conversationHistory: [...sourceContext.conversationHistory],
      parentContextId: contextId,
      activeAgents: [...sourceContext.activeAgents]
    };
    
    setState(prev => ({
      ...prev,
      contexts: [...prev.contexts, branchedContext],
      currentContextIndex: prev.contexts.length,
      currentContext: branchedContext
    }));
    
    return branchedContext.id;
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