import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Bot, 
  FileText, 
  Folder, 
  Hash, 
  Command,
  ChevronRight,
  Search
} from 'lucide-react';
import { MentionService, MentionItem, MentionContext } from '../services/MentionService';
import { cn } from '@/lib/utils';

interface MentionAutocompleteProps {
  isOpen: boolean;
  context: MentionContext | null;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  userId?: string;
  projectPath?: string;
  position?: { top: number; left: number };
  className?: string;
  fullText?: string;
  cursorPosition?: number;
}

export function MentionAutocomplete({
  isOpen,
  context,
  onSelect,
  onClose,
  userId,
  projectPath = '/home/jon/Projects/syna',
  position,
  className,
  fullText = '',
  cursorPosition = 0
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MentionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const orderedSuggestionsRef = useRef<MentionItem[]>([]);

  // Load suggestions when context changes
  useEffect(() => {
    if (context && isOpen) {
      loadSuggestions();
    }
  }, [context, isOpen]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Auto-scroll to keep selected item in view
  useEffect(() => {
    const selectedItem = itemRefs.current.get(selectedIndex);
    if (selectedItem && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const itemRect = selectedItem.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Check if item is above the visible area
      if (itemRect.top < containerRect.top) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      // Check if item is below the visible area
      else if (itemRect.bottom > containerRect.bottom) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
          const selectedItem = orderedSuggestionsRef.current[selectedIndex];
          if (selectedItem) {
            onSelect(selectedItem);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex, onSelect, onClose]);

  const loadSuggestions = async () => {
    if (!context) return;
    
    setLoading(true);
    try {
      const items = await MentionService.getSuggestions(
        context,
        userId,
        projectPath
      );
      setSuggestions(items);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (item: MentionItem) => {
    switch (item.type) {
      case 'agent':
        return <Bot className="w-4 h-4" style={{ color: item.color }} />;
      case 'file':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'user':
        return <User className="w-4 h-4 text-green-500" />;
      case 'workspace':
        if (context?.triggerChar === '/') {
          return <Folder className="w-4 h-4 text-purple-500" />;
        } else if (context?.triggerChar === '#') {
          return <Hash className="w-4 h-4 text-orange-500" />;
        } else if (context?.triggerChar === '>') {
          return <Command className="w-4 h-4 text-pink-500" />;
        }
        return <ChevronRight className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: MentionItem['type']) => {
    switch (type) {
      case 'agent':
        return 'Agent';
      case 'file':
        return 'File';
      case 'user':
        return 'User';
      case 'workspace':
        if (context?.triggerChar === '/') return 'Workspace';
        if (context?.triggerChar === '#') return 'Project';
        if (context?.triggerChar === '>') return 'Command';
        return 'Item';
      default:
        return '';
    }
  };

  const getTriggerDescription = () => {
    if (!context) return '';
    
    switch (context.triggerChar) {
      case '@':
        return 'Mention agents, files, or colleagues';
      case '/':
        return 'Switch to workspace';
      case '#':
        return 'Switch to project';
      case '>':
        return 'Execute command';
      default:
        return '';
    }
  };

  if (!isOpen || !context) return null;

  // Create properly ordered suggestions list
  const typeOrder = ['agent', 'user', 'file', 'workspace'];
  const typeLabels = {
    agent: 'Agents',
    user: 'People',
    file: 'Files',
    workspace: context?.triggerChar === '#' ? 'Projects' : 'Workspaces'
  };

  // Sort suggestions by type order and create flat list for keyboard navigation
  const orderedSuggestions: MentionItem[] = [];
  const groupedSuggestions: Record<string, MentionItem[]> = {};
  
  for (const type of typeOrder) {
    const items = suggestions.filter(s => s.type === type);
    if (items.length > 0) {
      groupedSuggestions[type] = items;
      orderedSuggestions.push(...items);
    }
  }
  
  // Store ordered suggestions for keyboard navigation
  orderedSuggestionsRef.current = orderedSuggestions;

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="absolute inset-x-0 bottom-0 flex flex-col-reverse"
      >
        {/* Input area - at the bottom, matching original input */}
        <div className="bg-background rounded-xl border border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
          <div className="px-4 py-3">
            <div className="flex items-center">
              {/* Full text with mention highlighted */}
              {context && fullText && (
                <>
                  <span className="text-base text-foreground">
                    {fullText.substring(0, context.startIndex)}
                  </span>
                  <span className="text-base text-primary font-medium">
                    {context.triggerChar}{context.query}
                  </span>
                  <span className="text-base text-muted-foreground animate-pulse">|</span>
                  <span className="text-base text-foreground">
                    {fullText.substring(context.endIndex)}
                  </span>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                {suggestions.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {suggestions.length} results
                  </span>
                )}
                <kbd className="text-xs px-1.5 py-0.5 bg-secondary/60 rounded">
                  ESC
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions that appear to extend upward from input */}
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-2 bg-background rounded-xl border border-border/20 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)] overflow-hidden"
        >
          <div ref={scrollContainerRef} className="max-h-[320px] overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="px-3 py-6 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Searching...
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">No results found</p>
              {context.query.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Start typing to search agents, files, and people
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            <div className="py-1">
              {(() => {
                let itemIndex = 0;
                return typeOrder.map(type => {
                  const items = groupedSuggestions[type];
                  if (!items || items.length === 0) return null;
                  
                  return (
                    <div key={type}>
                      {/* Section header */}
                      <div className="px-3 py-1.5 bg-secondary/30 sticky top-0 z-10 backdrop-blur-sm">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {typeLabels[type] || type}
                        </span>
                      </div>
                      
                      {/* Section items */}
                      {items.map((item) => {
                        const currentIndex = itemIndex++;
                        return (
                          <motion.button
                            key={item.id}
                            ref={el => {
                              if (el) itemRefs.current.set(currentIndex, el);
                            }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: currentIndex * 0.02 }}
                            onClick={() => onSelect(orderedSuggestions[currentIndex])}
                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                            className={cn(
                              "w-full px-3 py-2 flex items-center gap-3 hover:bg-primary/5 transition-all duration-150",
                              "text-left group relative",
                              selectedIndex === currentIndex && "bg-primary/10"
                            )}
                          >
                          {/* Selection indicator */}
                          {selectedIndex === currentIndex && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                          )}
                          
                          {/* Icon */}
                          <div className="flex-shrink-0">
                            {getIcon(item)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground truncate">
                                {item.name}
                              </span>
                              {/* Highlight match */}
                              {context.query && item.name.toLowerCase().includes(context.query.toLowerCase()) && (
                                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                              )}
                            </div>
                            {(item.description || item.path) && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {item.path || item.description}
                              </p>
                            )}
                          </div>

                            {/* Keyboard hint */}
                            {selectedIndex === currentIndex && (
                              <kbd className="text-xs px-1.5 py-0.5 bg-secondary/60 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                ⏎
                              </kbd>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default MentionAutocomplete;