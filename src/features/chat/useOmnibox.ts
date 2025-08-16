/**
 * useOmnibox Hook - Manages keyboard bindings and omnibox control
 * Handles Cmd/Ctrl+K for global, Ctrl+Space for inline modes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { commandRouter, CommandExecutionContext } from './command.router';
import { parsePrefix, PrefixMode } from './prefix.parse';

export interface UseOmniboxOptions {
  userId?: string;
  workspaceId?: string;
  documentId?: string;
  enabled?: boolean;
  onOpen?: (mode: 'global' | 'inline') => void;
  onClose?: () => void;
  onExecute?: (command: string, result: any) => void;
}

export interface UseOmniboxReturn {
  isOpen: boolean;
  mode: 'global' | 'inline';
  open: (mode?: 'global' | 'inline', initialQuery?: string) => void;
  close: () => void;
  toggle: (mode?: 'global' | 'inline') => void;
  execute: (command: string) => Promise<void>;
  position: { x: number; y: number } | null;
  setPosition: (pos: { x: number; y: number } | null) => void;
  initialQuery: string;
  initialMode: PrefixMode | undefined;
}

export function useOmnibox(options: UseOmniboxOptions = {}): UseOmniboxReturn {
  const {
    userId,
    workspaceId,
    documentId,
    enabled = true,
    onOpen,
    onClose,
    onExecute
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'global' | 'inline'>('global');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [initialQuery, setInitialQuery] = useState('');
  const [initialMode, setInitialMode] = useState<PrefixMode | undefined>();
  
  // Track if Ctrl is being held for Ctrl+Space detection
  const ctrlPressed = useRef(false);
  const lastKeyTime = useRef(0);

  /**
   * Opens the omnibox in specified mode
   */
  const open = useCallback((openMode: 'global' | 'inline' = 'global', query = '') => {
    // Parse initial query for mode detection
    if (query) {
      const parsed = parsePrefix(query, query.length);
      if (parsed) {
        setInitialMode(parsed.mode);
        setInitialQuery(parsed.query);
      } else {
        setInitialMode(undefined);
        setInitialQuery(query);
      }
    } else {
      setInitialMode(undefined);
      setInitialQuery('');
    }

    setMode(openMode);
    setIsOpen(true);
    onOpen?.(openMode);

    // For inline mode, try to get cursor position
    if (openMode === 'inline') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setPosition({
          x: rect.left,
          y: rect.top
        });
      }
    }
  }, [onOpen]);

  /**
   * Closes the omnibox
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
    setInitialQuery('');
    setInitialMode(undefined);
    onClose?.();
  }, [onClose]);

  /**
   * Toggles the omnibox
   */
  const toggle = useCallback((toggleMode: 'global' | 'inline' = 'global') => {
    if (isOpen && mode === toggleMode) {
      close();
    } else {
      open(toggleMode);
    }
  }, [isOpen, mode, open, close]);

  /**
   * Executes a command string
   */
  const execute = useCallback(async (command: string) => {
    // Parse the command
    const parsed = parsePrefix(command, command.length);
    
    if (!parsed) {
      // No prefix, treat as natural language
      console.log('Natural language input:', command);
      return;
    }

    // Create execution context
    const context: CommandExecutionContext = {
      userId,
      workspaceId,
      documentId,
      selection: window.getSelection()?.toString()
    };

    // Route the command
    const result = await commandRouter.route(parsed, context);
    
    // Handle result
    if (result.success) {
      // Close omnibox on successful execution
      close();
      
      // Call callback if provided
      onExecute?.(command, result);

      // Handle navigation actions
      if (result.action === 'navigate' && result.target) {
        window.location.href = result.target;
      }
    } else {
      console.error('Command failed:', result.error);
    }
  }, [userId, workspaceId, documentId, close, onExecute]);

  /**
   * Global keyboard event handler
   */
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Track Ctrl key state
      if (e.key === 'Control') {
        ctrlPressed.current = true;
      }

      // Cmd/Ctrl+K - Global omnibox
      if (e.key === 'k' && (isMac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        toggle('global');
        lastKeyTime.current = now;
        return;
      }

      // Ctrl+Space - Focus input or open inline omnibox
      if (e.key === ' ' && e.ctrlKey && !e.metaKey) {
        // Debounce to avoid conflicts with other shortcuts
        if (now - lastKeyTime.current < 100) return;
        
        e.preventDefault();
        
        // Try to focus existing input first
        const activeElement = document.activeElement;
        const inputs = document.querySelectorAll('input[type="text"], textarea');
        let inputFocused = false;

        // Check if we're already in an input
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA'
        )) {
          // Already in input, open inline omnibox at cursor
          const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
          const value = input.value;
          const cursorPos = input.selectionStart || 0;
          
          // Check if there's a prefix at cursor
          const textToCursor = value.slice(0, cursorPos);
          const lastWord = textToCursor.split(' ').pop() || '';
          
          if (lastWord.match(/^[/@#^>!?]/) || lastWord.startsWith('//')) {
            open('inline', lastWord);
          } else {
            open('inline');
          }
          inputFocused = true;
        } else {
          // Try to focus the main chat input
          for (const input of inputs) {
            if (input.classList.contains('chat-input') || 
                input.getAttribute('data-chat-input') === 'true') {
              (input as HTMLElement).focus();
              inputFocused = true;
              break;
            }
          }
        }

        // If no input found or focused, open inline omnibox
        if (!inputFocused) {
          open('inline');
        }
        
        lastKeyTime.current = now;
        return;
      }

      // ESC - Close omnibox
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
        return;
      }

      // Platform-specific shortcuts
      if (isMac) {
        // Cmd+/ - Help
        if (e.key === '/' && e.metaKey) {
          e.preventDefault();
          open('global', '?');
          return;
        }
      } else {
        // F1 - Help (Windows/Linux)
        if (e.key === 'F1') {
          e.preventDefault();
          open('global', '?');
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlPressed.current = false;
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, isOpen, open, close, toggle]);

  /**
   * Handle focus changes for inline mode positioning
   */
  useEffect(() => {
    if (!enabled || mode !== 'inline') return;

    const handleSelectionChange = () => {
      if (isOpen && mode === 'inline') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Update position if it changed significantly
          if (position && (
            Math.abs(rect.left - position.x) > 10 ||
            Math.abs(rect.top - position.y) > 10
          )) {
            setPosition({
              x: rect.left,
              y: rect.top
            });
          }
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [enabled, isOpen, mode, position]);

  return {
    isOpen,
    mode,
    open,
    close,
    toggle,
    execute,
    position,
    setPosition,
    initialQuery,
    initialMode
  };
}