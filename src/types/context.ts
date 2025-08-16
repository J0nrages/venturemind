export enum ContextType {
  MAIN = 'main',                    // Primary conversation
  BRANCH = 'branch',               // User-initiated branch
  THREAD = 'thread',               // Text selection thread
  AGENT_WORKSTREAM = 'agent_workstream', // Agent-spawned context
  LISTENER = 'listener'            // Hidden prefetch context
}

export enum ContextVisibility {
  ACTIVE = 'active',               // Visible and interactable
  BACKGROUND = 'background',       // Running but minimized
  HIDDEN = 'hidden'               // Not visible (for listeners)
}

export interface ContextMetadata {
  origin?: 'text_selection' | 'branch_action' | 'agent_spawn' | 'user_created';
  agentId?: string;
  selectedText?: string;
  prefetchData?: any;
  conversationType: 'main' | 'branch' | 'thread' | 'agent_workstream';
  
  // Branch-specific metadata
  branchPoint?: {
    messageId: string;
    timestamp: Date;
  };
  
  // Thread-specific metadata  
  inspirationLink?: {
    messageId: string;
    selectedText: string;
    parentContextId: string;
  };
  
  // Agent workstream metadata
  suggestedBy?: string;
  workstreamStatus?: 'initializing' | 'running' | 'complete' | 'error';
}

export interface Agent {
  id: string;
  name: string;
  type: 'planner' | 'writer' | 'engineer' | 'analyst' | 'critic' | 'tester' | 'ops';
  status: 'idle' | 'working' | 'thinking' | 'complete' | 'error';
  currentTask?: string;
  avatar?: string;
  capabilities: string[];
  description?: string;
  icon?: string;
  color?: string;
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
  visibility: ContextVisibility;
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
  metadata: ContextMetadata;
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
    name: 'Engineer',
    type: 'engineer',
    status: 'idle',
    capabilities: ['code_generation', 'debugging', 'architecture', 'testing'],
    description: 'Senior Software Engineer',
    icon: '🤖',
    color: '#10B981'
  },
  {
    id: 'critic-eng',
    name: 'Critic',
    type: 'critic',
    status: 'idle',
    capabilities: ['code_review', 'security_audit', 'performance_analysis'],
    description: 'Code Review Specialist',
    icon: '🤖',
    color: '#F59E0B'
  },
  {
    id: 'tester-eng',
    name: 'Tester',
    type: 'tester',
    status: 'idle',
    capabilities: ['unit_testing', 'integration_testing', 'e2e_testing'],
    description: 'QA Engineer',
    icon: '🤖',
    color: '#8B5CF6'
  },
  // Business/Strategy agents
  {
    id: 'writer-business',
    name: 'Writer',
    type: 'writer',
    status: 'idle',
    capabilities: ['investor_updates', 'pitch_decks', 'financial_narratives', 'requirements', 'documentation'],
    description: 'Technical Writer',
    icon: '🤖',
    color: '#3B82F6'
  },
  {
    id: 'analyst-business',
    name: 'Analyst',
    type: 'analyst',
    status: 'idle',
    capabilities: ['market_analysis', 'competitive_research', 'metrics_analysis', 'user_research'],
    description: 'Business Analyst',
    icon: '🤖',
    color: '#EC4899'
  },
  {
    id: 'planner-business',
    name: 'Planner',
    type: 'planner',
    status: 'idle',
    capabilities: ['strategy_planning', 'timeline_planning', 'milestone_tracking', 'roadmap_planning', 'sprint_management'],
    description: 'Project Manager',
    icon: '🤖',
    color: '#06B6D4'
  },
  // Operations agents
  {
    id: 'ops-primary',
    name: 'Ops',
    type: 'ops',
    status: 'idle',
    capabilities: ['deployment', 'monitoring', 'scaling', 'infrastructure'],
    description: 'DevOps Engineer',
    icon: '🤖',
    color: '#EF4444'
  },
];

// Helper function to create a new context
export const createNewContext = (
  title: string, 
  type: ContextType = ContextType.MAIN,
  visibility: ContextVisibility = ContextVisibility.ACTIVE,
  metadata: ContextMetadata = {}
): Omit<Context, 'conversationHistory'> => ({
  id: crypto.randomUUID(),
  type,
  visibility,
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
  metadata,
});

// Helper to create main context
export const createMainContext = (): Omit<Context, 'conversationHistory'> => 
  createNewContext('Main Conversation', ContextType.MAIN, ContextVisibility.ACTIVE, {
    conversationType: 'main',
    origin: 'user_created'
  });

// Helper to create branch context (parallel exploration with shared context)
export const createBranchContext = (
  title: string, 
  parentId: string, 
  selectedText?: string
): Omit<Context, 'conversationHistory'> => ({
  ...createNewContext(
    title, 
    ContextType.BRANCH, 
    ContextVisibility.ACTIVE,
    {
      conversationType: 'branch',
      origin: 'text_selection',
      selectedText,
      branchPoint: {
        messageId: crypto.randomUUID(),
        timestamp: new Date()
      }
    }
  ),
  parentContextId: parentId,
});

// Helper to create thread context (fresh conversation inspired by selection)
export const createThreadContext = (
  title: string, 
  parentId: string, 
  inspirationText: string
): Omit<Context, 'conversationHistory'> => ({
  ...createNewContext(
    title, 
    ContextType.THREAD, 
    ContextVisibility.ACTIVE,
    {
      conversationType: 'thread',
      origin: 'text_selection',
      inspirationLink: {
        messageId: crypto.randomUUID(),
        selectedText: inspirationText,
        parentContextId: parentId
      }
    }
  ),
  parentContextId: parentId,
});

// Helper to create agent workstream
export const createAgentWorkstream = (
  agentId: string, 
  parentId: string,
  title?: string
): Omit<Context, 'conversationHistory'> => ({
  ...createNewContext(
    title || `${agentId} Workstream`,
    ContextType.AGENT_WORKSTREAM,
    ContextVisibility.BACKGROUND,
    {
      conversationType: 'agent_workstream',
      origin: 'agent_spawn',
      agentId,
      suggestedBy: agentId,
      workstreamStatus: 'initializing'
    }
  ),
  parentContextId: parentId,
});

// Helper to create listener context
export const createListenerContext = (
  agentId: string,
  parentId: string
): Omit<Context, 'conversationHistory'> => ({
  ...createNewContext(
    `${agentId} Listener`,
    ContextType.LISTENER,
    ContextVisibility.HIDDEN,
    {
      conversationType: 'agent_workstream',
      origin: 'agent_spawn',
      agentId
    }
  ),
  parentContextId: parentId,
});

// Helper to create main context with proper metadata
export const createMainContextWithMetadata = (): Omit<Context, 'conversationHistory'> => 
  createNewContext('Main Conversation', ContextType.MAIN, ContextVisibility.ACTIVE, {
    conversationType: 'main',
    origin: 'user_created'
  });