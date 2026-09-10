import { View } from "react-native";
import { Screen } from "../components/layout/screen";
import { Badge, Card, Copy, Row, SectionTitle } from "../components/ui/primitives";
import { useWorkspace } from "../services/storage/workspace-provider";
import { formatDate, formatMoney } from "../lib/utils/format";
import { theme } from "../theme/tokens";
export default function FinancesScreen() {
  const { data, dashboard: { finance } } = useWorkspace();
  return <Screen title="Finanzas personales" back><Badge>REGISTROS LOCALES · COP</Badge>
    <Card tone="accent"><Copy variant="label" muted>SALDO DISPONIBLE</Copy><Copy variant="title">{formatMoney(finance.balance)}</Copy><Copy muted>Ingresos del mes: {formatMoney(finance.income)}</Copy><Copy muted>Gastos del mes: {formatMoney(finance.spent)}</Copy></Card>
    <Card><Copy variant="heading">Tu presupuesto</Copy><Copy>Presupuesto: {finance.budget === null ? "Sin definir" : formatMoney(finance.budget)}</Copy><Copy>Restante: {finance.remaining === null ? "—" : formatMoney(finance.remaining)}</Copy><Copy style={{ color: theme.colors.success }}>Por día: {finance.daily === null ? "—" : formatMoney(finance.daily)}</Copy><Copy muted>Calculado hasta fin de mes desde la fecha de demostración.</Copy></Card>
    <SectionTitle title="Movimientos recientes" />{[...data.transactions].sort((a, b) => +b.occurredAt - +a.occurredAt).map(transaction => <Card key={transaction.id}><Row style={{ flexWrap: "wrap" }}><View style={{ flex: 1, minWidth: 140 }}><Copy>{transaction.title}</Copy><Copy muted>{formatDate(transaction.occurredAt)} · {transaction.category}</Copy></View><Copy style={{ color: transaction.type === "INCOME" ? theme.colors.success : theme.colors.text }}>{transaction.type === "EXPENSE" ? "−" : "+"}{formatMoney(transaction.amountMinor)}</Copy></Row></Card>)}
  </Screen>;
}
