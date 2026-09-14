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
2. Established Illuminated HUD visual system (see §6)
3. Current visible Stitch screen
4. Rendered Stitch HTML/reference
5. Legacy Machined Obsidian system (2026-09-13, graphite + crimson, matte)
6. Legacy Calm Quiet-Tech Obsidian visual system
7. Legacy global Cybernetic Neural System theme

**Stitch dropped below the native system on 2026-09-13.** The user directed a full visual
redesign away from the Calm Palette, so the Stitch captures no longer describe the current
colour, geometry, or accent behaviour. They remain accurate references for *information
architecture* — which screens exist, what each one contains, and the order of the mobile
flow — and should still be consulted for that.

**Video reference added 2026-09-14.** The user supplied
`https://www.youtube.com/watch?v=FzE-UYBe8co` (Damian Malliaros, "I Built My Own JARVIS with
Claude Code") and asked for its look. The relevant frames are around 0:55–1:15, where the
desktop build is on screen. What was taken from it: the circular HUD dial with tick rings and
sweeping arcs, luminous bloom on live elements, monospace letterspaced system labels, coloured
category dots with right-aligned counts, circular icon controls, and a pill command input.
What was **not** taken: the desktop three-pane layout and the particle graph, neither of which
survives a phone screen. The reference is a still image of someone else's product — treat it as
aesthetic direction, not as a layout to copy.

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

**Illuminated HUD** (adopted 2026-09-14, replacing Machined Obsidian)

The governing metaphor is **a lit instrument panel in a dark room**. Machined Obsidian got the
structure right but was deliberately matte, and the user reported the result read as bland. The
correction is luminosity, not more ornament: the same disciplined structure, now with light
coming out of it.

The product should feel:

- Dark, precise, instrument-like
- Alive — something is powered on and paying attention
- Calm when nothing is happening, luminous when JARVIS is actually working

### The five structural rules

1. **Seams, not cards.** Content sits directly on the field and is divided by hairline seams. A
   raised plate is reserved for things that genuinely sit above the surface: a pending
   confirmation, an AI provider status, a message the user wrote.
2. **Bevelled edges.** Any raised surface carries a lighter top border (`edge`) and darker
   remaining borders (`border`).
3. **Bloom belongs to live things only.** Glow is layered translucency (see §12b), never a
   shadow, and it appears only on elements that are genuinely active: the core's iris, the
   dial, the microphone. Static content never glows.
4. **Cyan is the system, green is activity, crimson is urgency.** One hue per job. See §8.
5. **Soft radius.** The instrument reads as machined metal *behind glass*, not as a cut part.
   See §10.

It should not feel like:

- A generic SaaS dashboard, or content chopped into identical rounded cards
- A neon cyberpunk template
- Marvel fan art or a literal Ultron recreation
- A different design system on every screen

JARVIS should visually behave as one coherent product.

---

## 7. Core Color System

Defined in `src/theme/tokens.ts`. The greys are deliberately cool and close together so they
read as different metals under one light source rather than as arbitrary greys.

| Token | Value | Role |
|---|---|---|
| `background` | `#05070c` | The blue-black field everything sits on |
| `surface` | `#0a0f18` | Primary raised plate |
| `secondary` | `#0e141f` | Secondary fill |
| `elevated` | `#131b28` | Highest plate: primary buttons, user messages |
| `border` | `#1b2735` | The seam between two plates |
| `edge` | `#27384a` | The lit top bevel of a plate |
| `text` | `#e8eef5` | Primary text |
| `muted` | `#8b9bb0` | Secondary text, instrument meters |
| `dim` | `#55657a` | Tertiary text, inactive controls |
| `accent` | `#22d3ee` | Cyan — the system speaking: markers, dial rings, structure |
| `accentSoft` | `#164e5c` | Banked cyan: switch tracks, dial core border |
| `accentWash` | `#071820` | Barely-cyan black behind a live plate |
| `energy` | `#34d399` | Green — live activity. The only colour allowed to bloom |
| `success` | `#34d399` | Same value as `energy`: completed, on target |
| `warning` | `#f5b544` | Behind target; attention but not urgency |
| `danger` | `#e5322d` | Crimson — genuine urgency only (§8) |

`theme.glow` holds the translucent bloom washes; `theme.category` holds the eight category hues
used by `Dot` and `categoryColor()`.

Retired: the Machined Obsidian graphite values (`#07080a`, `#232830`, …) and `ember`, which is
replaced by `accentSoft`. Earlier still, `blue` and `indigo` were removed outright for naming a
hue rather than a purpose.

Do not introduce new global colors when an existing token can represent the same semantic purpose.

---

## 8. Accent Discipline

Three hues, three jobs, no overlap. Domain-specific palettes (the old Dark HUD cyan and the
finance teal/green) stay retired — they were the main reason JARVIS read as several products
stitched together.

| Hue | Meaning | Where it appears |
|---|---|---|
| **Cyan** `accent` | The system speaking, and structure | Section markers, dial rings, focal rails, primary-button underline, active tab, live plate edge |
| **Green** `energy` | Something is happening right now | Core iris, dial sweep arc, microphone orb, completed items |
| **Crimson** `danger` | Genuine urgency | Deadline within 24h or overdue, over budget, failed provider check, destructive actions |

Crimson is governed by `isUrgent()` in `src/features/tasks/urgency.ts` — a deadline that has
passed or lands within a day. Nothing else may turn an element crimson. This is why a focal
task is cyan when it is merely the top priority and crimson only when it is actually about to
be late.

### Where colour must not go

- **Money is never coloured by sign.** Income green / expense red is the trading-app tell the
  product explicitly avoids. Amounts render in `text`; the sign carries the meaning. Only
  *over budget* earns crimson.
- **Progress meters default to `muted`.** `tone="accent"` marks the metric JARVIS is pushing;
  `tone="danger"` only when the deadline is urgent.
- **Icons default to `muted`.** Any colour must be passed explicitly, so it is always a decision.
- **Warning stays amber.** A grade below target is not urgent; overloading crimson would
  dilute both.
- **Category hues are for identity, not status.** `Dot` and `categoryColor()` give a subject or
  a spending category a stable hue so it is recognisable across screens. They never mean good
  or bad.

At most one crimson region should be competing for attention in a single viewport.

---

## 9. Typography

The same three families are packaged through `expo-font`, but their **roles were inverted** on
2026-09-13. Mono was previously used only for 12px labels, which is the commonest tell of a
templated technical UI. It is now the system's display voice instead.

The rule is about *who is speaking*:

| Family | Speaker | Used for |
|---|---|---|
| **JetBrains Mono** | JARVIS, as a system | Section markers, live state, the wordmark, small counters |
| **Inter** | The user's own life | All human-readable content: titles, briefing, task names, descriptions |
| **Space Grotesk** | Measured quantities | Money, grades, day numbers, percentages — instrument readouts only |

### Scale (`Copy` variants in `src/components/ui/primitives.tsx`)

| Variant | Family | Size / line |
|---|---|---|
| `metric` | Grotesk | 34 / 40 |
| `title` | Inter Medium | 22 / 29 |
| `metricSmall` | Grotesk | 20 / 26 |
| `lead` | Inter | 18 / 28 |
| `section` | Inter Medium | 17 / 24 |
| `body` | Inter | 15 / 23 |
| `marker` | Mono | 13 / 18, +0.8 tracking |
| `caption` | Inter | 13 / 19 |
| `system` | Mono | 12 / 16, +1.2 tracking |

### Uppercase is rationed

Uppercase is now reserved for **section markers and real system state** (`CEREBRO LOCAL ACTIVO`,
`HOY`, `LO PRIMERO`). It is no longer used for content categorisation, and no screen opens with
a caps badge. Never use Grotesk for prose or Mono for a paragraph.

Do not substitute unrelated font families without an explicit design decision.

---

## 10. Spacing and Geometry

The visual system follows an **8-point rhythm**, with finer steps added for machined detail.

```text
space: hair 2 · xs 4 · sm 8 · ms 12 · md 16 · lg 24 · xl 32 · xxl 48
Screen margin: 16
Bottom dock height: 72 + bottom safe-area inset
```

### Radius (revised 2026-09-14)

```text
hairline  2   rails, meters, tick marks
control  10   buttons, chips, badges
plate    16   raised surfaces, message bubbles
pill    999   the core, the dial, command inputs, circular controls
```

The 2/6/10 scale of Machined Obsidian was part of what read as severe. The reference's panels
are softly rounded and its controls are fully circular, so command inputs and icon buttons now
take the pill radius.

### Vertical rhythm

The `Section` primitive owns it, so screens do not each invent their own spacing:
**24 between sections, 12 from seam to marker to content.** Prefer spacing derived from the
established rhythm rather than arbitrary values.

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

### Project primitives — `src/components/ui/primitives.tsx`

Reuse these rather than restyling a raw `View`. Codex should reach for them when an
integration needs UI.

| Primitive | Purpose |
|---|---|
| `Copy` | All text. Variants in §9 |
| `Section` | Seam + marker + content. Owns the vertical rhythm |
| `SectionMarker` | Mono label followed by a rule running to the edge |
| `Seam` | A 1px cut between plates |
| `Plate` | Bevelled raised surface. `tone`: `default` / `live` / `alert` |
| `Rail` | The 2px vertical light. `tone`: `accent` / `muted` / `success` / `warning` |
| `DataRow` | Label left, value right; stacks into a scannable column |
| `Row` | Horizontal flex with the standard gap |
| `Dot` | Category marker. Pair with `categoryColor()` for a stable per-name hue |
| `Button` | `variant`: `primary` / `secondary` / `ghost` / `danger` |
| `OrbButton` | Circular icon control. `tone`: `muted` / `energy` / `accent`; glows when not muted |
| `Progress` | Instrument meter. `tone`: `default` / `accent` / `danger` |
| `Badge` | Bordered mono tag. Used only for real system status |
| `Icon` | Defaults to `muted`; any colour must be explicit |

Layout and identity live alongside them: `Screen` and `SystemBar`
(`src/components/layout/`), `Boot` for the pre-workspace states, `JarvisCore`
(`src/components/jarvis/core.tsx`) for the compact indicator, and `JarvisDial`
(`src/components/jarvis/dial.tsx`) for the hero instrument.

The `secondary` boolean on `Button` was replaced by `variant`, and `Card` / `SectionTitle`
were replaced by `Plate` / `SectionMarker`.

---

## 12b. Motion, Bloom, and the JARVIS Instruments

Motion lives in exactly two components — `JarvisCore` (compact) and `JarvisDial` (hero). Nothing
else in the product animates. Concentrating motion is deliberate: scattered entrance fades and
hover transitions are what make an interface read as generated.

### Bloom

Glow is built from **layered translucent Views**, never from `shadow*` or `elevation`. Android
elevation shadows cannot be tinted, and `boxShadow` support varies by architecture; stacked
translucent circles render identically everywhere and cost nothing. The washes live in
`theme.glow`.

### The dial

`JarvisDial` is the product's hero object and the piece taken most directly from the user's
video reference: concentric tick rings, a green arc sweeping the outer track, a counter-rotating
cyan arc, and a labelled core. Tick rings are plain Views placed polar-style with
`transform: [{ rotate }, { translateY }]`, which is why the project still needs no SVG
dependency. It appears as the empty state of the JARVIS tab and yields the space to the
conversation as soon as there are messages.

The shell never moves. Only the light inside it does.

| State | Core | Dial | Real source |
|---|---|---|---|
| `idle` | Slow 4.2s breath | 9s arc sweep, slow bloom | Local brain enabled, nothing in flight |
| `listening` | 1.1s breath plus expanding ring | 2.6s sweep, 1.1s bloom | Speech recognition active |
| `thinking` | Rotating top arc | 1.4s sweep | Ollama request in flight, or a write being saved |
| `speaking` | 620ms breath | 2s sweep, 620ms bloom | `expo-speech` is speaking |
| `offline` | No motion, iris drops to `dim` | No motion, rings drop to `border`, bloom removed | Local brain off, or an availability check failed |

Rules:

- Transform and opacity only, so everything stays on the GPU.
- `useReducedMotion()` is honoured; the core falls still rather than degrading.
- **Every state must map to real application state.** Per §22, the core must never animate to
  look busy. A worked example: the dock's core reflects only whether the local brain is
  switched on — it deliberately does *not* show `listening` when its tab is focused, because
  focus is not listening.
- The same component appears in the chat header, the tab dock, and the boot screen, so JARVIS's
  real state is legible from anywhere in the product.

Animations are implemented with `react-native-reanimated`, which is already a dependency and
is auto-configured by `babel-preset-expo` (no `babel.config.js` is required). See the
Integration Note in `docs/AI_HANDOFF.md` about its Jest manual mock.

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

Current presentation (2026-09-14): the dock sits on `surface` with a lit top edge. The active
tab is marked by a 2px cyan bar above its icon and a brightening to `text` — the tint no
longer swaps to an accent hue. Labels are Mono 11 in sentence case. The centre tab renders the
live `JarvisCore` rather than a static icon, which is what makes the assistant's state visible
from every screen.

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

Every row below was rebuilt in Machined Obsidian on 2026-09-13. The Stitch IDs are retained for
information-architecture reference only; their colour and geometry no longer apply (§4).

| Stitch Screen | Stitch ID | Expo Router Route | Main Native Elements | Current Design/Implementation Status |
|---|---|---|---|---|
| Dashboard Principal | `72d186dee5c244adac6567b0cc7938d6` | `/(tabs)/index` | SystemBar, briefing lead, CommandBar, PriorityFocus, AgendaList, DataRow money column, HabitsCard | Redesigned: briefing is the typographic hero, one railed focal task, sections replace stacked cards. Phone comparison pending |
| Task Manager | `fcc12e43abef47458c5d6764a765f913` | `/(tabs)/tasks`, `/tasks/new`, `/tasks/[id]`, `/tasks/edit/[id]` | Memoised FlatList rows, underlined filters, TaskEditor, ProgressEditor | Redesigned: pressable railed rows replace per-item cards and buttons; rail tone encodes focal/normal/done. Phone comparison pending |
| Calendario Semanal | `fb4b8af9daef4453b42e02c3f74c7eda` | `/(tabs)/calendar` | Week strip, AgendaList, projected deadlines | Redesigned: 7-day strip with per-day busy/deadline marks replaces prev/next buttons. Week optimisation work still remains |
| Chat y Asistente IA | `b580f7623c404ce6918929f12c756cf3` | `/(tabs)/jarvis` | JarvisCore header, railed assistant turns, raised user turns, live proposal plate, composer | Redesigned: assistant messages are railed text on the substrate rather than bubbles; voice is the primary composer action. Device voice validation still pending |
| University Hub | `2a615b1a20a948ab8ae70688f9f801c1` | `/university` | Grade metric, railed subject list | Redesigned: rail tone reflects grade against target |
| Detalle de Materia | `c3322a3bd24e48bd8a378b81e1ac5623` | `/university/subjects/[id]` planned | Topics, assessments, materials | Planned |
| Finanzas Personales | `164d8eaf8b3841fe9959b95894f4c321` | `/finances` | Balance metric, budget meter, movement rows | Redesigned: amounts are never coloured by sign (§8); editing/goals remain |
| Perfil — no dedicated Stitch reference | N/A | `/(tabs)/profile` | Identity block, behaviour toggle, nav rows, live system readout | Redesigned as a JARVIS console rather than a settings page |

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