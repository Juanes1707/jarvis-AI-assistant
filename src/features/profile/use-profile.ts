import { useCallback, useEffect, useState } from "react";
import {
  getJarvisProfile, updateJarvisProfile,
  type BackendProfileUpdate, type BackendSettings, type BackendUserProfile,
} from "../../services/backend/client";

export type ResourceStatus = "idle" | "loading" | "ready" | "error";

export type ProfileResource = {
  status: ResourceStatus;
  profile: BackendUserProfile | null;
  error: string;
  saving: boolean;
  reload: () => void;
  save: (update: BackendProfileUpdate) => Promise<boolean>;
};

/** Empty string means "no server configured", so it can never collide with a real request. */
export function resourceKey(settings: BackendSettings, active: boolean): string {
  return active ? `${settings.url.trim()}|${settings.token.trim()}` : "";
}

/**
 * The confirmed profile stored in PostgreSQL (AI_HANDOFF X2C-002). It never falls back to the
 * local demonstration workspace: an empty server profile must read as empty, not as someone
 * else's sample data. Status is derived from which key the stored result belongs to, so the
 * loading transition needs no state write inside the effect.
 */
export function useProfile(settings: BackendSettings, active: boolean): ProfileResource {
  const key = resourceKey(settings, active);
  const [loaded, setLoaded] = useState<{ key: string; profile: BackendUserProfile } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { url, token } = settings;
  useEffect(() => {
    if (!key) return;
    let live = true;
    getJarvisProfile({ url, token })
      .then(profile => { if (live) setLoaded({ key, profile }); })
      .catch((cause: unknown) => {
        if (live) setFailure({ key, message: cause instanceof Error ? cause.message : "No pude leer tu perfil del servidor." });
      });
    return () => { live = false; };
  }, [key, url, token, attempt]);

  const reload = useCallback(() => { setSaveError(""); setFailure(null); setAttempt(value => value + 1); }, []);

  const save = useCallback(async (update: BackendProfileUpdate) => {
    setSaving(true); setSaveError("");
    try {
      const profile = await updateJarvisProfile({ url, token }, update);
      setLoaded({ key: resourceKey({ url, token }, true), profile });
      setFailure(null);
      return true;
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "No pude guardar tu perfil.");
      return false;
    } finally { setSaving(false); }
  }, [url, token]);

  const current = loaded?.key === key ? loaded : null;
  const failed = failure?.key === key ? failure : null;
  const status: ResourceStatus = !key ? "idle" : current ? "ready" : failed ? "error" : "loading";
  return { status, profile: current?.profile ?? null, error: saveError || failed?.message || "", saving, reload, save };
}
