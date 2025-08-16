import { Agent, AVAILABLE_AGENTS } from '../types/context';
import { supabase } from '../lib/supabase';

export interface MentionItem {
  id: string;
  type: 'agent' | 'file' | 'user' | 'workspace';
  name: string;
  description?: string;
  path?: string; // For files
  icon?: string;
  color?: string;
  metadata?: any;
}

export interface MentionContext {
  cursorPosition: number;
  text: string;
  triggerChar: string;
  query: string;
  startIndex: number;
  endIndex: number;
}

export class MentionService {
  private static fileCache: Map<string, MentionItem[]> = new Map();
  private static lastFileScan: number = 0;
  private static readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Detects mention context from text and cursor position
   */
  static detectMention(text: string, cursorPosition: number): MentionContext | null {
    // Check if we're right after a trigger character
    if (cursorPosition > 0) {
      const charBefore = text[cursorPosition - 1];
      if (charBefore === '@' || charBefore === '/' || charBefore === '#' || charBefore === '>') {
        // Make sure it's at word boundary (space before or start of text)
        const indexBefore = cursorPosition - 2;
        if (indexBefore < 0 || text[indexBefore] === ' ' || text[indexBefore] === '\n') {
          return {
            cursorPosition,
            text,
            triggerChar: charBefore,
            query: '',
            startIndex: cursorPosition - 1,
            endIndex: cursorPosition
          };
        }
      }
    }
    
    // Look backwards from cursor to find @ or other trigger chars
    let startIndex = cursorPosition - 1;
    
    while (startIndex >= 0) {
      const char = text[startIndex];
      
      // Check for mention triggers
      if (char === '@' || char === '/' || char === '#' || char === '>') {
        // Make sure it's at word boundary (space before or start of text)
        if (startIndex === 0 || text[startIndex - 1] === ' ' || text[startIndex - 1] === '\n') {
          const query = text.substring(startIndex + 1, cursorPosition);
          
          // Don't trigger if there's a space in the query (mention is complete)
          if (!query.includes(' ')) {
            return {
              cursorPosition,
              text,
              triggerChar: char,
              query,
              startIndex,
              endIndex: cursorPosition
            };
          }
        }
        break;
      }
      
      // Stop if we hit a space or newline
      if (text[startIndex] === ' ' || text[startIndex] === '\n') {
        break;
      }
      
      startIndex--;
    }
    
    return null;
  }

  /**
   * Get suggestions based on trigger character and query
   */
  static async getSuggestions(
    context: MentionContext,
    userId?: string,
    projectPath?: string
  ): Promise<MentionItem[]> {
    const { triggerChar, query } = context;
    const lowerQuery = query.toLowerCase();
    
    switch (triggerChar) {
      case '@':
        return this.getMentionSuggestions(lowerQuery, userId, projectPath);
      case '/':
        return this.getWorkspaceSuggestions(lowerQuery, userId);
      case '#':
        return this.getProjectSuggestions(lowerQuery, userId);
      case '>':
        return this.getCommandSuggestions(lowerQuery);
      default:
        return [];
    }
  }

  /**
   * Get @ mention suggestions (agents, files, users)
   */
  private static async getMentionSuggestions(
    query: string,
    userId?: string,
    projectPath?: string
  ): Promise<MentionItem[]> {
    const suggestions: MentionItem[] = [];
    const searchQuery = query.toLowerCase();
    
    // If no query, show default suggestions
    if (query.length === 0) {
      // Show most relevant agents
      const defaultAgents = AVAILABLE_AGENTS.slice(0, 4).map(agent => ({
        id: agent.id,
        type: 'agent' as const,
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        color: agent.color
      }));
      suggestions.push(...defaultAgents);
      
      // Show recent/important files
      if (projectPath) {
        const files = await this.getProjectFiles(projectPath);
        const importantFiles = [
          'README.md',
          'src/components/MainChat.tsx',
          'src/services/AgentOrchestrator.ts',
          'docs/ARCHITECTURE.md'
        ];
        
        const defaultFiles = files
          .filter(f => importantFiles.includes(f.path || f.name))
          .slice(0, 4);
        suggestions.push(...defaultFiles);
      }
      
      // Show team members
      if (userId) {
        const users = await this.getUsers(userId);
        suggestions.push(...users.slice(0, 3));
      }
      
      return suggestions;
    }
    
    // Score function for fuzzy matching
    const getMatchScore = (item: string, query: string): number => {
      if (!query) return 1; // Show all if no query
      const itemLower = item.toLowerCase();
      if (itemLower === query) return 1000; // Exact match
      if (itemLower.startsWith(query)) return 100; // Starts with
      if (itemLower.includes(query)) return 10; // Contains
      
      // Fuzzy match - check if query letters appear in order
      let queryIndex = 0;
      let score = 0;
      for (let i = 0; i < itemLower.length && queryIndex < query.length; i++) {
        if (itemLower[i] === query[queryIndex]) {
          queryIndex++;
          score += (5 - Math.min(i, 5)); // Higher score for matches at beginning
        }
      }
      return queryIndex === query.length ? score : 0;
    };
    
    // 1. Add matching agents with scores
    const agentSuggestions = AVAILABLE_AGENTS
      .map(agent => {
        const nameScore = getMatchScore(agent.name, searchQuery);
        const descScore = getMatchScore(agent.description, searchQuery) * 0.5;
        const typeScore = getMatchScore(agent.type, searchQuery) * 0.3;
        const totalScore = Math.max(nameScore, descScore, typeScore);
        
        return {
          item: {
            id: agent.id,
            type: 'agent' as const,
            name: agent.name,
            description: agent.description,
            icon: agent.icon,
            color: agent.color
          },
          score: totalScore
        };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.item);
    
    suggestions.push(...agentSuggestions);
    
    // 2. Add matching files from project with scores
    if (projectPath) {
      const files = await this.getProjectFiles(projectPath);
      const fileSuggestions = files
        .map(file => {
          const nameScore = getMatchScore(file.name, searchQuery);
          const pathScore = getMatchScore(file.path || '', searchQuery) * 0.7;
          const totalScore = Math.max(nameScore, pathScore);
          
          return { item: file, score: totalScore };
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => s.item);
      
      suggestions.push(...fileSuggestions);
    }
    
    // 3. Add matching users/colleagues with scores
    if (userId) {
      const users = await this.getUsers(userId);
      const userSuggestions = users
        .map(user => {
          const nameScore = getMatchScore(user.name, searchQuery);
          const descScore = getMatchScore(user.description || '', searchQuery) * 0.5;
          const totalScore = Math.max(nameScore, descScore);
          
          return { item: user, score: totalScore };
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(s => s.item);
      
      suggestions.push(...userSuggestions);
    }
    
    return suggestions;
  }

  /**
   * Get workspace suggestions for / command
   */
  private static async getWorkspaceSuggestions(
    query: string,
    userId?: string
  ): Promise<MentionItem[]> {
    if (!userId) return [];
    
    try {
      // Note: This would need to be updated to 'workspaces' table per architecture doc
      const { data: contexts } = await supabase
        .from('contexts')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${query}%`)
        .limit(10);
      
      return (contexts || []).map(ctx => ({
        id: ctx.id,
        type: 'workspace' as const,
        name: ctx.title,
        description: `Switch to ${ctx.title}`,
        color: ctx.color
      }));
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      return [];
    }
  }

  /**
   * Get project suggestions for # command
   */
  private static async getProjectSuggestions(
    query: string,
    userId?: string
  ): Promise<MentionItem[]> {
    // This would connect to projects table once implemented
    return [
      { id: 'default', type: 'workspace', name: 'Default Project', description: 'Main project workspace' }
    ].filter(p => p.name.toLowerCase().includes(query));
  }

  /**
   * Get command suggestions for > prefix
   */
  private static getCommandSuggestions(query: string): MentionItem[] {
    const commands = [
      { id: 'show-metrics', name: 'show revenue metrics', description: 'Display revenue dashboard' },
      { id: 'run-tests', name: 'run tests', description: 'Execute test suite' },
      { id: 'analyze-code', name: 'analyze code quality', description: 'Run code analysis' },
      { id: 'generate-report', name: 'generate weekly report', description: 'Create status report' },
      { id: 'deploy', name: 'deploy to production', description: 'Start deployment pipeline' }
    ];
    
    return commands
      .filter(cmd => cmd.name.includes(query))
      .map(cmd => ({
        id: cmd.id,
        type: 'workspace' as const,
        name: cmd.name,
        description: cmd.description,
        icon: '>'
      }));
  }

  /**
   * Scan project directory for files (with caching)
   */
  private static async getProjectFiles(projectPath: string): Promise<MentionItem[]> {
    const now = Date.now();
    
    // Check cache
    if (this.fileCache.has(projectPath) && (now - this.lastFileScan) < this.CACHE_DURATION) {
      return this.fileCache.get(projectPath) || [];
    }
    
    try {
      // Common Syna project files based on the actual project structure
      const files: MentionItem[] = [
        // Core files
        { id: 'README.md', type: 'file', name: 'README.md', path: 'README.md', icon: '📝' },
        { id: 'package.json', type: 'file', name: 'package.json', path: 'package.json', icon: '📦' },
        { id: 'tsconfig.json', type: 'file', name: 'tsconfig.json', path: 'tsconfig.json', icon: '⚙️' },
        { id: 'vite.config.ts', type: 'file', name: 'vite.config.ts', path: 'vite.config.ts', icon: '⚡' },
        
        // Documentation
        { id: 'docs/ARCHITECTURE.md', type: 'file', name: 'ARCHITECTURE.md', path: 'docs/ARCHITECTURE.md', icon: '📐' },
        { id: 'docs/TERMINOLOGY_MIGRATION.md', type: 'file', name: 'TERMINOLOGY_MIGRATION.md', path: 'docs/TERMINOLOGY_MIGRATION.md', icon: '📚' },
        { id: 'docs/DEPLOYMENT.md', type: 'file', name: 'DEPLOYMENT.md', path: 'docs/DEPLOYMENT.md', icon: '🚀' },
        { id: 'CLAUDE.md', type: 'file', name: 'CLAUDE.md', path: 'CLAUDE.md', icon: '🤖' },
        
        // Components
        { id: 'src/components/MainChat.tsx', type: 'file', name: 'MainChat.tsx', path: 'src/components/MainChat.tsx', icon: '💬' },
        { id: 'src/components/UnifiedChatInput.tsx', type: 'file', name: 'UnifiedChatInput.tsx', path: 'src/components/UnifiedChatInput.tsx', icon: '⌨️' },
        { id: 'src/components/MentionAutocomplete.tsx', type: 'file', name: 'MentionAutocomplete.tsx', path: 'src/components/MentionAutocomplete.tsx', icon: '🔍' },
        { id: 'src/components/Surface.tsx', type: 'file', name: 'Surface.tsx', path: 'src/components/Surface.tsx', icon: '📋' },
        { id: 'src/components/SynaApp.tsx', type: 'file', name: 'SynaApp.tsx', path: 'src/components/SynaApp.tsx', icon: '🏠' },
        { id: 'src/components/ContextProvider.tsx', type: 'file', name: 'ContextProvider.tsx', path: 'src/components/ContextProvider.tsx', icon: '🔄' },
        
        // Services
        { id: 'src/services/AgentOrchestrator.ts', type: 'file', name: 'AgentOrchestrator.ts', path: 'src/services/AgentOrchestrator.ts', icon: '🤖' },
        { id: 'src/services/AgentOrchestrationService.ts', type: 'file', name: 'AgentOrchestrationService.ts', path: 'src/services/AgentOrchestrationService.ts', icon: '🎯' },
        { id: 'src/services/MentionService.ts', type: 'file', name: 'MentionService.ts', path: 'src/services/MentionService.ts', icon: '@' },
        { id: 'src/services/ChatService.ts', type: 'file', name: 'ChatService.ts', path: 'src/services/ChatService.ts', icon: '💬' },
        { id: 'src/services/DocumentService.ts', type: 'file', name: 'DocumentService.ts', path: 'src/services/DocumentService.ts', icon: '📄' },
        { id: 'src/services/GeminiService.ts', type: 'file', name: 'GeminiService.ts', path: 'src/services/GeminiService.ts', icon: '✨' },
        
        // Pages
        { id: 'src/pages/Dashboard.tsx', type: 'file', name: 'Dashboard.tsx', path: 'src/pages/Dashboard.tsx', icon: '📊' },
        { id: 'src/pages/BusinessPlan.tsx', type: 'file', name: 'BusinessPlan.tsx', path: 'src/pages/BusinessPlan.tsx', icon: '📈' },
        { id: 'src/pages/Strategy.tsx', type: 'file', name: 'Strategy.tsx', path: 'src/pages/Strategy.tsx', icon: '♟️' },
        { id: 'src/pages/Documents.tsx', type: 'file', name: 'Documents.tsx', path: 'src/pages/Documents.tsx', icon: '📑' },
        
        // Entry points
        { id: 'src/main.tsx', type: 'file', name: 'main.tsx', path: 'src/main.tsx', icon: '🚪' },
        { id: 'src/App.tsx', type: 'file', name: 'App.tsx', path: 'src/App.tsx', icon: '📱' },
        { id: 'index.html', type: 'file', name: 'index.html', path: 'index.html', icon: '🌐' },
        
        // Supabase
        { id: 'supabase/migrations', type: 'file', name: 'migrations/', path: 'supabase/migrations', icon: '🗄️' },
        { id: 'supabase/functions', type: 'file', name: 'functions/', path: 'supabase/functions', icon: '⚡' },
        
        // Types
        { id: 'src/types/context.ts', type: 'file', name: 'context.ts', path: 'src/types/context.ts', icon: '🏷️' },
        { id: 'src/types/business.ts', type: 'file', name: 'business.ts', path: 'src/types/business.ts', icon: '🏢' }
      ];
      
      this.fileCache.set(projectPath, files);
      this.lastFileScan = now;
      
      return files;
    } catch (error) {
      console.error('Error scanning project files:', error);
      return [];
    }
  }

  /**
   * Get user/colleague suggestions
   */
  private static async getUsers(userId: string): Promise<MentionItem[]> {
    try {
      // In production, this would fetch team members from database
      // For now, return example colleagues
      return [
        { id: 'user-1', type: 'user', name: 'Alice Chen', description: 'Product Manager', icon: '👤' },
        { id: 'user-2', type: 'user', name: 'Bob Smith', description: 'Senior Engineer', icon: '👤' },
        { id: 'user-3', type: 'user', name: 'Carol Johnson', description: 'Designer', icon: '👤' }
      ];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Replace mention in text with formatted version
   */
  static replaceMention(
    text: string,
    context: MentionContext,
    item: MentionItem
  ): string {
    const before = text.substring(0, context.startIndex);
    const after = text.substring(context.endIndex);
    
    // The trigger character (@, /, #, etc.) is already at context.startIndex
    // We just need to add the name after it
    const mention = `${context.triggerChar}${item.name}`;
    
    return `${before}${mention} ${after}`;
  }

  /**
   * Parse mentions from text
   */
  static parseMentions(text: string): Array<{type: string; value: string; startIndex: number; endIndex: number; isComplete: boolean}> {
    const mentions = [];
    const patterns = [
      { type: 'agent', regex: /@([\w-]+)(?:\s|$)/g },
      { type: 'file', regex: /@([\w\/.]+\.\w+)(?:\s|$)/g },
      { type: 'user', regex: /@([\w\s]+)(?:\s|$)/g },
      { type: 'workspace', regex: /\/([\w-]+)(?:\s|$)/g },
      { type: 'project', regex: /#([\w-]+)(?:\s|$)/g },
      { type: 'command', regex: />([\w\s]+)(?:\s|$)/g }
    ];
    
    for (const { type, regex } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        mentions.push({
          type,
          value: match[1],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          isComplete: true // These are all complete mentions
        });
      }
    }
    
    return mentions.sort((a, b) => a.startIndex - b.startIndex);
  }
  
  /**
   * Check if a text contains completed mentions
   */
  static getCompletedMentions(text: string): string[] {
    const mentions = this.parseMentions(text);
    return mentions.filter(m => m.isComplete).map(m => m.value);
  }
}