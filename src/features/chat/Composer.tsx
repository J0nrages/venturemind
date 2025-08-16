/**
 * Composer - The main chat input component
 * Handles text input, send button, and prefix detection
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { parsePrefix, shouldOpenOmnibox } from './prefix.parse';
import { useChatStore } from './chat.state';
import Mentions, { MentionPill } from './Mentions';
import { MentionItem } from '@/services/MentionService';
import toast from 'react-hot-toast';

export interface ComposerProps {
  onSend: (message: string, mentions?: MentionPill[]) => void;
  onOpenOmnibox?: (mode: 'inline', query: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showAttachment?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}

export default function Composer({
  onSend,
  onOpenOmnibox,
  loading = false,
  disabled = false,
  placeholder = "Type a message... (@ to mention, / for commands)",
  className,
  showAttachment = true,
  maxLength = 5000,
  autoFocus = true
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionPills, setMentionPills] = useState<MentionPill[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  
  // Get state from store
  const { 
    inputValue, 
    setInputValue,
    userId 
  } = useChatStore();

  // Sync with store
  useEffect(() => {
    setLocalValue(inputValue);
  }, [inputValue]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current && !loading && !disabled) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, loading, disabled]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 300);
      textarea.style.height = `${newHeight}px`;
    }
  }, [localValue]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursor = e.target.selectionStart || 0;
    
    // Check length limit
    if (newValue.length > maxLength) {
      toast.error(`Message too long (max ${maxLength} characters)`);
      return;
    }
    
    setLocalValue(newValue);
    setCursorPosition(newCursor);
    setInputValue(newValue);
    
    // Check for command prefixes
    const parsed = parsePrefix(newValue, newCursor);
    
    if (parsed) {
      // Check if we should open omnibox
      if (shouldOpenOmnibox(parsed.mode)) {
        // Defer to next tick to avoid input conflicts
        setTimeout(() => {
          onOpenOmnibox?.('inline', newValue);
        }, 0);
      } else if (parsed.mode === 'mention') {
        // Show mention autocomplete
        setShowMentions(true);
      }
    } else {
      setShowMentions(false);
    }
  }, [maxLength, setInputValue, onOpenOmnibox]);

  /**
   * Handle mention change (from Mentions component)
   */
  const handleMentionChange = useCallback((value: string, pills: MentionPill[]) => {
    setLocalValue(value);
    setMentionPills(pills);
    setInputValue(value);
  }, [setInputValue]);

  /**
   * Handle key down
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let mentions component handle its keys
    if (showMentions) {
      if (['ArrowDown', 'ArrowUp', 'Tab', 'Enter', 'Escape'].includes(e.key)) {
        return; // Let Mentions handle it
      }
    }
    
    // Enter to send (Shift+Enter for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Ctrl+Space to open omnibox
    if (e.key === ' ' && e.ctrlKey) {
      e.preventDefault();
      onOpenOmnibox?.('inline', localValue);
    }
  }, [showMentions, localValue, onOpenOmnibox]);

  /**
   * Handle send
   */
  const handleSend = useCallback(() => {
    if (!localValue.trim() || loading || disabled) return;
    
    // Check if this is a command
    const parsed = parsePrefix(localValue, localValue.length);
    
    if (parsed && shouldOpenOmnibox(parsed.mode)) {
      // This is a command, open omnibox instead
      onOpenOmnibox?.('inline', localValue);
      return;
    }
    
    // Send the message
    onSend(localValue, mentionPills);
    
    // Clear input
    setLocalValue('');
    setMentionPills([]);
    setInputValue('');
    setCursorPosition(0);
    
    // Refocus
    textareaRef.current?.focus();
  }, [localValue, loading, disabled, mentionPills, onSend, onOpenOmnibox, setInputValue]);

  /**
   * Handle file attachment
   */
  const handleAttachment = useCallback(() => {
    toast.error('File attachments coming soon!');
  }, []);

  /**
   * Handle mention select
   */
  const handleMentionSelect = useCallback((mention: MentionItem) => {
    console.log('Mention selected:', mention);
    // Additional handling if needed
  }, []);

  // Determine if we should show mentions overlay
  const shouldShowMentions = showMentions && localValue.includes('@');

  return (
    <div className={cn('relative flex items-end gap-2', className)}>
      {/* Attachment button */}
      {showAttachment && (
        <Button
          size="icon"
          variant="ghost"
          onClick={handleAttachment}
          disabled={disabled}
          className="mb-1"
          type="button"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      )}

      {/* Input area */}
      <div className="flex-1 relative">
        {shouldShowMentions ? (
          // Use Mentions component when @ is detected
          <Mentions
            value={localValue}
            onChange={handleMentionChange}
            onMentionSelect={handleMentionSelect}
            cursorPosition={cursorPosition}
            setCursorPosition={setCursorPosition}
            disabled={disabled || loading}
            placeholder={placeholder}
            userId={userId || undefined}
            className="min-h-[44px]"
          />
        ) : (
          // Regular textarea
          <Textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            className={cn(
              'min-h-[44px] max-h-[300px] resize-none',
              'pr-2 py-3',
              'scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent'
            )}
            rows={1}
            data-chat-input="true"
          />
        )}

        {/* Character count */}
        {localValue.length > maxLength * 0.8 && (
          <div className="absolute bottom-1 right-2 text-xs text-muted-foreground">
            {localValue.length}/{maxLength}
          </div>
        )}
      </div>

      {/* Send button */}
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!localValue.trim() || loading || disabled}
        className="mb-1"
        type="button"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}