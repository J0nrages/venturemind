# Syna Input System — Omnibox & Mentions Spec (v1.1)

**Status:** Approved for implementation • **Owner:** Platform UX • **Scope:** Global input, omnibox, mentions, prefixes & keyboard map

---

## 0) Goals

* Make input **predictable** by aligning with common patterns (Notion/Slack/Linear/Raycast) while keeping Syna's chat-first spine.
* Ship a **single mental model**: natural language for intent, prefixes for precision, and an omnibox for power.
* Support both **keyboard-first** (fast) and **NL-first** (forgiving) workflows.

---

## 1) Global Launchers & Focus Rules

### 1.1 Keyboard

* **Cmd/Ctrl+K** → **Quick Switcher / Global Omnibox** (search + commands + navigation).
* **Ctrl+Space** → **Primary launcher** (configurable behavior, see below).
* **Esc** → Close palette/launcher; if already closed, clears input focus.

### 1.2 Ctrl+Space Behavior (configurable)

**Default (Recommended):**

1. If a text field is present on the current surface (chat input / editor), **move caret & focus** into that field (don't open a new UI).
2. If no editable field is available or input is already focused, open the **inline omnibox** (floating near caret).

**Alternate bindings (optional, power users):**

* **Ctrl+Alt+Space** → **New Workspace** (opens an empty workspace tab/window with cursor focused in the command-chat bar).
* **Shift+Ctrl+Space** → **Force omnibox** (always open the floating launcher, even if input is focused).

> **Rationale:** Ctrl+Space is your *get me typing now* shortcut. It prioritizes flow by placing the caret in the current context before spawning UI. Users can opt-in to a variant that spawns a fresh workspace.

### 1.3 Cmd/Ctrl+K vs Ctrl+Space

* **Cmd/Ctrl+K**: *Go anywhere or do anything* — global, Raycast-like omnibox.
* **Ctrl+Space**: *Type here, right now* — focus current input; fall back to inline omnibox.

---

## 2) Prefix Grammar (consistent secondary prefixes)

| Prefix | Purpose                              | Examples                                       | Notes                                             |
| ------ | ------------------------------------ | ---------------------------------------------- | ------------------------------------------------- |
| `@`    | **Mention** users/agents/objects     | `@maria`, `@Planner`, `@"Q3 Brief"`            | Mentions only (no commands). Stores stable IDs.   |
| `/`    | **Commands** (structured actions)    | `/summarize 10`, `/create task`, `/share @ops` | Slash-commands resolve to tool calls with params. |
| `#`    | **Projects/Workspaces**              | `#Foundraising`, `#Project Alpha`              | Switch/attach/filter to projects.                 |
| `>`    | **Power commands** (Raycast-style)   | `> open surface: proforma`, `> run agent`      | Shortcut to command palette actions.              |
| `//`   | **Search** (across surfaces/content) | `// revenue`, `// doc:"Q3 plan"`               | Forces search mode even in chat.                  |
| `?`    | **Help**                             | `? keyboard`, `? commands`                     | Opens contextual help panel.                      |
| `!`    | **Quick actions**                    | `!assign @maria`, `!approve`                   | One-tap actions with confirmation if destructive. |
| `^`    | **Documents**                        | `^Q3 planning doc`                             | Open/attach a document or section reference.      |

> **Decision:** `@` remains **mentions-only** for people, agents, and linkable objects (docs/surfaces). Do **not** overload `@` for command execution.

---

## 3) Mentions (canonical behavior)

* `@` triggers a typeahead filtered by permissions; arrow keys to select; **Enter/Tab** to insert.
* Render as non-breaking **pills** with avatar/icon + displayName; store **immutable IDs** in the doc/chat.
* Backspace on pill → unlinks; Delete → removes.
* Supports **users**, **agents**, and **objects** (docs/surfaces/files). For docs, we accept `@"Title"` or `@^Doc` internally; pill shows proper icon.
* Notification & backlinks created on commit; deduplicate within 2 minutes.

---

## 4) Omnibox Modes & Routing

* **Natural Language** (default): parse intent → suggest action(s) with preview.
* **Prefix Mode**: when an input starts with `/`, `>`, `//`, `?`, `!`, `#`, `^`, lock the mode accordingly.
* **Context boost**: current selection, active project, open surfaces prefill parameters.
* **Param stepper**: collect required params inline; show a confirmation/diff for risky actions.

---

## 5) Editor & Caret Semantics

* **Ctrl+Space** always attempts to **set caret** into the primary input of the current surface (chat input, TipTap editor, or focused form field).
* If caret is already in an editor and the user types a prefix, show a **popover** anchored to the caret (mention list, slash menu, etc.).
* Use `floating-ui` for robust placement; ensure IME/RTL safety.

---

## 6) Discoverability & Help

* **`?` Help** shows: keyboard cheatsheet, prefix glossary, and recently used commands.
* First-run: show a **3-step tooltip tour** for Cmd/Ctrl+K, Ctrl+Space, and `/`.
* Long-press **Cmd/Ctrl+K** opens the full command catalog with searchable descriptions.

---

## 7) Accessibility & i18n

* ARIA roles for listbox/options; roving tabindex; visible focus ring.
* 44px touch targets; support **IME composition** (CJK) and **RTL**.
* Do not split on ASCII-only regex; handle Unicode correctly for mentions and search.

---

## 8) Conflicts & Platform Notes

* **macOS**: Cmd+Space is Spotlight — **do not** use. Keep **Ctrl+Space** for Syna.
* **Linux**: IME often binds to Ctrl+Space; provide a **fallback binding** (e.g., Ctrl+J) and a first-run prompt to rebind.
* **Windows**: Ctrl+Space toggles IME in some locales; show the same rebind prompt.

---

## 9) Telemetry & Defaults

* Track: open → type → select → run, per launcher and prefix.
* Promote **recent commands** and **recent mentions** to the top; per-user ranking.
* Default config:

  * **Ctrl+Space** = Focus input; fallback to inline omnibox.
  * **Ctrl+Alt+Space** = New Workspace.
  * **Cmd/Ctrl+K** = Global Omnibox.

---

## 10) Implementation Notes

* Reuse the **mentionable index** (trigram/pg_trgm + recency/affinity) for omnibox entities.
* Commands defined via a **Command Manifest** (schema first) to drive palette UI and RBAC.
* Debounce 150–200ms; cancel stale requests; return ≤20 results per query.
* Notifications/backlinks on mention **commit** (server-side extraction), not on keystroke.

---

## 11) Acceptance Criteria

* Ctrl+Space focuses input in-context; if none, opens inline omnibox.
* Cmd/Ctrl+K opens global omnibox with search + commands.
* Prefix grammar works uniformly across chat and surfaces.
* @-pills store immutable IDs; notifications/backlinks fire on commit.
* Settings allow remapping Ctrl+Space behavior (focus vs new workspace).

---

## Current Implementation Status

### ✅ Implemented
- **@mentions** for agents, users, and files with autocomplete
- Basic mention pill rendering in sent messages
- Keyboard navigation in autocomplete (arrow keys, Enter, Tab, Esc)

### 🚧 Partially Implemented
- **Prefix detection** for `@`, `/`, `#`, `>` (detection works, but not all actions implemented)
- Mention formatting with icons (works in sent messages, not during typing)

### ❌ Not Yet Implemented
- **Command execution** via `/` prefix
- **Workspace switching** via `#` prefix
- **Power commands** via `>` prefix
- **Global Omnibox** (Cmd/Ctrl+K)
- **Ctrl+Space** focus behavior
- **Search mode** via `//`
- **Help system** via `?`
- **Quick actions** via `!`
- **Document references** via `^`
- Immutable IDs for mentions
- Notifications and backlinks
- Command manifest system
- Telemetry and ranking