import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../components/layout/screen";
import { Button, Copy, DataRow, Dot, Icon, Progress, Rail, Row, Section, Seam } from "../components/ui/primitives";
import { useWorkspace } from "../services/storage/workspace-provider";
import { categoryLabel } from "../features/finances/categories";
import { formatDate, formatMoney } from "../lib/utils/format";
import { categoryColor, theme } from "../theme/tokens";

/** Amounts are never coloured by sign (DESIGN_SYNC §8); the two meters carry the comparison. */
function FlowMeter({ label, amount, share }: { label: string; amount: bigint; share: number }) {
  return <View style={styles.flow}>
    <Row style={styles.flowHead}>
      <Copy variant="body" style={styles.grow}>{label}</Copy>
      <Copy variant="metricSmall">{formatMoney(amount)}</Copy>
    </Row>
    <Progress value={share} label={`${label} del mes`} />
  </View>;
}

export default function FinancesScreen() {
  const { data, dashboard: { finance } } = useWorkspace();
  const movements = useMemo(() => [...data.transactions].sort((a, b) => +b.occurredAt - +a.occurredAt), [data.transactions]);
  const overspentBy = finance.remaining !== null && finance.remaining < 0n ? -finance.remaining : null;
  const overspent = overspentBy !== null;
  const used = finance.budget !== null && finance.budget > 0n ? Number(finance.spent * 100n / finance.budget) : null;

  const peak = finance.income > finance.spent ? finance.income : finance.spent;
  const share = (amount: bigint) => peak > 0n ? Number(amount * 100n / peak) : 0;
  const net = finance.income - finance.spent;

  // Presentation-only grouping of movements already loaded; the ledger itself is untouched.
  const categories = useMemo(() => {
    const totals = new Map<string, bigint>();
    for (const transaction of data.transactions) {
      if (transaction.type !== "EXPENSE") continue;
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0n) + transaction.amountMinor);
    }
    const ranked = [...totals.entries()].sort((a, b) => a[1] === b[1] ? 0 : a[1] < b[1] ? 1 : -1);
    const largest = ranked[0]?.[1] ?? 0n;
    return ranked.map(([slug, amount]) => ({
      slug,
      label: categoryLabel(slug),
      amount,
      share: largest > 0n ? Number(amount * 100n / largest) : 0,
    }));
  }, [data.transactions]);

  return <Screen title="Finanzas" subtitle="Registros locales en pesos colombianos." back>
    <View style={styles.balance}>
      <Copy variant="metric">{formatMoney(finance.balance)}</Copy>
      <Copy variant="caption" muted>Saldo disponible</Copy>
    </View>

    <Section label="FLUJO DE CAJA">
      <FlowMeter label="Ingresos" amount={finance.income} share={share(finance.income)} />
      <FlowMeter label="Gastos" amount={finance.spent} share={share(finance.spent)} />
      <Seam />
      <DataRow label="Balance del mes" note={net < 0n ? "Gastaste más de lo que entró" : "Entró más de lo que gastaste"}
        value={`${net < 0n ? "−" : "+"}${formatMoney(net < 0n ? -net : net)}`} />
    </Section>

    <Section label="PRESUPUESTO">
      <DataRow label="Presupuesto del mes" value={finance.budget === null ? "Sin definir" : formatMoney(finance.budget)} tone="muted" />
      {used === null ? null : <View style={styles.budget}>
        <Progress value={used} label="Presupuesto consumido" tone={overspent ? "danger" : "default"} />
        <Copy variant="caption" muted>{used}% del presupuesto consumido.</Copy>
      </View>}
      {overspentBy === null
        ? <DataRow label="Puedes gastar por día" note="Desde hoy hasta fin de mes" value={finance.daily === null ? "—" : formatMoney(finance.daily)} />
        : <Row style={styles.warn}>
          <Rail tone="danger" />
          <Copy variant="caption" style={styles.warnText}>Superaste el presupuesto en {formatMoney(overspentBy)}.</Copy>
        </Row>}
    </Section>

    {categories.length ? <Section label="EN QUÉ SE VA">
      <View style={styles.categories}>{categories.map(category => <View key={category.slug} style={styles.categoryBlock}>
        <Row style={styles.flowHead}>
          <Dot color={categoryColor(category.label)} />
          <Copy variant="body" style={styles.grow}>{category.label}</Copy>
          <Copy variant="metricSmall">{formatMoney(category.amount)}</Copy>
        </Row>
        <Progress value={category.share} label={`Gasto en ${category.label}`} />
      </View>)}</View>
    </Section> : null}

    <Section label="MOVIMIENTOS">
      <View>{movements.map((transaction, index) => <View key={transaction.id}>
        {index === 0 ? null : <Seam />}
        <Row style={styles.movement}>
          <Dot color={categoryColor(categoryLabel(transaction.category))} />
          <View style={styles.grow}>
            <Copy variant="body">{transaction.title}</Copy>
            <Row style={styles.movementMeta}>
              <Copy variant="caption" muted>{formatDate(transaction.occurredAt)}</Copy>
              <Copy variant="caption" style={styles.category}>{categoryLabel(transaction.category)}</Copy>
            </Row>
          </View>
          <Copy variant="metricSmall">{transaction.type === "EXPENSE" ? "−" : "+"}{formatMoney(transaction.amountMinor)}</Copy>
        </Row>
      </View>)}</View>
    </Section>

    <Section label="EN EL SERVIDOR">
      <Row style={styles.pointer}>
        <Icon name="server-network" size={18} color={theme.colors.muted} />
        <Copy variant="caption" muted style={styles.grow}>
          Las tarjetas, los préstamos, las metas de ahorro y los cobros que llegan solos desde tu banco los lleva el servidor JARVIS. Pregúntaselos desde la conversación.
        </Copy>
      </Row>
      <Button label="Abrir JARVIS" variant="secondary" icon="message-outline" onPress={() => router.navigate("/jarvis")} />
    </Section>
  </Screen>;
}

const styles = StyleSheet.create({
  balance: { gap: theme.space.xs },
  flow: { gap: theme.space.sm },
  flowHead: { gap: theme.space.sm },
  budget: { gap: theme.space.sm, paddingTop: theme.space.sm },
  warn: { alignItems: "stretch", gap: theme.space.ms },
  warnText: { color: theme.colors.danger, flex: 1 },
  categories: { gap: theme.space.ms },
  categoryBlock: { gap: theme.space.sm },
  category: { color: theme.colors.dim },
  movement: { minHeight: 52, gap: theme.space.md },
  movementMeta: { gap: theme.space.sm },
  pointer: { alignItems: "flex-start", gap: theme.space.ms },
  grow: { flex: 1 },
});
