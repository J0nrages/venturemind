# SYNA: Executive Product Requirements & Vision Document

**Version:** 2.0\
**Status:** Implementation Ready\
**Purpose:** Unified product specification for SYNA AI Operating System\
**Audience:** Product Managers, Designers, Software Engineers, QA Engineers

---

## Executive Summary

SYNA is an **AI Operating System for conversation-native work** where natural language orchestrates all business operations through intelligent, living surfaces. Unlike traditional software where users navigate between apps, SYNA brings work artifacts directly into conversation as interactive, editable surfaces that both users and AI agents can manipulate in real-time.

**Core Innovation:** Work surfaces (dashboards, documents, models) exist as first-class citizens alongside conversation, appearing contextually and responding to both direct manipulation and natural language commands. This eliminates the app-switching paradigm in favor of continuous, contextual work.

---

## Product Vision & Strategy

### North Star Metric

**Tasks successfully completed by agents per active user per week, used 4+ days a week by active users**, with sub-second context switches and average satisfaction ≥4/5.

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
| P2       | Team Lead/PM          | Coordinate docs, tickets, research with instant context switching |
| P3       | Engineer/Builder      | Generate code, tests, PRs through conversational agents           |
| P4       | Ops/Analyst           | Research, outreach, scheduling at scale with full automation      |

---

## Core Concepts & Mental Model

### Fundamental Distinctions

**Clean model**

```
SYNA Workspace
├─ Branches (chats) — parallel paths from the same origin
├─ Threads (chats)  — fresh conversations inspired by a selection
└─ Surfaces (interactive docs/dashboards) — live artifacts alongside chat
```

**Differences at a glance**

| Concept      | Type                           | Purpose                                           | Context to Parent                                     | Problem Relation    | Collaboration Mode                        | Merge/Link                                   | Common Triggers      |
| ------------ | ------------------------------ | ------------------------------------------------- | ----------------------------------------------------- | ------------------- | ----------------------------------------- | -------------------------------------------- | -------------------- |
| **Branches** | Chat                           | Explore alternatives without losing history       | **Shares full context** (messages + memory)           | **Same problem**    | Conversation-first; agents can listen/act | **Can merge** back into parent               | 🌿 *Branch here*     |
| **Threads**  | Chat                           | Start a new line of thought inspired by a snippet | **No inherited context** (keeps only an origin link)  | **New problem**     | Conversation-first; agents can listen/act | **Independent** (can reference parent)       | 🧵 *Create thread*   |
| **Surfaces** | Interactive document/dashboard | Manipulate data, text, boards, charts directly    | **Bidirectional with chat** (updates reflect in both) | Artifact of problem | **User + Agent direct edit**; live sync   | Lives **alongside** chats; linkable/pinnable | 📄 *Open as surface* |

### Key Terminology

- **Branch** - Parallel exploration sharing complete parent history
- **Thread** - New conversation with inspiration link but no shared context
- **Surface** - Living document/dashboard that responds to chat and direct manipulation
- **Context Object** - A reusable memory bundle and an anchoring surface. Attach it to any chat or surface to preload relevant memory, or open it as a surface to explore insights, trigger actions, and manage versions.
- **Agent** - Specialized AI capability (Planner, Writer, Engineer, etc.)
- **Workstream** - Background agent task execution with minimal UI presence
- **Autonomy Level** - Task execution strictness/mode - may depend on agent

---

## System Behavior & User Experience

### Initialization Philosophy

```
New Session Start:
┌────────────────────────────────────┐
│  Single Clean Conversation Area    │
│  • No auto-loading past chats      │
│  • History accessible but hidden   │
│  • Fresh workspace, clear focus    │
└────────────────────────────────────┘
           ↓
    [Standard Session Management]
           ↓
┌────────────────────────────────────┐
│  If session persists (browser/app  │
│  open), resume where you left off  │
│  (chats, surfaces, context).       │
│  If logout or full app quit        │
│  start fresh on next sign-in.      │
└────────────────────────────────────┘
```

### Navigation Architecture

#### Command-Chat Bar (Primary Interface)

The main input intelligently recognizes multiple intents:

| Pattern              | Function          | Example                                   |
| -------------------- | ----------------- | ----------------------------------------- |
| Natural conversation | Continue chat     | "How should we structure authentication?" |
| Navigation request   | Find content      | "Pull up our chat about database design"  |
| Command prefix       | Execute action    | "/search revenue discussions"             |
| Agent mention        | Invoke capability | "@planner analyze this requirement"       |

#### Quick Switcher (⌘K) Commands

```
> Execute command     (>show revenue metrics)
@ Mention agent, person, file       (@analyst help with model)
# Switch project      (#fundraising)
// Search surfaces     (/proforma)
? Get help           (?how to create tasks)
! Quick action       (!create task from selection)
~ Switch thread      (~previous conversation)
^ Open document      (^Q3 planning doc)
```

### Creation Patterns

#### Text Selection → Context Menu Flow

```
User selects text
        ↓
┌─────────────────────────────┐
│  🔍 Search Web              │
│  🧠 Save to Memory          |
│  🌿 Branch Here (parallel)  │ ← Parent stays open
│  🧵 Create Thread (fresh)   │ ← Parent minimizes
│  📄 Open as Surface         │ ← Expands to doc/dashboard
└─────────────────────────────┘
```

### Workspace State Management

```
Active Workspace Contains:
┌──────────────────────────────────────────┐
│ • 1 Main Focus Window (active work)      │
│ • 2-3 Adjacent Cards (branches/threads)  │
│ • Minimized Indicators (inactive items)  │
│ • Hidden but Searchable (all history)    │
└──────────────────────────────────────────┘
```

---

## Surface System Specification

### Surface Protocol Requirements

Every surface must implement:

- **Trigger phrases** for natural language activation
- **Live editing** capability with bidirectional data flow
- **Agent binding** for observation and manipulation
- **State serialization** for interruptions and persistence
- **Lifecycle rules** for appear/dismiss/persist behavior

### Surface Transformation Map

| Current Component | Target Surface  | Capabilities                                                                               | Agent Integration                                           |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| ProformaPage      | sheetsSurface   | Cell editing, formulas, charts                                                             | @Analyst observes/modifies                                  |
| MetricsDashboard  | MetricsSurface  | Filters, drill-down, real-time                                                             | @Analyst queries/updates                                    |
| Strategy          | StrategySurface | Canvas manipulation, SWOT                                                                  | @Planner arranges/connects                                  |
| DocumentMemory    | DocumentSurface | Rich text, collaboration                                                                   | @Writer drafts/edits                                        |
| TaskBoard         | ProjectSurface  | Card movement, dependencies, all projects tracking                                         | @Planner creates/assigns                                    |
| AutomationBuilder | WorkflowSurface | Node editor (triggers, actions, conditions, branching, loops), test runs, logs, versioning | @Ops orchestrates; @Planner schedules; @Engineer integrates |

### Surface Lifecycle Rules

```
Appear When:
• Agent needs visual content
• User requests specific view
• Task requires visual manipulation
• Context naturally leads to visualization

Auto-Dismiss After 5 Minutes (editable) Unless:
• User is actively editing
• User has pinned surface
• Agent is monitoring changes
• Surface has unsaved changes

Handle Interruptions By:
• Freezing current state
• Serializing to context pack
• Queuing new context
• Offering merge/switch/dismiss options
```

---

## Agent System Architecture

### Core Agent Capabilities

```
┌─────────────────────────────────────────────────────┐
│                  Agent Catalog                      │
├──────────┬────────────────────────────────────────┤
│ Planner  │ Decomposes intents into task graphs    │
│ Writer   │ Creates and edits documents            │
│ Engineer │ Generates code, tests, PRs             │
│ Analyst  │ Processes data, creates visualizations │
│ Researcher│ Gathers and synthesizes information   │
│ Scheduler│ Manages time-based activities         │
│ Critic   │ Reviews and validates outputs         │
│ Ops      │ Handles automation and workflows      │
└──────────┴────────────────────────────────────────┘
```

### Agent Listener System

Agents continuously monitor conversations in real-time:

```
Main Conversation
       ↓
[Agent Listeners Active]
       ↓
┌────────────────────┐
│ Keyword Detection  │ → Prefetch relevant data
│ Context Analysis   │ → Prepare suggestions
│ Pattern Recognition│ → Queue workstreams
└────────────────────┘
       ↓
[Subtle UI Indicators]
• Pulsing orbs for activity
• Suggestion chips above input
• Never modal or blocking
```

### Autonomy & Control Framework

```
Task Autonomy Levels:
┌─────────────┬──────────────────────────────────┐
│  Suggest    │ Highlight changes, propose actions│
│  Draft      │ Create content, require approval  │
│  Execute    │ Perform directly, allow rollback  │
└─────────────┴──────────────────────────────────┘

Approval Gates (Always Required):
• External communications >10 recipients
• Repository merges (PRs ok, merge needs approval)
• Data modifications above threshold
• Budget exceedances (time/tokens/cost)
```

---

## Context & Memory Management

### Infinite Conversation Model

```
Message Range     | Storage Strategy        | Access Speed
-----------------|------------------------|-------------
0-10 messages    | Full fidelity          | Instant
11-50 messages   | Smart summaries        | <500ms
51-500 messages  | Topic metadata         | <1s
500+ messages    | Searchable index only  | <2s
```

### Context Pack Architecture

Context Packs enable sub-second switching through:

- Pre-computed embeddings for semantic search
- Memory caching for instant access
- Background enrichment without blocking
- Composable bundles sharable across threads
- Version control with rollback capability

### Interruption Model

```
Context Switch Detected
         ↓
┌──────────────────┐
│ 1. Freeze state  │
│ 2. Serialize     │
│ 3. Present options│
└──────────────────┘
         ↓
┌─────────────────────────────┐
│ • Dismiss current & switch  │
│ • Keep both in split view   │
│ • Queue for later           │
│ • Cancel interruption       │
└─────────────────────────────┘
```

---

## Right Rail System

Four essential tabs providing workspace awareness:

### Now Tab

- Real-time agent activity stream
- Progress indicators with time/token usage
- Running tasks with pause/cancel controls
- Resource consumption meters

### Clips Tab

- Retrieved context snippets with sources
- Citation provenance tracking
- Relevance scoring
- One-click expansion to full source

### Tasks Tab

- Active task graph visualization
- Dependency tracking
- Status indicators (Backlog, In Progress, Blocked, Done)
- Owner assignments (human or agent)

### Docs Tab

- Linked documents with live status chips
- Version history
- Collaborative presence indicators
- Quick preview on hover

---

## Performance Requirements

### Critical Performance Targets

| Operation         | Target        | Impact                  |
| ----------------- | ------------- | ----------------------- |
| Context Switch    | <2s perceived | Defines "instant" feel  |
| Surface Render    | <500ms        | Maintains flow state    |
| First Token       | <800ms P95    | Conversational pace     |
| Quick Switcher    | <50ms         | Feels immediate         |
| Surface Sync      | <100ms        | Real-time collaboration |
| Context Pack Load | <1s           | Enables fast switching  |

### Optimization Requirements

- Preload adjacent contexts (anticipatory loading)
- Virtualize large surfaces (viewport + buffer)
- Use differential updates (send only changes)
- Implement tiered caching (memory → IndexedDB → server)
- Stream responses progressively

---

## Integration Requirements

### Day-1 Connectors

| Integration      | Scope                   | Safety                                       |
| ---------------- | ----------------------- | -------------------------------------------- |
| Google Workspace | Drive, Docs, Calendar   | Preview all write-backs                      |
| GitHub           | Issues, PRs, Code       | PR creation allowed, merge needs approval    |
| Notion           | Pages, Databases        | Bi-directional sync with conflict resolution |
| Slack            | Messages, Channels      | Rate limits for bulk operations              |
| Email            | Send, Receive, Schedule | Approval for >10 recipients                  |

### Integration Principles

- Least-privilege scope requests
- Preview all write-backs before execution
- Degrade to comments when conflicts occur
- Maintain bi-directional sync where possible
- Never lose user work during conflicts

---

## Success Metrics

### User Experience Metrics

- **Activation:** % completing end-to-end flow within 24h
- **Engagement:** WAU performing ≥3 agent tasks
- **Throughput:** Median time from intent → deliverable
- **Context Continuity:** % switches with no re-explanation
- **Trust:** % of agent actions accepted without revision

### System Performance Metrics

- Context switch latency P95 <2s
- Agent response first token P95 <800ms
- Surface sync latency P95 <100ms
- System availability ≥99.9% monthly
- Zero data loss during interruptions

---

## Governance & Observability

### Complete Provenance System

```
Every Action Must Have:
┌──────────────────────────┐
│ • Full trace with steps  │
│ • Preview before apply   │
│ • One-click rollback     │
│ • Audit log entry        │
│ • Cost/resource tracking │
└──────────────────────────┘
```

### Default Policies

- **Autonomy:** Draft mode (requires approval for external actions)
- **Communications:** Approval required for >10 recipients
- **Repository:** PRs allowed, merges require approval
- **Budgets:** 5-minute wall-time default, escalate at 80%
- **Data Retention:** 12 months default (admin configurable)
- **Privacy:** PII/secrets masked in traces by default

---

## Risk Mitigation

### Technical Risks

- **Context Pack Scale:** Mitigate with aggressive caching and pagination
- **Surface Conflicts:** Use CRDT with clear conflict resolution UI
- **Agent Coordination:** Clear ownership model and locking mechanisms

### User Experience Risks

- **Cognitive Overload:** Progressive disclosure and smart defaults
- **Trust in Automation:** Always preview, explain, and allow rollback

---

## Document Status

**Status:** Implementation Ready\
**Critical Path:** Context System → Surface Protocol → Agent Binding → Integration Layer\
**Key Risk:** Context Pack performance at scale\
**Success Measure:** Users complete complex workflows through natural conversation while maintaining full control