import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Alert, AppState, StyleSheet } from "react-native";
import { openDatabaseAsync } from "expo-sqlite";
import type { Workspace, AcademicTask } from "../../domain/models";
import { initializeDatabase, readWorkspace, saveHabitEntry, saveTaskProgress, saveAcademicTask, startAcademicTask, deleteAcademicTask, executeJarvisAction, type LocalDatabase } from "./database";
import { defaultPreferences, readPreferences, savePreferences, type Preferences } from "./preferences";
import type { CommandProposal } from "../../features/jarvis/commands";
import { buildDashboard } from "../../engines/dashboard";
import { Boot } from "../../components/layout/boot";
import { Button, Copy } from "../../components/ui/primitives";
import { getJarvisProfile, type BackendUserProfile } from "../backend/client";

type WorkspaceContext = {
  data: Workspace; dashboard: ReturnType<typeof buildDashboard>; busy: boolean; preferences: Preferences;
  backendProfile: BackendUserProfile | null;
  updateProgress: (id: string, progress: number) => Promise<boolean>;
  toggleHabit: (id: string) => Promise<boolean>;
  toggleSuggestions: () => Promise<boolean>;
  saveTask: (task: AcademicTask, mode: "create" | "update") => Promise<boolean>;
  startTask: (id: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  executeCommand: (proposal: CommandProposal) => Promise<boolean>;
  setVoicePreferences: (options: Pick<Preferences, "voiceEnabled" | "voiceId">) => Promise<boolean>;
  setAiPreferences: (options: Pick<Preferences, "aiEnabled" | "ollamaUrl" | "ollamaModel">) => Promise<boolean>;
  setBackendPreferences: (options: Pick<Preferences, "backendEnabled" | "backendUrl" | "backendToken">) => Promise<boolean>;
};
const Context = createContext<WorkspaceContext | null>(null);
let databasePromise: Promise<LocalDatabase> | undefined;
function getDatabase() {
  if (!databasePromise) databasePromise = openDatabaseAsync("jarvis-mobile.db").then(async db => { await initializeDatabase(db); return db; }).catch(error => { databasePromise = undefined; throw error; });
  return databasePromise;
}

function isDemoId(value: string | null | undefined) {
  return value?.startsWith("demo-") ?? false;
}

function serverWorkspace(local: Workspace, profile: BackendUserProfile | null): Workspace {
  const subjects = local.subjects.filter(item => !isDemoId(item.id));
  const subjectIds = new Set(subjects.map(item => item.id));
  const habits = local.habits.filter(item => !isDemoId(item.id));
  const habitIds = new Set(habits.map(item => item.id));
  return {
    ...local,
    user: {
      id: profile?.user_id ?? "server-owner",
      name: profile?.preferred_name || profile?.display_name || "Usuario",
      semester: subjects.length ? local.user.semester : 0,
      timezone: profile?.timezone || "America/Bogota",
    },
    subjects,
    tasks: local.tasks.filter(item => !isDemoId(item.id) && (!item.subjectId || subjectIds.has(item.subjectId))),
    events: local.events.filter(item => !isDemoId(item.id) && (!item.subjectId || subjectIds.has(item.subjectId))),
    transactions: local.transactions.filter(item => !isDemoId(item.id)),
    habits,
    habitEntries: local.habitEntries.filter(item => habitIds.has(item.habitId)),
    exams: local.exams.filter(item => !isDemoId(item.id) && subjectIds.has(item.subjectId)),
    budget: local.budget && !isDemoId(local.budget.id) ? local.budget : null,
  };
}

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [localData, setLocalData] = useState<Workspace | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<{ key: string; profile: BackendUserProfile | null } | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({ ...defaultPreferences });
  // Preference writes can land back-to-back (switching assistant mode saves twice). Reading the
  // latest value from a ref keeps the second write from resurrecting the state the first replaced.
  const latestPreferences = useRef(preferences);
  const applyPreferences = useCallback((next: Preferences) => { latestPreferences.current = next; setPreferences(next); }, []);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const locked = useRef(false);
  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const timer = setInterval(updateClock, 60000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") updateClock(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  useEffect(() => {
    let active = true;
    getDatabase()
      .then(db => Promise.all([readWorkspace(db), readPreferences()]))
      .then(([workspace, prefs]) => {
        if (active) { applyPreferences(prefs); setLocalData(workspace); setError(null); }
      })
      .catch(() => {
        if (active) setError("No se pudo abrir el almacenamiento local. Tus datos se conservaron; vuelve a intentarlo.");
      });
    return () => { active = false; };
  }, [attempt, applyPreferences]);
  const backendProfileKey = preferences.backendEnabled
    && preferences.backendUrl.trim()
    && preferences.backendToken.trim().length >= 24
    ? `${preferences.backendUrl.trim()}\u0000${preferences.backendToken.trim()}`
    : null;
  useEffect(() => {
    let active = true;
    const url = preferences.backendUrl.trim();
    const token = preferences.backendToken.trim();
    if (!backendProfileKey) return () => { active = false; };
    getJarvisProfile({ url, token })
      .then(profile => { if (active) setProfileSnapshot({ key: backendProfileKey, profile }); })
      .catch(() => { if (active) setProfileSnapshot({ key: backendProfileKey, profile: null }); });
    return () => { active = false; };
  }, [backendProfileKey, preferences.backendToken, preferences.backendUrl]);
  const mutate = useCallback(async (action: (db: LocalDatabase) => Promise<void>) => {
    if (locked.current) return false;
    locked.current = true; setBusy(true);
    try {
      const db = await getDatabase();
      await action(db);
      setLocalData(await readWorkspace(db)); setNow(new Date());
      return true;
    } catch { Alert.alert("No se pudo guardar", "La operación no pudo confirmarse. Vuelve a intentarlo."); return false; }
    finally { locked.current = false; setBusy(false); }
  }, []);
  const backendProfile = profileSnapshot?.key === backendProfileKey ? profileSnapshot.profile : null;
  const data = useMemo(
    () => localData
      ? preferences.backendEnabled ? serverWorkspace(localData, backendProfile) : localData
      : null,
    [backendProfile, localData, preferences.backendEnabled],
  );
  const dashboard = useMemo(() => data ? buildDashboard(data, now) : null, [data, now]);
  if (error) return <Boot state="offline">
    <Copy variant="body" style={styles.centered}>{error}</Copy>
    <Button label="Reintentar" onPress={() => { setError(null); setAttempt(value => value + 1); }} />
  </Boot>;
  if (!data || !dashboard) return <Boot state="thinking"><Copy variant="caption" muted>Cargando tus datos locales…</Copy></Boot>;
  return <Context.Provider value={{
    data, dashboard, busy, preferences, backendProfile,
    updateProgress: (id, progress) => mutate(db => saveTaskProgress(db, id, progress)),
    saveTask: (task, mode) => mutate(db => saveAcademicTask(db, task, mode)),
    startTask: id => mutate(db => startAcademicTask(db, id)),
    deleteTask: id => mutate(db => deleteAcademicTask(db, id)),
    executeCommand: proposal => mutate(db => executeJarvisAction(db, proposal)),
    setVoicePreferences: options => mutate(async () => {
      const next = { ...latestPreferences.current, ...options };
      await savePreferences(next); applyPreferences(next);
    }),
    setAiPreferences: options => mutate(async () => {
      const next = { ...latestPreferences.current, ...options };
      await savePreferences(next); applyPreferences(next);
    }),
    setBackendPreferences: options => mutate(async () => {
      const next = { ...latestPreferences.current, ...options };
      await savePreferences(next); applyPreferences(next);
    }),
    toggleHabit: id => mutate(db => saveHabitEntry(db, id, dashboard.date, !data.habitEntries.some(e => e.habitId === id && e.date === dashboard.date))),
    toggleSuggestions: () => mutate(async () => {
      const next = { ...latestPreferences.current, showSuggestions: !latestPreferences.current.showSuggestions };
      await savePreferences(next); applyPreferences(next);
    }),
  }}>{children}</Context.Provider>;
}
const styles = StyleSheet.create({ centered: { textAlign: "center" } });

export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("WorkspaceProvider requerido.");
  return context;
}
