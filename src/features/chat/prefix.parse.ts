/**
 * Prefix Parser - Detects command modes from input text
 * Pure function that parses prefix grammar for commands and mentions
 */

export type PrefixMode = 
  | 'natural'    // No prefix - regular chat
  | 'command'    // / - Slash commands
  | 'search'     // // - Global search
  | 'power'      // > - Power user commands
  | 'help'       // ? - Help/documentation
  | 'quick'      // ! - Quick actions
  | 'workspace'  // # - Workspace navigation
  | 'document'   // ^ - Document reference
  | 'mention';   // @ - User/agent mentions

export interface ParsedPrefix {
  mode: PrefixMode;
  trigger: string;      // The actual prefix characters (/, //, >, etc.)
  query: string;        // The text after the prefix
  startIndex: number;   // Position where prefix starts
  endIndex: number;     // Position where prefix ends
}

/**
 * Detects and parses prefix commands from input text at cursor position
 * @param text - The input text to parse
 * @param cursorPosition - Current cursor position in the text
 * @returns Parsed prefix information or null if no prefix detected
 */
export function parsePrefix(text: string, cursorPosition: number): ParsedPrefix | null {
  if (!text || cursorPosition < 0) return null;

  // Get text up to cursor position
  const textToCursor = text.slice(0, cursorPosition);
  
  // Check if we're at the start of input or after whitespace (valid prefix position)
  const lastSpaceIndex = textToCursor.lastIndexOf(' ');
  const prefixStart = lastSpaceIndex + 1;
  const currentWord = textToCursor.slice(prefixStart);

  // No prefix if we're not at a word boundary
  if (prefixStart > 0 && text[prefixStart - 1] !== ' ') {
    return null;
  }

  // Check for double slash first (search)
  if (currentWord.startsWith('//')) {
    return {
      mode: 'search',
      trigger: '//',
      query: currentWord.slice(2),
      startIndex: prefixStart,
      endIndex: cursorPosition
    };
  }

  // Check single character prefixes
  const firstChar = currentWord[0];
  
  switch (firstChar) {
    case '/':
      return {
        mode: 'command',
        trigger: '/',
        query: currentWord.slice(1),
        startIndex: prefixStart,
        endIndex: cursorPosition
      };
    
    case '>':
      return {
        mode: 'power',
        trigger: '>',
        query: currentWord.slice(1),
        startIndex: prefixStart,
        endIndex: cursorPosition
      };
    
    case '?':
      return {
        mode: 'help',
        trigger: '?',
        query: currentWord.slice(1),
        startIndex: prefixStart,
        endIndex: cursorPosition
      };
    
    case '!':
      return {
        mode: 'quick',
        trigger: '!',
        query: currentWord.slice(1),
        startIndex: prefixStart,
        endIndex: cursorPosition
      };
    
    case '#':
      return {
        mode: 'workspace',
        trigger: '#',
        query: currentWord.slice(1),
        startIndex: prefixStart,
        endIndex: cursorPosition
      };
    
    case '^':
      return {
        mode: 'document',
        trigger: '^',
        query: currentWord.slice(1),
        startIndex: prefixStart,
        endIndex: cursorPosition
      };
    
    case '@':
      return {
        mode: 'mention',
        trigger: '@',
        query: currentWord.slice(1),
        startIndex: prefixStart,
        endIndex: cursorPosition
      };
    
    default:
      return null;
  }
}

/**
 * Replaces a prefix command with the selected result
 * @param text - Original text
 * @param prefix - The parsed prefix to replace
 * @param replacement - The replacement text
 * @returns Updated text with replacement
 */
export function replacePrefixWith(
  text: string, 
  prefix: ParsedPrefix, 
  replacement: string
): string {
  const before = text.slice(0, prefix.startIndex);
  const after = text.slice(prefix.endIndex);
  return before + replacement + after;
}

/**
 * Checks if a prefix mode should trigger the omnibox
 * @param mode - The prefix mode
 * @returns True if this mode should open the omnibox
 */
export function shouldOpenOmnibox(mode: PrefixMode): boolean {
  // All command modes except natural and mention should open omnibox
  // Mentions have their own UI component
  return mode !== 'natural' && mode !== 'mention';
}

/**
 * Gets a human-readable label for a prefix mode
 * @param mode - The prefix mode
 * @returns Display label for the mode
 */
export function getPrefixModeLabel(mode: PrefixMode): string {
  const labels: Record<PrefixMode, string> = {
    natural: 'Chat',
    command: 'Command',
    search: 'Search',
    power: 'Power',
    help: 'Help',
    quick: 'Quick Action',
    workspace: 'Workspace',
    document: 'Document',
    mention: 'Mention'
  };
  return labels[mode];
}

/**
 * Gets the icon name for a prefix mode (for UI display)
 * @param mode - The prefix mode
 * @returns Icon identifier
 */
export function getPrefixModeIcon(mode: PrefixMode): string {
  const icons: Record<PrefixMode, string> = {
    natural: 'message',
    command: 'terminal',
    search: 'search',
    power: 'zap',
    help: 'help-circle',
    quick: 'bolt',
    workspace: 'hash',
    document: 'file-text',
    mention: 'at-sign'
  };
  return icons[mode];
}