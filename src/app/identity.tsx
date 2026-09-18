import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../components/layout/screen";
import { Button, Copy, Field, Rail, Row, Section } from "../components/ui/primitives";
import { ServerGate } from "../features/profile/server-gate";
import { useProfile } from "../features/profile/use-profile";
import { useWorkspace } from "../services/storage/workspace-provider";
import type { BackendProfileUpdate, BackendUserProfile } from "../services/backend/client";
import { theme } from "../theme/tokens";

type TextKey = "display_name" | "preferred_name" | "city" | "country" | "timezone" | "locale" | "occupation" | "study_program";

/**
 * Grouped by what JARVIS does with each answer, not by data type. A profile form that explains
 * its own purpose is the difference between filling in a database and telling an assistant who
 * you are.
 */
const GROUPS: readonly { label: string; note: string; fields: readonly { key: TextKey; label: string; placeholder: string; hint?: string }[] }[] = [
  {
    label: "CÓMO TE LLAMA",
    note: "Con esto te saluda y se dirige a ti en cada respuesta.",
    fields: [
      { key: "display_name", label: "NOMBRE COMPLETO", placeholder: "Juan Esteban Rubio" },
      { key: "preferred_name", label: "COMO TE DICE", placeholder: "Juan", hint: "Solo el nombre, sin apellidos." },
    ],
  },
  {
    label: "DÓNDE ESTÁS",
    note: "Con esto decide qué es «hoy», cuándo vence una entrega y cuándo cierra tu mes.",
    fields: [
      { key: "city", label: "CIUDAD", placeholder: "Bogotá" },
      { key: "country", label: "PAÍS", placeholder: "Colombia" },
      { key: "timezone", label: "ZONA HORARIA", placeholder: "America/Bogota", hint: "Formato IANA, como America/Bogota." },
      { key: "locale", label: "IDIOMA Y FORMATO", placeholder: "es-CO", hint: "Formato de fechas y de pesos." },
    ],
  },
  {
    label: "QUÉ HACES",
    note: "Con esto entiende qué priorizar cuando le pides organizar tu día.",
    fields: [
      { key: "occupation", label: "OCUPACIÓN", placeholder: "Estudiante" },
      { key: "study_program", label: "PROGRAMA", placeholder: "Ingeniería de Sistemas" },
    ],
  },
];

const KEYS = GROUPS.flatMap(group => group.fields.map(field => field.key));

function stored(profile: BackendUserProfile | null, key: TextKey): string {
  return profile?.[key] ?? "";
}

export default function IdentityScreen() {
  const { preferences } = useWorkspace();
  const url = preferences.backendUrl ?? "";
  const token = preferences.backendToken ?? "";
  const settings = useMemo(() => ({ url, token }), [url, token]);
  const active = (preferences.backendEnabled ?? false) && url.trim().length > 0 && token.trim().length >= 24;
  const { status, profile, error, saving, reload, save } = useProfile(settings, active);

  // `undefined` means the user has not touched the field, so it keeps tracking the server value.
  const [edits, setEdits] = useState<Partial<Record<TextKey, string>>>({});
  const [saved, setSaved] = useState(false);

  const value = (key: TextKey) => edits[key] ?? stored(profile, key);
  const changed = KEYS.filter(key => edits[key] !== undefined && edits[key]!.trim() !== stored(profile, key).trim());
  const empty = status === "ready" && KEYS.every(key => !stored(profile, key));

  function edit(key: TextKey, next: string) {
    setSaved(false);
    setEdits(previous => ({ ...previous, [key]: next }));
  }

  async function submit() {
    const update: BackendProfileUpdate = {};
    for (const key of changed) update[key] = value(key).trim() || null;
    if (!profile?.onboarding_completed && value("display_name").trim()) update.onboarding_completed = true;
    const ok = await save(update);
    // Only clear local edits on success, so a failed write never loses what was typed.
    if (ok) { setEdits({}); setSaved(true); }
  }

  return <Screen title="Tu perfil" subtitle="Lo que JARVIS usa para responderte. Vive en tu servidor, no en este teléfono." back>
    <ServerGate active={active} status={status} error={error} onRetry={reload}>
      {empty ? <Row style={styles.intro}>
        <Rail />
        <View style={styles.introBody}>
          <Copy variant="body">JARVIS todavía no sabe nada de ti.</Copy>
          <Copy variant="caption" muted>Completa lo que quieras. Cada dato cambia algo concreto en sus respuestas, y puedes editarlo cuando quieras.</Copy>
        </View>
      </Row> : null}

      {GROUPS.map(group => <Section key={group.label} label={group.label}>
        <Copy variant="caption" muted>{group.note}</Copy>
        {group.fields.map(field => <Field key={field.key} label={field.label} value={value(field.key)}
          onChangeText={next => edit(field.key, next)} placeholder={field.placeholder} hint={field.hint}
          editable={!saving} autoCapitalize={field.key === "timezone" || field.key === "locale" ? "none" : "words"} autoCorrect={false} />)}
      </Section>)}

      <View style={styles.actions}>
        {error ? <Row style={styles.notice}>
          <Rail tone="danger" />
          <Copy variant="caption" accessibilityLiveRegion="polite" style={styles.errorText}>{error} No se guardó nada; lo que escribiste sigue aquí.</Copy>
        </Row> : null}
        {saved && !changed.length ? <Row style={styles.notice}>
          <Rail tone="energy" />
          <Copy variant="caption" muted accessibilityLiveRegion="polite">Perfil guardado en tu servidor.</Copy>
        </Row> : null}
        <Copy variant="caption" muted>
          {changed.length === 0 ? "No hay cambios sin guardar." : changed.length === 1 ? "1 campo sin guardar." : `${changed.length} campos sin guardar.`}
        </Copy>
        <Button label="Guardar perfil" icon="content-save-outline" loading={saving} disabled={!changed.length} onPress={() => void submit()} />
      </View>
    </ServerGate>
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { alignItems: "stretch", gap: theme.space.ms },
  introBody: { flex: 1, gap: theme.space.xs },
  actions: { gap: theme.space.ms, paddingTop: theme.space.sm },
  notice: { alignItems: "stretch", gap: theme.space.ms },
  errorText: { color: theme.colors.danger, flex: 1 },
});
