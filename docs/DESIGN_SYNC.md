# JARVIS — Design Sync

## 1. Purpose

This document is the canonical reference for the **JARVIS visual language, design system, and Stitch-to-React-Native synchronization**.

It defines:

- The established visual identity
- Design-source precedence
- Stitch references
- Design tokens
- Typography
- Spacing and layout rules
- Mobile adaptation rules
- Domain-specific visual variants
- Screen-to-implementation mapping
- Visual integration constraints

It is not the primary project progress log.

Detailed implementation progress, validation status, phase tracking, and technical TODOs should normally live in:

`docs/IMPLEMENTATION_PLAN.md`

Cross-agent design/system dependencies should be coordinated through:

`docs/AI_HANDOFF.md`

---

## 2. Ownership and Usage

Claude Code is the primary owner of the frontend visual and product system documented here.

Claude Code normally owns changes to:

- Visual identity
- Design tokens
- Typography system
- Spacing system
- Component visual language
- Screen composition
- Interaction design
- Animation language
- Micro-interactions
- Accessibility presentation
- Major user-facing navigation presentation

Codex must preserve this design system when making frontend integration changes.

Codex may make small frontend changes when necessary to integrate:

- Services
- APIs
- Authentication
- System state
- Persistence
- AI behavior
- Voice behavior
- Navigation guards
- Other Codex-owned system functionality

When doing so, Codex should reuse existing:

- Tokens
- Components
- Typography
- Spacing
- Interaction patterns
- Visual states

Codex must not introduce a parallel visual system merely to simplify an integration.

If a system requirement requires a meaningful visual, interaction, UX, or product-design change, Codex should create a request in:

`docs/AI_HANDOFF.md`

under:

`Codex → Claude Code Requests`

---

## 3. Design Source of Truth

The original design reference is:

**JARVIS Student Command Center**

Stitch project:

`https://stitch.withgoogle.com/projects/11174925214121356476`

Project ID:

`11174925214121356476`

The `google_stitch` MCP was consulted again during the mobile migration on September 8, 2026.

The Stitch project itself was not modified during that migration.

---

## 4. Design Precedence

When visual references disagree, use the following precedence:

1. Explicit current user instruction
2. Current visible Stitch screen
3. Rendered Stitch HTML/reference
4. Established Calm Quiet-Tech Obsidian visual system
5. Legacy global Cybernetic Neural System theme

Do not infer design chronology from Stitch API ordering.

Historical or hidden Stitch screens are references only unless explicitly restored by the user.

Do not allow an older hidden design to override a current visible design merely because it appears later in an API response or local file list.

When an implementation differs from the current reference, inspect:

- Current Stitch reference
- Saved screenshots
- Rendered HTML reference
- `src/theme/tokens.ts`
- Existing reusable components

before creating a new visual pattern.

---

## 5. Stored Stitch Evidence

The synchronized design evidence is stored under the project documentation.

Relevant sources include:

- `docs/stitch/html`
- `docs/stitch/screenshots`
- `project.json`
- `all-screens.json`
- `design-systems.json`

The project contains 14 MOBILE Stitch screen records:

- 7 current/visible references
- 7 historical/hidden references

The original captures use approximately **780 px width representing 390 mobile points**.

Stitch HTML is a visual/reference source only.

Do not reproduce web/DOM implementation patterns directly in React Native.

The native implementation should use React Native primitives and the existing Expo stack.

---

## 6. Core Visual Identity

The primary JARVIS design language is:

**Calm Quiet-Tech Obsidian**

The product should feel:

- Calm
- Focused
- Technical
- Intelligent
- Dark
- Precise
- Modern
- Deliberate

It should not feel like:

- A generic SaaS dashboard
- A neon cyberpunk template
- A collection of unrelated cards
- A desktop interface compressed into a phone
- A different design system on every screen

JARVIS should visually behave as one coherent product.

---

## 7. Core Color System

### Canvas

```text
#0a0e16
```

### Surfaces

```text
#151922
#181c24
#1f2430
```

### Primary text

```text
#dfe2ee
```

### Secondary text

```text
#94a3b8
```

### Calm accents

```text
#7dd3fc
#38bdf8
#93c5fd
```

### Indigo

```text
#6366f1
```

### Success

```text
#86efac
```

### Coral / warning-critical accent

```text
#fca5a5
```

### Amber

```text
#fcd34d
```

Do not introduce new global colors when an existing token can represent the same semantic purpose.

---

## 8. Domain Visual Variants

JARVIS shares one common visual foundation, but selected domains may use controlled specialization.

### Calm Foundation

Used as the common visual foundation across the product.

Primary accents include:

```text
#7dd3fc
#38bdf8
#93c5fd
```

---

### Dark HUD — University / JARVIS Chat

Dark HUD surfaces may use:

```text
#0b0f17
```

with cyan accent:

```text
#67e8f9
```

This variant should remain compatible with the common JARVIS token system.

It is a specialization of the product identity, not a separate design system.

---

### Finance Variant

Finance-specific accents may use:

```text
#00daf3
#4edea3
```

The finance domain should still inherit the shared Calm foundation.

Do not introduce an independent finance component library or unrelated token system.

---

## 9. Typography

The established type system is:

### Body

**Inter**

### Titles / Display

**Space Grotesk**

### Numeric / Technical Data

**JetBrains Mono**

The corresponding TTF assets are packaged for use through `expo-font`.

Use typography semantically and consistently.

Do not substitute unrelated font families without an explicit design decision.

---

## 10. Spacing and Geometry

The visual system follows an **8-point rhythm**.

Established values include:

```text
Base rhythm: 8
Screen margin: 16
Common spacing: 16–24
Card radius: 16
Control radius: 12
Bottom dock height: 72 + bottom safe-area inset
```

Prefer spacing derived from the established rhythm rather than arbitrary values.

Avoid accumulating near-identical spacing constants across individual screens.

Where practical, shared spacing should come from the common token system.

---

## 11. Design Tokens

The primary native design-token source is:

`src/theme/tokens.ts`

Before introducing:

- New colors
- New radii
- New spacing values
- New typography definitions
- New elevation/shadow conventions
- New domain-level visual constants

inspect the existing tokens first.

Prefer extending the existing token system over creating local parallel constants.

Changes that materially alter the global design system should normally be handled by Claude Code.

---

## 12. Native Component Foundation

JARVIS is a React Native / Expo mobile application.

Use native React Native primitives and established project components.

Typical primitives include:

- `View`
- `Text`
- `Pressable`
- `ScrollView`
- `FlatList`
- `TextInput`

Do not port Stitch DOM structures literally.

Avoid introducing web-only layout assumptions.

Reusable project components should be preferred over rebuilding equivalent visual primitives independently.

---

## 13. Mobile Adaptation

The mobile information flow follows a vertical hierarchy approximately structured as:

1. Greeting
2. Command
3. Briefing
4. Priority
5. Agenda
6. University
7. Finances
8. Habits
9. Upcoming events
10. Alerts
11. Suggestions

This order represents the current mobile product direction and may evolve through explicit product-design decisions.

The app should not reproduce desktop sidebar layouts.

---

## 14. Primary Navigation

The mobile application uses a five-tab bottom dock with JARVIS visually elevated at the center.

The dock should:

- Respect the bottom safe-area inset
- Preserve the established visual hierarchy
- Remain touch-accessible
- Avoid desktop-navigation patterns
- Preserve the central importance of JARVIS

Claude Code owns meaningful changes to the user-facing navigation presentation.

System-level navigation behavior remains governed by the ownership rules in `CLAUDE.md`, `AGENTS.md`, and `docs/AI_HANDOFF.md`.

---

## 15. Mobile Interaction Requirements

Frontend implementation should account for:

- `SafeAreaProvider`
- `SafeAreaView`
- Keyboard behavior
- Native modals where appropriate
- Scalable text
- Long-content wrapping
- Scrolling
- Virtualized lists
- Accessible controls

Established minimum interactive-control sizing is approximately:

```text
48 points
```

Established small-label sizing includes approximately:

```text
12 points
```

Content should adapt to mobile constraints instead of shrinking desktop layouts.

---

## 16. Current Screen Mapping

| Stitch Screen | Stitch ID | Expo Router Route | Main Native Elements | Current Design/Implementation Status |
|---|---|---|---|---|
| Dashboard Principal — Calm Palette | `72d186dee5c244adac6567b0cc7938d6` | `/(tabs)/index` | Brand, CommandBar, HomeScreen, ProgressEditor, AgendaList, HabitsCard | Initial native port; phone visual comparison still required |
| Task Manager — Calm Palette | `fcc12e43abef47458c5d6764a765f913` | `/(tabs)/tasks`, `/tasks/new`, `/tasks/[id]`, `/tasks/edit/[id]` | FlatList, filters, TaskEditor, ProgressEditor, priority detail | Core create/edit/reschedule/start/complete/delete flows implemented; phone visual comparison pending |
| Calendario Semanal — Calm Palette | `fb4b8af9daef4453b42e02c3f74c7eda` | `/(tabs)/calendar` | Daily navigation, AgendaList, projected deadlines | Daily view connected to tasks; week/optimization work remains |
| Chat y Asistente IA — Dark HUD Edition | `b580f7623c404ce6918929f12c756cf3` | `/(tabs)/jarvis` | Orb, messages, fixed composer, microphone, spoken responses, confirmation card | Local commands and session conversation available; device voice validation pending |
| University Hub — Dark HUD Edition | `2a615b1a20a948ab8ae70688f9f801c1` | `/university` | Metrics and subject list | Initial native summary |
| Detalle de Materia — Calm Palette | `c3322a3bd24e48bd8a378b81e1ac5623` | `/university/subjects/[id]` planned | Topics, assessments, materials | Planned |
| Finanzas Personales — Dark HUD Edition | `164d8eaf8b3841fe9959b95894f4c321` | `/finances` | Balance, budget, transactions | Calculated/read state available; editing/goals remain |
| Perfil — no dedicated Stitch reference | N/A | `/(tabs)/profile` | Demo profile, preference switches | Native foundation derived from common theme |

Detailed implementation progress belongs in:

`docs/IMPLEMENTATION_PLAN.md`

This table exists primarily to map visual references to native implementation.

---

## 17. Historical Stitch References

The following screen IDs are historical references and should not override current visible designs unless explicitly requested.

### Dashboard

```text
9a1201abd8e14a249890eeaaa2930636
```

### University

```text
cecbbd4dc366448b95f844fbf13d91f8
```

### Subject Detail

```text
9939f72eadb24a029e3003b71836c555
```

### Tasks

```text
aa54a6238df94e1f88c724e885a55e5a
```

### Calendar

```text
39fb9404c64e44dfbb3248b5bc52d5c3
```

### Chat

```text
290785ba2fdf4712a2f6e5182edb0fc8
```

### Finances

```text
f9d4ac55ec9e4a8ab3ffac775dbe8ccf
```

These references may help explain previous design decisions but are not current source-of-truth screens.

---

## 18. JARVIS Chat Design

The current JARVIS chat reference was re-inspected through `get_screen` using the `google_stitch` MCP.

The current composition preserves:

- Header with orb
- User messages aligned toward the right
- Assistant cards
- Blue/cyan accent language
- Quick actions
- Fixed lower composer
- Microphone interaction

Voice/system states such as:

- Listening
- Speaking
- Saving

should correspond to real application state.

Do not display fabricated system telemetry merely for visual effect.

Examples of information that should not be invented include:

- Fake synchronization status
- Fake latency
- Fake model confidence
- Fake AI-model identity
- Fake processing state

The UI should communicate real system behavior.

---

## 19. Confirmation Patterns

Actions with meaningful persistent consequences should expose an appropriate confirmation state when required by the product flow.

The current JARVIS confirmation pattern may display relevant information such as:

- Amount
- Date
- Task
- Habit

before persistence occurs.

Frontend presentation is owned by Claude Code.

Persistence behavior and business rules remain Codex-owned.

If the confirmation contract changes, coordinate it through:

`docs/AI_HANDOFF.md`

when both agents are affected.

---

## 20. Voice UI

Voice-related UI must use:

- Existing tokens
- Native controls
- Existing design language
- Real system state

Voice UI should not be directly coupled to internal speech-service implementation details.

Codex should expose stable system states/interfaces.

Claude Code should present those states through the established JARVIS visual language.

Cross-boundary changes should use `docs/AI_HANDOFF.md`.

---

## 21. Task Manager Design

The Task Manager reference was re-inspected through `get_screen` using the `google_stitch` MCP.

The native implementation should preserve the current design characteristics:

- Horizontal filters
- Vertical task cards
- Subject labels
- Priority indicators
- Progress representation
- Calm Palette visual language

Task forms and task detail should reuse the shared theme.

Native date selection should remain native where appropriate.

Do not display decorative Stitch functionality as though it were implemented application behavior.

Examples include unsupported:

- AI actions
- Pomodoro actions
- Decorative weighting/optimization behavior

unless the corresponding system functionality actually exists.

---

## 22. Data and System Truthfulness

Visual design must not imply capabilities that the application does not actually provide.

Do not fabricate:

- AI capabilities
- AI provider state
- Synchronization state
- Latency
- Confidence scores
- Financial calculations
- Academic optimization
- Persistence
- Voice state
- Automation behavior

Demo or local-only data should be clearly distinguishable when relevant.

The UI should reflect real application state whenever the corresponding functionality exists.

System truth comes from Codex-owned logic and contracts.

Visual representation comes from Claude-owned frontend behavior.

---

## 23. Date and Local Context

Current summaries and commands use the real date for Bogotá where implemented.

Frontend displays should consume the established system/date behavior rather than implementing an independent competing date model.

If date/time behavior becomes a cross-agent contract, document it in:

`docs/AI_HANDOFF.md`

---

## 24. Visual Validation

Historical web prototype screenshots do not validate the current React Native mobile implementation.

Native visual validation should compare the rendered mobile implementation against:

1. Current visible Stitch reference
2. Saved current screenshots
3. Established design tokens
4. Current mobile adaptation rules
5. Existing reusable components

Visual comparison should ultimately occur on an actual mobile-sized render or device.

A successful TypeScript build alone does not establish visual parity.

---

## 25. Technical Validation Ownership

Design synchronization and technical validation are separate concerns.

This document defines the expected visual result.

Detailed records for:

- Type checking
- Lint
- Jest
- Android export/build
- iOS export/build
- Metro state
- Runtime validation

should be tracked in:

`docs/IMPLEMENTATION_PLAN.md`

or the relevant technical documentation.

Claude Code should report frontend validation it actually performed.

Codex should report system validation it actually performed.

Neither agent should claim validation that was not run.

---

## 26. Updating This Document

Update `docs/DESIGN_SYNC.md` when:

- The user explicitly changes the JARVIS visual direction
- A current Stitch design becomes the new reference
- Global design tokens change
- Typography changes
- The spacing system changes
- A domain visual variant changes materially
- Navigation presentation changes materially
- A new canonical screen reference is introduced
- A major visual pattern becomes part of the design system

Do not update this document for every minor implementation detail.

Routine implementation progress belongs in:

`docs/IMPLEMENTATION_PLAN.md`

Cross-agent integration requirements belong in:

`docs/AI_HANDOFF.md`

---

## 27. Change Safety

Before modifying the established visual system:

1. Inspect the current implementation.
2. Inspect `src/theme/tokens.ts`.
3. Inspect reusable components.
4. Inspect the current Stitch reference when relevant.
5. Check for relevant Shared Decisions or Active Contracts in `docs/AI_HANDOFF.md`.
6. Determine whether the requested change is local or system-wide.

Avoid:

- Parallel token systems
- Duplicate visual primitives
- Uncoordinated global restyling
- Replacing established patterns without a reason
- Large visual rewrites during unrelated integration work

---

## 28. Core Principle

JARVIS should remain one coherent mobile product even though multiple agents contribute to its implementation.

Claude Code owns how JARVIS is visually and interactively expressed.

Codex owns the underlying system behavior that the interface represents.

`docs/DESIGN_SYNC.md` defines the visual truth.

`docs/AI_HANDOFF.md` coordinates changes that cross the frontend/system boundary.

`CLAUDE.md` defines Claude Code's working responsibilities.

`AGENTS.md` defines Codex's working responsibilities.

The implementation should preserve all four roles without creating competing architectures, contracts, or design systems.