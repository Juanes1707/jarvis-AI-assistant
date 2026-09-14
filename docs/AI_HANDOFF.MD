# JARVIS AI Assistant — Claude Code ↔ Codex Handoff

This document coordinates work between Claude Code and Codex.

Both agents work on the same repository but have different primary responsibilities.

- Claude Code: Frontend / UI / UX / Product Design
- Codex: Architecture / Logic / Integrations / Backend / Debugging / Testing

This document should be used when work owned by one agent creates a requirement for the other.

---

## Collaboration Rules

- Do not use this document as a general project log.
- Only record information relevant to coordination between Claude Code and Codex.
- Do not overwrite another agent's active request without resolving it.
- Preserve previous decisions when they remain relevant.
- Keep entries concise and technical.
- Mark completed requests as resolved instead of silently deleting them.
- Do not duplicate information already documented elsewhere unless necessary for the handoff.

---
## Operating Protocol

Before starting work that crosses ownership boundaries, both agents must read this document.

Claude Code and Codex may both update this file, but they must avoid rewriting or reformatting unrelated sections.

Each agent should primarily edit:

- Claude Code → `Claude Code → Codex Requests`
- Codex → `Codex → Claude Code Requests`

When responding to a request created by the other agent, the responding agent may update its status and add implementation notes.

Never delete an unresolved request.

Use one of these statuses:

- `Pending`
- `In Progress`
- `Blocked`
- `Resolved`

When a request is resolved:

1. Mark it as `Resolved`.
2. Document the implementation location.
3. Note any important contract or behavior changes.
4. Move it to `Resolved Handoffs` only when keeping it active is no longer useful.

Do not modify unrelated work simply because it appears in this document.

# Active Contracts

Shared interfaces or contracts currently required by both frontend and backend.

No active contracts.

---

# Claude Code → Codex Requests

Frontend requirements that require architecture, backend, services, integrations, or business logic.

No pending requests.

---

# Codex → Claude Code Requests

Backend or system changes that require frontend implementation or UX work.

No pending requests.

---

# Shared Decisions

Decisions that affect both frontend and backend.

No shared decisions yet.

---

# Integration Notes

Important information required to connect frontend and backend systems.

No integration notes yet.

---

# Resolved Handoffs

Completed coordination requests may be moved here for historical reference.

None yet.
---

# Handoff Entry Template

Use this format for new coordination requests:

## [Short Request Title]

**Status:** Pending  
**Owner:** Claude Code / Codex  
**Requested by:** Claude Code / Codex

### Context

Brief explanation of why this work is required.

### Requirement

What the other agent needs to implement or provide.

### Contract

If applicable, include:

- Inputs
- Outputs
- Types
- Errors
- Expected behavior

### Relevant Files

- `path/to/file`

### Notes

Any important constraints or implementation details.