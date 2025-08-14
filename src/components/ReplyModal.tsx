import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Quote } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  quotedText?: string;
  parentMessage?: string;
}

export default function ReplyModal({
  isOpen,
  onClose,
  onSubmit,
  quotedText,
  parentMessage
}: ReplyModalProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-card/95 backdrop-blur-xl border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Quote className="w-5 h-5 text-blue-600" />
                  Reply to Message
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Quoted Text */}
                {quotedText && (
                  <div className="bg-muted/50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                    <p className="text-sm text-muted-foreground mb-1">Replying to:</p>
                    <p className="text-sm italic">"{quotedText}"</p>
                  </div>
                )}
                
                {/* Parent Message Context */}
                {parentMessage && !quotedText && (
                  <div className="bg-muted/30 border border-border/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Original message:</p>
                    <p className="text-sm line-clamp-3">{parentMessage}</p>
                  </div>
                )}
                
                {/* Reply Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your reply:</label>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reply..."
                    className="w-full h-32 p-3 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Press ⌘+Enter (Mac) or Ctrl+Enter (Windows) to send
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}