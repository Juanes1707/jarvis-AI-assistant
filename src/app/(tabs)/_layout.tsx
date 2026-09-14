import { Tabs } from "expo-router";
import { StyleSheet, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../components/ui/primitives";
import { JarvisCore } from "../../components/jarvis/core";
import { useWorkspace } from "../../services/storage/workspace-provider";
import { theme } from "../../theme/tokens";

/** The lit edge above the active tab is the same leaked-light motif used across the product. */
function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  return <View style={styles.tab}>
    <View style={[styles.indicator, focused ? styles.indicatorOn : null]} />
    <Icon name={name} color={color} size={22} />
  </View>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { preferences } = useWorkspace();
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: theme.colors.text,
    tabBarInactiveTintColor: theme.colors.dim,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.edge,
      height: 72 + insets.bottom, paddingBottom: Math.max(insets.bottom, theme.space.sm), paddingTop: theme.space.sm,
    },
    tabBarLabelStyle: { fontFamily: theme.fonts.mono, fontSize: 11, letterSpacing: 0.4, marginTop: theme.space.xs },
  }}>
    <Tabs.Screen name="index" options={{ title: "Inicio", tabBarIcon: ({ color, focused }) => <TabIcon name="square-outline" color={color} focused={focused} /> }} />
    <Tabs.Screen name="tasks" options={{ title: "Tareas", tabBarIcon: ({ color, focused }) => <TabIcon name="checkbox-blank-outline" color={color} focused={focused} /> }} />
    <Tabs.Screen name="jarvis" options={{
      title: "JARVIS",
      // Reflects only whether the local brain is switched on. Live conversation states belong to the chat screen.
      tabBarIcon: () => <View style={styles.core}><JarvisCore state={preferences.aiEnabled ? "idle" : "offline"} size={44} /></View>,
    }} />
    <Tabs.Screen name="calendar" options={{ title: "Agenda", tabBarIcon: ({ color, focused }) => <TabIcon name="calendar-blank-outline" color={color} focused={focused} /> }} />
    <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarIcon: ({ color, focused }) => <TabIcon name="account-outline" color={color} focused={focused} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  tab: { alignItems: "center", gap: theme.space.sm },
  indicator: { width: 18, height: theme.space.hair, borderRadius: theme.radius.hairline, backgroundColor: "transparent" },
  indicatorOn: { backgroundColor: theme.colors.accent },
  core: { marginTop: -14 },
});
