import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

interface MentionTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelect?: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  cursorPosition?: number;
  mentionContext?: { startIndex: number; endIndex: number; query: string } | null;
  showMentionHighlight?: boolean;
}

export const MentionTextarea2 = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ 
    value, 
    onChange, 
    onKeyDown, 
    onSelect,
    cursorPosition = 0, 
    mentionContext,
    showMentionHighlight = true,
    className,
    style,
    ...props 
  }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    
    useImperativeHandle(ref, () => textareaRef.current!);

    // Get all mentions in the text
    const getMentions = () => {
      const mentions: Array<{start: number; end: number; text: string; isActive: boolean}> = [];
      const mentionRegex = /(@[\w]+)(?:\s|$)/g;
      let match;
      
      while ((match = mentionRegex.exec(value)) !== null) {
        const start = match.index;
        const end = match.index + match[1].length;
        const isActive = mentionContext && 
          start === mentionContext.startIndex &&
          cursorPosition >= start && 
          cursorPosition <= end;
          
        mentions.push({
          start,
          end,
          text: match[1],
          isActive
        });
      }
      
      return mentions;
    };

    const mentions = getMentions();

    return (
      <div className="relative">
        {/* Backdrop with mention highlights */}
        {showMentionHighlight && (
          <div
            ref={backdropRef}
            className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words px-4 py-3 pr-12"
            aria-hidden="true"
          >
            {mentions.map((mention, index) => {
              // Calculate position for highlight
              const beforeText = value.substring(0, mention.start);
              const lines = beforeText.split('\n');
              
              return (
                <div
                  key={index}
                  className={cn(
                    "absolute inline-block rounded-full transition-all duration-150",
                    mention.isActive 
                      ? "bg-primary/20 ring-2 ring-primary/30"
                      : "bg-primary/10"
                  )}
                  style={{
                    // This is a simplified positioning - in production you'd calculate exact position
                    left: `${(mention.start * 8)}px`,
                    top: `${(lines.length - 1) * 24}px`,
                    padding: '2px 8px',
                    zIndex: 0
                  }}
                />
              );
            })}
          </div>
        )}
        
        {/* Regular textarea on top */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onSelect={onSelect}
          className={cn(
            "relative z-10",
            className
          )}
          style={style}
          {...props}
        />
      </div>
    );
  }
);

MentionTextarea2.displayName = 'MentionTextarea2';

export default MentionTextarea2;