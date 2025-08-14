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
  RefreshCw
} from 'lucide-react';
import { ConversationMessage } from '../services/ConversationService';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface ThreadedChatMessageProps {
  message: ConversationMessage;
  onArchive: (messageId: string) => void;
  onRestore: (messageId: string) => void;
  onReply: (messageId: string, quotedText?: string) => void;
  onBranch: (messageId: string, selectedText: string) => void;
  onRetry?: (messageId: string) => void;
  onHardDelete?: (messageId: string) => void;
  showArchived: boolean;
  isRoot?: boolean;
  depth?: number;
  children?: React.ReactNode;
}

export default function ThreadedChatMessage({
  message,
  onArchive,
  onRestore,
  onReply,
  onBranch,
  showArchived,
  isRoot = false,
  depth = 0,
  children
}: ThreadedChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showTextMenu, setShowTextMenu] = useState(false);
  const [textMenuPosition, setTextMenuPosition] = useState({ x: 0, y: 0 });
  const messageRef = useRef<HTMLDivElement>(null);

  const isArchived = !!message.archived_at;
  const isReply = !!message.reply_to_message_id;
  const isBranch = !!message.parent_message_id && !message.reply_to_message_id;

  // Handle text selection for branching
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Check if selection is within this message
        if (messageRef.current?.contains(range.commonAncestorContainer)) {
          setSelectedText(selection.toString().trim());
          setTextMenuPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 40
          });
          setShowTextMenu(true);
        }
      } else {
        setShowTextMenu(false);
        setSelectedText('');
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleBranchFromSelection = () => {
    if (selectedText) {
      onBranch(message.id, selectedText);
      setShowTextMenu(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleQuoteReply = () => {
    if (selectedText) {
      onReply(message.id, selectedText);
      setShowTextMenu(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }
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

      {/* Text selection context menu */}
      <AnimatePresence>
        {showTextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed z-50 bg-popover border border-border rounded-md shadow-lg p-1"
            style={{
              left: textMenuPosition.x,
              top: textMenuPosition.y,
              transform: 'translateX(-50%)'
            }}
          >
            <button
              onClick={handleBranchFromSelection}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-sm w-full text-left"
            >
              <GitBranch className="w-3 h-3" />
              Branch Discussion
            </button>
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
            ? 'ml-auto max-w-xs lg:max-w-md bg-emerald-600 text-white' 
            : 'mr-auto max-w-xs lg:max-w-md bg-card border-border'
        } ${isArchived ? 'bg-muted border-dashed' : ''}`}
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