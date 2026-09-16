import { StyleSheet, View } from "react-native";
import type { BackendRoute, BackendToolResult } from "../../services/backend/client";
import { Copy, Dot, Icon, Rail, Row } from "../../components/ui/primitives";
import { theme } from "../../theme/tokens";
import { agentPresentation } from "./agents";
import { ToolResults } from "./tool-results";

export type TranscriptMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** True when the text came from dictation, so the user can see what JARVIS actually heard. */
  dictated?: boolean;
  /** Which agent the orchestrator routed to. Absent for answers that never left the phone. */
  route?: BackendRoute;
  tools?: BackendToolResult[];
};

/** Who answered. Two dots means the orchestrator combined both specialists in one reply. */
function AgentTag({ route }: { route: BackendRoute }) {
  const agent = agentPresentation(route);
  return <Row style={styles.tag}>
    {agent.hues.map(hue => <Dot key={hue} color={hue} size={6} />)}
    <Copy variant="system" style={styles.tagLabel}>{agent.label.toLocaleUpperCase("es")}</Copy>
  </Row>;
}

function UserTurn({ message }: { message: TranscriptMessage }) {
  return <View style={styles.userTurn}>
    {message.dictated ? <Row style={styles.dictated}>
      <Icon name="microphone" size={12} color={theme.colors.dim} />
      <Copy variant="system" style={styles.dictatedLabel}>DICTADO</Copy>
    </Row> : null}
    <Copy selectable accessibilityLabel={`Tú: ${message.text}`}>{message.text}</Copy>
  </View>;
}

function AssistantTurn({ message, offline }: { message: TranscriptMessage; offline: boolean }) {
  return <Row style={styles.assistantTurn}>
    <Rail tone={offline ? "muted" : "accent"} />
    <View style={styles.grow}>
      {message.route ? <AgentTag route={message.route} /> : null}
      <Copy selectable accessibilityLabel={`JARVIS: ${message.text}`}>{message.text}</Copy>
      {message.tools?.length ? <View style={styles.tools}><ToolResults results={message.tools} /></View> : null}
    </View>
  </Row>;
}

/** The conversation itself: what you said, what JARVIS answered, and what it looked up to answer. */
export function Transcript({ messages, offline }: { messages: TranscriptMessage[]; offline: boolean }) {
  return <>{messages.map(message => message.role === "user"
    ? <UserTurn key={message.id} message={message} />
    : <AssistantTurn key={message.id} message={message} offline={offline} />)}</>;
}

const styles = StyleSheet.create({
  userTurn: {
    alignSelf: "flex-end", maxWidth: "85%", gap: theme.space.xs,
    paddingHorizontal: theme.space.ms, paddingVertical: theme.space.sm,
    backgroundColor: theme.colors.elevated, borderRadius: theme.radius.plate,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  dictated: { gap: theme.space.xs },
  dictatedLabel: { color: theme.colors.dim, fontSize: 10, letterSpacing: 1.4 },
  assistantTurn: { alignItems: "stretch", gap: theme.space.ms, paddingRight: theme.space.lg },
  tag: { gap: theme.space.xs, paddingBottom: theme.space.hair },
  tagLabel: { color: theme.colors.muted },
  tools: { paddingTop: theme.space.ms },
  grow: { flex: 1, gap: theme.space.xs },
});
