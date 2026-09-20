import { useEffect } from "react";
import { router } from "expo-router";
import { Boot } from "../components/layout/boot";
import { Copy } from "../components/ui/primitives";

/**
 * Target of the phone shortcut (`jarvis://talk`). It exists as its own route so every launch
 * carries a fresh `request` value: that remounts the conversation, which is what makes the
 * microphone open again on the second and third tap and not only on the first.
 */
export default function TalkShortcut() {
  useEffect(() => {
    router.replace({ pathname: "/jarvis", params: { listen: "1", request: String(Date.now()) } });
  }, []);
  return <Boot state="listening"><Copy variant="caption" muted>Abriendo el micrófono…</Copy></Boot>;
}
