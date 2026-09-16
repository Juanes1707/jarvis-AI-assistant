import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Platform } from "react-native";
import { ResultCode, startActivityAsync } from "expo-intent-launcher";
import { recognizeSpeech } from "../src/services/voice/recognition";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { readPreferences, savePreferences } from "../src/services/storage/preferences";

jest.mock("expo-intent-launcher", () => ({ ResultCode: { Success: -1, Canceled: 0 }, startActivityAsync: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); jest.replaceProperty(Platform, "OS", "android"); });
afterEach(() => { jest.restoreAllMocks(); });

describe("puente de dictado Android", () => {
  it("solicita español y devuelve el primer resultado reconocido", async () => {
    jest.mocked(startActivityAsync).mockResolvedValue({ resultCode: ResultCode.Success, extra: { "android.speech.extra.RESULTS": [" agrega un gasto de cien mil pesos ", "otro resultado"] } });
    await expect(recognizeSpeech()).resolves.toBe("agrega un gasto de cien mil pesos");
    expect(startActivityAsync).toHaveBeenCalledWith("android.speech.action.RECOGNIZE_SPEECH", expect.objectContaining({ extra: expect.objectContaining({ "android.speech.extra.LANGUAGE": "es-CO", "android.speech.extra.LANGUAGE_MODEL": "free_form" }) }));
  });
  it("cancelar devuelve ausencia de mensaje", async () => {
    jest.mocked(startActivityAsync).mockResolvedValue({ resultCode: ResultCode.Canceled });
    await expect(recognizeSpeech()).resolves.toBeNull();
  });
  it("no trata resultados vacíos o errores como una orden", async () => {
    jest.mocked(startActivityAsync).mockResolvedValueOnce({ resultCode: ResultCode.Success, extra: {} }).mockRejectedValueOnce(new Error("ActivityNotFoundException"));
    await expect(recognizeSpeech()).rejects.toThrow("transcripción");
    await expect(recognizeSpeech()).rejects.toThrow("micrófono del teclado");
  });
  it("iOS no intenta abrir una actividad de Android", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    await expect(recognizeSpeech()).rejects.toThrow("iPhone");
    expect(startActivityAsync).not.toHaveBeenCalled();
  });
});
describe("preferencias de voz compatibles con datos previos", () => {
  it("completa las preferencias anteriores sin perder el ajuste existente", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue('{"showSuggestions":false}');
    await expect(readPreferences()).resolves.toEqual({ showSuggestions: false, voiceEnabled: true, voiceId: null, aiEnabled: false, ollamaUrl: "", ollamaModel: "qwen3.5:4b", backendEnabled: false, backendUrl: "", backendToken: "" });
  });
  it("guarda la voz y el silencio seleccionados", async () => {
    await savePreferences({ showSuggestions: true, voiceEnabled: false, voiceId: "spanish-voice", aiEnabled: true, ollamaUrl: "http://192.168.1.20:11434", ollamaModel: "qwen3.5:4b", backendEnabled: true, backendUrl: "https://equipo.tailnet.ts.net", backendToken: "a-secure-token-with-24-characters" });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("jarvis:preferences:v1", JSON.stringify({ showSuggestions: true, voiceEnabled: false, voiceId: "spanish-voice", aiEnabled: true, ollamaUrl: "http://192.168.1.20:11434", ollamaModel: "qwen3.5:4b", backendEnabled: true, backendUrl: "https://equipo.tailnet.ts.net", backendToken: "a-secure-token-with-24-characters" }));
  });
});
