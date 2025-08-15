# SYNA: Executive Product Requirements & Vision Document

**Version:** 3.0
**Status:** Implementation Ready - Terminology Aligned
**Purpose:** Unified product specification for SYNA AI Operating System
**Audience:** Product Managers, Designers, Software Engineers, QA Engineers

---

## Executive Summary

SYNA is an **AI Operating System for conversation-native work** where natural language orchestrates all business operations through intelligent, living surfaces. Unlike traditional software where users navigate between apps, SYNA brings work artifacts directly into conversation as interactive, editable surfaces that both users and AI agents can manipulate in real-time.

**Core Innovation:** Work surfaces (dashboards, documents, models) exist as first-class citizens alongside conversation, appearing contextually and responding to both direct manipulation and natural language commands. This eliminates the app-switching paradigm in favor of continuous, contextual work.

---

## Product Vision & Strategy

### North Star Metric

**Tasks successfully completed by agents per active user per week, used 4+ days a week by active users**, with sub-second workspace switches and average satisfaction ≥4/5.

### Strategic Pillars

1. **Conversation-Native Interface** - Chat as the spine with surfaces appearing only when they add value
2. **Continuous Context** - No re-explanation needed; context follows across all interactions
3. **Configurable Autonomy** - Adjustable from Suggest → Draft → Execute with approval gates
4. **Complete Observability** - Every action traceable with one-click rollback capability
5. **Instant Value** - Useful from day one with continuous improvement through interaction

### Target Users

| Priority | User Type             | Primary Jobs-to-be-Done                                           |
| -------- | --------------------- | ----------------------------------------------------------------- |
| P1       | Solo Founder/Operator | Orchestrate fundraising, product, recruiting without context loss |
| P2       | Team Lead/PM          | Coordinate docs, tickets, research with instant workspace switching |
| P3       | Engineer/Builder      | Generate code, tests, PRs through conversational agents           |
| P4       | Ops/Analyst           | Research, outreach, scheduling at scale with full automation      |

---

## Core Concepts & Mental Model

### Fundamental Architecture

```
SYNA Platform
├─ Projects (organizational folders like "Acme Corp" or "Q1 Planning")
│  └─ Workspaces (focused work containers you switch between)
│     ├─ MainChat (primary conversation with AI)
│     ├─ Surfaces (interactive documents/dashboards)
│     └─ Agents (AI workers visible via colored cursors)
└─ ContextObjects (versioned concepts tracked everywhere)
```

### Terminology Definitions

| Term | Definition | Example | Creates New Workspace? |
|------|------------|---------|------------------------|
| **Project** | Organizational folder for related work | "Acme Corp", "Fundraising 2025" | No |
| **Workspace** | Focused work container with chat + surfaces | Active fundraising conversation with pitch deck | N/A |
| **MainChat** | Primary conversation within a workspace | The main AI conversation in current workspace | No |
| **Surface** | Interactive document/dashboard attached to workspace | Financial model, PRD, code editor | No |
| **ContextObject** | Versioned concept tracked across all content | "product color", "pricing model", "Syna" | No |
| **Branch** | Parallel exploration WITH parent context | "Let me try another approach..." | Yes |
| **Thread** | Fresh conversation WITHOUT parent context | "New topic: let's discuss marketing" | Yes |
| **Message Reply** | Slack-style reply to specific message | Reply within same conversation | No |
| **Ledger** | Universal activity stream showing all actions | Running log of user, agent, and system actions | No |

### Key Interactions

**Workspace Switching**
```
Alt+Tab or Cmd+K → WorkspaceSwitcher
├── Workspace: "Fundraising" (active)
├── Workspace: "Product Planning"
└── Workspace: "Code Review"
```

**Creating New Workspaces**
```
Select text → Context Menu
├── 🌿 Branch Here → New workspace WITH context
├── 🧵 Create Thread → New workspace WITHOUT context
└── 💬 Reply → Message reply in same chat
```

**ContextObject Evolution**
```
"Change product color to red" → ContextObject "product-color" v2
├── Updates PRD Surface
├── Updates code files
├── Links to this conversation
└── Can rollback to v1 (blue)
```

---

## System Behavior & User Experience

### Initialization Philosophy

```
New Project Start:
┌─────────────────────────────────────┐
│  Single Clean Workspace             │
│  • One MainChat ready              │
│  • No auto-loading past work       │
│  • History accessible via search   │
│  • Fresh workspace, clear focus    │
└─────────────────────────────────────┘
           ↓
    [User Begins Work]
           ↓
┌─────────────────────────────────────┐
│  Surfaces attach as needed         │
│  Agents appear as colored cursors  │
│  ContextObjects track concepts     │
└─────────────────────────────────────┘
```

### Navigation Architecture

#### Command Bar (Primary Interface)

The main input intelligently recognizes multiple intents:

| Pattern | Function | Example |
|---------|----------|---------|
| Natural conversation | Continue MainChat | "How should we structure authentication?" |
| Project switch | Change project | "/project acme-corp" |
| Workspace switch | Quick switch | "Cmd+K" or "/workspace fundraising" |
| Agent mention | Invoke capability | "@planner analyze this requirement" |
| Surface attach | Open document | "/attach financial-model" |

#### Quick Switcher (⌘K) Commands

```
> Execute command        (>show revenue metrics)
@ Mention agent/person   (@analyst help with model)
# Switch project         (#fundraising)
/ Switch workspace       (/product-planning)
+ Create workspace       (+new conversation)
~ Recent workspaces      (~show recent)
? Get help              (?how to create branch)
```

### Workspace Lifecycle

```
User Action                    Result
─────────────────────────────────────────
Start typing          →  Creates first workspace
Select text + Branch  →  New workspace WITH context  
Select text + Thread  →  New workspace WITHOUT context
Close workspace       →  Saves to project history
Switch workspace      →  Instant context switch
Share workspace       →  Read-only or collaborative link
```

---

## Surface System Specification

### Surface Protocol Requirements

Every surface must implement:

- **Attachment logic** - How it connects to workspace
- **Live editing** capability with bidirectional data flow
- **Agent access** for observation and manipulation
- **State serialization** for workspace switching
- **ContextObject tracking** for concept versioning

### Core Surface Types

| Surface Type | Capabilities | Agent Integration |
|--------------|-------------|-------------------|
| DocumentSurface | Rich text editing, collaboration | @Writer drafts/edits |
| SpreadsheetSurface | Cells, formulas, charts | @Analyst modifies data |
| CanvasSurface | Visual diagrams, SWOT | @Planner arranges elements |
| CodeSurface | Syntax highlighting, testing | @Engineer writes/debugs |
| DashboardSurface | Metrics, real-time data | @Analyst queries/updates |
| WorkflowSurface | Automation builder, nodes | @Ops orchestrates flows |

### Surface Sharing Rules

```
Surface can be:
• Attached to multiple workspaces simultaneously
• Each workspace has independent agent cursors
• Changes sync across all attached workspaces
• ContextObjects track all modifications
• Version history maintained globally
```

---

## Agent System Architecture

### Visual Agent Representation

```
┌────────────────────────────────────────┐
│           Active Workspace             │
├────────────────────────────────────────┤
│ Surface: PRD.doc                       │
│                                        │
│ [🔵 Planner]──"Analyzing requirements" │
│      ↓                                 │
│ Requirements section...                │
│                                        │
│ [🟢 Writer]──"Adding details"         │
│      ↓                                 │
│ Implementation notes...                │
└────────────────────────────────────────┘
```

### Agent Catalog

```
┌─────────────────────────────────────────────────────┐
│                  Agent Registry                     │
├──────────┬──────────────────────────────────────────┤
│ Planner  │ Decomposes tasks, creates workflows     │
│ Writer   │ Creates and edits documents             │
│ Engineer │ Generates code, tests, PRs              │
│ Analyst  │ Processes data, creates visualizations  │
│ Researcher│ Gathers and synthesizes information    │
│ Scheduler│ Manages time-based activities          │
│ Critic   │ Reviews and validates outputs          │
│ Ops      │ Handles automation and workflows       │
└──────────┴──────────────────────────────────────────┘
```

### Agent Coordination

Agents appear as **colored cursors with chat bubbles** showing their current action:

```typescript
AgentCursor Components:
├── Color (agent-specific: Planner=blue, Writer=green)
├── Position (tracks location on surface)
├── Bubble (shows current thought/action)
└── Trail (visualizes path taken)
```

### Autonomy & Control Framework

```
Task Autonomy Levels:
┌─────────────┬───────────────────────────────────┐
│  Suggest    │ Highlight changes, propose actions│
│  Draft      │ Create content, require approval  │
│  Execute    │ Perform directly, allow rollback  │
└─────────────┴───────────────────────────────────┘

Approval Gates (Always Required):
• External communications >10 recipients
• Repository merges (PRs ok, merge needs approval)
• Data modifications above threshold
• Budget exceedances (time/tokens/cost)
```

---

## ContextObject System

### Versioned Concept Tracking

ContextObjects are the **semantic layer** that tracks concepts across all content:

```
ContextObject: "product-color"
├── Version 1: "blue" (2024-01-15)
│   ├── Referenced in: PRD v1, Design Doc v1
│   └── Conversations: Workspace #1, #2
├── Version 2: "red" (2024-02-01)
│   ├── Referenced in: PRD v2, Design Doc v2, code/theme.ts
│   ├── Conversations: Workspace #5
│   └── Changed by: @Designer agent
└── Current: v2 (can rollback to any version)
```

### ContextObject Propagation

When a ContextObject updates:
1. All surfaces referencing it get notified
2. Agents can auto-update dependent items
3. User can preview changes before applying
4. Full rollback capability maintained

---

## Ledger System

### Universal Activity Stream

The Ledger provides complete observability:

```
┌─────────────────────────────────────────┐
│            Ledger View                  │
├─────────────────────────────────────────┤
│ 10:32 👤 User: Edited PRD line 42      │
│ 10:33 🔵 Planner: Created 3 subtasks   │
│ 10:33 🟢 Writer: Updated requirements  │
│ 10:34 📄 Surface: PRD.doc modified     │
│ 10:34 🔄 ContextObject: "api-design" v3│
│ 10:35 👤 User: Approved changes        │
└─────────────────────────────────────────┘
         ↓ Click any entry to:
    • View details
    • See diff
    • Rollback change
```

---

## Performance Requirements

### Critical Performance Targets

| Operation | Target | Impact |
|-----------|--------|--------|
| Workspace Switch | <500ms | Instant feel |
| Surface Sync | <100ms | Real-time collaboration |
| Agent Response | <800ms first token | Natural conversation |
| ContextObject Update | <200ms | Seamless propagation |
| Ledger Query | <1s for any timeframe | Quick investigation |

---

## Success Metrics

### User Experience Metrics

- **Activation:** % completing first multi-agent task within 24h
- **Engagement:** WAU with ≥3 workspace switches
- **Throughput:** Median time from intent → completed work
- **Context Continuity:** % of branches/threads needing no re-explanation
- **Trust:** % of agent actions accepted without revision

### System Performance Metrics

- Workspace switch latency P95 <500ms
- Agent coordination overhead <10% of task time
- ContextObject sync <200ms globally
- Zero data loss during workspace switches
- Ledger completeness = 100% of actions logged

---

## Document Status

**Status:** Implementation Ready with Terminology Aligned
**Critical Path:** Workspace System → Surface Protocol → Agent Visualization → ContextObject Tracking
**Key Risk:** Performance at scale with many workspaces/surfaces
**Success Measure:** Users complete complex workflows through natural conversation while maintaining full control and visibility