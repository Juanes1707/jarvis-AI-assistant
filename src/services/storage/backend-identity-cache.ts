import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import type { BackendUserProfile } from "../backend/client";

/** A tiny offline courtesy cache, deliberately not a copy of the server profile or workspace. */
const cacheKey = "jarvis:backend-identity-cache:v1";
const identitySchema = z.object({
  url: z.string().trim().min(1).max(256),
  userId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(80),
});

export type CachedBackendIdentity = z.infer<typeof identitySchema>;

export function cachedIdentityFor(url: string, profile: BackendUserProfile): CachedBackendIdentity | null {
  const name = profile.preferred_name?.trim() || profile.display_name?.trim();
  const normalizedUrl = url.trim();
  if (!normalizedUrl || !name) return null;
  return identitySchema.parse({
    url: normalizedUrl,
    userId: profile.user_id,
    name,
    timezone: profile.timezone?.trim() || "America/Bogota",
  });
}

export async function readCachedBackendIdentity(url: string): Promise<CachedBackendIdentity | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = identitySchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.url === url.trim() ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeCachedBackendIdentity(url: string, profile: BackendUserProfile): Promise<CachedBackendIdentity | null> {
  const identity = cachedIdentityFor(url, profile);
  try {
    if (identity) await AsyncStorage.setItem(cacheKey, JSON.stringify(identity));
    else await AsyncStorage.removeItem(cacheKey);
  } catch {
    // Losing this convenience cache must never block the authoritative server response.
  }
  return identity;
}
