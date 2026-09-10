import { Pressable, View } from "react-native";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { Copy, Icon, Row, Progress } from "../../components/ui/primitives";
import { weekStart } from "../../lib/calendar/time";
import { theme } from "../../theme/tokens";
export function HabitsCard() {
  const { data, dashboard, toggleHabit, busy } = useWorkspace();
  const start = weekStart(dashboard.date);
  return <View style={{ gap: 16 }}>{data.habits.map(habit => {
    const today = data.habitEntries.some(e => e.habitId === habit.id && e.date === dashboard.date);
    const count = data.habitEntries.filter(e => e.habitId === habit.id && e.date >= start && e.date <= dashboard.date).length;
    return <View key={habit.id} style={{ gap: 8 }}>
      <Row><View style={{ flex: 1 }}><Copy>{habit.name}</Copy><Copy variant="mono" muted>{count} / {habit.weeklyGoal} días esta semana</Copy></View>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Registrar ${habit.name} hoy`} accessibilityState={{ checked: today, disabled: busy }} disabled={busy} onPress={() => void toggleHabit(habit.id)} style={{ minWidth: 48, minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: theme.colors.elevated }}>
          <Icon name={today ? "check-circle" : "plus-circle-outline"} color={today ? theme.colors.success : theme.colors.accent} />
        </Pressable>
      </Row><Progress value={count / habit.weeklyGoal * 100} label={`Meta semanal de ${habit.name}`} />
    </View>;
  })}</View>;
}
