import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { useJarvisVoice } from "../src/services/voice/use-jarvis-voice";

jest.mock("expo-speech", () => ({ getAvailableVoicesAsync: jest.fn(), stop: jest.fn(), speak: jest.fn(), maxSpeechInputLength: 4000, VoiceQuality: { Default: "Default", Enhanced: "Enhanced" } }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Speech.stop).mockResolvedValue();
  jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([
    { identifier: "en", name: "English", language: "en-US", quality: Speech.VoiceQuality.Default },
    { identifier: "es", name: "Español", language: "es-CO", quality: Speech.VoiceQuality.Default },
  ]);
});
describe("respuesta hablada de JARVIS", () => {
  it("elige español, usa tono sereno y permite detener la voz", async () => {
    const view = await renderHook(() => useJarvisVoice(null));
    await waitFor(() => expect(view.result.current.voices).toHaveLength(1));
    await act(async () => { await view.result.current.speak("A tu servicio."); });
    expect(Speech.speak).toHaveBeenCalledWith("A tu servicio.", expect.objectContaining({ language: "es-CO", voice: "es", pitch: 0.88, rate: 0.94 }));
    expect(view.result.current.speaking).toBe(true);
    await act(async () => { await view.result.current.stop(); });
    expect(view.result.current.speaking).toBe(false);
    await view.unmount();
  });
  it("un error de audio deja un mensaje legible y libera el estado", async () => {
    const view = await renderHook(() => useJarvisVoice("missing"));
    await act(async () => { await view.result.current.speak("Tu gasto está pendiente."); });
    await act(() => { jest.mocked(Speech.speak).mock.calls[0][1]?.onError?.(new Error("Audio unavailable")); });
    expect(view.result.current.error).toContain("No pude reproducir");
    expect(view.result.current.speaking).toBe(false);
    await view.unmount();
  });
  it("no reproduce una respuesta que seguía esperando cuando se desmontó el chat", async () => {
    const view = await renderHook(() => useJarvisVoice(null));
    let release!: () => void;
    jest.mocked(Speech.stop).mockReturnValueOnce(new Promise<void>(resolve => { release = resolve; }));
    let pending!: Promise<void>;
    await act(() => { pending = view.result.current.speak("Esta respuesta ya no debe sonar."); });
    await view.unmount();
    release(); await pending;
    expect(Speech.speak).not.toHaveBeenCalled();
  });
});
