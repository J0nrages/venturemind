import { supabase } from '../lib/supabase';
import { Context, AVAILABLE_AGENTS } from '../types/context';

export interface UserContextPreferences {
  auto_create_contexts: boolean;
  default_context_type: string;
  max_contexts: number;
  context_switching_hotkeys: boolean;
  show_context_suggestions: boolean;
}

export interface UserAgentPreferences {
  auto_activate_agents: boolean;
  confidence_threshold: number;
  max_active_agents: number;
  preferred_agents: string[];
  agent_suggestions: boolean;
  agent_notifications: boolean;
}

export interface UserUIPreferences {
  sidebar_position: 'left' | 'right';
  expanded_mode: 'compact' | 'expanded' | 'full';
  show_agent_badges: boolean;
  show_confidence_scores: boolean;
  show_message_stats: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface ModelConfiguration {
  model_name: string;
  temperature: number;
  top_k: number;
  top_p: number;
  max_output_tokens: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface UserModelPreferences {
  default_model: string;
  models: Record<string, ModelConfiguration>;
  agent_specific_models: Record<string, string>; // agent_id -> model_name
}

export interface UserSettings {
  google_docs_token?: string;
  gemini_api_key?: string;
  context_preferences: UserContextPreferences;
  agent_preferences: UserAgentPreferences;
  ui_preferences: UserUIPreferences;
  model_preferences: UserModelPreferences;
}

export interface SavedContext {
  id: string;
  user_id: string;
  context_id: string;
  title: string;
  type: string;
  description?: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  active_agent_ids: string[];
  surface_config: any;
  is_active: boolean;
  archived: boolean;
  parent_context_id?: string;
  created_at: string;
  updated_at: string;
}

export class UserSettingsService {
  // Default preferences
  static readonly DEFAULT_CONTEXT_PREFERENCES: UserContextPreferences = {
    auto_create_contexts: true,
    default_context_type: 'conversation',
    max_contexts: 10,
    context_switching_hotkeys: true,
    show_context_suggestions: true,
  };

  static readonly DEFAULT_AGENT_PREFERENCES: UserAgentPreferences = {
    auto_activate_agents: true,
    confidence_threshold: 30,
    max_active_agents: 5,
    preferred_agents: ['engineer', 'writer'],
    agent_suggestions: true,
    agent_notifications: true,
  };

  static readonly DEFAULT_UI_PREFERENCES: UserUIPreferences = {
    sidebar_position: 'right',
    expanded_mode: 'compact',
    show_agent_badges: true,
    show_confidence_scores: true,
    show_message_stats: false,
    theme: 'system',
  };

  static readonly DEFAULT_MODEL_PREFERENCES: UserModelPreferences = {
    default_model: 'gemini-2.5-flash',
    models: {
      'gemini-2.5-flash': {
        model_name: 'gemini-2.5-flash',
        temperature: 0.7,
        top_k: 40,
        top_p: 0.95,
        max_output_tokens: 2048,
      },
      'gemini-1.5-pro': {
        model_name: 'gemini-1.5-pro',
        temperature: 0.7,
        top_k: 40,
        top_p: 0.95,
        max_output_tokens: 8192,
      },
      'gemini-1.5-flash': {
        model_name: 'gemini-1.5-flash',
        temperature: 0.7,
        top_k: 40,
        top_p: 0.95,
        max_output_tokens: 2048,
      },
    },
    agent_specific_models: {},
  };

  // Load user settings from database
  static async loadUserSettings(userId: string): Promise<UserSettings> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        google_docs_token: data?.google_docs_token,
        gemini_api_key: data?.gemini_api_key,
        context_preferences: data?.context_preferences || this.DEFAULT_CONTEXT_PREFERENCES,
        agent_preferences: data?.agent_preferences || this.DEFAULT_AGENT_PREFERENCES,
        ui_preferences: data?.ui_preferences || this.DEFAULT_UI_PREFERENCES,
        model_preferences: data?.model_preferences || this.DEFAULT_MODEL_PREFERENCES,
      };
    } catch (error) {
      console.error('Error loading user settings:', error);
      return {
        context_preferences: this.DEFAULT_CONTEXT_PREFERENCES,
        agent_preferences: this.DEFAULT_AGENT_PREFERENCES,
        ui_preferences: this.DEFAULT_UI_PREFERENCES,
        model_preferences: this.DEFAULT_MODEL_PREFERENCES,
      };
    }
  }

  // Save user settings to database
  static async saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          google_docs_token: settings.google_docs_token,
          gemini_api_key: settings.gemini_api_key,
          context_preferences: settings.context_preferences,
          agent_preferences: settings.agent_preferences,
          ui_preferences: settings.ui_preferences,
          model_preferences: settings.model_preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  }

  // Load saved contexts for user (using conversation_threads)
  static async loadUserContexts(userId: string): Promise<SavedContext[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Convert conversation_threads to SavedContext format
      return (data || []).map(thread => ({
        id: thread.id,
        user_id: thread.user_id,
        context_id: thread.id, // Use thread ID as context ID
        title: thread.title || 'Untitled Conversation',
        type: thread.type || 'conversation',
        description: thread.description,
        color: thread.color || { primary: '#6366F1', secondary: '#E0E7FF', accent: '#4F46E5' },
        active_agent_ids: thread.active_agent_ids || [],
        surface_config: thread.surface_config || {},
        is_active: thread.status === 'active',
        archived: thread.archived || false,
        parent_context_id: thread.parent_thread_id,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
      }));
    } catch (error) {
      console.error('Error loading user contexts:', error);
      return [];
    }
  }

  // Save context to database (using conversation_threads)
  static async saveUserContext(userId: string, context: Omit<Context, 'conversationHistory' | 'availableAgents'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_threads')
        .upsert({
          id: context.id,
          user_id: userId,
          title: context.title,
          type: context.type,
          description: context.description,
          color: context.color,
          active_agent_ids: context.activeAgents.map(a => a.id),
          surface_config: context.surfaces,
          status: context.isActive ? 'active' : 'inactive',
          archived: context.archived || false,
          parent_thread_id: context.parentContextId,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving user context:', error);
      throw error;
    }
  }

  // Convert saved context back to Context object
  static savedContextToContext(savedContext: SavedContext): Omit<Context, 'conversationHistory'> {
    return {
      id: savedContext.context_id,
      type: savedContext.type as any,
      title: savedContext.title,
      description: savedContext.description,
      color: savedContext.color,
      activeAgents: savedContext.active_agent_ids
        .map(id => AVAILABLE_AGENTS.find(a => a.id === id))
        .filter(Boolean) as any[],
      availableAgents: AVAILABLE_AGENTS,
      surfaces: savedContext.surface_config,
      isActive: savedContext.is_active,
      createdAt: new Date(savedContext.created_at),
      updatedAt: new Date(savedContext.updated_at),
      archived: savedContext.archived,
      parentContextId: savedContext.parent_context_id,
    };
  }

  // Delete/Archive context (using conversation_threads)
  static async archiveUserContext(userId: string, contextId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_threads')
        .update({
          archived: true,
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('id', contextId);

      if (error) throw error;
    } catch (error) {
      console.error('Error archiving user context:', error);
      throw error;
    }
  }

  // Load archived contexts
  static async loadArchivedContexts(userId: string): Promise<SavedContext[]> {
    try {
      const { data, error } = await supabase
        .from('user_contexts')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading archived contexts:', error);
      return [];
    }
  }

  // Restore archived context
  static async restoreUserContext(userId: string, contextId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_contexts')
        .update({
          archived: false,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('context_id', contextId);

      if (error) throw error;
    } catch (error) {
      console.error('Error restoring user context:', error);
      throw error;
    }
  }
}