import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../components/layout/screen";
import { Copy, DataRow, Dot, Progress, Rail, Row, Section, Seam } from "../components/ui/primitives";
import { useWorkspace } from "../services/storage/workspace-provider";
import { formatDate, formatMoney } from "../lib/utils/format";
import { categoryColor, theme } from "../theme/tokens";

export default function FinancesScreen() {
  const { data, dashboard: { finance } } = useWorkspace();
  const movements = useMemo(() => [...data.transactions].sort((a, b) => +b.occurredAt - +a.occurredAt), [data.transactions]);
  const overspentBy = finance.remaining !== null && finance.remaining < 0n ? -finance.remaining : null;
  const overspent = overspentBy !== null;
  const used = finance.budget !== null && finance.budget > 0n ? Number(finance.spent * 100n / finance.budget) : null;

  return <Screen title="Finanzas" subtitle="Registros locales en pesos colombianos." back>
    <View style={styles.balance}>
      <Copy variant="metric">{formatMoney(finance.balance)}</Copy>
      <Copy variant="caption" muted>Saldo disponible</Copy>
    </View>

    <Section label="ESTE MES">
      <View>
        <DataRow label="Ingresos" value={formatMoney(finance.income)} tone="muted" />
        <DataRow label="Gastos" value={formatMoney(finance.spent)} />
        <DataRow label="Presupuesto" value={finance.budget === null ? "Sin definir" : formatMoney(finance.budget)} tone="muted" />
      </View>
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

    <Section label="MOVIMIENTOS">
    <View>{movements.map((transaction, index) => <View key={transaction.id}>
      {index === 0 ? null : <Seam />}
      <Row style={styles.movement}>
        <Dot color={categoryColor(transaction.category)} />
        <View style={styles.grow}>
          <Copy variant="body">{transaction.title}</Copy>
          <Row style={styles.movementMeta}>
            <Copy variant="caption" muted>{formatDate(transaction.occurredAt)}</Copy>
            <Copy variant="caption" style={styles.category}>{transaction.category}</Copy>
          </Row>
        </View>
        <Copy variant="metricSmall">{transaction.type === "EXPENSE" ? "−" : "+"}{formatMoney(transaction.amountMinor)}</Copy>
      </Row>
    </View>)}</View>
    </Section>
  </Screen>;
}

const styles = StyleSheet.create({
  balance: { gap: theme.space.xs },
  budget: { gap: theme.space.sm, paddingTop: theme.space.sm },
  warn: { alignItems: "stretch", gap: theme.space.ms },
  warnText: { color: theme.colors.danger, flex: 1 },
  movement: { minHeight: 52, gap: theme.space.md },
  movementMeta: { gap: theme.space.sm },
  category: { color: theme.colors.dim },
  grow: { flex: 1 },
});
