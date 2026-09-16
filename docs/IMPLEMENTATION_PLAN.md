# Plan de implementación móvil

React Native + Expo reemplaza el plan web anterior. No construir todas las fases simultáneamente.

| Fase | Entrega | Estado |
|---|---|---|
| 0 · Discovery | Repositorio, MCP Stitch, 14 referencias, arquitectura móvil | Completada |
| 1 · Foundation | Expo Router, shell, tokens, fuentes, tabs, safe areas, modelos y persistencia | Implementación y pruebas completas; teléfono pendiente |
| 2 · JARVIS Home | Briefing, prioridad, agenda, resúmenes, hábitos y recomendaciones; comparar en teléfono | Funcionalidad portada; fidelidad en teléfono pendiente |
| 3 · Académico | University Hub, detalle, CRUD tareas, calendario y sesiones | Tareas implementadas; detalle académico, semana y sesiones pendientes |
| 4 · Finanzas | Movimientos, presupuestos, metas e insights | Alta de gastos/ingresos por órdenes; edición avanzada y metas pendientes |
| 5 · Personal | Hábitos completos, proyectos, documentos e insights | Pendiente |
| 6 · Inteligencia | Contexto, historial, acciones propuestas, inbox y proveedor IA | Voz y órdenes locales confirmadas; Ollama LAN opcional integrado; historial persistente pendiente |
| 7 · Polish | Android/iOS, accesibilidad, teclado y comparación visual | Rediseño visual completo aplicado; comparación en teléfono pendiente |
| 8 · Producción | Seguridad, arquitectura, builds e interfaces backend | Backend multi-agente implementado; integración visual y prueba Tailscale pendientes |

Foundation: npx expo start desde la raíz, rutas nativas, persistencia sin Node, pruebas de lógica y componentes, bundles Android/iOS. Verificación en dispositivo registrada por separado, nunca inferida de un preview web.

## Validación foundation

- Typecheck y lint sin errores ni advertencias; Jest 35 pruebas en 4 suites.
- SQLite probado con cierre/reapertura de archivo; controles nativos accesibles.
- Android/iOS exportados a bytecode Hermes; assets reducidos de 92 a 39 mediante imports específicos.
- Expo Doctor 21/21; expo install --check compatible; Metro iniciado en 8081 y manifiesto Android servido.
- Runtime en teléfono pendiente: no hay adb ni SDK Android instalado. Teclado, safe areas y comparación visual no están verificados.
- npm audit: 14 avisos moderados transitivos (decode-uri-component y uuid), cero altos/críticos. No degradar Expo con audit fix --force. Revisar antes de distribución.

## Avance académico — tareas

Nueva tarea, Inbox sin fecha/materia, filtros Pendientes/Inbox/Hoy/Próximas/En curso/Completadas, detalle con explicación de prioridad, edición, selector nativo de fecha/hora Bogotá, inicio, progreso, completar y eliminar con confirmación. Las entregas son proyecciones de las tareas en la agenda: reprogramar las actualiza y completar las retira, sin copiar eventos independientes.

SQLite v2 permite referencias opcionales sin perder registros v1. Identificadores únicos de expo-crypto. Inicio no inventa porcentaje completado. Validaciones numéricas rechazan vacíos, decimales y valores fuera de rango.

Typecheck y lint aprobados; 43 pruebas en 6 suites. Pruebas nuevas: migración v1→v2 con progreso preservado, CRUD con relaciones, filtros en medianoche Bogotá, formulario nativo y confirmación de eliminación. Expo Doctor 21/21 e install --check aprobados tras añadir DateTimePicker.

Auditoría actual: 15 avisos moderados (el selector también depende del config plugin afectado), cero altos/críticos; son las mismas dos dependencias raíz indicadas arriba.

Siguiente: detalle de materias, exámenes/sesiones persistentes y calendario semanal. Continúa pendiente la prueba en teléfono de la fundación, Home y tareas.

## Corrección de Expo Go Android — 10 de septiembre de 2026

El teléfono alcanzó la app mediante ngrok, pero el render inicial falló al formatear bigint con Intl. El formateador ahora usa plantillas numéricas pequeñas y conserva los importes como texto exacto. Regresión reproducida antes del cambio; 58 pruebas aprobadas después, incluidas cantidades negativas, centavos, límites de 64 bits y construcción del dashboard bajo la restricción de Hermes. Typecheck, lint y exportación Android/iOS aprobados. Túnel HTTP 200 y código corregido comprobado en el bundle servido por Metro. La recarga y comprobación visual del teléfono siguen pendientes; estas verificaciones no las sustituyen.

## Voz y órdenes — avance solicitado por el usuario

Se adelanta una parte de las fases 4 y 6 a petición explícita: dictado Android mediante el servicio del sistema, respuestas habladas en español, selección/silencio de voz, conversación de sesión y confirmación por voz o botón. Expo Go se conserva; iOS usa dictado del teclado. No se promete timbre idéntico al personaje cinematográfico ni reconocimiento continuo.

Órdenes: gastos/ingresos COP con números escritos o hablados, tareas Inbox, inicio/completado de tareas y hábitos de hoy. Propuestas sin escrituras hasta confirmar. SQLite v3 migra datos y registra recibos atómicos para reintentos sin duplicación. Se usa fecha real de Bogotá y se actualiza el contexto al regresar a la app. Consulta de Stitch y adaptación con StyleSheet/tokens documentadas en DESIGN_SYNC.md.

Las comprobaciones automatizadas y los límites de compatibilidad se detallan en README.md y JARVIS_VOICE.md. Prueba de micrófono, timbre y layout en teléfono pendiente; no se infiere del bundle ni de mocks.

Validación: 123 pruebas en 11 suites, typecheck y lint aprobados; Android/iOS exportados. Manifiesto y bundle de desarrollo Android HTTP 200 con módulos de voz y acciones presentes. Versiones cotejadas con bundledNativeModules del SDK 57; expo install --check en modo offline no encontró desajustes. La instalación mantiene 15 avisos moderados transitivos, sin cambio respecto al estado previo.

## Ollama local — avance solicitado por el usuario

JARVIS integra el endpoint nativo `/api/chat` de Ollama para que `qwen3.5:4b` responda la conversación desde el computador del usuario. La URL y modelo se guardan en AsyncStorage y el chat ofrece una comprobación de `/api/tags`. El modelo recibe un contexto acotado y de solo lectura; las acciones de gastos, tareas y hábitos permanecen en el intérprete local y requieren confirmación antes de SQLite. Android permite tráfico HTTP únicamente para la LAN privada configurada por el usuario; no se expone un backend ni un túnel para Ollama.

La validación automatizada cubre cliente, modelo instalado y delimitación del contexto, además de la compatibilidad de preferencias anteriores. Typecheck, lint y Jest se ejecutaron. La conexión real desde teléfono y el comportamiento/latencia de `qwen3.5:4b` siguen pendientes de validación en la red del usuario; una exportación o mock no la sustituye.

## Rediseño visual «Machined Obsidian» — 13 de septiembre de 2026

Rediseño solicitado explícitamente por el usuario: la interfaz anterior se sentía estática y genérica. El sistema visual pasa de Calm Palette (azul marino y cian) a grafito con acento carmesí usado como luz que escapa por las juntas. La especificación completa está en `docs/DESIGN_SYNC.md`; los cambios que cruzan el límite con Codex están en `docs/AI_HANDOFF.md` (SD-001, SD-002, IN-001, IN-002).

Fundación: `src/theme/tokens.ts` reescrito (grafitos, `edge`, `dim`, `ember`; radios 2/6/10; escala de espacio y duraciones de motion). `primitives.tsx` sustituye `Card`/`SectionTitle` por `Plate`/`SectionMarker` y añade `Section`, `Seam`, `Rail`, `DataRow`; `Button` cambia el booleano `secondary` por `variant`. Se eliminaron los tokens `blue` e `indigo`.

Núcleo: `src/components/jarvis/core.tsx` es el único elemento animado; sus cinco estados se derivan de estado real (escucha, petición a Ollama, escritura en curso, voz hablando, cerebro local apagado o inalcanzable). Solo transform y opacidad; respeta `useReducedMotion`. Aparece en el encabezado del chat, en el dock y en el arranque.

Pantallas rehechas: Inicio (el briefing es el titular tipográfico y una sola tarea focal lleva el riel carmesí), chat de JARVIS (las respuestas son texto con riel en lugar de burbujas; la voz es la acción primaria), Tareas (filas pulsables memoizadas en lugar de tarjetas con botón por ítem), Agenda (tira semanal con marcas reales de ocupación y entregas), Finanzas (importes sin color por signo), Universidad, Perfil (consola del sistema) y los estados de arranque y error.

Validación ejecutada: `npx tsc --noEmit` sin errores, `npm run lint` con cero advertencias y `npm test` con 146 pruebas en 15 suites, incluida una suite nueva del núcleo. Se conservaron todas las etiquetas de accesibilidad y los textos visibles que las pruebas existentes verifican.

Pendiente y no sustituible por lo anterior: comprobación en teléfono de safe areas, teclado, tipografías, rendimiento de la animación y medidas reales del dock. La revisión visual de esta sesión se hizo sobre una aproximación HTML con los mismos tokens a 390 px, que no es el render de React Native.

## Rediseño visual «Illuminated HUD» — 14 de septiembre de 2026

El usuario indicó que el sistema anterior (grafito mate con carmesí) se veía soso y aportó un video de referencia: `https://www.youtube.com/watch?v=FzE-UYBe8co`. Se inspeccionaron los fotogramas del minuto 0:55 al 1:15, donde aparece la aplicación real. De ahí se tomaron el dial HUD circular, el brillo sobre elementos vivos, las etiquetas monoespaciadas con tracking, los puntos de color por categoría y los controles circulares. No se tomó la disposición de tres paneles ni el grafo de partículas, que no caben en un teléfono.

Paleta elegida por el usuario: cian como color del sistema, verde como actividad viva y carmesí reservado a urgencias reales. Ese último punto está codificado en `isUrgent()` (`src/features/tasks/urgency.ts`): una entrega vencida o a menos de 24 horas. Nada más puede poner un elemento en rojo.

Nuevo: `src/components/jarvis/dial.tsx` (instrumento principal, anillos de marcas y arcos giratorios construidos con Views y transforms, sin dependencia de SVG), primitivos `Dot` y `OrbButton`, y `categoryColor()` para dar a cada materia o categoría de gasto un tono estable. El núcleo compacto (`core.tsx`) recibió halo de brillo. Radios ampliados a 10/16 y controles de comando en forma de píldora.

El dial aparece como estado vacío de la pestaña JARVIS y cede el espacio a la conversación en cuanto hay mensajes; el compositor pasó a campo tipo píldora con micrófono y envío circulares.

Validación ejecutada: `npx tsc --noEmit` sin errores, `npm run lint` con cero advertencias y `npm test` con 152 pruebas en 16 suites, incluida una suite nueva del dial. Se conservaron todas las etiquetas de accesibilidad y los textos verificados por las pruebas.

Sigue pendiente la comprobación en teléfono: brillo real sobre OLED, rendimiento de los 72 Views del dial en gama media, safe areas y teclado. La revisión visual se hizo de nuevo sobre una aproximación HTML a 390 px con los mismos tokens, que no sustituye al render nativo.

## Backend multi-agente del taller — 15 de septiembre de 2026

El PDF del segundo corte cambia el alcance de producción: exige un backend local autoalojado accesible por Tailscale, orquestación con function calling, agentes de Secretaría y Finanzas, correo e ingesta bancaria automática. Se añadió `backend/app` con FastAPI, Ollama, herramientas tipadas, propuestas confirmables e idempotentes, webhook bancario con structured output y SQLite relacional. El modo local del móvil se conserva como fallback.

La trazabilidad completa está en `docs/WORKSHOP_REQUIREMENTS.md`; la topología, secuencias y esquema relacional están en `docs/MULTI_AGENT_BACKEND.md`. Pruebas automáticas del servidor y cliente móvil cubren enrutamiento combinado, confirmación sin duplicados, seguridad del webhook, integridad y contrato HTTP. Pendientes no simulables: cuenta IMAP real, Tailscale desde datos móviles, automatización Shortcuts/Tasker, integración visual del modo servidor y video demostrativo.
