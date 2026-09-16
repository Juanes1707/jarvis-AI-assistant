import type { BackendRoute } from "../../services/backend/client";
import type { IconName } from "../../components/ui/primitives";
import { theme } from "../../theme/tokens";

/**
 * Who answered. The orchestrator delegates to one specialist or combines both, and the workshop
 * architecture is only legible if the interface says which one did the work.
 *
 * These are identity hues from `theme.category` (DESIGN_SYNC §8): they name an agent, never a
 * status. Cyan, green and crimson stay reserved for system / activity / urgency.
 */
export type AgentPresentation = { label: string; icon: IconName; hues: string[] };

const SKY = theme.category[0];
const VIOLET = theme.category[3];
const GREY = theme.category[7];

export const AGENTS: Record<BackendRoute, AgentPresentation> = {
  orchestrator: { label: "Orquestador", icon: "sitemap-outline", hues: [GREY] },
  secretary: { label: "Secretaría", icon: "briefcase-outline", hues: [SKY] },
  financial: { label: "Finanzas", icon: "wallet-outline", hues: [VIOLET] },
  composite: { label: "Secretaría y Finanzas", icon: "sitemap-outline", hues: [SKY, VIOLET] },
};

export function agentPresentation(route: BackendRoute | undefined): AgentPresentation {
  return route ? AGENTS[route] ?? AGENTS.orchestrator : AGENTS.orchestrator;
}
