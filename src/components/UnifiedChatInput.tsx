import React, { useState, useRef, useEffect } from 'react';
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
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UserSettingsService, type ModelConfiguration } from '../services/UserSettingsService';

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
}

export default function UnifiedChatInput({
  value,
  onChange,
  onSend,
  loading = false,
  placeholder = "Type your message here...",
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
  userId
}: UnifiedChatInputProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [localSelectedModel, setLocalSelectedModel] = useState(selectedModel);
  const inputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSelectedModel(selectedModel);
  }, [selectedModel]);

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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    : "p-4 border-t border-gray-200 bg-white/50 backdrop-blur-sm";

  return (
    <div className={cn(containerClass, className)}>
      {floating ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={wrapperClass}
        >
          <ChatInputContent />
        </motion.div>
      ) : (
        <div className={wrapperClass}>
          <div className="max-w-2xl mx-auto">
            <ChatInputContent />
          </div>
        </div>
      )}
    </div>
  );

  function ChatInputContent() {
    return (
      <>
        {/* Message Stats */}
        {showStats && stats?.lastLatency && (
          <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
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
                className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                disabled={loading}
              >
                <Brain className="w-4 h-4" />
                <span className="font-medium">{localSelectedModel}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showModelDropdown && Object.keys(modelOptions).length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48 z-10">
                  {Object.entries(modelOptions).map(([modelName, config]) => (
                    <button
                      key={modelName}
                      onClick={() => handleModelSelect(modelName)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                        localSelectedModel === modelName ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{modelName}</div>
                      <div className="text-xs text-gray-500">
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
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={webSearchEnabled ? 'Web search enabled' : 'Web search disabled'}
            >
              <Search className="w-4 h-4" />
              <span className="text-xs font-medium">Search</span>
            </button>
          )}

          {/* Attachment placeholder */}
          {showAttachment && (
            <button
              className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Attach files (coming soon)"
              disabled
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Message Input */}
        <div className="relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading}
            className="w-full bg-white/80 border-0 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-0 transition-colors resize-none min-h-[44px] shadow-sm"
          />
          <Button
            onClick={onSend}
            disabled={loading || !value.trim()}
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted transition-all"
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
      </>
    );
  }
}