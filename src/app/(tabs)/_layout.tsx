import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/ui/primitives";
import { theme } from "../../theme/tokens";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown: false, tabBarActiveTintColor: theme.colors.accent, tabBarInactiveTintColor: theme.colors.muted,
    tabBarHideOnKeyboard: true,
    tabBarStyle: { backgroundColor: "#10151e", borderTopColor: theme.colors.border, height: 72 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 10 },
    tabBarLabelStyle: { fontFamily: theme.fonts.medium, fontSize: 12, marginTop: 3 },
  }}>
    <Tabs.Screen name="index" options={{ title: "Inicio", tabBarIcon: ({ color }) => <Icon name="view-dashboard-outline" color={color} /> }} />
    <Tabs.Screen name="tasks" options={{ title: "Tareas", tabBarIcon: ({ color }) => <Icon name="checkbox-marked-outline" color={color} /> }} />
    <Tabs.Screen name="jarvis" options={{ title: "JARVIS", tabBarIcon: () => <View style={styles.orb}><Icon name="robot-outline" size={26} /></View> }} />
    <Tabs.Screen name="calendar" options={{ title: "Agenda", tabBarIcon: ({ color }) => <Icon name="calendar-blank-outline" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarIcon: ({ color }) => <Icon name="account-outline" color={color} /> }} />
  </Tabs>;
}
const styles = StyleSheet.create({
  orb: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#142839", borderColor: "#4fa9cb", borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: -16 },
});
