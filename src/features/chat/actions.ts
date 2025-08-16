/**
 * Actions - Typed UI actions for chat
 * Centralized action definitions and handlers
 */

import { ConversationMessage } from '@/services/ChatService';
import { MentionPill } from './Mentions';
import { useChatStore, ChatPanel } from './chat.state';
import { commandRouter, CommandExecutionContext } from './command.router';
import { parsePrefix } from './prefix.parse';
import toast from 'react-hot-toast';

export type ActionType = 
  | 'send-message'
  | 'edit-message'
  | 'delete-message'
  | 'reply-to-message'
  | 'branch-workspace'
  | 'thread-workspace'
  | 'open-panel'
  | 'close-panel'
  | 'execute-command'
  | 'open-document'
  | 'switch-workspace'
  | 'toggle-setting'
  | 'copy-message'
  | 'archive-message'
  | 'pin-message';

export interface Action {
  type: ActionType;
  payload?: any;
  timestamp: number;
  userId?: string;
}

export interface SendMessagePayload {
  content: string;
  mentions?: MentionPill[];
  parentMessageId?: string;
  metadata?: Record<string, any>;
}

export interface ExecuteCommandPayload {
  command: string;
  context?: CommandExecutionContext;
}

export interface OpenPanelPayload {
  panel: ChatPanel;
  data?: any;
}

export interface BranchWorkspacePayload {
  name?: string;
  parentWorkspaceId: string;
  selectedText?: string;
  context?: Record<string, any>;
}

/**
 * Chat actions class - handles all chat-related actions
 */
export class ChatActions {
  private store = useChatStore.getState();
  private actionHistory: Action[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Send a message
   */
  async sendMessage(payload: SendMessagePayload): Promise<void> {
    this.recordAction('send-message', payload);
    
    const { content, mentions, parentMessageId, metadata } = payload;
    
    // Check if this is a command
    const parsed = parsePrefix(content, content.length);
    if (parsed) {
      // Execute as command
      await this.executeCommand({ command: content });
      return;
    }
    
    // Create message object
    const message: Partial<ConversationMessage> = {
      content,
      sender: 'user',
      user_id: this.store.userId || undefined,
      parent_message_id: parentMessageId,
      thread_id: this.store.workspaceId || undefined,
      document_updates: [],
      context_confidence: 0,
      metadata: {
        ...metadata,
        mentions: mentions?.map(m => ({
          id: m.id,
          type: m.type,
          name: m.name
        }))
      }
    };
    
    // Add to store optimistically
    const tempId = `temp-${Date.now()}`;
    this.store.addMessage({
      ...message,
      id: tempId,
      created_at: new Date().toISOString()
    } as ConversationMessage);
    
    try {
      // Send to backend
      // TODO: Implement actual backend call
      console.log('Sending message:', message);
      
      // Simulate success
      toast.success('Message sent');
    } catch (error) {
      // Remove optimistic message on error
      this.store.deleteMessage(tempId);
      toast.error('Failed to send message');
      console.error('Send message error:', error);
    }
  }

  /**
   * Execute a command
   */
  async executeCommand(payload: ExecuteCommandPayload): Promise<void> {
    this.recordAction('execute-command', payload);
    
    const { command, context } = payload;
    
    // Parse the command
    const parsed = parsePrefix(command, command.length);
    if (!parsed) {
      toast.error('Invalid command format');
      return;
    }
    
    // Create execution context
    const executionContext: CommandExecutionContext = {
      userId: this.store.userId || undefined,
      workspaceId: this.store.workspaceId || undefined,
      documentId: this.store.documentId || undefined,
      ...context
    };
    
    try {
      // Route and execute command
      const result = await commandRouter.route(parsed, executionContext);
      
      if (result.success) {
        // Handle result based on action type
        switch (result.action) {
          case 'navigate':
            if (result.target) {
              window.location.href = result.target;
            }
            break;
          
          case 'insert':
            // Insert text at cursor
            this.store.setInputValue(
              this.store.inputValue + (result.data || '')
            );
            break;
          
          case 'replace':
            // Replace input value
            this.store.setInputValue(result.data || '');
            break;
          
          case 'open':
            // Open in panel or modal
            this.openPanel({ 
              panel: 'docs', 
              data: result.data 
            });
            break;
        }
        
        toast.success('Command executed');
      } else {
        toast.error(result.error || 'Command failed');
      }
    } catch (error) {
      toast.error('Failed to execute command');
      console.error('Command execution error:', error);
    }
  }

  /**
   * Open a panel
   */
  openPanel(payload: OpenPanelPayload): void {
    this.recordAction('open-panel', payload);
    this.store.setActivePanel(payload.panel);
    
    // Store panel data if provided
    if (payload.data) {
      // TODO: Store panel-specific data
      console.log('Panel data:', payload.data);
    }
  }

  /**
   * Close the active panel
   */
  closePanel(): void {
    this.recordAction('close-panel');
    this.store.setActivePanel('none');
  }

  /**
   * Branch a workspace
   */
  async branchWorkspace(payload: BranchWorkspacePayload): Promise<void> {
    this.recordAction('branch-workspace', payload);
    
    const { name, parentWorkspaceId, selectedText, context } = payload;
    
    try {
      // TODO: Implement workspace branching via backend
      console.log('Branching workspace:', payload);
      
      // Simulate success
      const newWorkspaceId = `workspace-${Date.now()}`;
      toast.success(`Created branch: ${name || 'New Branch'}`);
      
      // Navigate to new workspace
      window.location.href = `/workspace/${newWorkspaceId}`;
    } catch (error) {
      toast.error('Failed to create branch');
      console.error('Branch workspace error:', error);
    }
  }

  /**
   * Create a thread (new workspace without context)
   */
  async threadWorkspace(name?: string, selectedText?: string): Promise<void> {
    this.recordAction('thread-workspace', { name, selectedText });
    
    try {
      // TODO: Implement thread creation via backend
      console.log('Creating thread:', { name, selectedText });
      
      // Simulate success
      const newWorkspaceId = `thread-${Date.now()}`;
      toast.success(`Created thread: ${name || 'New Thread'}`);
      
      // Navigate to new thread
      window.location.href = `/workspace/${newWorkspaceId}`;
    } catch (error) {
      toast.error('Failed to create thread');
      console.error('Thread workspace error:', error);
    }
  }

  /**
   * Reply to a message
   */
  async replyToMessage(
    messageId: string, 
    content: string, 
    quotedText?: string
  ): Promise<void> {
    this.recordAction('reply-to-message', { messageId, content, quotedText });
    
    await this.sendMessage({
      content,
      parentMessageId: messageId,
      metadata: { quotedText }
    });
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newContent: string): Promise<void> {
    this.recordAction('edit-message', { messageId, newContent });
    
    try {
      // Update in store
      this.store.updateMessage(messageId, { content: newContent });
      
      // TODO: Sync with backend
      console.log('Editing message:', { messageId, newContent });
      
      toast.success('Message edited');
    } catch (error) {
      toast.error('Failed to edit message');
      console.error('Edit message error:', error);
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    this.recordAction('delete-message', { messageId });
    
    try {
      // Remove from store
      this.store.deleteMessage(messageId);
      
      // TODO: Sync with backend
      console.log('Deleting message:', messageId);
      
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
      console.error('Delete message error:', error);
    }
  }

  /**
   * Copy message content
   */
  async copyMessage(messageId: string): Promise<void> {
    this.recordAction('copy-message', { messageId });
    
    const message = this.store.getMessageById(messageId);
    if (!message) {
      toast.error('Message not found');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
      console.error('Copy error:', error);
    }
  }

  /**
   * Archive a message
   */
  async archiveMessage(messageId: string): Promise<void> {
    this.recordAction('archive-message', { messageId });
    
    try {
      // Update message status
      this.store.updateMessage(messageId, { 
        metadata: { archived: true } 
      });
      
      // TODO: Sync with backend
      console.log('Archiving message:', messageId);
      
      toast.success('Message archived');
    } catch (error) {
      toast.error('Failed to archive message');
      console.error('Archive message error:', error);
    }
  }

  /**
   * Pin a message
   */
  async pinMessage(messageId: string): Promise<void> {
    this.recordAction('pin-message', { messageId });
    
    try {
      // Update message status
      this.store.updateMessage(messageId, { 
        metadata: { pinned: true } 
      });
      
      // TODO: Sync with backend
      console.log('Pinning message:', messageId);
      
      toast.success('Message pinned');
    } catch (error) {
      toast.error('Failed to pin message');
      console.error('Pin message error:', error);
    }
  }

  /**
   * Toggle a UI setting
   */
  toggleSetting(setting: keyof ChatActions['store']['uiPreferences']): void {
    this.recordAction('toggle-setting', { setting });
    
    const current = this.store.uiPreferences[setting];
    if (typeof current === 'boolean') {
      this.store.updateUIPreferences({
        [setting]: !current
      });
    }
  }

  /**
   * Record an action to history
   */
  private recordAction(type: ActionType, payload?: any): void {
    const action: Action = {
      type,
      payload,
      timestamp: Date.now(),
      userId: this.store.userId || undefined
    };
    
    this.actionHistory.push(action);
    
    // Limit history size
    if (this.actionHistory.length > this.MAX_HISTORY) {
      this.actionHistory.shift();
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Action:', action);
    }
  }

  /**
   * Get action history
   */
  getHistory(): Action[] {
    return [...this.actionHistory];
  }

  /**
   * Clear action history
   */
  clearHistory(): void {
    this.actionHistory = [];
  }
}

// Export singleton instance
export const chatActions = new ChatActions();