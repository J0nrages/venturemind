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

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
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
    const highlightRef = useRef<HTMLDivElement>(null);
    
    useImperativeHandle(ref, () => textareaRef.current!);

    // Sync highlight scroll with textarea scroll
    useEffect(() => {
      const textarea = textareaRef.current;
      const highlight = highlightRef.current;
      
      if (!textarea || !highlight) return;
      
      const handleScroll = () => {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
      };
      
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }, []);

    // Render highlighted text
    const renderHighlightedText = () => {
      if (!showMentionHighlight || !value) return value;
      
      const segments: JSX.Element[] = [];
      // Match mentions - look for @ followed by word characters
      // Complete mentions have space after or are at end of text
      const mentionRegex = /(@[\w]+(?:\s|$)?|@[\w]*|\/[\w-]+(?:\s|$)?|\/[\w-]*|#[\w-]+(?:\s|$)?|#[\w-]*|>[\w\s]+(?:\s|$)?|>[\w\s]*)/g;
      let lastIndex = 0;
      let match;
      let key = 0;

      while ((match = mentionRegex.exec(value)) !== null) {
        // Add text before mention (make it transparent to match textarea)
        if (match.index > lastIndex) {
          segments.push(
            <span key={key++} className="text-transparent">
              {value.substring(lastIndex, match.index)}
            </span>
          );
        }

        const mentionText = match[0];
        const mentionStart = match.index;
        const mentionEnd = match.index + match[0].length;
        
        // Check if this is an active mention being typed
        const isActive = mentionContext && 
          cursorPosition >= mentionStart && 
          cursorPosition <= mentionEnd &&
          mentionStart === mentionContext.startIndex;
        
        // Check if this is a completed mention (has space after or at end of text)
        const hasSpaceAfter = mentionText.endsWith(' ');
        const isAtEnd = mentionEnd === value.length;
        const isCompleted = mentionText.trim().length > 1 && (hasSpaceAfter || isAtEnd);

        // Add mention with pill-style highlighting
        segments.push(
          <span
            key={key++}
            className={cn(
              "inline-block rounded-md transition-all duration-150",
              isActive 
                ? "bg-primary/15 text-primary px-1.5 py-0.5 ring-1 ring-primary/20"
                : isCompleted
                ? "bg-primary/10 text-primary px-1.5 py-0.5"
                : "text-primary px-0.5"
            )}
            style={{
              marginRight: hasSpaceAfter ? '0.125rem' : '0',
              marginLeft: isCompleted ? '0.125rem' : '0'
            }}
          >
            {match[0].trim()}
          </span>
        );
        
        // Add space after completed mention if it exists
        if (hasSpaceAfter) {
          segments.push(
            <span key={key++} className="text-transparent">
              {' '}
            </span>
          );
        }

        lastIndex = mentionEnd;
      }

      // Add remaining text (make it transparent)
      if (lastIndex < value.length) {
        segments.push(
          <span key={key++} className="text-transparent">
            {value.substring(lastIndex)}
          </span>
        );
      }

      return segments;
    };

    return (
      <>
        {/* Highlight layer */}
        {showMentionHighlight && (
          <div
            ref={highlightRef}
            className={cn(
              "absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words",
              className
            )}
            style={{
              ...style,
              fontSize: 'inherit',
              fontFamily: 'inherit',
              lineHeight: 'inherit',
              letterSpacing: 'inherit',
              border: 'transparent',
              background: 'transparent',
              color: 'transparent',
            }}
            aria-hidden="true"
          >
            <div className="px-4 py-3 pr-14">
              {renderHighlightedText()}
            </div>
          </div>
        )}
        
        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onSelect={onSelect}
          className={className}
          style={style}
          {...props}
        />
      </>
    );
  }
);

MentionTextarea.displayName = 'MentionTextarea';

export default MentionTextarea;