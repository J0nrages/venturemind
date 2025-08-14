export type ContextType = 'conversation' | 'project' | 'task' | 'meeting' | 'document';

export interface Agent {
  id: string;
  name: string;
  type: 'planner' | 'writer' | 'engineer' | 'analyst' | 'critic' | 'tester' | 'ops';
  status: 'idle' | 'working' | 'thinking' | 'complete' | 'error';
  currentTask?: string;
  avatar?: string;
  capabilities: string[];
}

export interface SurfaceContent {
  sections?: {
    title: string;
    content: string;
    metadata?: string[];
  }[];
  data?: any;
}

export interface SurfaceConfig {
  visible: boolean;
  title: string;
  status?: string;
  content?: SurfaceContent;
  agentManipulated?: boolean;
}

export interface ContextSurfaces {
  document?: SurfaceConfig;
  agents?: SurfaceConfig;
  metrics?: SurfaceConfig;
  planning?: SurfaceConfig;
  [key: string]: SurfaceConfig | undefined;
}

export interface Context {
  id: string;
  type: ContextType;
  title: string;
  description?: string;
  badge?: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  activeAgents: Agent[]; // Agents currently involved in this conversation
  availableAgents: Agent[]; // All available agents that can join
  surfaces: ContextSurfaces;
  conversationHistory: {
    id: string;
    content: string;
    sender: 'user' | 'ai' | 'agent';
    agentId?: string;
    timestamp: Date;
    agentIndicators?: {
      agentName: string;
      status: string;
    }[];
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  archived?: boolean;
  parentContextId?: string; // For branched conversations
  workspaceMode?: 'compact' | 'expanded' | 'full';
}

export interface ContextAction {
  type: 'switch' | 'toggle_surface' | 'agent_action' | 'expand_mode' | 'create_context' | 'archive_context' | 'branch_context' | 'save_context';
  payload?: any;
}

// Available agent pool
export const AVAILABLE_AGENTS: Agent[] = [
  // Engineering agents
  {
    id: 'engineer-primary',
    name: '@Engineer',
    type: 'engineer',
    status: 'idle',
    capabilities: ['code_generation', 'debugging', 'architecture', 'testing'],
  },
  {
    id: 'critic-eng',
    name: '@Critic',
    type: 'critic',
    status: 'idle',
    capabilities: ['code_review', 'security_audit', 'performance_analysis'],
  },
  {
    id: 'tester-eng',
    name: '@Tester',
    type: 'tester',
    status: 'idle',
    capabilities: ['unit_testing', 'integration_testing', 'e2e_testing'],
  },
  // Business/Strategy agents
  {
    id: 'writer-business',
    name: '@Writer',
    type: 'writer',
    status: 'idle',
    capabilities: ['investor_updates', 'pitch_decks', 'financial_narratives', 'requirements', 'documentation'],
  },
  {
    id: 'analyst-business',
    name: '@Analyst',
    type: 'analyst',
    status: 'idle',
    capabilities: ['market_analysis', 'competitive_research', 'metrics_analysis', 'user_research'],
  },
  {
    id: 'planner-business',
    name: '@Planner',
    type: 'planner',
    status: 'idle',
    capabilities: ['strategy_planning', 'timeline_planning', 'milestone_tracking', 'roadmap_planning', 'sprint_management'],
  },
  // Operations agents
  {
    id: 'ops-primary',
    name: '@Ops',
    type: 'ops',
    status: 'idle',
    capabilities: ['deployment', 'monitoring', 'scaling', 'infrastructure'],
  },
];

// Helper function to create a new context
export const createNewContext = (title: string, type: ContextType = 'conversation'): Omit<Context, 'conversationHistory'> => ({
  id: `context-${Date.now()}`,
  type,
  title,
  color: {
    primary: '#6366F1', // indigo-500
    secondary: '#E0E7FF', // indigo-100
    accent: '#4F46E5', // indigo-600
  },
  activeAgents: [],
  availableAgents: AVAILABLE_AGENTS,
  surfaces: {
    document: {
      visible: false,
      title: 'Document',
    },
    agents: {
      visible: false,
      title: 'Active Agents',
    },
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Default starting context (empty conversation)
export const DEFAULT_CONTEXTS: Omit<Context, 'conversationHistory'>[] = [
  createNewContext('General Chat', 'conversation'),
];