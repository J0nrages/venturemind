import React from 'react';
import { cn } from '@/lib/utils';

interface MentionHighlighterProps {
  text: string;
  cursorPosition: number;
  className?: string;
}

interface MentionSegment {
  text: string;
  isMention: boolean;
  isActive: boolean;
  type?: 'agent' | 'file' | 'user' | 'workspace' | 'command';
}

export function MentionHighlighter({ text, cursorPosition, className }: MentionHighlighterProps) {
  const getSegments = (): MentionSegment[] => {
    const segments: MentionSegment[] = [];
    const mentionRegex = /(@[\w\/.]*|\/[\w-]*|#[\w-]*|>[\w\s]*)/g;
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, match.index),
          isMention: false,
          isActive: false
        });
      }

      // Determine if this mention is active (cursor is within it)
      const mentionStart = match.index;
      const mentionEnd = match.index + match[0].length;
      const isActive = cursorPosition >= mentionStart && cursorPosition <= mentionEnd;

      // Determine mention type
      let type: MentionSegment['type'];
      if (match[0].startsWith('@')) type = 'agent';
      else if (match[0].startsWith('/')) type = 'workspace';
      else if (match[0].startsWith('>')) type = 'command';
      else type = 'agent';

      // Add mention
      segments.push({
        text: match[0],
        isMention: true,
        isActive,
        type
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        isMention: false,
        isActive: false
      });
    }

    return segments;
  };

  const segments = getSegments();

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <div className="px-4 py-3 pr-12 whitespace-pre-wrap break-words">
        {segments.map((segment, index) => (
          <span
            key={index}
            className={cn(
              segment.isMention && !segment.isActive && "text-blue-600 font-medium",
              segment.isActive && "bg-blue-100 text-blue-700 px-0.5 rounded"
            )}
            style={{
              opacity: segment.isMention ? 1 : 0
            }}
          >
            {segment.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default MentionHighlighter;