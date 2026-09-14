// JARVIS "Illuminated HUD": deep blue-black field, cyan system light, green energy that blooms,
// crimson held back for genuine urgency. See docs/DESIGN_SYNC.md.
export const theme = {
  colors: {
    // Field and panels, darkest to lightest.
    background: "#05070c", surface: "#0a0f18", secondary: "#0e141f", elevated: "#131b28",
    border: "#1b2735", edge: "#27384a",
    text: "#e8eef5", muted: "#8b9bb0", dim: "#55657a",
    // Cyan is the system speaking: markers, dial rings, structure.
    accent: "#22d3ee", accentSoft: "#164e5c", accentWash: "#071820",
    // Green is live activity. It is the only colour allowed to bloom.
    energy: "#34d399", energyWash: "#06201a", success: "#34d399",
    // Crimson means urgency, never decoration.
    danger: "#e5322d", dangerWash: "#1a0a0b", warning: "#f5b544",
  },
  // Bloom is layered translucency, not a shadow: identical on iOS and Android.
  glow: {
    accent: "rgba(34,211,238,0.16)", accentFaint: "rgba(34,211,238,0.07)",
    energy: "rgba(52,211,153,0.22)", energyFaint: "rgba(52,211,153,0.09)",
    danger: "rgba(229,50,45,0.18)",
  },
  // Category hues encode kind, the way the reference colour-codes its node types.
  category: ["#38bdf8", "#f5b544", "#34d399", "#a78bfa", "#f472b6", "#22d3ee", "#fb923c", "#8b9bb0"] as const,
  fonts: { body: "Inter_400Regular", medium: "Inter_500Medium", display: "SpaceGrotesk_600SemiBold", mono: "JetBrainsMono_500Medium" },
  space: { hair: 2, xs: 4, sm: 8, ms: 12, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { hairline: 2, control: 10, plate: 16, pill: 999 },
  motion: { fast: 140, base: 240, slow: 420, breath: 4200 },
  touchTarget: 48,
} as const;

/** Stable colour for a category name, so the same subject keeps its hue everywhere. */
export function categoryColor(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return theme.category[hash % theme.category.length];
}
