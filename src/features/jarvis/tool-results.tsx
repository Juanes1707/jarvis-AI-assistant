import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { BackendToolResult } from "../../services/backend/client";
import { Copy, DataRow, Dot, Icon, Progress, Rail, Row, Seam } from "../../components/ui/primitives";
import { formatMoney } from "../../lib/utils/format";
import { categoryColor, theme } from "../../theme/tokens";

/**
 * Read-only renderings of what an agent actually returned. Every value here comes from the
 * backend payload; nothing is derived, estimated or filled in (DESIGN_SYNC §22). A tool this
 * file does not recognise degrades to a named row rather than a guess.
 */

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
/** Backend amounts arrive as JSON integers in minor units; only whole numbers are money. */
function money(value: unknown): string | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? formatMoney(BigInt(value)) : null;
}
function ratio(part: unknown, whole: unknown): number | null {
  if (typeof part !== "number" || typeof whole !== "number" || whole <= 0) return null;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}
/** `2026-09-14T…` or `2026-09-14` → `14 sep`. Leaves anything else untouched. */
function shortDate(value: unknown): string {
  const raw = str(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month.slice(0, 3)}` : raw;
}
function monthName(value: unknown): string {
  const match = /^(\d{4})-(\d{2})$/.exec(str(value));
  if (!match) return str(value, "este mes");
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} de ${match[1]}` : str(value, "este mes");
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return <View style={styles.block}>
    <Copy variant="marker">{label}</Copy>
    {children}
  </View>;
}

function Empty({ text }: { text: string }) {
  return <Copy variant="caption" muted>{text}</Copy>;
}

function FinancialSummary({ data }: { data: Record<string, unknown> }) {
  const available = money(data.available_minor);
  const goals = rows(data.savings_goals);
  return <Block label={`FLUJO DE CAJA · ${monthName(data.month).toLocaleUpperCase("es")}`}>
    {available ? <View style={styles.metric}>
      {/* metricSmall, not metric: inside a turn the sentence is the answer and this is its evidence. */}
      <Copy variant="metricSmall">{available}</Copy>
      <Copy variant="caption" muted>Disponible ahora</Copy>
    </View> : null}
    <View>
      <DataRow label="Ingresos del mes" value={money(data.income_minor) ?? "—"} tone="muted" />
      <DataRow label="Gastos del mes" value={money(data.expense_minor) ?? "—"} tone="muted" />
      <DataRow label="Obligaciones proyectadas" value={money(data.projected_obligations_minor) ?? "—"} tone="muted" note="Pagos mínimos con vencimiento este mes" />
      <DataRow label="Queda para gastar" value={money(data.discretionary_minor) ?? "—"}
        tone={typeof data.discretionary_minor === "number" && data.discretionary_minor < 0 ? "danger" : "accent"} />
    </View>
    {goals.length ? <View style={styles.goals}>
      <Copy variant="marker">METAS DE AHORRO</Copy>
      {goals.map((goal, index) => {
        const percent = ratio(goal.saved_minor, goal.target_minor);
        const name = str(goal.name, "Meta");
        return <View key={str(goal.id, `goal-${index}`)} style={styles.goal}>
          <Row style={styles.goalHead}>
            <Dot color={categoryColor(name)} />
            <Copy variant="body" style={styles.grow}>{name}</Copy>
            <Copy variant="metricSmall">{percent === null ? "—" : `${Math.round(percent)}%`}</Copy>
          </Row>
          <Progress value={percent ?? 0} label={`Avance de ${name}`} tone="accent" />
          <Row style={styles.goalMeta}>
            <Copy variant="caption" muted style={styles.grow}>{money(goal.saved_minor) ?? "—"} de {money(goal.target_minor) ?? "—"}</Copy>
            {goal.target_date ? <Copy variant="caption" muted>para {shortDate(goal.target_date)}</Copy> : null}
          </Row>
        </View>;
      })}
    </View> : null}
  </Block>;
}

function Liabilities({ data }: { data: Record<string, unknown> }) {
  const liabilities = rows(data.liabilities);
  return <Block label="TARJETAS Y PRÉSTAMOS">
    {liabilities.length ? liabilities.map((item, index) => {
      const name = str(item.name, "Obligación");
      const used = ratio(item.outstanding_minor, item.credit_limit_minor);
      const interest = typeof item.annual_interest_bps === "number" ? (item.annual_interest_bps / 100).toFixed(2).replace(".", ",") : null;
      return <View key={str(item.id, `liability-${index}`)} style={styles.liability}>
        {index === 0 ? null : <Seam />}
        <Row style={styles.goalHead}>
          <Icon name={item.kind === "credit_card" ? "credit-card-outline" : "bank-outline"} size={16} color={theme.colors.muted} />
          <Copy variant="body" style={styles.grow}>{name}</Copy>
          <Copy variant="metricSmall">{money(item.outstanding_minor) ?? "—"}</Copy>
        </Row>
        {used === null ? null : <Progress value={used} label={`Cupo usado de ${name}`} />}
        <Row style={styles.goalMeta}>
          <Copy variant="caption" muted style={styles.grow}>Paga {money(item.minimum_payment_minor) ?? "—"} antes del {shortDate(item.due_date)}</Copy>
          {interest ? <Copy variant="caption" muted>{interest}% E.A.</Copy> : null}
        </Row>
        {item.statement_day ? <Copy variant="caption" muted>Corte el día {String(item.statement_day)} de cada mes.</Copy> : null}
      </View>;
    }) : <Empty text="No hay tarjetas ni préstamos registrados en el servidor." />}
  </Block>;
}

function Emails({ data }: { data: Record<string, unknown> }) {
  if (data.status === "not_configured") {
    return <Block label="CORREO">
      <Empty text="El buzón todavía no está configurado en el servidor, así que no hay correos que revisar." />
    </Block>;
  }
  const messages = rows(data.messages);
  const imported = typeof data.imported === "number" ? data.imported : null;
  return <Block label="CORREOS SIN LEER">
    {messages.length ? messages.map((message, index) => {
      const urgent = message.priority === "urgent";
      const sender = str(message.sender, "Remitente desconocido");
      return <Row key={str(message.id, `email-${index}`)} style={styles.email}>
        <Rail tone={urgent ? "danger" : "muted"} />
        <View style={styles.grow}>
          <Copy variant="body" numberOfLines={2} style={styles.emailSubject}>{str(message.subject, "(Sin asunto)")}</Copy>
          <Row style={styles.goalMeta}>
            <Copy variant="caption" muted numberOfLines={1} style={styles.grow}>{sender}</Copy>
            <Copy variant="caption" muted>{shortDate(message.received_at)}</Copy>
          </Row>
        </View>
      </Row>;
    }) : <Empty text="No tienes correos sin leer." />}
    {imported === null ? null : <Copy variant="caption" muted>{imported === 0 ? "Sin mensajes nuevos en esta sincronización." : `${imported} mensaje${imported === 1 ? "" : "s"} nuevo${imported === 1 ? "" : "s"} en esta sincronización.`}</Copy>}
  </Block>;
}

const PRIORITY: Record<string, { label: string; tone: "danger" | "warning" | "muted" }> = {
  HIGH: { label: "Alta", tone: "danger" },
  MEDIUM: { label: "Media", tone: "warning" },
  LOW: { label: "Baja", tone: "muted" },
};

function Tasks({ data }: { data: Record<string, unknown> }) {
  const tasks = rows(data.tasks);
  return <Block label="PENDIENTES EN EL SERVIDOR">
    {tasks.length ? tasks.map((task, index) => {
      const priority = PRIORITY[str(task.priority, "LOW")] ?? PRIORITY.LOW;
      const done = task.status === "COMPLETED";
      return <Row key={str(task.id, `task-${index}`)} style={styles.email}>
        <Rail tone={done ? "energy" : priority.tone === "danger" ? "danger" : priority.tone === "warning" ? "warning" : "muted"} />
        <View style={styles.grow}>
          <Copy variant="body" numberOfLines={2}>{str(task.title, "Tarea")}</Copy>
          <Row style={styles.goalMeta}>
            <Copy variant="caption" muted style={styles.grow}>Prioridad {priority.label.toLocaleLowerCase("es")}</Copy>
            <Copy variant="caption" muted>{task.due_at ? `vence ${shortDate(task.due_at)}` : "sin fecha"}</Copy>
          </Row>
        </View>
      </Row>;
    }) : <Empty text="No hay pendientes registrados en el servidor." />}
  </Block>;
}

function Reminders({ data }: { data: Record<string, unknown> }) {
  const reminders = rows(data.reminders);
  return <Block label="RECORDATORIOS ACTIVOS">
    {reminders.length ? reminders.map((reminder, index) => <Row key={str(reminder.id, `reminder-${index}`)} style={styles.email}>
      <Icon name="bell-outline" size={16} color={theme.colors.warning} />
      <View style={styles.grow}>
        <Copy variant="body" numberOfLines={2}>{str(reminder.title, "Recordatorio")}</Copy>
        <Copy variant="caption" muted>Desde {shortDate(reminder.trigger_at)}</Copy>
      </View>
    </Row>) : <Empty text="Ningún recordatorio se ha activado todavía." />}
  </Block>;
}

function Unknown({ result }: { result: BackendToolResult }) {
  return <Block label="RESULTADO DE HERRAMIENTA">
    <Copy variant="caption" muted>{result.name}</Copy>
  </Block>;
}

function ToolResult({ result }: { result: BackendToolResult }) {
  const data = isRecord(result.data) ? result.data : {};
  switch (result.name) {
    case "financial_get_summary": return <FinancialSummary data={data} />;
    case "financial_list_liabilities": return <Liabilities data={data} />;
    case "secretary_list_unread_emails":
    case "secretary_sync_unread_emails": return <Emails data={data} />;
    case "secretary_list_tasks": return <Tasks data={data} />;
    case "secretary_list_due_reminders": return <Reminders data={data} />;
    default: return <Unknown result={result} />;
  }
}

/** The structured half of an agent's answer: what it looked up, laid out to be read at a glance. */
export function ToolResults({ results }: { results: BackendToolResult[] }) {
  if (!results.length) return null;
  return <View style={styles.list}>
    {results.map((result, index) => <ToolResult key={`${result.name}-${index}`} result={result} />)}
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: theme.space.lg },
  block: { gap: theme.space.sm, paddingLeft: theme.space.md, borderLeftWidth: 1, borderLeftColor: theme.colors.border },
  metric: { gap: theme.space.hair, paddingBottom: theme.space.xs },
  goals: { gap: theme.space.ms, paddingTop: theme.space.sm },
  goal: { gap: theme.space.sm },
  goalHead: { gap: theme.space.sm },
  goalMeta: { gap: theme.space.sm },
  liability: { gap: theme.space.sm, paddingTop: theme.space.sm },
  email: { alignItems: "stretch", gap: theme.space.ms, paddingVertical: theme.space.xs },
  emailSubject: { fontFamily: theme.fonts.medium },
  grow: { flex: 1 },
});
