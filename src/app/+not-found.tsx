import { router } from "expo-router";
import { Screen } from "../components/layout/screen";
import { Button, Copy } from "../components/ui/primitives";
export default function NotFound() {
  return <Screen title="Pantalla no encontrada"><Copy>Esta ruta no está disponible en JARVIS.</Copy><Button label="Ir al inicio" onPress={() => router.replace("/")} /></Screen>;
}
