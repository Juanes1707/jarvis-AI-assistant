import { useLocalSearchParams } from "expo-router";
import { JarvisConversation } from "../../features/jarvis/conversation";

export default function JarvisScreen() {
  const params = useLocalSearchParams<{ question?: string; request?: string }>();
  return <JarvisConversation key={params.request ?? params.question ?? "initial"} initialQuestion={typeof params.question === "string" ? params.question : ""} />;
}
