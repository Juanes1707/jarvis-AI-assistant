import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk/600SemiBold";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono/500Medium";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WorkspaceProvider } from "../services/storage/workspace-provider";
import { theme } from "../theme/tokens";
export { ErrorBoundary } from "expo-router";

void SplashScreen.preventAutoHideAsync().catch(() => {});
export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, SpaceGrotesk_600SemiBold, JetBrainsMono_500Medium });
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;
  return <SafeAreaProvider><StatusBar style="light" /><WorkspaceProvider>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
  </WorkspaceProvider></SafeAreaProvider>;
}
