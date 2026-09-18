import { useCallback, useEffect, useState } from "react";
import {
  createJarvisMemory, forgetJarvisMemory, listJarvisMemories,
  type BackendMemory, type BackendMemoryCreate, type BackendSettings,
} from "../../services/backend/client";
import { resourceKey, type ResourceStatus } from "./use-profile";

export type MemoriesResource = {
  status: ResourceStatus;
  memories: BackendMemory[];
  error: string;
  mutating: boolean;
  reload: () => void;
  add: (memory: BackendMemoryCreate) => Promise<boolean>;
  forget: (id: string) => Promise<boolean>;
};

/**
 * What JARVIS has confirmed about the user, and the controls to curate it. Every write goes
 * through the typed client and is followed by a fresh read, so the server stays the single
 * record of truth and a failed delete never removes the row from the screen.
 */
export function useMemories(settings: BackendSettings, active: boolean): MemoriesResource {
  const key = resourceKey(settings, active);
  const [loaded, setLoaded] = useState<{ key: string; memories: BackendMemory[] } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [mutating, setMutating] = useState(false);
  const [writeError, setWriteError] = useState("");

  const { url, token } = settings;
  useEffect(() => {
    if (!key) return;
    let live = true;
    listJarvisMemories({ url, token })
      .then(result => { if (live) setLoaded({ key, memories: result.memories ?? [] }); })
      .catch((cause: unknown) => {
        if (live) setFailure({ key, message: cause instanceof Error ? cause.message : "No pude leer la memoria del servidor." });
      });
    return () => { live = false; };
  }, [key, url, token, attempt]);

  const reload = useCallback(() => { setWriteError(""); setFailure(null); setAttempt(value => value + 1); }, []);

  const run = useCallback(async (operation: () => Promise<unknown>, fallback: string) => {
    setMutating(true); setWriteError("");
    try {
      await operation();
      setAttempt(value => value + 1);
      return true;
    } catch (cause) {
      setWriteError(cause instanceof Error ? cause.message : fallback);
      return false;
    } finally { setMutating(false); }
  }, []);

  const add = useCallback(
    (memory: BackendMemoryCreate) => run(() => createJarvisMemory({ url, token }, memory), "No pude guardar el recuerdo."),
    [run, url, token],
  );
  const forget = useCallback(
    (id: string) => run(() => forgetJarvisMemory({ url, token }, id), "No pude olvidar ese recuerdo."),
    [run, url, token],
  );

  const current = loaded?.key === key ? loaded : null;
  const failed = failure?.key === key ? failure : null;
  const status: ResourceStatus = !key ? "idle" : current ? "ready" : failed ? "error" : "loading";
  return {
    status, memories: current?.memories ?? [], error: writeError || failed?.message || "",
    mutating, reload, add, forget,
  };
}
