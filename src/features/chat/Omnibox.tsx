/**
 * Omnibox - Command palette UI using cmdk
 * Provides global and inline command palette modes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { 
  Search, 
  Terminal, 
  Hash, 
  FileText, 
  HelpCircle, 
  Zap, 
  Clock,
  AtSign,
  User,
  Bot,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { commandManifest, Command as CommandDef } from './command.manifest';
import { PrefixMode, getPrefixModeLabel } from './prefix.parse';
import { MentionService, MentionItem } from '@/services/MentionService';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export interface OmniboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'global' | 'inline';
  initialQuery?: string;
  initialMode?: PrefixMode;
  onSelect?: (value: string, type: 'command' | 'mention' | 'workspace' | 'document') => void;
  position?: { x: number; y: number };
  userId?: string;
  workspaceId?: string;
  className?: string;
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'command' | 'mention' | 'workspace' | 'document' | 'help';
  icon?: React.ReactNode;
  prefix?: string;
  data?: any;
}

export default function Omnibox({
  open,
  onOpenChange,
  mode = 'global',
  initialQuery = '',
  initialMode,
  onSelect,
  position,
  userId,
  workspaceId,
  className
}: OmniboxProps) {
  const [search, setSearch] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentItems, setRecentItems] = useState<SearchResult[]>([]);
  const [currentMode, setCurrentMode] = useState<PrefixMode>(initialMode || 'natural');

  // Load recent items on mount
  useEffect(() => {
    if (open) {
      loadRecentItems();
    }
  }, [open, userId]);

  // Search when query changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        performSearch(search);
      } else {
        setResults([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [search, currentMode]);

  const loadRecentItems = async () => {
    // TODO: Load from user preferences or local storage
    setRecentItems([
      {
        id: 'recent-1',
        title: 'Business Plan',
        description: 'Last edited 2 hours ago',
        type: 'document',
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: 'recent-2',
        title: 'Strategy Workshop',
        description: 'Active workspace',
        type: 'workspace',
        icon: <Hash className="w-4 h-4" />
      }
    ]);
  };

  const performSearch = async (query: string) => {
    setLoading(true);
    
    try {
      // Detect mode from query prefix
      let searchMode = currentMode;
      let searchQuery = query;
      
      if (query.startsWith('//')) {
        searchMode = 'search';
        searchQuery = query.slice(2);
      } else if (query.startsWith('/')) {
        searchMode = 'command';
        searchQuery = query.slice(1);
      } else if (query.startsWith('>')) {
        searchMode = 'power';
        searchQuery = query.slice(1);
      } else if (query.startsWith('?')) {
        searchMode = 'help';
        searchQuery = query.slice(1);
      } else if (query.startsWith('!')) {
        searchMode = 'quick';
        searchQuery = query.slice(1);
      } else if (query.startsWith('#')) {
        searchMode = 'workspace';
        searchQuery = query.slice(1);
      } else if (query.startsWith('^')) {
        searchMode = 'document';
        searchQuery = query.slice(1);
      } else if (query.startsWith('@')) {
        searchMode = 'mention';
        searchQuery = query.slice(1);
      }

      setCurrentMode(searchMode);
      
      const searchResults: SearchResult[] = [];

      // Search based on mode
      switch (searchMode) {
        case 'command':
        case 'power':
        case 'quick':
          const prefix = searchMode === 'command' ? '/' : 
                        searchMode === 'power' ? '>' : '!';
          const commands = await commandManifest.searchCommands(searchQuery, prefix);
          searchResults.push(...commands.map(cmd => ({
            id: cmd.id,
            title: cmd.name,
            description: cmd.description,
            type: 'command' as const,
            icon: <Terminal className="w-4 h-4" />,
            prefix: cmd.prefix,
            data: cmd
          })));
          break;

        case 'mention':
          const mentions = await MentionService.searchMentions(searchQuery, 'all');
          searchResults.push(...mentions.map(mention => ({
            id: mention.id,
            title: mention.name,
            description: mention.type === 'user' ? 'User' : 'Agent',
            type: 'mention' as const,
            icon: mention.type === 'user' ? 
              <User className="w-4 h-4" /> : 
              <Bot className="w-4 h-4" />,
            data: mention
          })));
          break;

        case 'workspace':
          // TODO: Search workspaces
          searchResults.push({
            id: 'workspace-1',
            title: 'Product Development',
            description: '12 members',
            type: 'workspace',
            icon: <Hash className="w-4 h-4" />
          });
          break;

        case 'document':
          // TODO: Search documents
          searchResults.push({
            id: 'doc-1',
            title: 'Q4 Planning',
            description: 'Updated yesterday',
            type: 'document',
            icon: <FileText className="w-4 h-4" />
          });
          break;

        case 'help':
          searchResults.push({
            id: 'help-1',
            title: 'Keyboard Shortcuts',
            description: 'View all shortcuts',
            type: 'help',
            icon: <HelpCircle className="w-4 h-4" />
          });
          break;

        case 'search':
        default:
          // Global search across everything
          const [cmds, docs, spaces] = await Promise.all([
            commandManifest.searchCommands(searchQuery),
            Promise.resolve([]), // TODO: Search documents
            Promise.resolve([])  // TODO: Search workspaces
          ]);
          
          searchResults.push(...cmds.slice(0, 3).map(cmd => ({
            id: cmd.id,
            title: cmd.name,
            description: cmd.description,
            type: 'command' as const,
            icon: <Terminal className="w-4 h-4" />,
            prefix: cmd.prefix,
            data: cmd
          })));
          break;
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    // Record to recent items
    const newRecent = [result, ...recentItems.filter(r => r.id !== result.id)].slice(0, 5);
    setRecentItems(newRecent);
    
    // Call onSelect callback
    if (onSelect) {
      let value = result.title;
      
      // Format value based on type
      if (result.type === 'command' && result.prefix) {
        value = `${result.prefix}${result.title}`;
      } else if (result.type === 'mention') {
        value = `@${result.title}`;
      } else if (result.type === 'workspace') {
        value = `#${result.title}`;
      } else if (result.type === 'document') {
        value = `^${result.title}`;
      }
      
      onSelect(value, result.type);
    }
    
    // Close omnibox
    onOpenChange(false);
  };

  const getModeIcon = (mode: PrefixMode) => {
    switch (mode) {
      case 'command': return <Terminal className="w-4 h-4" />;
      case 'search': return <Search className="w-4 h-4" />;
      case 'power': return <Zap className="w-4 h-4" />;
      case 'help': return <HelpCircle className="w-4 h-4" />;
      case 'workspace': return <Hash className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'mention': return <AtSign className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const containerStyle = mode === 'inline' && position
    ? {
        position: 'fixed' as const,
        left: position.x,
        top: position.y,
        transform: 'translateY(-100%)'
      }
    : {};

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop for global mode */}
          {mode === 'global' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => onOpenChange(false)}
            />
          )}

          {/* Command palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              mode === 'global'
                ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50'
                : 'fixed z-50',
              className
            )}
            style={mode === 'inline' ? containerStyle : {}}
          >
            <Command
              className={cn(
                'bg-popover text-popover-foreground shadow-2xl rounded-xl border overflow-hidden',
                mode === 'global' ? 'w-[640px] max-w-[90vw]' : 'w-[400px]'
              )}
            >
              <div className="flex items-center border-b px-3">
                <div className="flex items-center gap-2 flex-1">
                  {getModeIcon(currentMode)}
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder={`${getPrefixModeLabel(currentMode)} mode - Type to search...`}
                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>

              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                {/* Empty state */}
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {/* Recent items (when no search) */}
                {!search && recentItems.length > 0 && (
                  <Command.Group heading="Recent">
                    {recentItems.map(item => (
                      <Command.Item
                        key={item.id}
                        value={item.title}
                        onSelect={() => handleSelect(item)}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent cursor-pointer"
                      >
                        {item.icon}
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Search results */}
                {results.length > 0 && (
                  <Command.Group heading="Results">
                    {results.map(result => (
                      <Command.Item
                        key={result.id}
                        value={result.title}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent cursor-pointer"
                      >
                        {result.icon}
                        <div className="flex-1">
                          <div className="font-medium">
                            {result.prefix && (
                              <span className="text-muted-foreground mr-1">{result.prefix}</span>
                            )}
                            {result.title}
                          </div>
                          {result.description && (
                            <div className="text-xs text-muted-foreground">{result.description}</div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Mode hints */}
                {!search && (
                  <Command.Group heading="Modes">
                    <div className="grid grid-cols-2 gap-1 px-2 py-1 text-xs text-muted-foreground">
                      <div><kbd>/</kbd> Commands</div>
                      <div><kbd>//</kbd> Search</div>
                      <div><kbd>&gt;</kbd> Power</div>
                      <div><kbd>?</kbd> Help</div>
                      <div><kbd>!</kbd> Quick</div>
                      <div><kbd>#</kbd> Workspace</div>
                      <div><kbd>^</kbd> Document</div>
                      <div><kbd>@</kbd> Mention</div>
                    </div>
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer */}
              <div className="border-t px-3 py-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                    <span>Navigate</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-2">↵</kbd>
                    <span>Select</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-2">ESC</kbd>
                    <span>Close</span>
                  </div>
                  {mode === 'global' && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Recent</span>
                    </div>
                  )}
                </div>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}