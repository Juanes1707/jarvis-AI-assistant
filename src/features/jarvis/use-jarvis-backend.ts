import { useCallback, useMemo, useRef, useState } from "react";
import type { BackendCheckState } from "../../components/jarvis/backend-status";
import {
  askJarvisBackend, checkJarvisBackend, confirmJarvisBackendAction,
  type BackendAssistantResponse, type BackendConfirmation, type BackendSettings, type BackendStatus,
} from "../../services/backend/client";
import type { Preferences } from "../../services/storage/preferences";

/** The token is the only secret here, so it never leaves `settings`; `host` is what the UI shows. */
function describeHost(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  } catch {
    return trimmed;
  }
}

export type JarvisBackend = {
  /** The user turned server mode on *and* supplied enough to try it. */
  active: boolean;
  configured: boolean;
  settings: BackendSettings;
  host: string;
  state: BackendCheckState;
  report: BackendStatus | null;
  error: string;
  verify: (override?: BackendSettings) => Promise<boolean>;
  ask: (input: { text: string; requestId: string; conversationId?: string }) => Promise<BackendAssistantResponse>;
  confirm: (actionId: string) => Promise<BackendConfirmation>;
};

/**
 * View-model for the self-hosted multi-agent backend (AI_HANDOFF X2C-001). It owns only
 * presentation state: whether a check is running and what the last real answer was. Routing,
 * agents and persistence stay behind the typed client.
 */
export function useJarvisBackend(preferences: Preferences): JarvisBackend {
  const [state, setState] = useState<BackendCheckState>("idle");
  const [report, setReport] = useState<BackendStatus | null>(null);
  const [error, setError] = useState("");
  const running = useRef(false);

  const url = preferences.backendUrl ?? "";
  const token = preferences.backendToken ?? "";
  const enabled = preferences.backendEnabled ?? false;
  const settings = useMemo<BackendSettings>(() => ({ url, token }), [url, token]);
  const configured = url.trim().length > 0 && token.trim().length >= 24;

  const verify = useCallback(async (override?: BackendSettings) => {
    if (running.current) return false;
    running.current = true;
    setState("checking"); setError("");
    try {
      const result = await checkJarvisBackend(override ?? { url, token });
      setReport(result); setState("online");
      return true;
    } catch (cause) {
      setReport(null); setState("failed");
      setError(cause instanceof Error ? cause.message : "No pude comprobar el servidor JARVIS.");
      return false;
    } finally { running.current = false; }
  }, [url, token]);

  const ask = useCallback(
    (input: { text: string; requestId: string; conversationId?: string }) => askJarvisBackend({ url, token }, input),
    [url, token],
  );
  const confirm = useCallback((actionId: string) => confirmJarvisBackendAction({ url, token }, actionId), [url, token]);

  return {
    active: enabled && configured,
    configured,
    settings,
    host: describeHost(url),
    state,
    report,
    error,
    verify,
    ask,
    confirm,
  };
}
