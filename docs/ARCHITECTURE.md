# Syna Architecture Documentation

## Documentation Index

This document serves as the primary architecture reference with updated terminology aligned to product vision.

### Core Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - This document - Complete system architecture
- **[README.md](../README.md)** - Product vision and requirements (terminology source of truth)
- **[TERMINOLOGY_MIGRATION.md](./TERMINOLOGY_MIGRATION.md)** - Migration plan for naming updates
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment strategies

## Executive Summary

Syna is an AI-powered operating system built with a modern, service-oriented architecture. The system features a React/TypeScript frontend organized into Projects and Workspaces, with a Python FastAPI backend providing multi-agent AI orchestration.

## Terminology Alignment

### Core Concepts (From README.md v3.0)

| Concept | Definition | Implementation Status |
|---------|------------|----------------------|
| **Project** | Organizational folder for related work | Implemented as routes |
| **Workspace** | Focused container with chat + surfaces | Currently called "Context" |
| **MainChat** | Primary conversation in workspace | Currently "ConversationSpine" |
| **Surface** | Interactive document/dashboard | ✓ Correctly named |
| **ContextObject** | Versioned concept tracking | Planned feature |
| **Branch** | New workspace WITH context | Partially implemented |
| **Thread** | New workspace WITHOUT context | Confused with message replies |
| **Ledger** | Universal activity stream | In DocumentMemory.tsx |

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Supabase      │
│   (React/TS)    │◄──►│   (FastAPI)     │◄──►│   (DB/Auth)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Project Pages   │    │ Agent Engine    │    │ Edge Functions  │
│ Workspace UI    │    │ LangChain/Graph │    │ WebSocket/SSE   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture (`/src`) - Current State (August 2025)

### Component Directory Structure & Purpose

```
src/
├── components/
│   ├── [WORKSPACE MANAGEMENT]
│   │   ├── WorkspaceCard.tsx          # Card UI for workspace selection/preview
│   │   ├── WorkspaceSwitcher.tsx      # Alt+Tab style workspace switching interface
│   │   ├── WorkspaceView.tsx          # Main workspace container with chat + surfaces
│   │   └── ContextMenu.tsx            # Right-click menu for workspace actions
│   │
│   ├── [CHAT COMPONENTS]
│   │   ├── MainChat.tsx               # Primary chat interface (739 lines - main conversation UI)
│   │   ├── MessageWithReplies.tsx     # Message component with nested reply threading
│   │   ├── UnifiedChatInput.tsx       # Unified input with mentions, model selector, commands
│   │   ├── ModernChatSidebar.tsx      # Floating sidebar chat for secondary conversations
│   │   ├── RepliesSidebar.tsx         # Sidebar showing message reply threads
│   │   ├── ReplyModal.tsx             # Modal for composing message replies
│   │   └── BranchModal.tsx            # Modal for creating workspace branches
│   │
│   ├── [MENTION SYSTEM]
│   │   ├── MentionAutocomplete.tsx    # Dropdown for @ mention suggestions
│   │   ├── MentionHighlighter.tsx     # Highlights @ mentions in text
│   │   ├── MentionTextarea.tsx        # Main textarea with mention support
│   │   ├── MentionTextarea2.tsx       # Alternative mention implementation
│   │   └── SimpleMentionTextarea.tsx  # Lightweight mention textarea variant
│   │
│   ├── [DOCUMENT SURFACES]
│   │   ├── Surface.tsx                # Base surface component for documents
│   │   ├── PageSurface.tsx            # Page-specific surface implementation
│   │   └── CollaborativeEditor.tsx    # Real-time collaborative document editor
│   │
│   ├── [AGENT VISUALIZATION]
│   │   ├── AgentRail.tsx              # Side rail showing active agent status
│   │   └── AgenticAIChatOrchestrator.tsx # Orchestrates multi-agent conversations
│   │
│   ├── [UI COMPONENTS - shadcn/ui]
│   │   └── ui/
│   │       ├── button.tsx             # Reusable button component
│   │       ├── card.tsx               # Card container component
│   │       ├── dialog.tsx             # Modal dialog component
│   │       ├── sidebar.tsx            # Sidebar navigation component
│   │       └── [20+ more]             # Complete UI component library
│   │
│   └── [SHARED/UTILITY COMPONENTS]
│       ├── AuthGuard.tsx              # Route protection for authenticated users
│       ├── ErrorBoundary.tsx          # Error handling wrapper component
│       ├── Sidebar.tsx                # Main app navigation sidebar
│       ├── SimpleSidebar.tsx          # Minimal sidebar variant
│       ├── PageHeader.tsx             # Consistent page header component
│       ├── PageLayout.tsx             # Page wrapper with common layout
│       ├── FormattedMessage.tsx       # Message formatting with markdown
│       ├── PresenceIndicator.tsx      # Shows user online status
│       └── ThemeToggle.tsx            # Dark/light mode switcher

├── contexts/
│   └── WorkspaceProvider.tsx          # Global workspace state and context management

├── hooks/
│   ├── useMessageReplies.ts          # Handles message reply threading logic
│   ├── useSSEConnection.ts           # Server-Sent Events for real-time updates
│   ├── useBusinessData.ts            # Business plan data management
│   ├── useStrategicData.ts           # Strategic planning data hooks
│   └── useWebSocket.ts               # WebSocket connection management

├── pages/
│   ├── [BUSINESS PLANNING]
│   │   ├── BusinessPlan.tsx          # Main business planning interface
│   │   ├── BusinessSetup.tsx         # Initial business configuration wizard
│   │   ├── Strategy.tsx              # Strategic planning and goal setting
│   │   └── SwotAnalysis.tsx          # SWOT analysis tool
│   │
│   ├── [FINANCIAL MANAGEMENT]
│   │   ├── ProformaPage.tsx          # Financial projections and pro forma
│   │   ├── Metrics.tsx               # KPI tracking and analytics
│   │   ├── Revenue.tsx               # Revenue tracking and forecasting
│   │   └── Customers.tsx             # Customer management interface
│   │
│   ├── [COLLABORATION & AI]
│   │   ├── Documents.tsx             # Document management interface
│   │   ├── DocumentMemory.tsx        # Document history and ledger view
│   │   └── AIProcessing.tsx          # AI task processing dashboard
│   │
│   └── [SYSTEM PAGES]
│       ├── Auth.tsx                  # Login/signup authentication flow
│       ├── Settings.tsx              # User and system settings
│       ├── ModernDashboard.tsx       # Main application dashboard
│       └── Integrations.tsx          # Third-party service integrations

└── services/
    ├── [AI & CHAT SERVICES]
    │   ├── ChatService.ts            # Core chat functionality and message handling
    │   ├── GeminiService.ts          # Google Gemini AI integration
    │   ├── GeminiToolService.ts     # Tool calling for Gemini models
    │   ├── MentionService.ts         # @ mention parsing and handling
    │   └── ToolExecutor.ts           # Execute AI-suggested tools
    │
    ├── [AGENT ORCHESTRATION]
    │   ├── AgentOrchestrator.ts      # Multi-agent coordination logic
    │   └── AgentOrchestrationService.ts # Agent suggestion and management
    │
    ├── [BUSINESS LOGIC]
    │   ├── BusinessService.ts        # Business plan data operations
    │   ├── StrategicService.ts       # Strategic planning operations
    │   └── ProformaService.ts        # Financial projection calculations
    │
    ├── [DOCUMENT MANAGEMENT]
    │   ├── DocumentService.ts        # Basic document CRUD operations
    │   └── CollaborativeDocumentService.ts # Real-time collaboration
    │
    ├── [REAL-TIME & INTEGRATION]
    │   ├── UnifiedWebSocketManager.ts # WebSocket connection pooling
    │   ├── SSEService.ts             # Server-Sent Events handling
    │   ├── IntegrationService.ts     # External service integrations
    │   └── UserSettingsService.ts    # User preferences and config
```

## Backend Architecture (`/backend`) - Aligned Terminology

### Updated API Endpoints

```python
# Current → Target API Routes
/api/v1/contexts       → /api/v1/workspaces
/api/v1/threading      → /api/v1/replies
/api/v1/conversations  → /api/v1/chats

# New endpoints needed
/api/v1/projects       # Project management
/api/v1/context-objects # Versioned concept tracking
/api/v1/ledger        # Activity stream
/api/v1/branches      # Workspace branching
/api/v1/threads       # Fresh workspace creation
```

## Database Schema Updates

### Current Tables → Required Changes

```sql
-- Existing tables that need renaming
ALTER TABLE contexts RENAME TO workspaces;
ALTER TABLE context_messages RENAME TO workspace_messages;

-- New tables needed
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workspace_project (
    workspace_id UUID REFERENCES workspaces(id),
    project_id UUID REFERENCES projects(id),
    PRIMARY KEY (workspace_id, project_id)
);

CREATE TABLE context_objects (
    id UUID PRIMARY KEY,
    key TEXT NOT NULL,        -- e.g., "product-color"
    version INTEGER NOT NULL,
    value JSONB NOT NULL,
    previous_version UUID REFERENCES context_objects(id),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    actor_type TEXT NOT NULL, -- 'user', 'agent', 'system'
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    diff JSONB,
    revertable BOOLEAN DEFAULT true,
    workspace_id UUID REFERENCES workspaces(id),
    project_id UUID REFERENCES projects(id)
);
```

## Component Connection & Data Flow

### Primary Application Flow

```
App.tsx
  ├─> AuthGuard (authentication check)
  └─> Router
      ├─> ModernDashboard (/)
      │   └─> WorkspaceSwitcher
      │       └─> WorkspaceView
      │           ├─> MainChat (primary conversation)
      │           └─> Surface(s) (documents/dashboards)
      │
      └─> [Page Routes] (/business-plan, /strategy, etc.)
          └─> PageLayout
              ├─> Sidebar (navigation)
              ├─> PageHeader
              └─> [Page Content]
```

### Key Component Interactions

1. **MainChat ↔ UnifiedChatInput**
   - MainChat manages conversation state and history
   - UnifiedChatInput handles user input with mentions, model selection
   - Connected via props: value, onChange, onSend

2. **WorkspaceProvider ↔ Components**
   - Provides global workspace context to all child components
   - Components access via useContexts() hook
   - Manages: active workspace, agents, threading

3. **Services ↔ Supabase**
   - All services communicate with Supabase for data persistence
   - Real-time updates via SSEService and WebSocket
   - Authentication handled through supabase.auth

4. **Agent Orchestration Flow**
   ```
   User Input → ChatService → AgentOrchestrator
                                    ↓
                            AgentOrchestrationService
                                    ↓
                            GeminiService (AI processing)
                                    ↓
                            Response → MainChat UI
   ```

## Component Relationships with New Terminology

### Project → Workspace → Surface Architecture

```
User Session
     │
     ▼
ProjectContainer (route: /project/:projectId)
     │
     ├── WorkspaceSwitcher (Alt+Tab between workspaces)
     │   ├── WorkspaceCard: "Fundraising"
     │   ├── WorkspaceCard: "Product Planning"
     │   └── WorkspaceCard: "Code Review"
     │
     └── ActiveWorkspace (current focus)
         ├── MainChat (primary conversation)
         ├── Surface: DocumentEditor
         ├── Surface: SpreadsheetView
         └── AgentCursors (visual indicators)
```

### Message Reply vs Thread vs Branch Clarification

```
ACTION: User selects text in MainChat
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
Reply       Branch      Thread
│           │           │
├─ Same     ├─ New      ├─ New
│  chat     │  workspace │  workspace
│           │           │
├─ Nested   ├─ WITH     ├─ WITHOUT
│  message  │  context  │  context
│           │           │
└─ Uses:    └─ Uses:    └─ Uses:
   Message     Branch      Thread
   WithReplies Creator     Creator
```

## WebSocket Architecture Updates

### Channel Definitions with New Terms

```typescript
enum WebSocketChannel {
  WORKSPACE = 'workspace',      // Workspace-level messages
  CHAT = 'chat',                // MainChat messages
  AGENT = 'agent',              // Agent coordination
  SURFACE = 'surface',          // Surface synchronization
  LEDGER = 'ledger',           // Activity stream updates
  CONTEXT_OBJECT = 'context'    // ContextObject changes
}

interface WebSocketMessage {
  channel: WebSocketChannel;
  workspaceId: string;         // Changed from contextId
  projectId?: string;
  payload: any;
}
```

## Migration Impact Analysis

### High Impact (Core functionality)
- ContextProvider → WorkspaceProvider (35+ imports)
- ConversationSpine → MainChat (20+ imports)
- All API endpoints need updating

### Medium Impact (Multiple touchpoints)
- Threading terminology (10+ files)
- Database schema changes
- WebSocket message formats

### Low Impact (Isolated changes)
- Component file names
- Hook names
- Service method names


## Performance Considerations

### Workspace Management
- Lazy-load inactive workspaces
- Cache recently accessed workspaces
- Suspend background workspace activities

### ContextObject Tracking
- Efficient diff algorithms for version tracking
- Indexed search across all versions
- Async propagation of changes

### Ledger Performance
- Pagination for historical entries
- Real-time streaming for live updates
- Indexed by timestamp, actor, and target

### MainChat Optimization
- Virtual scrolling for long conversations
- Debounced typing indicators
- Optimistic UI updates for messages
- Cached model configurations

## Testing Strategy for Migration

### Phase 1: Parallel Implementation
- Create new components with correct names
- Keep old components working
- Add feature flags for gradual rollout

### Phase 2: Data Migration
- Database schema updates with backwards compatibility
- Migration scripts for existing data
- Rollback procedures ready

### Phase 3: UI Cutover
- Switch routes to new components
- Update imports progressively
- Monitor for issues

### Phase 4: Cleanup
- Remove old components
- Update documentation
- Final testing

---

**Last Updated**: August 2025
**Architecture Version**: 4.1 (Current State Documentation)
**Status**: Active Development - Partially Migrated Terminology