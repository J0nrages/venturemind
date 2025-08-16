import React from 'react';
import { Bot, User, FileText, Hash, Folder, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormattedMessageProps {
  content: string;
  className?: string;
}

export function FormattedMessage({ content, className }: FormattedMessageProps) {
  // Parse content for mentions and format them
  const formatContent = () => {
    // Regex to match mentions: @word, /word, #word, >phrase
    const mentionRegex = /(@\w+|\/\w+|#\w+|>[^@/#>]+?)(?=\s|$|[.!?,])/g;
    
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const mention = match[0];
      const mentionType = mention[0];
      const mentionName = mention.substring(1).trim();

      // Get icon based on mention type
      const getIcon = () => {
        switch (mentionType) {
          case '@':
            // Check if it's an agent (Engineer, Writer, Tester, etc.)
            const agentNames = ['Engineer', 'Writer', 'Tester', 'Critic', 'Analyst', 'Planner', 'Ops'];
            if (agentNames.includes(mentionName)) {
              return <Bot className="w-3.5 h-3.5" />;
            }
            return <User className="w-3.5 h-3.5" />;
          case '/':
            return <Folder className="w-3.5 h-3.5" />;
          case '#':
            return <Hash className="w-3.5 h-3.5" />;
          case '>':
            return <ChevronRight className="w-3.5 h-3.5" />;
          default:
            return null;
        }
      };

      // Get color based on mention type
      const getColorClass = () => {
        switch (mentionType) {
          case '@':
            const agentNames = ['Engineer', 'Writer', 'Tester', 'Critic', 'Analyst', 'Planner', 'Ops'];
            if (agentNames.includes(mentionName)) {
              return 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950/70';
            }
            return 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950/50 dark:text-green-400 dark:hover:bg-green-950/70';
          case '/':
            return 'bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-400 dark:hover:bg-purple-950/70';
          case '#':
            return 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-950/50 dark:text-orange-400 dark:hover:bg-orange-950/70';
          case '>':
            return 'bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-950/50 dark:text-pink-400 dark:hover:bg-pink-950/70';
          default:
            return 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-950/50 dark:text-gray-400 dark:hover:bg-gray-950/70';
        }
      };

      // Add formatted mention with Search button-like styling
      parts.push(
        <span
          key={`mention-${key++}`}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium mx-0.5",
            getColorClass()
          )}
        >
          {getIcon()}
          <span>{mentionName}</span>
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  return (
    <span className={className}>
      {formatContent()}
    </span>
  );
}

export default FormattedMessage;