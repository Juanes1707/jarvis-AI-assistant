import { Pressable, StyleSheet, View } from "react-native";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { Copy, Icon, Progress, Row } from "../../components/ui/primitives";
import { weekStart } from "../../lib/calendar/time";
import { theme } from "../../theme/tokens";

export function HabitsCard() {
  const { data, dashboard, toggleHabit, busy } = useWorkspace();
  const start = weekStart(dashboard.date);
  return <View style={styles.list}>{data.habits.map(habit => {
    const done = data.habitEntries.some(entry => entry.habitId === habit.id && entry.date === dashboard.date);
    const count = data.habitEntries.filter(entry => entry.habitId === habit.id && entry.date >= start && entry.date <= dashboard.date).length;
    return <View key={habit.id} style={styles.habit}>
      <Row style={styles.head}>
        <View style={styles.grow}>
          <Copy variant="body">{habit.name}</Copy>
          <Copy variant="caption" muted>{count} de {habit.weeklyGoal} días esta semana</Copy>
        </View>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Registrar ${habit.name} hoy`} accessibilityState={{ checked: done, disabled: busy }} disabled={busy}
          onPress={() => void toggleHabit(habit.id)} style={({ pressed }) => [styles.check, done ? styles.checked : null, pressed ? styles.pressed : null]}>
          <Icon name={done ? "check" : "plus"} size={18} color={done ? theme.colors.success : theme.colors.muted} />
        </Pressable>
      </Row>
      <Progress value={count / habit.weeklyGoal * 100} label={`Meta semanal de ${habit.name}`} />
    </View>;
  })}</View>;
}

const styles = StyleSheet.create({
  list: { gap: theme.space.md },
  habit: { gap: theme.space.sm },
  head: { gap: theme.space.ms },
  grow: { flex: 1 },
  check: {
    width: theme.touchTarget, height: theme.touchTarget, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.control,
    borderWidth: 1, borderTopColor: theme.colors.edge, borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border, borderBottomColor: theme.colors.border,
  },
  checked: { backgroundColor: theme.colors.elevated, borderTopColor: theme.colors.success },
  pressed: { opacity: 0.6 },
});
