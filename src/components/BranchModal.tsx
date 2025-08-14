import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  selectedText?: string;
  parentMessage?: string;
}

export default function BranchModal({
  isOpen,
  onClose,
  onSubmit,
  selectedText,
  parentMessage
}: BranchModalProps) {
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
                  <GitBranch className="w-5 h-5 text-emerald-600" />
                  Start New Discussion
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
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
                {/* Selected Text */}
                {selectedText && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 p-3 rounded-r-lg">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1 font-medium">
                      Selected text to explore:
                    </p>
                    <p className="text-sm italic text-emerald-800 dark:text-emerald-200">
                      "{selectedText}"
                    </p>
                  </div>
                )}
                
                {/* Context */}
                <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/10 dark:to-blue-900/10 border border-border/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Creating New Thread
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will create a separate discussion thread focused on the selected topic. 
                    The AI will automatically generate a contextual title for your new thread.
                  </p>
                </div>
                
                {/* Initial Message Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    What would you like to discuss about this topic?
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedText 
                      ? `Start your discussion about "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"` 
                      : "What would you like to explore in this new thread?"
                    }
                    className="w-full h-32 p-3 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Press ⌘+Enter (Mac) or Ctrl+Enter (Windows) to create thread
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
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <GitBranch className="w-4 h-4" />
                    Create Thread
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