/**
 * Command Manifest - Registry and management of available commands
 * Fetches and caches command definitions from backend
 */

import { supabase } from '@/lib/supabase';

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'date';
  required: boolean;
  description?: string;
  default?: any;
  enum?: string[];  // For enum types
}

export interface Command {
  id: string;
  name: string;
  description: string;
  category: 'workspace' | 'document' | 'ai' | 'navigation' | 'settings' | 'help';
  prefix: string;           // Which prefix triggers this (/, //, >, etc.)
  aliases?: string[];       // Alternative names
  parameters?: CommandParameter[];
  shortcut?: string;        // Keyboard shortcut if any
  icon?: string;           // Icon identifier
  enabled: boolean;
  requiresAuth?: boolean;
  requiresPermission?: string;
  handler?: string;        // Backend handler identifier
}

export interface CommandManifest {
  version: string;
  commands: Command[];
  lastUpdated: Date;
}

class CommandManifestService {
  private manifest: CommandManifest | null = null;
  private manifestPromise: Promise<CommandManifest> | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Gets the command manifest, fetching from backend if needed
   */
  async getManifest(): Promise<CommandManifest> {
    const now = Date.now();
    
    // Return cached manifest if still valid
    if (this.manifest && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.manifest;
    }

    // If already fetching, return the existing promise
    if (this.manifestPromise) {
      return this.manifestPromise;
    }

    // Fetch new manifest
    this.manifestPromise = this.fetchManifest();
    
    try {
      this.manifest = await this.manifestPromise;
      this.lastFetch = now;
      return this.manifest;
    } finally {
      this.manifestPromise = null;
    }
  }

  /**
   * Fetches the command manifest from backend
   */
  private async fetchManifest(): Promise<CommandManifest> {
    try {
      // Try to fetch from backend API
      const response = await fetch('/api/v1/commands/manifest');
      if (response.ok) {
        const data = await response.json();
        return {
          version: data.version || '1.0.0',
          commands: data.commands || this.getDefaultCommands(),
          lastUpdated: new Date(data.lastUpdated || Date.now())
        };
      }
    } catch (error) {
      console.warn('Failed to fetch command manifest from backend:', error);
    }

    // Fallback to default commands
    return {
      version: '1.0.0',
      commands: this.getDefaultCommands(),
      lastUpdated: new Date()
    };
  }

  /**
   * Gets default/built-in commands
   */
  private getDefaultCommands(): Command[] {
    return [
      // Slash commands
      {
        id: 'new-workspace',
        name: 'new',
        description: 'Create a new workspace',
        category: 'workspace',
        prefix: '/',
        aliases: ['create', 'workspace'],
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: false,
            description: 'Workspace name'
          }
        ],
        icon: 'plus',
        enabled: true,
        requiresAuth: true
      },
      {
        id: 'switch-workspace',
        name: 'switch',
        description: 'Switch to another workspace',
        category: 'workspace',
        prefix: '/',
        aliases: ['go', 'open'],
        parameters: [
          {
            name: 'workspace',
            type: 'string',
            required: true,
            description: 'Workspace name or ID'
          }
        ],
        shortcut: 'Alt+Tab',
        icon: 'arrow-right',
        enabled: true,
        requiresAuth: true
      },
      {
        id: 'branch',
        name: 'branch',
        description: 'Create a branch from current workspace',
        category: 'workspace',
        prefix: '/',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: false,
            description: 'Branch name'
          }
        ],
        icon: 'git-branch',
        enabled: true,
        requiresAuth: true
      },
      
      // Search commands
      {
        id: 'search-all',
        name: 'search',
        description: 'Search across all content',
        category: 'navigation',
        prefix: '//',
        icon: 'search',
        enabled: true
      },
      
      // Power commands
      {
        id: 'execute-sql',
        name: 'sql',
        description: 'Execute SQL query',
        category: 'ai',
        prefix: '>',
        parameters: [
          {
            name: 'query',
            type: 'string',
            required: true,
            description: 'SQL query to execute'
          }
        ],
        icon: 'database',
        enabled: true,
        requiresPermission: 'admin'
      },
      {
        id: 'run-script',
        name: 'run',
        description: 'Run a script or command',
        category: 'ai',
        prefix: '>',
        icon: 'play',
        enabled: true,
        requiresAuth: true
      },
      
      // Help commands
      {
        id: 'help',
        name: 'help',
        description: 'Show help for commands',
        category: 'help',
        prefix: '?',
        aliases: ['docs', 'guide'],
        shortcut: 'F1',
        icon: 'help-circle',
        enabled: true
      },
      {
        id: 'shortcuts',
        name: 'shortcuts',
        description: 'Show keyboard shortcuts',
        category: 'help',
        prefix: '?',
        icon: 'keyboard',
        enabled: true
      },
      
      // Quick actions
      {
        id: 'quick-note',
        name: 'note',
        description: 'Create a quick note',
        category: 'document',
        prefix: '!',
        parameters: [
          {
            name: 'content',
            type: 'string',
            required: true,
            description: 'Note content'
          }
        ],
        icon: 'sticky-note',
        enabled: true,
        requiresAuth: true
      },
      {
        id: 'quick-task',
        name: 'task',
        description: 'Create a quick task',
        category: 'document',
        prefix: '!',
        parameters: [
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Task title'
          }
        ],
        icon: 'check-square',
        enabled: true,
        requiresAuth: true
      },
      
      // Workspace navigation
      {
        id: 'workspace-home',
        name: 'home',
        description: 'Go to workspace home',
        category: 'workspace',
        prefix: '#',
        icon: 'home',
        enabled: true
      },
      {
        id: 'workspace-settings',
        name: 'settings',
        description: 'Open workspace settings',
        category: 'workspace',
        prefix: '#',
        icon: 'settings',
        enabled: true,
        requiresAuth: true
      },
      
      // Document references
      {
        id: 'doc-open',
        name: 'open',
        description: 'Open a document',
        category: 'document',
        prefix: '^',
        parameters: [
          {
            name: 'document',
            type: 'string',
            required: true,
            description: 'Document name or ID'
          }
        ],
        icon: 'file-text',
        enabled: true
      },
      {
        id: 'doc-recent',
        name: 'recent',
        description: 'Show recent documents',
        category: 'document',
        prefix: '^',
        icon: 'clock',
        enabled: true
      }
    ];
  }

  /**
   * Searches commands based on query and prefix
   */
  async searchCommands(query: string, prefix?: string): Promise<Command[]> {
    const manifest = await this.getManifest();
    let commands = manifest.commands.filter(cmd => cmd.enabled);

    // Filter by prefix if provided
    if (prefix) {
      commands = commands.filter(cmd => cmd.prefix === prefix);
    }

    // If no query, return all matching commands
    if (!query) {
      return commands;
    }

    // Search by name, aliases, and description
    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => {
      const nameMatch = cmd.name.toLowerCase().includes(lowerQuery);
      const aliasMatch = cmd.aliases?.some(alias => 
        alias.toLowerCase().includes(lowerQuery)
      );
      const descMatch = cmd.description.toLowerCase().includes(lowerQuery);
      
      return nameMatch || aliasMatch || descMatch;
    });
  }

  /**
   * Gets a specific command by ID
   */
  async getCommand(commandId: string): Promise<Command | null> {
    const manifest = await this.getManifest();
    return manifest.commands.find(cmd => cmd.id === commandId) || null;
  }

  /**
   * Checks if user has permission for a command
   */
  async canExecuteCommand(command: Command, userId?: string): Promise<boolean> {
    // Check if command requires auth
    if (command.requiresAuth && !userId) {
      return false;
    }

    // Check specific permissions if required
    if (command.requiresPermission) {
      // TODO: Implement permission checking via Supabase
      // For now, return true for demo
      return true;
    }

    return true;
  }

  /**
   * Clears the manifest cache
   */
  clearCache(): void {
    this.manifest = null;
    this.lastFetch = 0;
  }
}

// Export singleton instance
export const commandManifest = new CommandManifestService();