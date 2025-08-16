/**
 * Mentions - Consolidated @ mention component
 * Handles mention autocomplete, pill insertion, and immutable IDs
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Hash, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionService, MentionItem, MentionContext } from '@/services/MentionService';

export interface MentionPill {
  id: string;          // Immutable ID
  type: 'user' | 'agent' | 'workspace' | 'document';
  name: string;
  displayName: string;
  metadata?: any;
}

export interface MentionsProps {
  value: string;
  onChange: (value: string, pills: MentionPill[]) => void;
  onMentionSelect?: (mention: MentionItem) => void;
  cursorPosition: number;
  setCursorPosition: (pos: number) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  userId?: string;
}

export default function Mentions({
  value,
  onChange,
  onMentionSelect,
  cursorPosition,
  setCursorPosition,
  className,
  disabled = false,
  placeholder,
  userId
}: MentionsProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [mentionContext, setMentionContext] = useState<MentionContext | null>(null);
  const [suggestions, setSuggestions] = useState<MentionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pills, setPills] = useState<MentionPill[]>([]);
  const [loading, setLoading] = useState(false);
  
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  /**
   * Detect mentions in the text
   */
  useEffect(() => {
    const mention = MentionService.detectMention(value, cursorPosition);
    
    if (mention) {
      setMentionContext(mention);
      setShowAutocomplete(true);
      searchMentions(mention);
    } else {
      setMentionContext(null);
      setShowAutocomplete(false);
      setSuggestions([]);
    }
  }, [value, cursorPosition]);

  /**
   * Search for mention suggestions
   */
  const searchMentions = async (context: MentionContext) => {
    setLoading(true);
    
    try {
      const results = await MentionService.searchMentions(
        context.query,
        context.type || 'all'
      );
      setSuggestions(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Failed to search mentions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle mention selection
   */
  const selectMention = useCallback((mention: MentionItem) => {
    if (!mentionContext) return;

    // Create immutable pill
    const pill: MentionPill = {
      id: mention.id,
      type: mention.type as MentionPill['type'],
      name: mention.name,
      displayName: mention.displayName || mention.name,
      metadata: mention.metadata
    };

    // Replace mention text with pill placeholder
    const before = value.slice(0, mentionContext.startIndex);
    const after = value.slice(mentionContext.endIndex);
    const pillPlaceholder = `[[${pill.id}]]`; // Use special syntax for pills
    const newValue = before + pillPlaceholder + ' ' + after;
    
    // Update pills array
    const newPills = [...pills, pill];
    setPills(newPills);
    
    // Update value and cursor
    onChange(newValue, newPills);
    setCursorPosition(mentionContext.startIndex + pillPlaceholder.length + 1);
    
    // Close autocomplete
    setShowAutocomplete(false);
    setMentionContext(null);
    setSuggestions([]);
    
    // Trigger callback
    onMentionSelect?.(mention);
    
    // Add backlink in background
    addBacklink(mention);
  }, [mentionContext, value, pills, onChange, setCursorPosition, onMentionSelect]);

  /**
   * Add backlink for the mention
   */
  const addBacklink = async (mention: MentionItem) => {
    if (!userId) return;
    
    try {
      // TODO: Implement backlink creation via Supabase
      console.log('Adding backlink for:', mention);
    } catch (error) {
      console.error('Failed to add backlink:', error);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showAutocomplete || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectMention(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        setMentionContext(null);
        break;
    }
  }, [showAutocomplete, suggestions, selectedIndex, selectMention]);

  /**
   * Get icon for mention type
   */
  const getMentionIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4" />;
      case 'agent': return <Bot className="w-4 h-4" />;
      case 'workspace': return <Hash className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  /**
   * Render pill in text
   */
  const renderPill = (pill: MentionPill) => (
    <span
      key={pill.id}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-sm font-medium mx-0.5"
      contentEditable={false}
      data-pill-id={pill.id}
    >
      {getMentionIcon(pill.type)}
      <span>{pill.displayName}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          removePill(pill.id);
        }}
        className="ml-0.5 hover:bg-primary/20 rounded p-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  /**
   * Remove a pill
   */
  const removePill = (pillId: string) => {
    const newPills = pills.filter(p => p.id !== pillId);
    setPills(newPills);
    
    // Remove pill placeholder from text
    const placeholder = `[[${pillId}]]`;
    const newValue = value.replace(placeholder, '');
    onChange(newValue, newPills);
  };

  /**
   * Parse and render text with pills
   */
  const renderTextWithPills = () => {
    const parts = value.split(/(\[\[[^\]]+\]\])/g);
    
    return parts.map((part, index) => {
      // Check if this is a pill placeholder
      const pillMatch = part.match(/\[\[([^\]]+)\]\]/);
      if (pillMatch) {
        const pillId = pillMatch[1];
        const pill = pills.find(p => p.id === pillId);
        if (pill) {
          return renderPill(pill);
        }
      }
      
      // Regular text
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={cn('relative', className)}>
      {/* Rich text display with pills */}
      <div
        ref={inputRef}
        className="min-h-[40px] p-2 border rounded-md bg-background"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        role="textbox"
        aria-label="Message with mentions"
        aria-autocomplete="list"
        aria-expanded={showAutocomplete}
        data-placeholder={placeholder}
      >
        {renderTextWithPills()}
      </div>

      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {showAutocomplete && suggestions.length > 0 && (
          <motion.div
            ref={autocompleteRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute bottom-full left-0 mb-1 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="py-1 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => selectMention(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-2 hover:bg-accent transition-colors text-left',
                    selectedIndex === index && 'bg-accent'
                  )}
                >
                  <div className="flex-shrink-0">
                    {getMentionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {suggestion.displayName || suggestion.name}
                    </div>
                    {suggestion.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </div>
                    )}
                  </div>
                  {suggestion.metadata?.status && (
                    <div className="flex-shrink-0">
                      <span className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium',
                        suggestion.metadata.status === 'online' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      )}>
                        {suggestion.metadata.status}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {loading && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                Searching...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden input for actual value (for form submission) */}
      <input
        type="hidden"
        value={value}
        disabled={disabled}
      />
    </div>
  );
}