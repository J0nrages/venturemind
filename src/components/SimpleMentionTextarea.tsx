import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SimpleMentionTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  mentionStyles?: boolean;
}

export const SimpleMentionTextarea = forwardRef<HTMLTextAreaElement, SimpleMentionTextareaProps>(
  ({ className, mentionStyles = true, ...props }, ref) => {
    // Add custom CSS for mention highlighting
    const mentionClass = mentionStyles ? 'mention-textarea' : '';
    
    return (
      <>
        <style jsx global>{`
          .mention-textarea {
            caret-color: currentColor;
          }
          
          /* Style completed mentions that have a space after them */
          .mention-textarea:has(+ .mention-highlight) {
            color: transparent;
          }
        `}</style>
        
        <textarea
          ref={ref}
          className={cn(mentionClass, className)}
          {...props}
        />
      </>
    );
  }
);

SimpleMentionTextarea.displayName = 'SimpleMentionTextarea';

export default SimpleMentionTextarea;