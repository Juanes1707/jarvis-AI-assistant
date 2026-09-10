import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { openDatabaseAsync } from "expo-sqlite";
import type { Workspace, AcademicTask } from "../../domain/models";
import { initializeDatabase, readWorkspace, saveHabitEntry, saveTaskProgress, saveAcademicTask, startAcademicTask, deleteAcademicTask, type LocalDatabase } from "./database";
import { readPreferences, savePreferences, type Preferences } from "./preferences";
import { buildDashboard } from "../../engines/dashboard";
import { Screen } from "../../components/layout/screen";
import { Button, Copy } from "../../components/ui/primitives";
import { theme } from "../../theme/tokens";

type WorkspaceContext = {
  data: Workspace; dashboard: ReturnType<typeof buildDashboard>; busy: boolean; preferences: Preferences;
  updateProgress: (id: string, progress: number) => Promise<boolean>;
  toggleHabit: (id: string) => Promise<boolean>;
  toggleSuggestions: () => Promise<boolean>;
  saveTask: (task: AcademicTask, mode: "create" | "update") => Promise<boolean>;
  startTask: (id: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
};
const Context = createContext<WorkspaceContext | null>(null);
let databasePromise: Promise<LocalDatabase> | undefined;
function getDatabase() {
  if (!databasePromise) databasePromise = openDatabaseAsync("jarvis-mobile.db").then(async db => { await initializeDatabase(db); return db; }).catch(error => { databasePromise = undefined; throw error; });
  return databasePromise;
}
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<Workspace | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({ showSuggestions: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    getDatabase()
      .then(db => Promise.all([readWorkspace(db), readPreferences()]))
      .then(([workspace, prefs]) => {
        if (active) { setPreferences(prefs); setData(workspace); setError(null); }
      })
      .catch(() => {
        if (active) setError("No se pudo abrir el almacenamiento local. Tus datos se conservaron; vuelve a intentarlo.");
      });
    return () => { active = false; };
  }, [attempt]);
  const mutate = useCallback(async (action: (db: LocalDatabase) => Promise<void>) => {
    if (locked.current) return false;
    locked.current = true; setBusy(true);
    try {
      const db = await getDatabase();
      await action(db);
      setData(await readWorkspace(db));
      return true;
    } catch { Alert.alert("No se pudo guardar", "La operación no pudo confirmarse. Vuelve a intentarlo."); return false; }
    finally { locked.current = false; setBusy(false); }
  }, []);
  const dashboard = useMemo(() => data ? buildDashboard(data) : null, [data]);
  if (error) return <Screen title="Tu centro de comando"><Copy>{error}</Copy><Button label="Reintentar" onPress={() => { setError(null); setAttempt(value => value + 1); }} /></Screen>;
  if (!data || !dashboard) return <Screen title="Preparando JARVIS"><ActivityIndicator color={theme.colors.accent} /><Copy muted>Cargando tus datos locales…</Copy></Screen>;
  return <Context.Provider value={{
    data, dashboard, busy, preferences,
    updateProgress: (id, progress) => mutate(db => saveTaskProgress(db, id, progress)),
    saveTask: (task, mode) => mutate(db => saveAcademicTask(db, task, mode)),
    startTask: id => mutate(db => startAcademicTask(db, id)),
    deleteTask: id => mutate(db => deleteAcademicTask(db, id)),
    toggleHabit: id => mutate(db => saveHabitEntry(db, id, dashboard.date, !data.habitEntries.some(e => e.habitId === id && e.date === dashboard.date))),
    toggleSuggestions: () => mutate(async () => {
      const next = { ...preferences, showSuggestions: !preferences.showSuggestions };
      await savePreferences(next); setPreferences(next);
    }),
  }}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("WorkspaceProvider requerido.");
  return context;
}
