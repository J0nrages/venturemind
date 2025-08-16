import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Brain,
  ChevronDown,
  Search,
  Paperclip,
  Loader2,
  Clock,
  Hash,
  Zap,
  Settings,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { UserSettingsService, type ModelConfiguration } from '../services/UserSettingsService';
import { MentionService, MentionContext, MentionItem } from '../services/MentionService';
import MentionAutocomplete from './MentionAutocomplete';

export interface UnifiedChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  showModelSelector?: boolean;
  showWebSearch?: boolean;
  showAttachment?: boolean;
  showStats?: boolean;
  floating?: boolean;
  modelOptions?: Record<string, ModelConfiguration>;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  stats?: {
    lastLatency?: number;
    lastTokens?: number;
    lastSpeed?: number;
  };
  userId?: string;
  showSettingsBar?: boolean;
  onSettingsToggle?: (show: boolean) => void;
}

export default function UnifiedChatInput({
  value,
  onChange,
  onSend,
  loading = false,
  placeholder = "Message... (Shift+Enter for new line)",
  className,
  showModelSelector = true,
  showWebSearch = true,
  showAttachment = true,
  showStats = false,
  floating = false,
  modelOptions = {},
  selectedModel = 'gemini-2.5-flash',
  onModelChange,
  webSearchEnabled = true,
  onWebSearchToggle,
  stats,
  userId,
  showSettingsBar = false,
  onSettingsToggle
}: UnifiedChatInputProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [localSelectedModel, setLocalSelectedModel] = useState(selectedModel);
  const [mentionContext, setMentionContext] = useState<MentionContext | null>(null);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [localShowSettingsBar, setLocalShowSettingsBar] = useState(showSettingsBar);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSelectedModel(selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    setLocalShowSettingsBar(showSettingsBar);
  }, [showSettingsBar]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus textarea on mount and when focus is lost
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current && !loading) {
        textareaRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [loading]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate new height based on scrollHeight
      const newHeight = Math.min(textarea.scrollHeight, 300); // Max height of ~10-12 lines
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleModelSelect = async (modelName: string) => {
    setLocalSelectedModel(modelName);
    setShowModelDropdown(false);
    
    if (onModelChange) {
      onModelChange(modelName);
    }
    
    // Save user preference if userId is provided
    if (userId) {
      try {
        const settings = await UserSettingsService.loadUserSettings(userId);
        await UserSettingsService.saveUserSettings(userId, {
          ...settings,
          model_preferences: {
            ...settings.model_preferences,
            default_model: modelName
          }
        });
      } catch (error) {
        console.error('Failed to save model preference:', error);
      }
    }

    // Refocus textarea after model selection
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    // Check for mentions
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart || 0;
      setCursorPosition(cursorPos);
      
      const mention = MentionService.detectMention(newValue, cursorPos);
      setMentionContext(mention);
      setShowMentionAutocomplete(!!mention);
    }
  }, [onChange]);

  const handleMentionSelect = useCallback((item: MentionItem) => {
    if (mentionContext) {
      const newValue = MentionService.replaceMention(value, mentionContext, item);
      onChange(newValue);
      setShowMentionAutocomplete(false);
      setMentionContext(null);
      
      // Refocus textarea and move cursor after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Position cursor after the mention (trigger + name + space)
          const newCursorPos = mentionContext.startIndex + 1 + item.name.length + 1;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  }, [value, mentionContext, onChange]);

  const handleSettingsToggle = () => {
    const newState = !localShowSettingsBar;
    setLocalShowSettingsBar(newState);
    onSettingsToggle?.(newState);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Let mention autocomplete handle its own keyboard events
    if (showMentionAutocomplete) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Tab') {
        return; // Let autocomplete handle navigation
      }
      if (e.key === 'Enter') {
        // Only prevent send if autocomplete is showing
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionAutocomplete(false);
        setMentionContext(null);
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const containerClass = floating
    ? "fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-2xl px-5"
    : "relative w-full";

  const wrapperClass = floating
    ? "bg-background/95 backdrop-blur-lg rounded-2xl shadow-2xl p-4 border border-border"
    : "p-4 border-t border-border/10 bg-background/80 backdrop-blur-md";

  return (
    <div className={cn(containerClass, className)}>
      {floating ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={wrapperClass}
        >
          {/* Message Stats */}
          {showStats && stats?.lastLatency && (
            <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{(stats.lastLatency / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>{stats.lastTokens} tokens</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>{stats.lastSpeed} tok/sec</span>
              </div>
            </div>
          )}
          
          {/* Model Selector and Controls */}
          <div className="mb-3 flex items-center gap-2 text-sm">
            {/* Model Selector */}
            {showModelSelector && (
              <div className="relative" ref={modelDropdownRef}>
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  disabled={loading}
                  type="button"
                >
                  <Brain className="w-4 h-4" />
                  <span className="font-medium">{localSelectedModel}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showModelDropdown && Object.keys(modelOptions).length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-48 z-10">
                    {Object.entries(modelOptions).map(([modelName, config]) => (
                      <button
                        key={modelName}
                        onClick={() => handleModelSelect(modelName)}
                        className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors ${
                          localSelectedModel === modelName ? 'bg-primary/10 text-primary' : 'text-foreground'
                        }`}
                        type="button"
                      >
                        <div className="font-medium">{modelName}</div>
                        <div className="text-xs text-muted-foreground">
                          Max: {config.max_output_tokens} tokens • Temp: {config.temperature}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Web Search Toggle */}
            {showWebSearch && (
              <button
                onClick={() => onWebSearchToggle?.(!webSearchEnabled)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  webSearchEnabled 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={webSearchEnabled ? 'Web search enabled' : 'Web search disabled'}
                type="button"
              >
                <Search className="w-4 h-4" />
                <span className="text-xs font-medium">Search</span>
              </button>
            )}

            {/* Attachment placeholder */}
            {showAttachment && (
              <button
                className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                title="Attach files (coming soon)"
                disabled
                type="button"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Message Input */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onSelect={(e) => {
                const textarea = e.currentTarget;
                setCursorPosition(textarea.selectionStart || 0);
              }}
              placeholder={placeholder}
              disabled={loading}
              className={cn(
                "w-full bg-background border rounded-xl px-4 py-3 pr-14 focus:outline-none focus:ring-1 focus:ring-ring/20 transition-all resize-none overflow-y-auto scrollbar-safari-thin shadow-sm",
                value.includes('@') && "border-primary/30 focus:border-primary/50",
                !value.includes('@') && "border-border/50 focus:border-border/60"
              )}
              style={{ minHeight: '48px' }}
              rows={1}
              autoFocus
            />
            <Button
              onClick={onSend}
              disabled={loading || !value.trim()}
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted transition-all"
              type="button"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                  />
                </svg>
              )}
            </Button>
          </div>
          
          {/* Mention Autocomplete - Extending upward from input */}
          {showMentionAutocomplete && mentionContext && (
            <div className="absolute inset-x-0 bottom-0 z-50">
              <MentionAutocomplete
                isOpen={showMentionAutocomplete}
                context={mentionContext}
                onSelect={handleMentionSelect}
                onClose={() => {
                  setShowMentionAutocomplete(false);
                  setMentionContext(null);
                }}
                userId={userId}
                projectPath="/home/jon/Projects/syna"
                fullText={value}
                cursorPosition={cursorPosition}
              />
            </div>
          )}
        </motion.div>
      ) : (
        <div className={wrapperClass}>
          <div className="max-w-2xl mx-auto">
            {/* Message Stats */}
            {showStats && stats?.lastLatency && (
              <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{(stats.lastLatency / 1000).toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span>{stats.lastTokens} tokens</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>{stats.lastSpeed} tok/sec</span>
                </div>
              </div>
            )}
            
            {/* Model Selector and Controls */}
            <div className="mb-3 flex items-center gap-2 text-sm">
              {/* Model Selector */}
              {showModelSelector && (
                <div className="relative" ref={modelDropdownRef}>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                    disabled={loading}
                    type="button"
                  >
                    <Brain className="w-4 h-4" />
                    <span className="font-medium">{localSelectedModel}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showModelDropdown && Object.keys(modelOptions).length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-48 z-10">
                      {Object.entries(modelOptions).map(([modelName, config]) => (
                        <button
                          key={modelName}
                          onClick={() => handleModelSelect(modelName)}
                          className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors ${
                            localSelectedModel === modelName ? 'bg-primary/10 text-primary' : 'text-foreground'
                          }`}
                          type="button"
                        >
                          <div className="font-medium">{modelName}</div>
                          <div className="text-xs text-muted-foreground">
                            Max: {config.max_output_tokens} tokens • Temp: {config.temperature}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Web Search Toggle */}
              {showWebSearch && (
                <button
                  onClick={() => onWebSearchToggle?.(!webSearchEnabled)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                    webSearchEnabled 
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                  title={webSearchEnabled ? 'Web search enabled' : 'Web search disabled'}
                  type="button"
                >
                  <Search className="w-4 h-4" />
                  <span className="text-xs font-medium">Search</span>
                </button>
              )}

              {/* Attachment placeholder */}
              {showAttachment && (
                <button
                  className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  title="Attach files (coming soon)"
                  disabled
                  type="button"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Message Input */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onSelect={(e) => {
                  const textarea = e.currentTarget;
                  setCursorPosition(textarea.selectionStart || 0);
                }}
                placeholder={placeholder}
                disabled={loading}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 pr-14 focus:outline-none focus:ring-1 focus:ring-ring/20 transition-all resize-none overflow-y-auto scrollbar-safari-thin",
                  value.includes('@') && "border-primary/30 focus:border-primary/50",
                  !value.includes('@') && "border-border/50 focus:border-border/60"
                )}
                style={{ 
                  minHeight: '48px',
                  background: 'var(--background)'
                }}
                rows={1}
                autoFocus
              />
              <Button
                onClick={onSend}
                disabled={loading || !value.trim()}
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted transition-all"
                type="button"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                    />
                  </svg>
                )}
              </Button>
            </div>
            
            {/* Mention Autocomplete - Extending upward from input */}
            {showMentionAutocomplete && mentionContext && (
              <div className="absolute inset-x-0 bottom-0 z-50">
                <MentionAutocomplete
                  isOpen={showMentionAutocomplete}
                  context={mentionContext}
                  onSelect={handleMentionSelect}
                  onClose={() => {
                    setShowMentionAutocomplete(false);
                    setMentionContext(null);
                  }}
                  userId={userId}
                  projectPath="/home/jon/Projects/syna"
                  fullText={value}
                  cursorPosition={cursorPosition}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}