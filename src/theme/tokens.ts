export const theme = {
  colors: {
    background: "#0a0e16", surface: "#151922", secondary: "#181c24", elevated: "#1f2430",
    text: "#dfe2ee", muted: "#94a3b8", accent: "#7dd3fc", blue: "#38bdf8",
    indigo: "#6366f1", success: "#86efac", danger: "#fca5a5", warning: "#fcd34d",
    border: "rgba(148,163,184,0.16)", accentWash: "#122534", dangerWash: "#261c29",
  },
  fonts: { body: "Inter_400Regular", medium: "Inter_500Medium", heading: "SpaceGrotesk_600SemiBold", mono: "JetBrainsMono_500Medium" },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { control: 12, card: 16, pill: 999 },
  touchTarget: 48,
} as const;
