# SYNA MASTER SPEC v1.0 — Executive Product Doc

**AI Operating System for Conversation‑Native Work**
**Status:** Draft for Executive Review
**Last Updated:** 2025‑08‑12
**Owner:** Product & Platform

---

## 0) What This Document Is (and Isn’t)

This is the **product‑level specification** for Syna. It explains **how the product should work** for users and admins, what behaviors we guarantee, and how we’ll measure success. It intentionally **avoids low‑level implementation** details (stacks, libraries, schemas). Those live in engineering specs.

---

## 1) Vision & Strategy

**Product promise:** Syna is an **AI Operating System for work** where **conversation is the primary interface** and agents complete multi‑step work across tools **without breaking user flow**.

**North Star Metric (NSM):** **Tasks successfully completed by agents per active user per week**, with **sub‑second context switches** and average satisfaction ≥ **4/5**.

**Strategic pillars**

1. **Conversation‑native:** Chat is the spine; HUDs and dashboards appear only when they add speed/clarity.
2. **Continuity by default:** Users don’t re‑explain. Context follows across threads, projects, and surfaces.
3. **Composable autonomy:** Adjustable from **Suggest → Draft → Execute** with approvals when needed.
4. **Observable & reversible:** Every action has a trace and can be rolled back.
5. **Fast time‑to‑value:** Useful on Day 1; improves continuously from feedback.

---

## 2) Who We’re Building For

**P1 Solo Founder/Operator (primary)** – orchestrates fundraising, product, recruiting.
**P2 Team Lead / Product Manager** – coordinates docs, tickets, research, releases.
**P3 Engineer/Builder** – wants code agents to scaffold features/tests and open PRs.
**P4 Ops/Recruiter/Analyst** – research, outreach, scheduling, reporting at scale.

**Top jobs‑to‑be‑done**

* “Switch focus quickly without losing context.”
* “Have agents draft, refine, and ship real artifacts (docs, tickets, PRs, emails).”
* “See what’s happening and approve changes safely.”

---

## 3) Mental Model & Core Concepts

* **Workspace** – org or team boundary with members, agents, data, policies.
* **Project** – named container for outcomes; has tasks, docs, and threads.
* **Thread** – conversation unit; can be linked to multiple projects.
* **Context Pack** – reusable bundle of memory (docs, threads, datasets) attachable to any thread.
* **Agent** – capability profile (Planner, Researcher, Writer, Engineer, Ops, Analyst, Scheduler, Critic). Each task sets an **autonomy level** and **budget**.
* **Task** – atomic unit of work with owner (agent or human), acceptance criteria, due date, dependencies.
* **Run** – a single execution by an agent with steps, traces, artifacts, and cost.
* **Doc** – native PRDs/specs/briefs; sections link to tasks & runs.
* **Clips** – retrieved snippets with provenance that power context and citations.

**Guiding behaviors**

* Threads can **branch**; branches keep links to origin and may carry context.
* Switching topics/projects is **instant**; relevant context is already warmed.
* Users can **@mention agents** and **reference objects** (e.g., #Project, ^Doc).

---

## 4) End‑to‑End Experience (Canonical Flows)

### 4.1 Planning → Execution (PM/Lead)

1. User: “Pause growth plan; switch to Fundraising. Summarize deck feedback and draft v2 outline.”
2. **Planner** proposes a mini plan (sections, owners, due dates) with **Suggested Action Chips** (e.g., “Create tasks,” “Draft outline”).
3. User accepts; **Writer** drafts the outline in a doc.
4. **Ops** schedules reviewer pings; **Critic** flags risks and missing inputs.
5. User approves; **Tasks** update to **In Progress**; status chips appear in the doc.

**Success state:** Deliverable link + 3–5 tasks created with owners and due dates; all changes have provenance and are visible in the right rail (**Now/Clips/Tasks/Docs** tabs).

### 4.2 Research → Brief → Outreach (Ops/Analyst)

1. User: “Compile 50 target accounts matching our ICP; draft a first‑touch email; schedule follow‑ups.”
2. **Researcher** produces a list with sources.
3. **Writer** drafts email variants; **Critic** checks for tone/compliance.
4. **Scheduler** proposes a send/schedule plan; approvals gate large sends.
5. User approves; system queues outreach and tracks replies in the thread.

### 4.3 Engineering Spike → Issue → PR (Engineer/PM)

1. User: “Add retry logic to payment processor if API supports exponential backoff.”
2. **Engineer** verifies capability, creates issue(s), scaffolds tests, and opens a PR draft.
3. **Critic** validates acceptance criteria; **User** approves merge when checks pass.

**Interruption model (applies to all):** If the user changes course mid‑run, Syna **preserves current thought**, processes the interruption, then merges or queues the contexts. The user can resume either at any time.

---

## 5) Capabilities (How It Should Work)

### 5.1 Conversation OS

* **Start & link:** Create a thread in a workspace; optionally link projects and attach context packs.
* **Agent mentions:** `@Planner`, `@Engineer`, etc. trigger the appropriate agent with the current thread context.
* **Quick Switcher (⌘K):** Jump threads/projects, attach/detach context, add/assign tasks, toggle flows.
* **Suggested Action Chips:** 3–7 context‑appropriate actions (e.g., “Create tasks,” “Draft summary,” “Open issue”).
* **Inline approvals:** Accept/reject diffs, request edits, escalate to human review; always preview changes before write‑backs.
* **Branching:** Fork a message or selection into a new thread; choose whether to carry context.

**Acceptance (Conversation OS)**

* From a new workspace, a user can create a thread, attach a project and one context pack, and complete a multi‑step flow with approvals in under **10 minutes**.

### 5.2 Tasks & Projects

* **Task graph:** Tasks are hierarchical or DAG with dependencies and standard states: **Backlog, In Progress, Awaiting Approval, Done, Blocked**.
* **Auto‑tasking:** Planner decomposes intents into subtasks with owners (agents/humans), due dates, and acceptance criteria; user reviews before creation.
* **Project views:** Kanban and Timeline views; filters by owner, priority, status, area.
* **Status surfaces:** Docs show **live chips** (e.g., “API ready,” “Tests failing”).

**Acceptance (Tasks & Projects)**

* Given an intent containing at least two steps, the Planner proposes ≥ **3** tasks with owners and dependencies; users can edit and confirm in‑flow.

### 5.3 Agents & Autonomy

* **Catalog:** Core agents ship day one – **Planner, Researcher, Writer, Engineer, Ops, Analyst, Scheduler, Critic**.
* **Autonomy slider per task:** **Suggest → Draft → Execute**, with optional approval gates for destructive or external actions.
* **Budgets:** Per‑task ceilings for time, tokens, and cost; escalate at 80%.
* **Observability:** Runs stream progress, sources, and timing in the **Now** tab.

**Acceptance (Agents)**

* Users can set autonomy and budgets at task creation and modify mid‑run without losing state.

### 5.4 Memory & Context

* **Unified memory:** Short‑term (thread), long‑term (workspace/project), and semantic (searchable) memory presented as **Context Packs**.
* **Snapshots:** Rolling summaries with citations; refresh on major changes.
* **Cross‑thread reuse:** Bring past research into new threads via attachable context packs.

**Acceptance (Memory)**

* When switching topics, visible results appear immediately (warmed context); additional improvements stream in within seconds.

### 5.5 Docs & Artifacts

* **Native docs:** PRDs, specs, briefs with version history and review flow.
* **Section links:** Sections can link to tasks, runs, and acceptance criteria; status chips display live state.
* **Annotation & selection:** On selection, bubble shows **Annotate / Expand Topic / Quote→Ask / Branch**.
* **Exports:** Markdown/PDF; share read‑only links.

**Acceptance (Docs)**

* From a thread, user can create a doc, accept tracked changes from an agent, and export a reviewable version with provenance in **< 3 minutes**.

### 5.6 Integrations (Product‑Level)

* **Day‑1 connectors:** Google (Drive/Docs/Calendar), GitHub, Notion, Slack/Email, Calendar.
* **Consent & scopes:** Clear scope picker during connect; “least privilege” by default; write‑backs require explicit confirmation.
* **Write‑back safety:** Always show a preview; if conflicts occur, degrade to comment with a link to resolve.

**Acceptance (Integrations)**

* A first‑time user connects one provider and completes a round‑trip (ingest → draft → preview → approved write‑back or comment) without leaving Syna.

### 5.7 Observability, Governance & Approvals

* **Run Log:** Steps, tool calls, prompts, timing, artifacts, and diffs (readable by humans).
* **Audit Log:** Who did what, when; approver trail visible per object.
* **Approvals:** Outbound comms above a threshold and repo writes require explicit approval.

**Acceptance (Observability)**

* For any deliverable, a user can view the complete provenance within **two clicks** from the thread.

### 5.8 Automation & Scheduling

* **Recurring checks:** e.g., “Search for funding news weekly and brief me.”
* **Event triggers:** e.g., on PR opened, on doc updated, on new meeting notes.
* **Quiet hours:** Batch non‑urgent updates by default; urgent events can break through with a reason.

**Acceptance (Automation)**

* Users can create, pause, and resume automations from the thread or a simple **Automations** panel.

---

## 6) Default Policies & Settings (Initial Defaults)

* **Autonomy default:** Draft (requires approval for destructive or external actions).
* **Outbound comms:** Approval required if recipients > **10** or external domains are included.
* **Repo writes:** PRs allowed; merges require human approval.
* **Budgets:** Task default cap: **5 minutes** wall‑time, **low cost** (workspace default); escalate at **80%** with a confirmation chip.
* **Data retention:** Workspace default **12 months**; admins can shorten/extend or exclude sources.
* **Redaction:** Secrets and PII are masked in traces/logs by default.

---

## 7) Performance & Experience Targets (User‑Facing)

* **Context switch:** Feels instant; visible results appear immediately with richer context within **≤ 2 s**.
* **First token for agent replies:** **< 800 ms** P95 when no external tools are needed.
* **Tool‑assisted actions:** **< 10 s** P95 for common flows (search, file fetch, issue create).
* **Doc save & state updates:** **< 1 s** P95.
* **Availability:** Core chat & task features ≥ **99.9%** monthly.

---

## 8) Security & Privacy (Product Posture)

* **Access:** SSO (OAuth/OIDC), optional MFA.
* **Permissions:** Workspace roles (Owner, Admin, Member, Viewer) and doc/task‑level sharing.
* **Secrets:** Per‑workspace vault with rotation; least‑privilege scopes.
* **Compliance:** SOC2 readiness roadmap; audit exports on request.
* **Customer data:** Isolation by workspace; data residency options in enterprise tier.

---

## 9) Packaging & Pricing (Draft)

* **Solo (Free/Starter):** 1 workspace, limited automations, community support.
* **Team (Paid):** Multiple projects, all core agents, approvals, integrations, exports, analytics.
* **Enterprise:** SSO/SAML, RBAC, data residency, advanced audit, custom retention, premium support, SLAs.

> Final pricing TBD after Private Beta. Metering is based on agent task runs + storage.

---

## 10) Rollout Plan

* **v0 Internal Alpha:** Core chat, Planner+Writer+Researcher, context packs, tasks, base docs.
* **v1 Private Beta:** Add Google+GitHub+Notion, approvals, run logs, exports, Quick Switcher.
* **v1.1:** Scheduler, Slack/Email, better snapshots, marketplace v0.
* **v1.2:** Org workspaces, RBAC, analytics console, cost controls.

**Exit criteria for Private Beta → GA**

* ≥ 70% of pilot users complete one end‑to‑end flow within 24 hours of onboarding.
* P95 experience targets met for context switches and common actions.
* ≤ 5% of runs require manual recovery due to conflicts or policy blocks.

---

## 11) Metrics & Instrumentation (Product)

* **Activation:** % of new users completing 1 end‑to‑end flow in 24h.
* **Engagement:** WAU performing ≥ 3 agent tasks.
* **Throughput:** Median time from intent → accepted deliverable.
* **Quality:** Avg deliverable rating; revision count to acceptance.
* **Retention:** D30 user retention; project recurrence.
* **Continuity:** % context switches with no manual re‑explanation.
* **Attention stewardship:** % updates delivered in quiet mode vs. interrupts.
* **Observability:** % of agent actions with visible trace + provenance.

---

## 12) Admin & Governance

* **Org settings:** Invite users, manage roles, set defaults for autonomy, budgets, and retention.
* **Audit exports:** Time‑bounded export of audit/run logs.
* **Data controls:** Right to be forgotten; object deletion; export workspace data.
* **Policy templates:** Starter presets (Conservative, Balanced, Autonomous) for quick setup.

---

## 13) Product Content & UX Guidelines

* **Tone:** Direct, professional, optimistic. Avoid jargon in user‑facing surfaces.
* **Diffs & previews:** Always provide a human‑readable summary plus a link to the full diff.
* **Empty states:** Offer one‑click starter actions and sample prompts relevant to the surface (Thread, Tasks, Docs).
* **Errors:** Explain cause + next best action; never dead‑end. Prefer “Retry,” “View Trace,” “Contact Owner.”
* **Keyboard‑first:** Document common shortcuts; show hints contextually (e.g., ⌘K for switcher).

---

## 14) Open Questions (Product)

1. Minimum viable marketplace scope for v1 (templates vs. hosted agents)?
2. Default autonomy policies per persona (e.g., Engineer default to Draft)?
3. Approval thresholds for outbound comms (10 recipients vs. domain‑based)?
4. What telemetry is user‑visible vs. admin‑only by default?

---

## Appendix A — Capability Acceptance Criteria (Condensed)

**Conversation OS**

* From a blank workspace, user completes a 3‑step outcome with approvals in < 10 minutes.

**Tasks & Projects**

* Planner proposes ≥ 3 tasks with owners and dependencies for a multi‑step intent.

**Agents & Autonomy**

* User adjusts autonomy/budgets mid‑run without losing state; changes are logged.

**Memory & Context**

* Switching topics surfaces warmed context instantly; citations appear for all claims.

**Docs & Artifacts**

* User accepts tracked changes and exports a reviewable doc with provenance in < 3 minutes.

**Integrations**

* First‑time connect completes an ingest→draft→preview→approved write‑back or comment loop.

**Observability**

* Any deliverable’s full provenance accessible within two clicks from the thread.

**Automation**

* User creates a recurring check and receives a summary at the scheduled time with opt‑out controls.

---

## Appendix B — Glossary

* **Action Chip:** One‑click affordance to trigger a suggested next step.
* **Autonomy Level:** Execution strictness for agents (Suggest/Draft/Execute).
* **Budget:** Guardrail for time/cost/tokens; escalates at 80%.
* **Clip:** Retrieved, cited snippet used for grounding or display.
* **Context Pack:** Reusable memory bundle attached to a thread.
* **Run:** Single execution by an agent with observable steps.
* **Snapshot:** Rolling summary of a thread/project with citations.

---

## Appendix C — Example UI Copy (Reference)

* **Approval:** “Ready to apply these changes? You can review the full diff before confirming.”
* **Conflict:** “The source changed since draft. We’ll add a comment with your edits and link the revision.”
* **Budget Escalation:** “This task is nearing its limit. Increase budget or pause to review.”
