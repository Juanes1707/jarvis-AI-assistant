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
| 7 · Polish | Android/iOS, accesibilidad, teclado y comparación visual | Pendiente |
| 8 · Producción | Seguridad, arquitectura, builds e interfaces backend | Pendiente |

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
