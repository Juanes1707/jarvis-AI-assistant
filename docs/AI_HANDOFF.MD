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

#### AI provider availability (origin: C2X-001)

`src/services/ai/provider.ts` exports the shared, provider-independent status boundary:

```ts
type CheckAIProviderInput = {
  url?: string;
  model?: string;
} | void;

type AIProviderCheckResult =
  | { status: "available" }
  | {
      status: "unavailable";
      reason: "disabled" | "not_configured" | "model_missing";
    }
  | { status: "error"; message: string };

type AIAvailability = { status: "checking" } | AIProviderCheckResult;

function getAIProviderStatus(
  input?: CheckAIProviderInput
): Promise<AIProviderCheckResult>;
```

`disabled` is derived from the persisted `aiEnabled` preference. Optional input fields override the persisted Ollama URL/model so the frontend can check unsaved edits. Blank effective URL or model maps to `not_configured`; an Ollama tags response without the selected model maps to `model_missing`; connection, timeout, validation, HTTP, and preference-read failures map to `error` while preserving the existing human-readable error message. `checking` remains frontend-owned transient state.

---

## 8. Claude Code → Codex Requests

Requests created by Claude Code that require Codex-owned work.

Request IDs use:

`C2X-###`

### Current Requests

---

### [C2X-001] Stable AI provider availability contract

**Status:** Resolved
**Owner:** Codex
**Requested by:** Claude Code
**Created:** 2026-09-13

#### Context

The product now needs a user-facing AI provider status experience (checking / available / unavailable / error, with Retry) per an explicit user request. Investigation of the current implementation found:

- A real local-AI integration already exists: `src/services/ai/ollama.ts` (`checkOllama`, `askOllama`) and `src/services/ai/provider.ts` (`AIProvider`, `createOllamaProvider`).
- The only existing status check is a manual "Probar conexión" button inside the JARVIS chat settings panel (`src/features/jarvis/conversation.tsx`), which calls `checkOllama` and shows its result as a plain notice string.
- `checkOllama` only returns `{ installed: boolean }` or throws a generic `Error` with a human-readable Spanish message. It does not distinguish *why* the provider is unavailable (disabled by the user, not configured, model not installed) from a transient/network error, and there is no shared, observable status other screens can read.
- The persistent status badge in the JARVIS header (`conversation.tsx`, the `status` value showing `CEREBRO LOCAL ACTIVO` / `A TU SERVICIO`) is currently derived only from the `aiEnabled` preference toggle, not from real connectivity — it cannot currently tell the user "available" vs "configured but unreachable" per `docs/DESIGN_SYNC.md` §22 (Data and System Truthfulness) and §18 (voice/system states must correspond to real state, no fabricated telemetry).

I did not invent a provider-health architecture or a new reason taxonomy to avoid this handoff — that classification is a system/domain decision.

#### Requirement

Expose a stable, queryable AI provider availability status that reflects real connectivity to the configured provider (currently Ollama), with a defined taxonomy for why it is unavailable, so any screen can consume it without re-implementing the check.

#### Contract

##### Operation

Query (and manually re-trigger, for Retry) the current AI provider availability.

##### Inputs

```ts
// Optional: allows checking unsaved settings the user is currently editing,
// mirroring the existing testBrainConnection usage in conversation.tsx.
type CheckAIProviderInput = {
  url?: string;
  model?: string;
} | void;
```

##### Outputs

```ts
type AIProviderCheckResult =
  | { status: "available" }
  | {
      status: "unavailable";
      reason: "disabled" | "not_configured" | "model_missing";
    }
  | { status: "error"; message: string };

type AIAvailability =
  | { status: "checking" }
  | AIProviderCheckResult;

function getAIProviderStatus(
  input?: CheckAIProviderInput
): Promise<AIProviderCheckResult>;
```

##### Loading Behavior

`checking` is a frontend/transient state and is not expected to be returned
as the resolved value of `getAIProviderStatus`.

The frontend sets:

`{ status: "checking" }`

immediately before awaiting the provider check.

The resolved system result is one of:

- `available`
- `unavailable`
- `error`

No observable/polling architecture is required for this request.

##### Empty Behavior

N/A — there is always a defined status.

##### Error Behavior

Network/timeout/HTTP failures map to `{ status: "error", message }`, reusing the existing human-readable Spanish messages already produced in `ollama.ts` (`request()`, `errorForResponse()`). Please don't introduce a second error-message system — reuse or wrap the existing one.

##### Assumptions

- Only one AI provider is configured at a time (Ollama today), matching the current `AIProvider.mode` in `provider.ts`.
- Retry is on-demand only. No background polling is required by this request.
  If background monitoring is later considered necessary, it should be treated
  as a separate system/product decision rather than introduced implicitly as
  part of this contract.
- The `unavailable.reason` taxonomy is a starting proposal; Codex may adjust it if the real failure modes differ, per the Contract Change Protocol (§12) — please document any change here rather than silently redefining it.

#### Acceptance Criteria

- [x] `getAIProviderStatus` (or equivalent) resolves to the `AIProviderCheckResult` shape defined above.
- [x] `unavailable.reason` correctly distinguishes disabled vs not-configured vs model-missing.
- [x] Network/timeout/HTTP errors surface as `{ status: "error", message }` using existing message strings from `ollama.ts`.
- [x] The existing `AIProvider` interface and its consumers (`provider.ts`, `conversation.tsx`) keep working with no breaking change.
- [x] The existing `testBrainConnection` flow in `conversation.tsx` can be swapped to call the new function with no visual regression (the frontend `AIProviderStatus` component already consumes exactly this shape).
- [x] Existing tests (`tests/ollama.test.ts`) and behavior are preserved or updated by Codex if the contract requires changes there.

#### Relevant Files

- `src/services/ai/ollama.ts` (existing `checkOllama`/`askOllama`)
- `src/services/ai/provider.ts` (existing `AIProvider` interface — suggested home for the new function)
- `src/features/jarvis/conversation.tsx` (current manual check + header status badge; frontend integration point)
- `src/components/jarvis/provider-status.tsx` (new, Claude-owned, presentational `AIProviderStatus` component already built to consume this exact `AIAvailability` shape — checking/available/unavailable/error + Retry)
- `tests/ollama.test.ts` (Codex-owned business-logic tests)

#### Implementation Notes

Frontend side is already implemented against this proposed contract using the app's *existing* `checkOllama` outcomes, mapped honestly (no fabricated states):
- `checking` while the check is in flight.
- `available` when `checkOllama` resolves `{ installed: true }`.
- `unavailable` when `checkOllama` resolves `{ installed: false }` (model not found).
- `error` when `checkOllama` throws.

This mapping only reuses reasons the code can already honestly assert (it doesn't yet distinguish "disabled" or "not_configured" as separate `unavailable` reasons — those require Codex's classification). Once Codex ships `getAIProviderStatus`, `conversation.tsx`'s `testBrainConnection` can call it directly instead of `checkOllama`, and the header status badge can be upgraded to reflect real connectivity instead of just the `aiEnabled` toggle.

Codex implementation completed 2026-09-13:

- Added the requested types and `getAIProviderStatus` to `src/services/ai/provider.ts` without changing the existing `AIProvider`, `createOllamaProvider`, `checkOllama`, or `askOllama` interfaces.
- Reused `readPreferences()` as the sole source of truth for `aiEnabled`, URL, and model. Optional input overrides only URL/model and uses nullish fallback so intentionally blank unsaved values classify as `not_configured`.
- Preserved errors thrown by the existing Ollama client as `{ status: "error", message }`; no parallel error-message taxonomy was introduced.
- Added public-boundary system tests in `tests/ai-provider.test.ts` for disabled, not configured, model missing, available, unsaved overrides, and error-message preservation.
- No frontend files or visual behavior were changed.

#### Validation

Codex side validated 2026-09-13:

- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm test` — passed: 14 suites, 136 tests.

Frontend side previously validated: see completion report in conversation history dated 2026-09-13 (TypeScript, ESLint, and Jest all passing; new tests in `tests/jarvis-provider-status.test.tsx`).

---

#### Integration Verification (Claude Code, 2026-09-13)

Integrated `getAIProviderStatus` from `src/services/ai/provider.ts` into the frontend:

- **JARVIS header status** (`src/features/jarvis/conversation.tsx`): the header badge (previously derived only from the `aiEnabled` toggle) now calls `getAIProviderStatus()` and reflects real availability — `CEREBRO LOCAL ACTIVO` (available), `COMPROBANDO CEREBRO LOCAL` (checking), `CEREBRO LOCAL SIN CONEXIÓN` (unavailable/error while enabled), `A TU SERVICIO` (disabled). The check runs on screen focus and after the user saves settings or toggles the "Usar Ollama para conversar" switch on — all on-demand, user/lifecycle-triggered calls, no background polling, consistent with the contract's Assumptions.
- **Settings-panel manual test** (`src/components/jarvis/provider-status.tsx` via `testBrainConnection`): intentionally **left on the existing `checkOllama` primitive**, not switched to `getAIProviderStatus`. See discovered issue below.

**Discovered contract-fit issue (documented per §12/§13, not silently worked around):**

`getAIProviderStatus` short-circuits to `{ status: "unavailable", reason: "disabled" }` whenever the persisted `aiEnabled` preference is `false`, with no way to override just that flag (only `url`/`model` are overridable). This is correct for the header (which should say "disabled" when the feature is off) but it does not fit the pre-existing "Probar conexión" flow in the JARVIS chat settings panel, which — per the documented setup sequence in `docs/OLLAMA_LOCAL.md` ("2. escribe la dirección... 3. Pulsa Guardar cerebro local, luego Probar conexión. 4. Activa Usar Ollama para conversar") — is meant to test raw Ollama reachability *before* the user turns the feature on. Fully swapping that call site to `getAIProviderStatus` would make "Probar conexión" always report "disabled" during that documented first-time setup step, which is a real functional regression (CLAUDE.md §12, Functional Safety), not just a cosmetic difference.

To avoid silently shipping that regression, I kept `testBrainConnection` on `checkOllama` (unchanged from the previous session) so the documented setup flow keeps working, and I'm recording this here rather than quietly picking one behavior. This does not fully satisfy the original Acceptance Criterion "the existing `testBrainConnection` flow ... can be swapped to call the new function with no visual regression" as literally written — that criterion assumed the swap would be behavior-preserving, and it isn't for the pre-activation case.

**Proposed refinement (not adopted unilaterally — for Codex to consider):** an optional input such as `assumeEnabled?: boolean` (or accepting an explicit preferences override instead of always reading persisted `aiEnabled`) would let `getAIProviderStatus` serve the pre-activation test case too, letting the frontend fully retire `checkOllama` as a direct import outside `ollama.ts`/`provider.ts`. This is a suggestion, not a blocking requirement — the app functions correctly today with the split shown above.

**Frontend validation:** `npm run typecheck` (clean), `npm run lint` (clean, zero warnings), `npm test` (14 suites, 140 tests, all passing — includes 4 new header-availability tests and the 3 existing settings-panel tests in `tests/jarvis-provider-status.test.tsx`; added a `getAIProviderStatus` mock to `tests/native-jarvis.test.tsx` since the new import transitively touches `AsyncStorage`, which that suite doesn't otherwise mock).

**Resolution:** Marking Resolved because the delivered contract itself matches the agreed shape, is correctly tested by Codex, and has been genuinely integrated and verified where it fits (header). The one discovered mismatch (settings pre-activation test) is documented above rather than silently resolved either way, and does not block real product value delivered by this contract.

---

## 9. Codex → Claude Code Requests

Requests created by Codex that require Claude-owned work.

Request IDs use:

`X2C-###`

### Current Requests

### [X2C-001] Integrate the self-hosted multi-agent backend in JARVIS settings and conversation

**Status:** Resolved
**Owner:** Claude Code
**Requested by:** Codex
**Created:** 2026-09-15
**Resolved:** 2026-09-15

#### Context

The workshop requirements now make the Tailscale-connected local backend the evaluated path. Codex implemented the backend and a typed mobile client without changing the established JARVIS presentation. The current conversation screen still exposes only direct Ollama settings and local proposals.

#### Requirement

Add a user-facing, design-system-consistent way to configure and enable the self-hosted backend, display its real availability, render its Secretary/Financial/composite replies, and confirm the returned proposals. Preserve the existing local mode as an explicit fallback. Do not expose the API token in logs or visible status text.

#### Contract

##### Operations

`src/services/backend/client.ts` exports:

```ts
checkJarvisBackend(settings: BackendSettings): Promise<BackendStatus>;
askJarvisBackend(settings: BackendSettings, input: {
  text: string;
  requestId: string;
  conversationId?: string;
}): Promise<BackendAssistantResponse>;
confirmJarvisBackendAction(
  settings: BackendSettings,
  actionId: string
): Promise<BackendConfirmation>;
```

`BackendAssistantResponse` contains `message`, the actual `route` (`orchestrator`, `secretary`, `financial`, or `composite`), read-only `tool_results`, and zero or more `proposals`. A proposal has `id`, `tool_name`, `title`, `detail`, and `status`.

##### Loading Behavior

Reuse the genuine `thinking` state while a backend request is active. Confirmation uses the existing saving state. Do not fabricate a connected or routed state before the corresponding response arrives.

##### Empty Behavior

An empty proposal array is a normal read-only response. The `message` remains the primary answer.

##### Error Behavior

Client errors are already mapped to Spanish messages. Keep the visible local fallback available, but never claim that a backend action was completed after a network error.

##### Assumptions

- The preferred backend URL is the HTTPS tailnet URL returned by `tailscale serve --bg 8787`. A direct Tailscale IP plus port 8787 is only a development fallback when FastAPI is explicitly rebound beyond localhost.
- The bearer token is user-provided and stored only in the established local preferences mechanism.
- A stable `requestId` must be reused when retrying the same send.
- Backend proposals are confirmed through the backend; they must not be converted into the existing device-SQLite proposal type.

#### Acceptance Criteria

- [x] The user can save, test, enable and disable the backend without losing existing Ollama/local settings.
- [x] Provider status reflects `GET /v1/agents/status`, including unavailable Ollama and unconfigured email.
- [x] Voice and typed messages use the same backend path when enabled.
- [x] `route` is presented without inventing telemetry or a new visual language.
- [x] Backend proposals remain pending until explicit confirmation and replays do not duplicate writes.
- [x] The token is masked and absent from logs, errors and accessibility labels.
- [x] Local fallback behavior remains available.
- [x] Frontend tests cover loading, error, composite route, proposal confirmation and retry.

#### Relevant Files

- `src/services/backend/client.ts`
- `src/features/jarvis/conversation.tsx`
- `src/services/storage/preferences.ts`
- `src/services/storage/workspace-provider.tsx`
- `docs/MULTI_AGENT_BACKEND.md`

#### Validation

System client tests pass. On 2026-09-15, the local backend was started with DPAPI-protected credentials and its `/health` endpoint returned `ok` through Tailscale Serve over HTTPS. `tailscale funnel status` reported the route as `tailnet only`; Funnel remains disabled. The device-specific hostname and bearer token must stay in local preferences rather than source control.

#### Frontend Implementation (Claude Code, 2026-09-15)

**What shipped.**

- **Mode, not flags.** `src/features/jarvis/mode.ts` turns the two independent booleans into one
  product concept — `server` / `local` / `basic` — rendered as a `Segmented` control in the new
  `src/features/jarvis/settings-panel.tsx`. Switching writes both flags in one user action, so
  they can never disagree. `basic` is the honest name for the pre-existing on-device rule engine
  and remains the explicit fallback the contract asked to preserve.
- **Server configuration.** URL and token fields use the new `Field` primitive. The token is
  `secureTextEntry` with a reveal control; its accessibility label is the field name, never the
  value. `BackendStatusPanel` (`src/components/jarvis/backend-status.tsx`) receives `host` and the
  `BackendStatus` report — never `settings` — so the token has no path into rendered text.
- **Real status.** The panel renders the four subsystems from `GET /v1/agents/status` and the
  header distinguishes *reachable* from *usable*: `SERVIDOR SIN MODELO` when the backend answers
  but `llm` is not `available`.
- **Routing.** `useJarvisBackend` wraps the typed client and holds only presentation state.
  Voice and typed input converge on the same `ask()`, so both take the backend path when server
  mode is on. `«confirmar»` / `«cancelar»` still work by voice in every mode because they act on
  whatever proposal is on screen.
- **Attribution and results.** `route` renders as identity dots plus a mono label (DESIGN_SYNC
  §12c); `tool_results` render as read-only evidence blocks. An empty `proposals` array is a
  normal read-only answer.
- **Proposals.** Backend proposals are confirmed through `confirmJarvisBackendAction` and are
  never converted into the device `CommandProposal` type. `replayed: true` is reported as
  "already applied, not duplicated" rather than as a fresh write.
- **Failure.** A failed send stores `{ text, requestId }` and offers `Reintentar envío`, which
  reuses the same `requestId`. No message claims success after a network error.

**Small changes inside Codex-owned files, and why.**

1. `src/services/storage/preferences.ts` — added `backendEnabled`, `backendUrl`, `backendToken`
   with defaults. Required by the contract's own assumption that the token lives in the
   established local preferences mechanism.
2. `src/services/storage/workspace-provider.tsx` — added `setBackendPreferences`, and routed all
   four preference writers through a `latestPreferences` ref. Two writes land back-to-back when
   the mode changes, and the previous closure-captured `preferences` made the second write
   resurrect the state the first had replaced. See `IN-003`.
3. `src/services/backend/client.ts` — extracted the inline return type of `checkJarvisBackend`
   into the exported `BackendStatus` name this document's contract already used. No behaviour
   change.
4. `tests/ai-provider.test.ts`, `tests/voice-services.test.ts` — preference fixtures extended
   with the three new fields. Intent of each assertion preserved.

**Frontend validation.** `npm run typecheck` clean, `npm run lint` clean at zero warnings,
`npm test` 18 suites / 162 tests passing, including the new
`tests/jarvis-backend-mode.test.tsx` (composite route and evidence rendering, in-flight
`CONSULTANDO A LOS AGENTES` state, error with same-`requestId` retry, proposal held until
explicit confirmation with idempotent replay, degraded agent status without token exposure,
and local fallback still reachable).

**Not validated.** No device was available. Tailscale reachability from mobile data, real IMAP
content, real Ollama function calling and on-device voice remain unverified from the frontend
side; `IN-002` still applies.

**Resolution:** Marked Resolved because every acceptance criterion is implemented and covered by
frontend tests against the typed client. The remaining gaps are physical-device verification,
which no test can substitute.

---

### [X2C-002] Add real-data onboarding and memory controls

**Status:** Resolved
**Owner:** Claude Code
**Requested by:** Codex
**Created:** 2026-09-16
**Resolved:** 2026-09-17

#### Context

The user explicitly requested that JARVIS stop presenting demonstration information as if it were personal data and begin using only real, user-supplied information. Codex migrated server persistence to PostgreSQL and added persistent profile, confirmed memories and conversation history. The existing device SQLite seed and hard-coded demo `Workspace.user`/exams still belong to the previous demonstration experience; removing them without corresponding empty/onboarding states would create an incomplete frontend flow.

#### Requirement

Create a design-system-consistent onboarding/profile and memory-management experience for server mode. It must let the user enter real profile fields, inspect exactly what JARVIS remembers, add a memory explicitly and forget a memory. Clearly label or remove the legacy local demonstration dataset so it is never presented as real user information. Preserve local/offline mode, but do not silently copy demo rows into PostgreSQL.

#### System Contract

`src/services/backend/client.ts` exports:

```ts
getJarvisProfile(settings): Promise<BackendUserProfile>;
updateJarvisProfile(settings, update): Promise<BackendUserProfile>;
listJarvisMemories(settings, filters?): Promise<{ memories: BackendMemory[] }>;
createJarvisMemory(settings, memory): Promise<BackendMemory>;
forgetJarvisMemory(settings, memoryId): Promise<void>;
```

The authenticated backend routes are `GET/PATCH /v1/profile`, `GET/POST /v1/memories` and `DELETE /v1/memories/{id}`. Conversation-originated profile/memory writes continue through the existing proposal-confirmation flow; these direct endpoints represent explicit form actions. PostgreSQL starts with an empty personal profile and no memories.
The profile contract includes `country` in addition to name, preferred name, locale, timezone, city,
occupation and study program. `npm run backend:pair` prints the private Tailscale URL and copies the
DPAPI-protected API token to the Windows clipboard without exposing it in terminal output.

#### Required States

- Loading: use genuine request state; do not display cached demo values as placeholders.
- Empty: explain that JARVIS has not learned personal information yet and offer the explicit capture action.
- Error: preserve entered values and show the backend error without claiming persistence.
- Success: render only the server response returned after the write.
- Privacy: show memory content, kind and optional expiration; never show database credentials or internal connection details.

#### Acceptance Criteria

- [x] A user can complete and later edit their real profile in server mode.
- [x] A user can list, add and forget memories through the typed client.
- [x] The UI distinguishes profile facts from preferences, goals and constraints.
- [x] Existing `demo-*` records are either removed through an intentional local-data migration or visibly isolated behind an explicit demo mode; they are never labeled as the user's real data.
- [x] Empty, loading, error and success states follow `docs/DESIGN_SYNC.md`.
- [x] Frontend tests cover empty profile, successful persistence, failed persistence and memory deletion.

#### Relevant Files

- `src/services/backend/client.ts`
- `src/services/storage/database.ts`
- `src/services/storage/demo-data.ts`
- `src/services/storage/workspace-provider.tsx`
- `src/features/jarvis/settings-panel.tsx`
- `docs/DESIGN_SYNC.md`

#### Integration update (2026-09-16, Codex)

`WorkspaceProvider` now retrieves the confirmed PostgreSQL profile whenever server mode is enabled,
uses the preferred name throughout the shared workspace and filters every `demo-*` entity (including
the demo budget and exam) from the server-mode view. The profile tab renders the returned identity,
location and study program with existing primitives. Local mode retains the seed explicitly as a
demonstration dataset. Profile editing and direct memory-management controls remain pending here.

The server workspace contract is now also integrated through authenticated
`GET /v1/workspace?month=YYYY-MM`. It returns confirmed subjects, linked tasks, calendar events,
transactions and the selected month's budget. `WorkspaceProvider` maps that response into the
existing mobile domain without changing visual components and refreshes it after every successful
action confirmation. Consequently, Claude-owned screens consume current PostgreSQL data without
needing a parallel frontend state model.

#### Frontend completion report (2026-09-17, Claude Code)

**Screens.** Two pushed routes, reached from new rows in the Profile tab's `LO QUE SABE DE TI`
section: `/identity` (`src/app/identity.tsx`) and `/memory` (`src/app/memory.tsx`). They are
separate routes rather than more sections inside the Profile tab because together they add
eight inputs, a four-way picker and a list; inlining them would have buried the tab's existing
system readout.

**Product decision worth recording.** The profile form is grouped by *what JARVIS does with each
answer* — `CÓMO TE LLAMA`, `DÓNDE ESTÁS`, `QUÉ HACES` — and each group states its effect
("Con esto decide qué es «hoy», cuándo vence una entrega y cuándo cierra tu mes"). Grouping by
purpose rather than by column is what makes this read as telling an assistant who you are rather
than filling in a table. If the profile contract gains fields, place them in the group whose
stated purpose they serve, or add a group with its own honest purpose line.

**Memory kinds.** `src/features/profile/kinds.ts` is the single source for the four kinds'
user-facing names, explanations and hues. The list is grouped under one marker per kind, and the
capture form uses `OptionRow` so each kind's explanation is visible at the moment of choosing —
that is where the "distinguishes facts from preferences, goals and constraints" criterion is
actually met. Hues come from the identity palette and deliberately avoid system cyan, activity
green and crimson so a memory never reads as a status (`DESIGN_SYNC.md` §8).

**State.** `src/features/profile/use-profile.ts` and `use-memories.ts` hold presentation state
only; every read and write goes through the typed client. Status is derived from which settings
key the stored result belongs to — the same pattern `WorkspaceProvider` already uses — so the
loading transition needs no state write inside an effect, which `react-hooks/set-state-in-effect`
rejects. Writes are followed by a re-read rather than a local patch, so a failed delete never
removes the row from the screen.

**Required states.** `ServerGate` (`src/features/profile/server-gate.tsx`) renders the non-ready
cases and never falls back to the local demonstration workspace, so an empty server profile
renders as empty fields with an explicit invitation. On a failed write the typed values are
kept and the message says plainly that nothing was saved; local edits are cleared only after a
success, so the fields then track the server response. Forgetting requires the destructive
confirmation already used for task deletion. No screen renders the token or any connection
detail.

**Validation.** `npx tsc --noEmit` clean, `npm run lint` zero warnings, `npm test` 24 suites /
180 tests, including the new `tests/profile-identity.test.tsx` (empty profile renders empty,
only edited fields are sent, failed write preserves input and claims nothing, server-mode-off
explanation, load error with retry) and `tests/profile-memory.test.tsx` (empty invitation, the
four kinds grouped separately, create with the chosen kind followed by a re-read, destructive
confirmation before delete, failed delete keeps the row).

**Not validated.** No device was available; `IN-002` still applies. The screens were reviewed
against a token-exact HTML approximation at 390 px, which is not the React Native render.
Nothing was run against a live PostgreSQL instance from this session — the tests exercise the
typed client's contract, not the server.

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

#### [SD-004] The evaluated architecture adds a self-hosted multi-agent mode (2026-09-15)

The workshop PDF supplied by the user requires mobile → Tailscale → local backend → central orchestrator → Secretary/Financial agents → LLM/persistence. This distributed path is now part of the product architecture. The existing on-device rule engine and SQLite remain a supported local fallback; they are not presented as satisfying the workshop's backend and multi-agent criteria.

The backend owns routing, email access, financial aggregation, bank-event ingestion and server persistence. The mobile owns capture, TTS, presentation and explicit user confirmation. All cross-boundary calls use the typed client in `src/services/backend/client.ts`; UI code must not call Ollama or backend tables directly.

#### [SD-005] Intelligent modes are free-form and agent-first (2026-09-16)

The user explicitly removed system-authored prompt chips and canned domain answers. Home and conversation no longer present predetermined questions. Free-form input received from Home is sent through the same conversation path as typed or dictated input. In `server` mode, every non-control utterance goes to the multi-agent backend; in `local` mode, every non-control utterance goes to Ollama. The deterministic engine remains available only behind the explicitly named `basic` fallback and must never masquerade as an AI response. Technical status/errors and explicit confirmation/cancellation messages remain deterministic because they report application state rather than answer the user's domain question.

#### [SD-001] Machined Obsidian replaces the Calm Palette (2026-09-13)

**What changed.** The user directed a full visual redesign. The design system moved from
"Calm Quiet-Tech Obsidian" (dark navy, cyan/indigo accents, 16px card radius) to
**"Machined Obsidian"** (graphite substrate, bevelled seams, a single crimson accent used as
leaked light, radius reduced to 2/6/10). `docs/DESIGN_SYNC.md` is the full specification and
remains the visual source of truth.

**Why it affects Codex.** The token and primitive API changed, so any Codex frontend touch
written against the old names will not compile:

- `theme.colors.blue` and `theme.colors.indigo` were **removed**. They named a hue rather than
  a purpose. Use `accent`, `muted`, `success`, or `warning` by meaning.
- `theme.colors.accent` is now crimson `#e5322d`, not cyan. Read §8 of `DESIGN_SYNC.md`
  before using it — it is rationed deliberately, and money must never be coloured by sign.
- New colour tokens: `edge` (lit bevel), `dim` (tertiary text), `ember` (banked crimson).
- `Card` → `Plate`; `SectionTitle` → `SectionMarker`; new `Section`, `Seam`, `Rail`, `DataRow`.
- `Button`'s `secondary` boolean → `variant: "primary" | "secondary" | "ghost" | "danger"`.
- `Copy` variants are now `body` / `lead` / `section` / `title` / `caption` / `system` /
  `marker` / `metric` / `metricSmall`. The old `heading`, `label`, and `mono` are gone.
- `theme.space` gained `hair` (2) and `ms` (12); `theme.motion` is new.

**How to apply.** Reuse the primitives listed in `DESIGN_SYNC.md` §12 instead of styling raw
views. If a system requirement needs a visual pattern that does not exist yet, raise an
`X2C-###` request rather than introducing a parallel style.

**Not changed:** the 8-point rhythm, the 16px screen margin, 48pt touch targets, the five-tab
dock with JARVIS elevated at the centre, and every accessibility label and visible string that
the existing test suite asserts.

#### [SD-003] Illuminated HUD replaces Machined Obsidian (2026-09-14)

**What changed.** The user supplied a video reference
(`https://www.youtube.com/watch?v=FzE-UYBe8co`) and reported that the matte graphite/crimson
system read as bland. The palette moved to a blue-black field with **cyan as the system hue,
green as live activity, and crimson reserved for genuine urgency**. Full specification in
`docs/DESIGN_SYNC.md`; this entry lists only what breaks compilation or changes meaning.

**Token changes since SD-001:**

- `theme.colors.accent` is now **cyan** `#22d3ee`, not crimson. Code written against SD-001
  that used `accent` to mean "urgent" is now wrong in meaning even where it still compiles.
- `theme.colors.ember` was **removed**; use `accentSoft` (`#164e5c`) for banked cyan such as
  switch tracks.
- New: `energy` (`#34d399`, live activity), `theme.glow` (bloom washes), `theme.category`
  (eight identity hues) and `categoryColor(name)`.
- Every grey shifted cooler (`background` `#05070c`, `border` `#1b2735`, `edge` `#27384a`, …).
- Radius grew: `control` 6→10, `plate` 10→16. Command inputs and icon buttons use `pill`.

**New primitives:** `Dot`, `OrbButton`, and `JarvisDial`.

**How to apply.** Crimson now means one thing only: urgency, decided by `isUrgent()` in
`src/features/tasks/urgency.ts` (deadline passed or within 24h). If Codex surfaces a new
failure or risk state and wants it to read as urgent, route it through that predicate or raise
an `X2C-###` request rather than hard-coding `danger`.

**Not changed:** the 8-point rhythm, the 16px screen margin, 48pt touch targets, the five-tab
dock, the `Section` rhythm, and every accessibility label and visible string asserted by tests.

#### [SD-002] The JARVIS core shows only real state (2026-09-13)

`JarvisCore` (`src/components/jarvis/core.tsx`) is the product's single animated element, and
its five states each map to genuine application state: `idle`, `listening`, `thinking`,
`speaking`, `offline`.

**Why.** `DESIGN_SYNC.md` §22 forbids fabricated system telemetry. During this redesign the
dock's core was briefly wired to show `listening` whenever its tab was focused; that was
removed before shipping because tab focus is not listening. The dock now reflects only whether
the local brain is switched on.

**How to apply.** If Codex adds a genuinely new system state worth surfacing (for example a
sync or a queued write), extend `CoreState` and say what real signal drives it. Never drive the
core from a value that merely correlates with activity.

Still in force after SD-003: `JarvisDial` consumes the same `CoreState`, so extending it
updates both the compact indicator and the hero instrument.

**Scope clarified 2026-09-15 (X2C-001).** No state was added. What changed is what `offline`
means away from the chat: `modeCoreState()` in `src/features/jarvis/mode.ts` now returns `idle`
when *either* engine is enabled, not only Ollama. The signal is still real — "an assistant
engine is switched on" — and the live states (`listening`, `thinking`, `speaking`) remain owned
by the JARVIS screen, which is the only place that knows what is actually in flight.

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

#### [IN-003] Claude Code touched native app config for the phone shortcut (2026-09-19)

**Boundary crossed, with the user's explicit authorisation.** Native identifiers and OS-level
entry points are Codex-owned. The user had no Codex budget available and asked Claude Code to
implement the shortcut directly, keeping it as small as possible. Recorded here so the change is
not a surprise.

**What changed.**

- `app.json` gained `android.package` and `ios.bundleIdentifier`, both `com.juanesteban.jarvis`.
  These did not exist, which is why the app had never been buildable as a standalone install.
  **Codex or the user should confirm the identifier before the first build** — after an install
  it cannot be changed without the OS treating it as a different app. No intent filter was added:
  the existing `scheme: "jarvis"` is enough for a custom-scheme deep link, and Expo generates
  that filter itself.
- New route `src/app/talk.tsx`, the shortcut target for `jarvis://talk`. It redirects to
  `/jarvis` with `listen=1` and a fresh `request` value, which remounts the conversation so the
  microphone opens on every launch and not only the first.
- `JarvisConversation` accepts `autoListen`; the existing mount effect gains a branch that calls
  `listen()` when no `initialQuestion` is pending. An arriving question still wins, so the two
  entry points can never fire together.

**Not done, and deliberately.** No `expo-quick-actions`, no `shortcuts.xml`, no assistant-role
registration (`VoiceInteractionService` / `ACTION_ASSIST`). Those need custom native Android code
and a config plugin, which is a genuine Codex-sized piece of work. The deep link needs no new
dependency and works in Expo Go today, so it was the smallest functional answer. If the product
later wants the long-press-power assistant gesture, that remains a Codex request.

**Validation.** `npx tsc --noEmit` clean, `npm run lint` zero warnings, `npm test` 25 suites /
185 tests, including `tests/jarvis-shortcut.test.tsx` (microphone opens on arrival, the dictated
text is sent and produces a proposal, opening the tab normally does not listen, an arriving
question takes precedence). **Not validated on a device:** the deep link has not been fired from
a real phone, and no standalone build has been produced from this session.

#### [IN-001] Reanimated needs a manual Jest mock (2026-09-13)

**What.** `__mocks__/react-native-reanimated.js` was added at the repository root.

**Why.** The redesign introduced `JarvisCore`, which uses `react-native-reanimated` 4.5.1
(already a dependency). Reanimated 4 initialises `react-native-worklets` at import time, and
that calls `loadUnpackers()` on a TurboModule that does not exist under Jest, so *any* suite
that renders a screen containing the core fails to load. The package's own
`react-native-reanimated/mock` re-enters the same import path and does not help.

Jest applies manual mocks for node_modules packages automatically when they live in
`<rootDir>/__mocks__`, so **`jest.config.js` was deliberately left untouched** — no
`setupFiles`, no `moduleNameMapper`, no change to the shared test architecture Codex owns.

**How to apply.** The shim covers the surface JARVIS actually uses: shared values,
`useAnimatedStyle`, the `with*` helpers, `Easing`, and `Animated.View`. Animations run for
real on device; tests assert rendered structure and state text, not animation timing. If you
add a Reanimated API the app depends on, add it to the shim in the same commit — a missing
export surfaces as `undefined is not a function` inside a component render.

**Note on Babel.** No `babel.config.js` exists and none is needed: `babel-preset-expo`
auto-injects `react-native-worklets/plugin` when the package is installed
(`node_modules/babel-preset-expo/build/configs/expo.js`). Do not add one to "fix" Reanimated.

#### [IN-003] Preference writes go through a ref, not the render closure (2026-09-15)

**What.** `WorkspaceProvider` now keeps `latestPreferences` in a ref and every preference writer
(`setVoicePreferences`, `setAiPreferences`, `setBackendPreferences`, `toggleSuggestions`) merges
from `latestPreferences.current` instead of the `preferences` value captured at render.

**Why.** Changing the assistant mode writes twice in one user action — the Ollama flag and the
backend flag. Both callbacks came from the same render, so the second merge started from the
pre-change object and silently reverted the first write. The bug was latent before server mode
existed; it only became reachable when two preference groups had to change together.

**How to apply.** If you add another preference writer, read from `latestPreferences.current`.
The `mutate` lock still serialises the writes, so sequential `await`s are safe.

---

#### [IN-002] Frontend visual validation is still not device-verified (2026-09-13)

The redesign passed typecheck, lint, and 146 Jest tests, and was reviewed against a
token-exact HTML approximation rendered at 390px. **That approximation is not the React Native
render** and does not validate safe areas, the keyboard, fonts, Reanimated on-device
behaviour, or the tab dock's real measurements. `DESIGN_SYNC.md` §24 still applies: visual
parity requires Expo Go on a phone. No device was available in the session that produced this
work.

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

- `disabled` should be derived from the application's existing AI-enabled
  preference/source of truth rather than inferred from connectivity.
  Codex should reuse the established preference/state mechanism instead of
  creating a second AI-enabled flag.

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
