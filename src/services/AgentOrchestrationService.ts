import { Agent, AVAILABLE_AGENTS } from '../types/context';

interface AgentMatchResult {
  agent: Agent;
  confidence: number;
  reason: string;
}

export class AgentOrchestrationService {
  // Keywords and patterns for different agent types
  private static readonly AGENT_KEYWORDS = {
    engineer: [
      'code', 'programming', 'debug', 'bug', 'error', 'function', 'api', 'database',
      'frontend', 'backend', 'javascript', 'typescript', 'react', 'node', 'sql',
      'git', 'deploy', 'build', 'test', 'architecture', 'refactor', 'optimize',
      'algorithm', 'performance', 'security', 'authentication', 'cors', 'webpack'
    ],
    writer: [
      'write', 'draft', 'document', 'content', 'blog', 'article', 'copy', 'proposal',
      'pitch', 'investor', 'update', 'newsletter', 'email', 'presentation', 'deck',
      'requirements', 'specification', 'user story', 'readme', 'documentation',
      'narrative', 'messaging', 'communication', 'report', 'summary'
    ],
    analyst: [
      'analyze', 'research', 'data', 'metrics', 'statistics', 'report', 'insights',
      'market', 'competitor', 'trend', 'user behavior', 'analytics', 'dashboard',
      'kpi', 'conversion', 'revenue', 'growth', 'retention', 'churn', 'cohort',
      'segmentation', 'survey', 'feedback', 'review', 'performance', 'benchmark'
    ],
    planner: [
      'plan', 'roadmap', 'timeline', 'milestone', 'sprint', 'backlog', 'prioritize',
      'schedule', 'deadline', 'goal', 'objective', 'strategy', 'feature', 'epic',
      'project', 'manage', 'organize', 'workflow', 'process', 'methodology',
      'agile', 'scrum', 'kanban', 'deliverable', 'scope', 'resource', 'capacity'
    ],
    critic: [
      'review', 'audit', 'check', 'validate', 'verify', 'quality', 'standards',
      'best practices', 'security', 'vulnerability', 'compliance', 'guidelines',
      'feedback', 'improve', 'suggestion', 'recommendation', 'issue', 'problem',
      'risk', 'assessment', 'evaluation', 'inspection'
    ],
    tester: [
      'test', 'testing', 'qa', 'quality assurance', 'unit test', 'integration',
      'e2e', 'end to end', 'automation', 'selenium', 'jest', 'cypress', 'mock',
      'coverage', 'regression', 'bug', 'defect', 'scenario', 'edge case',
      'acceptance', 'validation', 'verification'
    ],
    ops: [
      'deploy', 'deployment', 'server', 'infrastructure', 'aws', 'azure', 'gcp',
      'docker', 'kubernetes', 'ci/cd', 'pipeline', 'monitoring', 'logging',
      'scaling', 'load balancer', 'database', 'backup', 'recovery', 'uptime',
      'performance', 'optimization', 'cache', 'cdn', 'ssl', 'security'
    ]
  };

  // Analyze message content to suggest relevant agents
  static suggestAgents(message: string, currentAgents: Agent[] = []): AgentMatchResult[] {
    const messageLower = message.toLowerCase();
    const suggestions: AgentMatchResult[] = [];
    
    // Get current agent IDs to avoid duplicates
    const currentAgentIds = new Set(currentAgents.map(a => a.id));

    for (const agent of AVAILABLE_AGENTS) {
      if (currentAgentIds.has(agent.id)) continue;

      const keywords = this.AGENT_KEYWORDS[agent.type] || [];
      let matches = 0;
      let totalKeywords = keywords.length;
      const foundKeywords: string[] = [];

      // Count keyword matches
      for (const keyword of keywords) {
        if (messageLower.includes(keyword)) {
          matches++;
          foundKeywords.push(keyword);
        }
      }

      // Calculate confidence based on matches
      const confidence = totalKeywords > 0 ? (matches / totalKeywords) * 100 : 0;

      // Only suggest if confidence is above threshold
      if (confidence > 5 && matches > 0) {
        suggestions.push({
          agent,
          confidence,
          reason: `Detected ${matches} relevant keyword${matches > 1 ? 's' : ''}: ${foundKeywords.slice(0, 3).join(', ')}${foundKeywords.length > 3 ? '...' : ''}`
        });
      }
    }

    // Sort by confidence descending
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Return top 3 suggestions
  }

  // Get smart agent suggestions based on conversation context
  static getContextualAgentSuggestions(
    recentMessages: string[], 
    currentAgents: Agent[] = []
  ): AgentMatchResult[] {
    // Combine recent messages for analysis
    const conversationContext = recentMessages.slice(-5).join(' ');
    return this.suggestAgents(conversationContext, currentAgents);
  }

  // Check if an agent should be automatically activated
  static shouldAutoActivateAgent(message: string, agentType: Agent['type']): boolean {
    const keywords = this.AGENT_KEYWORDS[agentType] || [];
    const messageLower = message.toLowerCase();
    
    let matches = 0;
    for (const keyword of keywords) {
      if (messageLower.includes(keyword)) {
        matches++;
      }
    }

    // Auto-activate if high confidence (>20% of keywords match)
    const confidence = keywords.length > 0 ? (matches / keywords.length) * 100 : 0;
    return confidence > 20;
  }

  // Get agent recommendations for a new context
  static getInitialAgentRecommendations(contextTitle: string): AgentMatchResult[] {
    return this.suggestAgents(contextTitle);
  }
}