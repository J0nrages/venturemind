import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Archive, 
  RotateCcw, 
  GitBranch, 
  Reply, 
  MoreHorizontal,
  Quote,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Zap,
  MessageSquare
} from 'lucide-react';
import { ConversationMessage } from '../services/ConversationService';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useThreading, SelectionAnalysis } from '../hooks/useThreading';

interface ThreadedChatMessageProps {
  message: ConversationMessage;
  onArchive: (messageId: string) => void;
  onRestore: (messageId: string) => void;
  onReply: (messageId: string, quotedText?: string) => void;
  onBranch: (messageId: string, selectedText: string) => void;
  onThread?: (messageId: string, selectedText: string) => void;
  onSpawnAgent?: (agentId: string, selectedText: string) => void;
  onRetry?: (messageId: string) => void;
  onHardDelete?: (messageId: string) => void;
  showArchived: boolean;
  isRoot?: boolean;
  depth?: number;
  children?: React.ReactNode;
  contextId?: string;
  userId?: string | null;
}

export default function ThreadedChatMessage({
  message,
  onArchive,
  onRestore,
  onReply,
  onBranch,
  onThread,
  onSpawnAgent,
  onRetry,
  showArchived,
  isRoot = false,
  depth = 0,
  children,
  contextId,
  userId
}: ThreadedChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [textMenuPosition, setTextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectionAnalysis, setSelectionAnalysis] = useState<SelectionAnalysis | null>(null);
  const [analyzingSelection, setAnalyzingSelection] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  
  const { analyzeSelection, extractCurrentTopic, getRecentMessages } = useThreading(userId);

  const isArchived = !!message.archived_at;
  const isReply = !!message.reply_to_message_id;
  const isBranch = !!message.parent_message_id && !message.reply_to_message_id;
  
  // Determine if message should show retry button
  const shouldShowRetry = () => {
    // Show retry for user messages that may have failed AI responses
    if (message.sender === 'user' && onRetry) return true;
    
    // Show retry for AI messages that failed or have errors
    if (message.sender === 'ai' && onRetry) {
      // Check if message content indicates an error
      const hasError = message.content.toLowerCase().includes('error') ||
                      message.content.toLowerCase().includes('failed') ||
                      message.content.toLowerCase().includes('try again') ||
                      message.thread_title_status === 'failed';
      return hasError;
    }
    
    return false;
  };

  // Enhanced text selection with intelligent analysis
  useEffect(() => {
    const handleSelection = async () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Check if selection is within this message
        if (messageRef.current?.contains(range.commonAncestorContainer)) {
          const text = selection.toString().trim();
          setSelectedText(text);
          setTextMenuPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 80 // More space for intelligent menu
          });
          setShowTextMenu(true);
          
          // Analyze selection for intelligent suggestions
          if (text.length > 10) { // Only analyze meaningful selections
            setAnalyzingSelection(true);
            try {
              const analysis = await analyzeSelection(text, {
                conversationContext: message.content,
                messageHistory: getRecentMessages(5),
                currentTopic: extractCurrentTopic()
              });
              setSelectionAnalysis(analysis);
            } catch (error) {
              console.error('Selection analysis failed:', error);
              setSelectionAnalysis(null);
            } finally {
              setAnalyzingSelection(false);
            }
          }
        }
      } else {
        setShowTextMenu(false);
        setSelectedText('');
        setSelectionAnalysis(null);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [analyzeSelection, extractCurrentTopic, getRecentMessages, message.content]);

  const handleBranchFromSelection = () => {
    if (selectedText) {
      onBranch(message.id, selectedText);
      clearSelection();
    }
  };

  const handleThreadFromSelection = () => {
    if (selectedText && onThread) {
      onThread(message.id, selectedText);
      clearSelection();
    }
  };

  const handleQuoteReply = () => {
    if (selectedText) {
      onReply(message.id, selectedText);
      clearSelection();
    }
  };
  
  const handleSpawnAgent = (agentId: string) => {
    if (selectedText && onSpawnAgent) {
      onSpawnAgent(agentId, selectedText);
      clearSelection();
    }
  };
  
  const clearSelection = () => {
    setShowTextMenu(false);
    setSelectedText('');
    setSelectionAnalysis(null);
    window.getSelection()?.removeAllRanges();
  };

  const getStatusIcon = () => {
    switch (message.thread_title_status) {
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getIndentLevel = () => {
    return Math.min(depth * 20, 60); // Max indent of 60px
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: isArchived && !showArchived ? 0.5 : 1, 
        y: 0,
        x: getIndentLevel()
      }}
      className={`relative ${isArchived && !showArchived ? 'pointer-events-none' : ''}`}
      style={{ marginLeft: `${getIndentLevel()}px` }}
    >
      {/* Threading connector lines */}
      {(isReply || isBranch) && depth > 0 && (
        <div className="absolute -left-5 top-0 w-5 h-full">
          <div className="absolute left-0 top-0 w-px h-6 bg-border"></div>
          <div className="absolute left-0 top-6 w-5 h-px bg-border"></div>
        </div>
      )}

      {/* Branch indicator */}
      {isBranch && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <GitBranch className="w-3 h-3" />
          <span>Branched from: "{message.branch_context?.substring(0, 50)}..."</span>
        </div>
      )}

      {/* Reply indicator */}
      {isReply && message.quoted_text && (
        <div className="bg-muted/50 border-l-2 border-blue-500 pl-3 py-2 mb-2 rounded-r text-sm">
          <div className="text-muted-foreground text-xs mb-1">Replying to:</div>
          <div className="italic">"{message.quoted_text}"</div>
        </div>
      )}

      {/* Enhanced text selection context menu */}
      <AnimatePresence>
        {showTextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[200px]"
            style={{
              left: textMenuPosition.x,
              top: textMenuPosition.y,
              transform: 'translateX(-50%)'
            }}
          >
            {analyzingSelection && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing selection...
              </div>
            )}
            
            {!analyzingSelection && selectionAnalysis && (
              <>
                {/* Branch option with intelligence */}
                <button
                  onClick={handleBranchFromSelection}
                  className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-accent rounded-sm w-full text-left ${
                    selectionAnalysis.suggestsBranch ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3 h-3" />
                    <span>🌿 {selectionAnalysis.suggestsBranch ? selectionAnalysis.branchReason : 'Branch Here'}</span>
                  </div>
                  {selectionAnalysis.branchConfidence > 0.7 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {Math.round(selectionAnalysis.branchConfidence * 100)}%
                    </span>
                  )}
                </button>
                
                {/* Thread option with intelligence */}
                {onThread && (
                  <button
                    onClick={handleThreadFromSelection}
                    className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-accent rounded-sm w-full text-left ${
                      selectionAnalysis.suggestsThread ? 'bg-purple-50 border border-purple-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" />
                      <span>🧵 {selectionAnalysis.suggestsThread ? selectionAnalysis.threadReason : 'Create Thread'}</span>
                    </div>
                    {selectionAnalysis.threadConfidence > 0.7 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {Math.round(selectionAnalysis.threadConfidence * 100)}%
                      </span>
                    )}
                  </button>
                )}
                
                {/* Agent suggestions */}
                {selectionAnalysis.agentSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSpawnAgent(suggestion.agentId)}
                    className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-accent rounded-sm w-full text-left ${
                      suggestion.confidence > 0.8 ? 'bg-green-50 border border-green-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      <span>{suggestion.icon} {suggestion.text}</span>
                    </div>
                    {suggestion.confidence > 0.7 && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    )}
                  </button>
                ))}
                
                <div className="border-t border-border my-1"></div>
              </>
            )}
            
            {/* Standard options */}
            <button
              onClick={handleQuoteReply}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-sm w-full text-left"
            >
              <Quote className="w-3 h-3" />
              Quote & Reply
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main message card */}
      <Card
        ref={messageRef}
        className={`group relative ${
          message.sender === 'user'
            ? 'ml-auto bg-primary text-primary-foreground'
            : 'mr-auto bg-card border border-border'
        } ${'max-w-[65%] sm:max-w-[60%] lg:max-w-[55%]'} ${isArchived ? 'bg-muted border-dashed' : ''}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="p-4">
          {/* Message header with thread title */}
          {message.thread_title && isRoot && (
            <div className="flex items-center gap-2 mb-2 text-xs">
              {getStatusIcon()}
              <span className="font-medium text-muted-foreground">
                {message.thread_title}
              </span>
            </div>
          )}

          {/* Message content */}
          <div className="prose prose-sm max-w-none">
            <p className="text-sm mb-0 select-text">{message.content}</p>
          </div>

          {/* Document updates */}
          {message.document_updates && message.document_updates.length > 0 && (
            <div className="mt-2 text-xs opacity-75">
              Updated: {message.document_updates.join(', ')}
            </div>
          )}

          {/* AI confidence */}
          {message.sender === 'ai' && message.context_confidence > 0 && (
            <div className="mt-1 text-xs opacity-60">
              Confidence: {Math.round(message.context_confidence * 100)}%
            </div>
          )}

          {/* Archive indicator */}
          {isArchived && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Archive className="w-3 h-3" />
              Archived {new Date(message.archived_at!).toLocaleString()}
            </div>
          )}
        </div>

        {/* Message actions */}
        <AnimatePresence>
          {showActions && !isArchived && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute -right-2 top-2 flex flex-col gap-1"
            >
              <Button
                size="sm"
                variant="secondary"
                className="h-6 w-6 p-0"
                onClick={() => onReply(message.id)}
                title="Reply"
              >
                <Reply className="w-3 h-3" />
              </Button>
              
              <Button
                size="sm"
                variant="secondary" 
                className="h-6 w-6 p-0"
                onClick={() => onArchive(message.id)}
                title="Archive"
              >
                <Archive className="w-3 h-3" />
              </Button>
              
              {shouldShowRetry() && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={() => onRetry!(message.id)}
                  title="Retry"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}
            </motion.div>
          )}

          {/* Restore button for archived messages */}
          {isArchived && showArchived && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute -right-2 top-2"
            >
              <Button
                size="sm"
                variant="secondary"
                className="h-6 w-6 p-0"
                onClick={() => onRestore(message.id)}
                title="Restore"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Child messages/replies */}
      {children && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </motion.div>
  );
}