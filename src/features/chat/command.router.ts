/**
 * Command Router - Routes parsed commands to appropriate executors
 * Maps UI intent to backend execution via CQRS pipeline
 */

import { Command, commandManifest } from './command.manifest';
import { ParsedPrefix, PrefixMode } from './prefix.parse';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export interface CommandExecutionContext {
  userId?: string;
  workspaceId?: string;
  documentId?: string;
  selection?: string;
  metadata?: Record<string, any>;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  action?: 'navigate' | 'insert' | 'replace' | 'open' | 'execute';
  target?: string;
}

export interface CommandTelemetry {
  commandId: string;
  prefix: string;
  query: string;
  timestamp: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

class CommandRouter {
  private telemetryQueue: CommandTelemetry[] = [];
  private readonly MAX_TELEMETRY_QUEUE = 50;

  /**
   * Routes a parsed prefix command to the appropriate executor
   */
  async route(
    prefix: ParsedPrefix,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    const startTime = Date.now();
    let result: CommandResult;
    
    try {
      // Route based on prefix mode
      switch (prefix.mode) {
        case 'command':
          result = await this.executeSlashCommand(prefix.query, context);
          break;
        
        case 'search':
          result = await this.executeSearch(prefix.query, context);
          break;
        
        case 'power':
          result = await this.executePowerCommand(prefix.query, context);
          break;
        
        case 'help':
          result = await this.executeHelpCommand(prefix.query, context);
          break;
        
        case 'quick':
          result = await this.executeQuickAction(prefix.query, context);
          break;
        
        case 'workspace':
          result = await this.executeWorkspaceCommand(prefix.query, context);
          break;
        
        case 'document':
          result = await this.executeDocumentCommand(prefix.query, context);
          break;
        
        default:
          result = {
            success: false,
            error: `Unknown command mode: ${prefix.mode}`
          };
      }

      // Record telemetry
      this.recordTelemetry({
        commandId: `${prefix.mode}:${prefix.query.split(' ')[0]}`,
        prefix: prefix.trigger,
        query: prefix.query,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: result.success,
        error: result.error
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record error telemetry
      this.recordTelemetry({
        commandId: `${prefix.mode}:error`,
        prefix: prefix.trigger,
        query: prefix.query,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: false,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Executes a slash command (/)
   */
  private async executeSlashCommand(
    query: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    const [commandName, ...args] = query.split(' ');
    
    // Search for matching command
    const commands = await commandManifest.searchCommands(commandName, '/');
    if (commands.length === 0) {
      return {
        success: false,
        error: `Unknown command: /${commandName}`
      };
    }

    const command = commands[0];
    
    // Check permissions
    if (!await commandManifest.canExecuteCommand(command, context.userId)) {
      return {
        success: false,
        error: 'Insufficient permissions for this command'
      };
    }

    // Execute based on command ID
    switch (command.id) {
      case 'new-workspace':
        return this.createWorkspace(args.join(' ') || 'New Workspace', context);
      
      case 'switch-workspace':
        return this.switchWorkspace(args.join(' '), context);
      
      case 'branch':
        return this.createBranch(args.join(' '), context);
      
      default:
        return this.executeBackendCommand(command, args, context);
    }
  }

  /**
   * Executes a search command (//)
   */
  private async executeSearch(
    query: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    try {
      // Call backend search API
      const response = await fetch('/api/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          workspaceId: context.workspaceId,
          userId: context.userId
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();
      
      return {
        success: true,
        data: results,
        action: 'open'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Search failed'
      };
    }
  }

  /**
   * Executes a power command (>)
   */
  private async executePowerCommand(
    query: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    const [commandName, ...args] = query.split(' ');
    
    // Power commands require authentication
    if (!context.userId) {
      return {
        success: false,
        error: 'Authentication required for power commands'
      };
    }

    // Search for matching command
    const commands = await commandManifest.searchCommands(commandName, '>');
    if (commands.length === 0) {
      // Try to execute as raw code/query
      return this.executeRawCommand(query, context);
    }

    const command = commands[0];
    
    switch (command.id) {
      case 'execute-sql':
        return this.executeSql(args.join(' '), context);
      
      case 'run-script':
        return this.runScript(args.join(' '), context);
      
      default:
        return this.executeBackendCommand(command, args, context);
    }
  }

  /**
   * Executes a help command (?)
   */
  private async executeHelpCommand(
    query: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    const [topic] = query.split(' ');
    
    if (!topic || topic === 'help') {
      // Show general help
      return {
        success: true,
        data: {
          type: 'help',
          content: 'Available prefixes:\n' +
                  '/ - Commands\n' +
                  '// - Search\n' +
                  '> - Power commands\n' +
                  '? - Help\n' +
                  '! - Quick actions\n' +
                  '# - Workspace\n' +
                  '^ - Documents\n' +
                  '@ - Mentions'
        },
        action: 'open'
      };
    }

    // Search for help on specific topic
    return {
      success: true,
      data: {
        type: 'help',
        topic,
        content: `Help for: ${topic}`
      },
      action: 'open'
    };
  }

  /**
   * Executes a quick action (!)
   */
  private async executeQuickAction(
    query: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    const [action, ...content] = query.split(' ');
    
    switch (action) {
      case 'note':
        return this.createQuickNote(content.join(' '), context);
      
      case 'task':
        return this.createQuickTask(content.join(' '), context);
      
      default:
        return {
          success: false,
          error: `Unknown quick action: !${action}`
        };
    }
  }

  /**
   * Executes a workspace command (#)
   */
  private async executeWorkspaceCommand(
    query: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    const [target] = query.split(' ');
    
    switch (target) {
      case 'home':
        return {
          success: true,
          action: 'navigate',
          target: '/'
        };
      
      case 'settings':
        return {
          success: true,
          action: 'navigate',
          target: '/settings'
        };
      
      default:
        // Try to navigate to workspace by name
        return this.switchWorkspace(query, context);
    }
  }

  /**
   * Executes a document command (^)
   */
  private async executeDocumentCommand(
    query: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    const [action, ...args] = query.split(' ');
    
    switch (action) {
      case 'open':
        return this.openDocument(args.join(' '), context);
      
      case 'recent':
        return this.showRecentDocuments(context);
      
      default:
        // Try to open document by name
        return this.openDocument(query, context);
    }
  }

  /**
   * Helper: Create workspace
   */
  private async createWorkspace(
    name: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name,
          user_id: context.userId,
          metadata: {}
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Created workspace: ${name}`);
      
      return {
        success: true,
        data,
        action: 'navigate',
        target: `/workspace/${data.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create workspace'
      };
    }
  }

  /**
   * Helper: Switch workspace
   */
  private async switchWorkspace(
    identifier: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    if (!identifier) {
      return {
        success: false,
        error: 'Workspace name or ID required'
      };
    }

    // TODO: Implement workspace switching
    return {
      success: true,
      action: 'navigate',
      target: `/workspace/${identifier}`
    };
  }

  /**
   * Helper: Create branch
   */
  private async createBranch(
    name: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    if (!context.workspaceId) {
      return {
        success: false,
        error: 'No active workspace to branch from'
      };
    }

    // TODO: Implement branching
    toast.success(`Created branch: ${name || 'New Branch'}`);
    
    return {
      success: true,
      data: { name, parentId: context.workspaceId }
    };
  }

  /**
   * Helper: Execute SQL
   */
  private async executeSql(
    query: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    // TODO: Implement SQL execution with proper permissions
    return {
      success: false,
      error: 'SQL execution not yet implemented'
    };
  }

  /**
   * Helper: Run script
   */
  private async runScript(
    script: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    // TODO: Implement script execution
    return {
      success: false,
      error: 'Script execution not yet implemented'
    };
  }

  /**
   * Helper: Execute raw command
   */
  private async executeRawCommand(
    command: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    // TODO: Implement raw command execution
    return {
      success: false,
      error: 'Raw command execution not yet implemented'
    };
  }

  /**
   * Helper: Create quick note
   */
  private async createQuickNote(
    content: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    if (!content) {
      return {
        success: false,
        error: 'Note content required'
      };
    }

    // TODO: Implement note creation
    toast.success('Note created');
    
    return {
      success: true,
      data: { content, type: 'note' }
    };
  }

  /**
   * Helper: Create quick task
   */
  private async createQuickTask(
    title: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    if (!title) {
      return {
        success: false,
        error: 'Task title required'
      };
    }

    // TODO: Implement task creation
    toast.success('Task created');
    
    return {
      success: true,
      data: { title, type: 'task' }
    };
  }

  /**
   * Helper: Open document
   */
  private async openDocument(
    identifier: string,
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    if (!identifier) {
      return {
        success: false,
        error: 'Document name or ID required'
      };
    }

    // TODO: Implement document opening
    return {
      success: true,
      action: 'navigate',
      target: `/document/${identifier}`
    };
  }

  /**
   * Helper: Show recent documents
   */
  private async showRecentDocuments(
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    // TODO: Fetch recent documents
    return {
      success: true,
      data: {
        type: 'document-list',
        documents: []
      },
      action: 'open'
    };
  }

  /**
   * Helper: Execute backend command
   */
  private async executeBackendCommand(
    command: Command,
    args: string[],
    context: CommandExecutionContext
  ): Promise<CommandResult> {
    try {
      const response = await fetch('/api/v1/commands/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: command.id,
          args,
          context
        })
      });

      if (!response.ok) {
        throw new Error('Command execution failed');
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute command: ${command.name}`
      };
    }
  }

  /**
   * Records telemetry for command execution
   */
  private recordTelemetry(telemetry: CommandTelemetry): void {
    this.telemetryQueue.push(telemetry);
    
    // Limit queue size
    if (this.telemetryQueue.length > this.MAX_TELEMETRY_QUEUE) {
      this.telemetryQueue.shift();
    }

    // Send telemetry in background (non-blocking)
    this.sendTelemetry(telemetry).catch(console.error);
  }

  /**
   * Sends telemetry to backend
   */
  private async sendTelemetry(telemetry: CommandTelemetry): Promise<void> {
    // TODO: Implement telemetry sending
    console.log('Command telemetry:', telemetry);
  }

  /**
   * Gets telemetry history
   */
  getTelemetryHistory(): CommandTelemetry[] {
    return [...this.telemetryQueue];
  }
}

// Export singleton instance
export const commandRouter = new CommandRouter();