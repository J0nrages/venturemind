# Syna Implementation Document
*AI Operating System for Conversation-Native Work*

Version: 1.0  
Date: August 2025  
Status: Technical Implementation Guide

---

## Executive Summary

This document provides a comprehensive technical roadmap for implementing Syna as specified in the PRD. Based on current technology landscape (August 2025) and the existing codebase, we recommend a phased approach leveraging FastAPI, LangGraph, and Vercel AI SDK to build a production-ready conversation-native AI operating system.

---

## 1. Technology Stack Recommendations

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Layer                             │
├─────────────────────────────────────────────────────────────┤
│  • Framework: React 19 + Vite (existing)                    │
│  • UI Components: ShadCN/UI + Tailwind CSS                  │
│  • State: Zustand + React Context                           │
│  • Streaming: Vercel AI SDK v5                              │
│  • Real-time: WebSocket + SSE (existing)                    │
└─────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────┐
│                   Orchestration Layer                        │
├─────────────────────────────────────────────────────────────┤
│  • Framework: FastAPI (async Python)                        │
│  • Agent Framework: LangGraph                               │
│  • Streaming: AI SDK Protocol + Custom WebSocket            │
│  • Queue: Redis Streams                                     │
│  • Cache: Redis + Vector Store                              │
└─────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────┐
│                    Data & Services Layer                     │
├─────────────────────────────────────────────────────────────┤
│  • Database: Supabase (PostgreSQL)                          │
│  • Vector DB: pgvector (existing)                           │
│  • File Storage: Supabase Storage                           │
│  • Auth: Supabase Auth                                      │
│  • Edge Functions: Deno (existing)                          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Rationale

1. **FastAPI over Node.js/Bun Backend**
   - Superior Python AI ecosystem (LangChain, LangGraph, embeddings)
   - Native async/await for concurrent agent execution
   - Pydantic for type-safe API contracts matching TypeScript
   - WebSocket support for real-time streaming

2. **LangGraph for Agent Orchestration**
   - Built-in state machines for multi-step workflows
   - Checkpointing for interruption/resume
   - Native tool calling interface
   - Observable execution traces

3. **Vercel AI SDK Integration**
   - Streaming UI components for action chips
   - Parallel tool execution
   - Type-safe end-to-end streaming
   - Resumable conversations for context switching

4. **Redis for Real-time Operations**
   - Message queue for agent tasks
   - Conversation state caching
   - Distributed locks for approvals
   - Pub/sub for real-time updates

---

## 2. Implementation Phases

### Phase 0: Foundation (Week 1-2)
**Goal: Establish core infrastructure**

1. **Backend Setup**
   ```python
   # FastAPI structure
   syna-backend/
   ├── app/
   │   ├── api/
   │   │   ├── conversations.py
   │   │   ├── agents.py
   │   │   └── tasks.py
   │   ├── core/
   │   │   ├── config.py
   │   │   ├── security.py
   │   │   └── streaming.py
   │   ├── agents/
   │   │   ├── base.py
   │   │   ├── planner.py
   │   │   ├── researcher.py
   │   │   └── writer.py
   │   └── services/
   │       ├── context_manager.py
   │       ├── task_graph.py
   │       └── approval_gateway.py
   ```

2. **Security Fixes**
   - Move Gemini API key to backend
   - Enable Supabase leaked password protection
   - Configure RLS policies for all tables
   - Set up environment-based configuration

3. **Type Safety**
   - Define Pydantic models for all entities
   - Generate TypeScript types from OpenAPI spec
   - Implement strict TypeScript configuration

### Phase 1: Conversation OS (Week 3-4)
**Goal: Core chat with streaming and context**

1. **Streaming Infrastructure**
   ```typescript
   // Frontend integration
   const { messages, append, setContext } = useChat({
     api: '/api/conversation',
     id: threadId,
     maxSteps: 5,
     onToolCall: handleAgentExecution,
   });
   ```

2. **Context Management**
   ```python
   # Backend context engine
   class ContextManager:
       async def create_pack(self, sources: List[Source]) -> ContextPack
       async def attach_to_thread(self, thread_id: str, pack_id: str)
       async def get_relevant_context(self, query: str) -> List[Clip]
   ```

3. **Thread Management**
   - Branching conversations
   - Context inheritance
   - Quick switcher (⌘K) implementation

### Phase 2: Agent System (Week 5-6)
**Goal: Multi-agent orchestration with approvals**

1. **Agent Implementation**
   ```python
   # LangGraph agent definition
   class PlannerAgent(BaseAgent):
       async def plan(self, intent: str) -> TaskGraph:
           # Decompose intent into tasks
           # Assign owners (agents/humans)
           # Set dependencies and due dates
           
   class ResearcherAgent(BaseAgent):
       async def research(self, query: str) -> ResearchResult:
           # Search across integrated sources
           # Generate clips with provenance
           # Return structured findings
   ```

2. **Autonomy Controls**
   ```typescript
   // Frontend autonomy slider
   <AutonomyControl
     levels={['suggest', 'draft', 'execute']}
     onChange={setTaskAutonomy}
     budget={{ time: 300, cost: 0.50 }}
   />
   ```

3. **Approval Gateway**
   - Intercept destructive operations
   - Queue for human review
   - Approval UI with diffs

### Phase 3: Tasks & Projects (Week 7-8)
**Goal: Task graph execution and project management**

1. **Task Graph Engine**
   ```python
   class TaskGraphExecutor:
       async def execute_dag(self, graph: TaskGraph):
           # Topological sort for dependencies
           # Parallel execution where possible
           # Handle blocks and failures
   ```

2. **Project Views**
   - Kanban board with live status
   - Timeline/Gantt visualization
   - Task → Doc linking

3. **Status Propagation**
   - WebSocket updates for task changes
   - Live chips in documents
   - Progress indicators

### Phase 4: Memory & Knowledge (Week 9-10)
**Goal: Intelligent context and memory system**

1. **Memory Layers**
   ```python
   class MemorySystem:
       short_term: ThreadMemory      # Current conversation
       long_term: WorkspaceMemory     # Historical patterns
       semantic: VectorMemory         # Searchable embeddings
       episodic: EventMemory          # Time-based recall
   ```

2. **Snapshot System**
   - Rolling summaries with citations
   - Incremental updates
   - Cross-thread memory transfer

3. **Retrieval Pipeline**
   - Hybrid search (keyword + semantic)
   - Relevance ranking
   - Source attribution

### Phase 5: Integrations (Week 11-12)
**Goal: External tool connectivity**

1. **Integration Framework**
   ```python
   class IntegrationRegistry:
       def register(self, connector: BaseConnector):
           # OAuth flow
           # Scope management
           # Rate limiting
           
   class GitHubConnector(BaseConnector):
       async def create_issue(self, repo: str, issue: Issue)
       async def open_pr(self, repo: str, pr: PullRequest)
   ```

2. **Write-back Safety**
   - Preview generation
   - Conflict detection
   - Fallback to comments

3. **Day-1 Integrations**
   - GitHub (issues, PRs)
   - Google (Drive, Calendar)
   - Notion (pages, databases)
   - Slack (messages, channels)

---

## 3. Critical Implementation Details

### Conversation Protocol

```typescript
// Unified message format
interface SynaMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | AgentType;
  content: string;
  parts: MessagePart[];
  context?: ContextPack;
  approvalState?: ApprovalState;
  metadata: {
    timestamp: number;
    tokenUsage?: TokenUsage;
    executionTime?: number;
    provenance?: Source[];
  };
}

// Stream protocol for real-time updates
interface StreamEvent {
  type: 'text' | 'tool_call' | 'approval_required' | 'status_update';
  payload: any;
  timestamp: number;
}
```

### Agent Tool Interface

```python
# Standardized tool definition
class AgentTool:
    name: str
    description: str
    parameters: BaseModel
    requires_approval: bool
    autonomy_threshold: AutonomyLevel
    
    async def execute(self, params: dict) -> ToolResult:
        # Pre-execution checks
        if self.requires_approval:
            await self.request_approval(params)
        
        # Execute with observability
        with trace_context() as trace:
            result = await self._execute_impl(params)
            trace.record(result)
            
        return result
```

### Context Switching Mechanism

```python
# Fast context switching implementation
class ContextSwitcher:
    def __init__(self):
        self.warm_cache = {}  # Pre-computed contexts
        self.cold_storage = {}  # Full context data
        
    async def switch_context(self, 
                            from_thread: str, 
                            to_thread: str) -> Context:
        # Immediate response with warm cache
        warm_context = self.warm_cache.get(to_thread)
        yield warm_context
        
        # Background enrichment
        if needs_update(to_thread):
            cold_context = await self.load_cold_context(to_thread)
            enriched = await self.enrich_context(cold_context)
            yield enriched
```

### Approval Flow

```typescript
// Frontend approval component
const ApprovalGateway: React.FC<ApprovalRequest> = ({ request }) => {
  const [decision, setDecision] = useState<'approve' | 'reject' | 'modify'>();
  
  return (
    <Card className="glass-card">
      <CardHeader>
        <Badge>{request.agent}</Badge>
        <span>requests permission to {request.action}</span>
      </CardHeader>
      <CardContent>
        <DiffViewer 
          before={request.currentState}
          after={request.proposedState}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={() => approve(request.id)}>Approve</Button>
        <Button onClick={() => reject(request.id)}>Reject</Button>
        <Button onClick={() => modify(request.id)}>Modify</Button>
      </CardFooter>
    </Card>
  );
};
```

---

## 4. Performance Optimization Strategy

### Streaming Optimizations

1. **Token Streaming**
   - First token < 800ms using prefetch
   - Chunked responses with backpressure
   - Client-side buffering for smooth display

2. **Parallel Processing**
   ```python
   async def process_intent(intent: str):
       # Parallel agent execution
       tasks = [
           planner.plan(intent),
           researcher.gather_context(intent),
           writer.prepare_templates(intent)
       ]
       results = await asyncio.gather(*tasks)
   ```

3. **Caching Strategy**
   - Redis for hot conversations (TTL: 1h)
   - PostgreSQL for persistent state
   - CDN for static resources
   - Vector cache for embeddings

### Database Optimizations

1. **Query Optimization**
   ```sql
   -- Indexed conversation retrieval
   CREATE INDEX idx_threads_workspace_updated 
   ON threads(workspace_id, updated_at DESC);
   
   -- Materialized view for task status
   CREATE MATERIALIZED VIEW task_status_summary AS
   SELECT project_id, status, COUNT(*) 
   FROM tasks 
   GROUP BY project_id, status;
   ```

2. **Connection Pooling**
   ```python
   # FastAPI startup
   @app.on_event("startup")
   async def startup():
       app.state.db_pool = await asyncpg.create_pool(
           DATABASE_URL,
           min_size=10,
           max_size=20,
           command_timeout=60
       )
   ```

---

## 5. Security Implementation

### API Security

```python
# FastAPI security middleware
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@app.post("/api/conversation", 
          dependencies=[Depends(RateLimiter(times=100, seconds=60))])
async def create_message(
    message: Message,
    user: User = Depends(get_current_user),
    workspace: Workspace = Depends(verify_workspace_access)
):
    # Input validation
    sanitized = sanitize_input(message.content)
    
    # Check permissions
    if not has_permission(user, workspace, "write"):
        raise HTTPException(403)
    
    # Process with audit trail
    with audit_context(user, "message.create"):
        result = await process_message(sanitized)
    
    return result
```

### Data Protection

1. **Encryption**
   - TLS 1.3 for all connections
   - AES-256 for data at rest
   - Field-level encryption for PII

2. **Access Control**
   ```sql
   -- Row-level security
   CREATE POLICY workspace_isolation ON conversations
   FOR ALL USING (workspace_id = current_workspace());
   ```

3. **Secret Management**
   - HashiCorp Vault for API keys
   - Environment-specific encryption
   - Automatic rotation

---

## 6. Monitoring & Observability

### Metrics Collection

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

message_counter = Counter('syna_messages_total', 
                         'Total messages processed',
                         ['agent', 'status'])
                         
response_time = Histogram('syna_response_duration_seconds',
                         'Response time distribution',
                         ['endpoint'])
                         
active_conversations = Gauge('syna_active_conversations',
                           'Currently active conversations')
```

### Distributed Tracing

```python
# OpenTelemetry integration
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

@tracer.start_as_current_span("agent_execution")
async def execute_agent(agent: Agent, prompt: str):
    span = trace.get_current_span()
    span.set_attribute("agent.name", agent.name)
    span.set_attribute("prompt.length", len(prompt))
    
    result = await agent.process(prompt)
    
    span.set_attribute("result.tokens", result.token_count)
    return result
```

### Error Tracking

```typescript
// Frontend error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack }
      }
    });
    
    // Graceful fallback
    this.setState({ hasError: true });
  }
}
```

---

## 7. Testing Strategy

### Test Pyramid

1. **Unit Tests (70%)**
   ```python
   # Agent testing
   async def test_planner_decomposes_intent():
       planner = PlannerAgent()
       result = await planner.plan("Create a PRD for mobile app")
       assert len(result.tasks) >= 3
       assert all(task.owner for task in result.tasks)
   ```

2. **Integration Tests (20%)**
   ```python
   # End-to-end conversation flow
   async def test_conversation_with_approval():
       async with TestClient(app) as client:
           # Start conversation
           response = await client.post("/api/conversation", 
                                      json={"content": "Deploy to production"})
           assert response.status_code == 200
           
           # Check approval required
           assert response.json()["approval_required"] == True
   ```

3. **E2E Tests (10%)**
   ```typescript
   // Playwright test
   test('complete task creation flow', async ({ page }) => {
     await page.goto('/');
     await page.fill('[data-testid="chat-input"]', 'Plan Q3 roadmap');
     await page.press('[data-testid="chat-input"]', 'Enter');
     
     // Wait for agent response
     await expect(page.locator('[data-testid="action-chip"]')).toBeVisible();
     
     // Approve task creation
     await page.click('[data-testid="approve-tasks"]');
     
     // Verify tasks created
     await expect(page.locator('[data-testid="task-card"]')).toHaveCount(3);
   });
   ```

---

## 8. Deployment Architecture

### Infrastructure as Code

```yaml
# docker-compose.yml for development
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://backend:8000
      
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - redis
      - postgres
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres/syna
      - REDIS_URL=redis://redis:6379
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
      
  postgres:
    image: supabase/postgres:15
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Production Deployment

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: syna-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: syna-backend
  template:
    metadata:
      labels:
        app: syna-backend
    spec:
      containers:
      - name: backend
        image: syna/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: syna-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## 9. Migration Path from Current State

### Immediate Actions (Week 1)

1. **Security Fixes**
   ```bash
   # Move API keys to backend
   mv .env.local .env.backend
   # Update frontend to proxy API calls
   ```

2. **Type Safety**
   ```typescript
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true
     }
   }
   ```

3. **Linting**
   ```bash
   # Fix critical issues
   npm run lint -- --fix
   # Add pre-commit hooks
   npx husky add .husky/pre-commit "npm run lint"
   ```

### Backend Introduction (Week 2)

1. **FastAPI Setup**
   ```bash
   # Create backend structure
   mkdir syna-backend
   cd syna-backend
   poetry init
   poetry add fastapi uvicorn langchain langgraph redis
   ```

2. **API Gateway**
   ```python
   # Proxy existing Supabase calls through FastAPI
   @app.post("/api/proxy/supabase/{path:path}")
   async def proxy_supabase(path: str, request: Request):
       # Add authentication
       # Add rate limiting
       # Forward to Supabase
   ```

### Progressive Enhancement (Week 3+)

1. **Incremental Agent Addition**
   - Start with Planner agent
   - Add Researcher once stable
   - Gradually introduce all 8 agents

2. **Feature Flagging**
   ```typescript
   // Enable features progressively
   const features = {
     conversationOS: true,
     agentSystem: false,  // Enable when ready
     taskGraph: false,
     approvals: false
   };
   ```

---

## 10. Success Metrics & KPIs

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Token Latency | < 800ms P95 | OpenTelemetry |
| Context Switch Time | < 2s | Custom timing |
| Agent Task Success Rate | > 85% | Task completion tracking |
| Approval Response Time | < 10s P95 | Workflow metrics |
| System Availability | 99.9% | Uptime monitoring |

### Product Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Activation (24h) | > 70% | Amplitude/Mixpanel |
| Tasks/User/Week | > 10 | Database query |
| Context Reuse Rate | > 60% | Context pack usage |
| Approval Acceptance | > 80% | Approval logs |
| User Satisfaction | > 4/5 | In-app feedback |

---

## 11. Risk Mitigation

### Technical Risks

1. **LLM Rate Limits**
   - Mitigation: Multi-provider fallback
   - Implementation: Load balancer across OpenAI/Anthropic/Google

2. **Context Window Limits**
   - Mitigation: Intelligent summarization
   - Implementation: Rolling context with importance scoring

3. **Real-time Performance**
   - Mitigation: Edge caching and CDN
   - Implementation: Cloudflare Workers for edge compute

### Business Risks

1. **Data Privacy Concerns**
   - Mitigation: On-premise deployment option
   - Implementation: Docker package for self-hosting

2. **Cost Overruns**
   - Mitigation: Strict budget controls
   - Implementation: Per-workspace spending limits

---

## 12. Timeline & Milestones

### Month 1: Foundation
- ✅ Week 1-2: Infrastructure setup
- ✅ Week 3-4: Conversation OS

### Month 2: Intelligence
- Week 5-6: Agent system
- Week 7-8: Tasks & projects

### Month 3: Polish
- Week 9-10: Memory & knowledge
- Week 11-12: Integrations

### Month 4: Launch Prep
- Week 13-14: Performance optimization
- Week 15-16: Private beta launch

---

## Appendix A: Code Examples

### Agent Definition Example

```python
from langgraph import StateGraph, Node
from typing import TypedDict, List

class PlannerState(TypedDict):
    intent: str
    tasks: List[Task]
    context: ContextPack
    approval_required: bool

class PlannerAgent:
    def __init__(self):
        self.graph = StateGraph(PlannerState)
        
        # Define nodes
        self.graph.add_node("analyze", self.analyze_intent)
        self.graph.add_node("decompose", self.decompose_to_tasks)
        self.graph.add_node("assign", self.assign_owners)
        self.graph.add_node("validate", self.validate_plan)
        
        # Define edges
        self.graph.add_edge("analyze", "decompose")
        self.graph.add_edge("decompose", "assign")
        self.graph.add_conditional_edges(
            "assign",
            self.check_approval_needed,
            {
                True: "validate",
                False: END
            }
        )
        
    async def plan(self, intent: str, context: ContextPack) -> PlanResult:
        initial_state = PlannerState(
            intent=intent,
            context=context,
            tasks=[],
            approval_required=False
        )
        
        result = await self.graph.ainvoke(initial_state)
        return PlanResult(
            tasks=result["tasks"],
            approval_required=result["approval_required"]
        )
```

### Streaming UI Component Example

```typescript
// ActionChip component with streaming updates
export const ActionChip: React.FC<{ action: AgentAction }> = ({ action }) => {
  const [status, setStatus] = useState<'pending' | 'executing' | 'complete'>('pending');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/actions/${action.id}/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'progress') {
        setProgress(data.value);
      } else if (data.type === 'status') {
        setStatus(data.value);
      }
    };
    
    return () => eventSource.close();
  }, [action.id]);
  
  return (
    <Card className="glass-card cursor-pointer hover:scale-105 transition-transform">
      <CardContent className="flex items-center gap-2 p-3">
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{action.label}</span>
        {status === 'executing' && (
          <Progress value={progress} className="w-20 h-2" />
        )}
      </CardContent>
    </Card>
  );
};
```

---

## Appendix B: Database Schema Updates

```sql
-- Thread branching support
ALTER TABLE threads ADD COLUMN parent_thread_id UUID REFERENCES threads(id);
ALTER TABLE threads ADD COLUMN branch_point_message_id UUID REFERENCES messages(id);

-- Context packs
CREATE TABLE context_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sources JSONB NOT NULL DEFAULT '[]',
    embeddings vector(1536)[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task graph with DAG support
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL, -- 'blocks', 'informs', 'requires'
    UNIQUE(task_id, depends_on_task_id)
);

-- Approval system
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    agent_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,
    current_state JSONB,
    proposed_state JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    approver_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution traces for observability
CREATE TABLE execution_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL,
    agent_id VARCHAR(50) NOT NULL,
    tool_name VARCHAR(100),
    input JSONB,
    output JSONB,
    duration_ms INTEGER,
    token_usage JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_threads_workspace_updated ON threads(workspace_id, updated_at DESC);
CREATE INDEX idx_messages_thread_created ON messages(thread_id, created_at);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_context_packs_workspace ON context_packs(workspace_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(workspace_id, status, created_at DESC);
```

---

## Appendix C: Environment Configuration

```env
# .env.backend
# API Keys (moved from frontend)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Database
DATABASE_URL=postgresql://user:pass@localhost/syna
REDIS_URL=redis://localhost:6379

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Observability
SENTRY_DSN=https://xxx@sentry.io/xxx
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Feature Flags
ENABLE_AGENTS=true
ENABLE_APPROVALS=true
ENABLE_INTEGRATIONS=false
```

---

## Conclusion

This implementation document provides a comprehensive roadmap for building Syna as specified in the PRD. The phased approach allows for iterative development while maintaining system stability. The technology choices leverage the best of modern AI tooling (LangGraph, Vercel AI SDK) while building on your existing Supabase infrastructure.

Key success factors:
1. **Start with security** - Fix critical vulnerabilities before adding features
2. **Build incrementally** - Each phase delivers user value
3. **Maintain observability** - Every action is traceable
4. **Optimize for interruption** - Context switching is core to the experience
5. **Design for scale** - Architecture supports growth from solo to enterprise

The estimated timeline of 16 weeks to private beta is aggressive but achievable with focused execution. The modular architecture allows for parallel development across frontend and backend teams once the foundation is established.