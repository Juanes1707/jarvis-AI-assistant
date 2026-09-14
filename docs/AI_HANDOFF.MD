# JARVIS AI Handoff

This document is the canonical coordination protocol between **Claude Code** and **Codex**.

It is not a general project log, task tracker, or development diary.

Its purpose is to coordinate work that crosses agent ownership boundaries.

Canonical file path:

`docs/AI_HANDOFF.md`

---

## 1. Purpose

Use this document to record:

- Cross-agent requests
- Shared contracts
- Shared technical/product decisions
- Integration requirements
- Cross-boundary implementation notes
- Dependencies between Claude Code and Codex

Do not use this document for:

- General progress updates
- Unrelated TODOs
- Personal notes
- Routine implementation details that affect only one agent's area
- Information already documented more appropriately elsewhere

---

## 2. Ownership Summary

Claude Code and Codex collaborate on the same repository with different primary responsibilities.

### Claude Code primarily owns

- Frontend implementation
- UI / UX
- Product design
- Screens and layouts
- Reusable UI components
- Design-system implementation
- Visual hierarchy
- Typography, colors, and spacing
- Animations and micro-interactions
- Accessibility
- User-facing navigation experience
- Frontend-local / presentation state
- Loading, empty, error, and success visual states
- Stitch design implementation
- JARVIS visual identity
- Frontend-specific testing

### Codex primarily owns

- System and application architecture
- Business rules and domain logic
- Services and APIs
- Shared/system state architecture
- Data persistence and databases
- Authentication implementation
- Authorization and permissions
- Security-sensitive logic
- AI provider architecture
- Ollama and local-model integrations
- Voice / assistant system integrations
- Complex debugging
- Reliability and observability
- Major system refactors
- Shared testing infrastructure
- System-level and integration testing

Detailed ownership rules remain defined in:

- `CLAUDE.md`
- `AGENTS.md`

This document coordinates the boundary between those responsibilities.

---

## 3. Operating Rules

Both agents must:

- Read relevant sections of this document before crossing ownership boundaries.
- Check `git status` before significant modifications.
- Treat unrelated uncommitted work as intentional unless proven otherwise.
- Preserve unrelated work.
- Avoid overwriting or reverting another agent's work.
- Prefer the smallest viable integration change.
- Use explicit contracts instead of assumptions.
- Reuse established contracts instead of creating parallel ones.
- Keep unresolved requests in this document.
- Mark completed requests as `Resolved` instead of deleting them.
- Preserve useful handoff history.
- Document meaningful cross-agent contract changes.

Neither agent should silently change:

- Another agent's requirement
- An accepted contract
- A shared decision
- The meaning of an existing request

If an existing requirement cannot reasonably be implemented as written, document the issue and coordinate the change instead of silently redefining it.

---

## 4. Request Directions

The direction of a request indicates **who is requesting work from whom**.

### Claude Code → Codex

Use:

`Claude Code → Codex Requests`

when Claude Code requires Codex-owned work such as:

- Architecture
- Business logic
- Services
- APIs
- Persistence
- Authentication
- Authorization
- AI architecture
- Ollama integration
- Voice-system behavior
- Security-sensitive logic
- Shared/system state
- Shared testing infrastructure
- Complex debugging
- System-level navigation behavior

Request ID prefix:

`C2X`

Examples:

- `C2X-001`
- `C2X-002`
- `C2X-003`

---

### Codex → Claude Code

Use:

`Codex → Claude Code Requests`

when Codex requires Claude-owned work such as:

- Frontend implementation
- UI
- UX
- Product design
- Screens
- Components
- Visual states
- Design-system work
- Animations
- Accessibility
- User-facing navigation changes
- Significant frontend restructuring
- New interaction patterns

Request ID prefix:

`X2C`

Examples:

- `X2C-001`
- `X2C-002`
- `X2C-003`

Never reverse these directions.

---

## 5. Request Lifecycle

Use the following lifecycle:

`Pending → In Progress → Blocked | Ready for Integration → Resolved`

### `Pending`

The requesting agent has created the request, but the implementing agent has not yet completed the work.

### `In Progress`

The implementing agent is actively working on the request.

### `Blocked`

The implementing agent cannot continue because a decision, dependency, clarification, or prerequisite is missing.

The reason must be documented in `Implementation Notes`.

### `Ready for Integration`

The implementing agent has completed its side of the request and believes the agreed contract is ready for the requesting agent to consume or verify.

### `Resolved`

The requesting agent has verified that the completed work satisfies the required integration.

Resolved requests should remain in this document for useful historical context.

Do not delete them merely to shorten the file.

---

## 6. Request Responsibilities

### Requesting agent

The requesting agent is responsible for defining:

- Context
- Requirement
- Expected contract
- Acceptance criteria
- Relevant assumptions
- Relevant files when known

The requesting agent should provide enough information that the implementing agent does not need to guess the intended behavior.

The requesting agent normally performs final integration verification and marks the request:

`Resolved`

after successful verification.

---

### Implementing agent

The implementing agent may update:

- Status
- Implementation Notes
- Relevant Files
- Validation information
- Discovered constraints
- Proposed contract clarifications

The implementing agent must not silently redefine:

- Context
- Requirement
- Acceptance Criteria
- An already agreed contract

If the contract needs to change, document the proposed change and why.

For a meaningful contract change, both sides should converge on the new contract before treating it as established.

---

## 7. Active Contracts

Stable interfaces currently relied upon by both agents belong here.

Examples include:

- API contracts
- Service interfaces
- Shared TypeScript types
- State interfaces
- Authentication/session contracts
- AI provider interfaces
- Persistence contracts
- Navigation contracts
- Voice-state contracts
- Error contracts

A contract belongs here when both frontend and system implementation may rely on it beyond a single temporary handoff.

Do not place temporary implementation details here.

When promoting a handoff contract into an Active Contract:

1. Ensure the contract reflects the implemented behavior.
2. Record the relevant interfaces/types.
3. Reference the originating request when useful.
4. Avoid duplicating conflicting versions of the same contract.

### Current Active Contracts

No active contracts yet.

---

## 8. Claude Code → Codex Requests

Requests created by Claude Code that require Codex-owned work.

Request IDs use:

`C2X-###`

### Current Requests

No pending requests.

---

## 9. Codex → Claude Code Requests

Requests created by Codex that require Claude-owned work.

Request IDs use:

`X2C-###`

### Current Requests

No pending requests.

---

## 10. Shared Decisions

Use this section for decisions that affect both frontend and system implementation.

Examples:

- A shared architectural/product constraint
- A cross-agent naming convention
- A decision about shared data shape
- A navigation contract that affects both agents
- A provider-independent state model
- A decision about how frontend errors map from system errors

Do not use this section for temporary implementation details.

Do not silently modify an established Shared Decision.

If a Shared Decision must change, document:

- What changed
- Why it changed
- Which areas are affected

### Current Shared Decisions

No shared decisions yet.

---

## 11. Integration Notes

Use this section for temporary or implementation-specific information required while integrating work across the ownership boundary.

Examples:

- Migration notes
- Temporary compatibility constraints
- Known integration limitations
- Transitional file locations
- Temporary feature flags
- Implementation sequencing requirements

Integration Notes are not stable contracts.

When an Integration Note is no longer relevant, it may be marked obsolete or removed if doing so does not destroy useful unresolved context.

### Current Integration Notes

No integration notes yet.

---

## 12. Contract Change Protocol

An established contract must not be silently changed by either agent.

If implementation reveals that a contract is incomplete or invalid:

1. Keep the original requirement visible.
2. Document the issue in `Implementation Notes`.
3. Describe the proposed contract change.
4. Explain why the change is necessary.
5. Identify affected files or consumers.
6. Update the shared contract only after the new behavior is agreed or clearly required by the user's instruction.

Prefer backward-compatible changes when practical.

Do not create a second competing interface merely to avoid updating an existing contract.

---

## 13. Conflict Handling

If Claude Code and Codex appear to require incompatible changes:

1. Do not overwrite the other agent's implementation.
2. Do not silently choose one interpretation.
3. Inspect existing project documentation.
4. Inspect relevant Active Contracts and Shared Decisions.
5. Identify the exact conflict.
6. Record it in the relevant handoff request.
7. Prefer the smallest solution that preserves both agents' responsibilities.
8. Ask the user only when the conflict requires a product or architectural decision that cannot be safely derived from existing project decisions.

Do not bypass unresolved ownership conflicts by duplicating functionality.

---

## 14. Cross-Agent Git Safety

Before significant cross-agent work:

1. Run or inspect `git status`.
2. Treat uncommitted changes as potentially intentional.
3. Identify files already modified by another agent or the user.
4. Preserve unrelated changes.
5. Avoid broad formatting or cleanup passes across unrelated files.
6. Keep commits or modifications focused on the requested work.

Do not revert another agent's work merely because a different implementation would be preferred.

When touching another agent's area:

- Make the smallest viable change.
- Preserve intent.
- Avoid unrelated refactors.
- Document what changed and why.

---

## 15. Handoff Entry Template

Use this template for new cross-agent requests.

---

### [REQUEST-ID] Short descriptive title

**Status:** Pending  
**Owner:** Claude Code | Codex  
**Requested by:** Claude Code | Codex  
**Created:** YYYY-MM-DD

#### Context

Explain why this work is needed.

Describe what frontend, product, system, or integration behavior depends on it.

#### Requirement

Describe exactly what must exist after the request is completed.

Focus on observable behavior and required capability rather than prescribing unnecessary implementation details.

#### Contract

Define the cross-agent interface when relevant.

##### Operation

Describe the capability or operation being requested.

##### Inputs

```ts
// Expected input shape
```

##### Outputs

```ts
// Expected output shape
```

##### Types / Data Shape

```ts
// Shared or relevant TypeScript types when applicable
```

##### Loading Behavior

Describe what the consumer should expect while the operation is running.

Use `N/A` when not applicable.

##### Empty Behavior

Describe valid no-data / empty-result behavior.

Use `N/A` when not applicable.

##### Error Behavior

Describe expected failure modes and how they should be exposed across the boundary.

Use `N/A` when not applicable.

##### Assumptions

List assumptions the implementing agent must know.

Use `None` when there are no relevant assumptions.

#### Acceptance Criteria

- [ ] Required behavior is implemented.
- [ ] The agreed contract is respected.
- [ ] Relevant edge cases are handled.
- [ ] Existing unrelated behavior is preserved.
- [ ] Relevant tests or validation pass.
- [ ] Cross-agent integration behavior is documented when necessary.

Add request-specific acceptance criteria below these items when needed.

#### Relevant Files

- `path/to/file`

Use `Unknown / to be determined` if the requesting agent does not yet know the implementation location.

#### Implementation Notes

Implementation details, discovered constraints, blockers, validation results, or proposed contract clarifications belong here.

Do not silently change the agreed requirement or contract.

#### Validation

Record validation performed by the implementing agent.

Examples:

- TypeScript
- Unit tests
- Integration tests
- Runtime verification
- Expo verification
- Manual integration verification

Use:

`Not yet validated`

until applicable validation has been performed.

---

## 16. Example: Claude Code → Codex

```md
### [C2X-001] Persist university assignments

**Status:** Pending
**Owner:** Codex
**Requested by:** Claude Code
**Created:** YYYY-MM-DD

#### Context

The University screen needs to display assignments after the application is restarted.

#### Requirement

Provide a persistence interface that allows the frontend to retrieve and store university assignments.

#### Contract

##### Operation

Load and save assignments.

##### Inputs

```ts
type SaveAssignmentsInput = {
  assignments: Assignment[];
};
```

##### Outputs

```ts
type LoadAssignmentsResult = {
  assignments: Assignment[];
};
```

##### Loading Behavior

Loading state must be observable by the frontend.

##### Empty Behavior

Return an empty assignments array when no persisted assignments exist.

##### Error Behavior

Persistence failures must be exposed as typed errors rather than silently ignored.

#### Acceptance Criteria

- [ ] Assignments survive application restart.
- [ ] Empty persistence returns an empty array.
- [ ] Persistence failures are exposed predictably.
- [ ] Existing assignment UI behavior remains unchanged.
```

---

## 17. Example: Codex → Claude Code

```md
### [X2C-001] Add unavailable-AI-provider state

**Status:** Pending
**Owner:** Claude Code
**Requested by:** Codex
**Created:** YYYY-MM-DD

#### Context

The AI service can now report that no configured provider is currently available.

#### Requirement

Provide a user-facing state that communicates provider unavailability and allows the user to retry when appropriate.

#### Contract

##### System State

```ts
type AIAvailability =
  | { status: 'available' }
  | { status: 'unavailable'; reason?: string };
```

##### Loading Behavior

Preserve the existing AI loading behavior.

##### Empty Behavior

N/A

##### Error Behavior

Provider unavailability should be presented as a recoverable application state rather than a generic crash/error screen.

#### Acceptance Criteria

- [ ] The unavailable-provider state matches the JARVIS design system.
- [ ] Retry behavior is accessible when retry is supported.
- [ ] Existing available-provider UI remains unchanged.
```

---

## 18. Resolved History

Resolved requests should normally remain in their respective request sections with:

`Status: Resolved`

This preserves the context that explains why shared interfaces or implementation decisions exist.

Historical requests may be reorganized later if the document becomes difficult to navigate, but useful contracts, decisions, and reasoning must not be discarded solely for cleanliness.

---

## 19. Core Principle

`docs/AI_HANDOFF.md` exists so Claude Code and Codex can work independently without guessing what the other agent needs.

The protocol should make cross-agent work:

- Explicit
- Traceable
- Small in scope
- Contract-driven
- Safe for concurrent repository work
- Easy to verify
- Resistant to accidental ownership conflicts

When work remains entirely inside one agent's ownership boundary, no handoff is necessary.

When work crosses that boundary, use this document instead of making assumptions.