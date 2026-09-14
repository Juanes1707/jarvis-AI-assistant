# JARVIS — Stitch → React Native

Proyecto: [JARVIS Student Command Center](https://stitch.withgoogle.com/projects/11174925214121356476), ID 11174925214121356476. MCP google_stitch consultado nuevamente durante la migración móvil del 8 de septiembre de 2026. No se modificó el proyecto en Stitch.

## Evidencia

14 pantallas MOBILE: siete visibles y siete versiones históricas ocultas en screenInstances. HTML y capturas completas en docs/stitch/html y docs/stitch/screenshots; metadatos en project.json, all-screens.json y design-systems.json. Originales a 780 px de ancho representan 390 puntos. El HTML se usa solo de referencia.

Precedencia: pantalla visible → HTML renderizado → Calm Quiet-Tech Obsidian → tema global antiguo Cybernetic Neural System. No inferir cronología por orden de API.

## Pantallas vigentes y código nativo

| Stitch / ID | Ruta Expo Router | Componentes | Estado |
|---|---|---|---|
| Dashboard Principal (Calm Palette) · 72d186dee5c244adac6567b0cc7938d6 | /(tabs)/index | Brand, CommandBar, HomeScreen, ProgressEditor, AgendaList, HabitsCard | Portado inicial nativo; comparación en teléfono pendiente |
| Task Manager (Calm Palette) · fcc12e43abef47458c5d6764a765f913 | /(tabs)/tasks; /tasks/new; /tasks/[id]; /tasks/edit/[id] | FlatList, filtros, TaskEditor, ProgressEditor, detalle de prioridad | Crear/editar/reprogramar/iniciar/completar/eliminar implementados; prueba visual en teléfono pendiente |
| Calendario Semanal (Calm Palette) · fb4b8af9daef4453b42e02c3f74c7eda | /(tabs)/calendar | navegación diaria, AgendaList, entregas proyectadas | Vista diaria enlazada a tareas; semana/optimización pendientes |
| Chat y Asistente IA (Dark HUD Edition) · b580f7623c404ce6918929f12c756cf3 | /(tabs)/jarvis | orbe, mensajes, compositor fijo, micrófono, respuestas habladas, tarjeta de confirmación | Órdenes locales y conversación de sesión; validación de voz en dispositivo pendiente |
| University Hub (Dark HUD Edition) · 2a615b1a20a948ab8ae70688f9f801c1 | /university | métricas y lista de materias | Resumen nativo inicial; detalle y flujo académico fase 3 |
| Detalle de Materia (Calm Palette) · c3322a3bd24e48bd8a378b81e1ac5623 | /university/subjects/[id] (prevista) | temas, evaluaciones, materiales | Pendiente fase 3 |
| Finanzas Personales (Dark HUD Edition) · 164d8eaf8b3841fe9959b95894f4c321 | /finances | saldo, presupuesto, movimientos | Lectura calculada; edición/metas fase 4 |
| Perfil (sin referencia propia) | /(tabs)/profile | perfil demo, Switch de preferencias | Base nativa derivada del tema común |

Referencias históricas: dashboard 9a1201abd8e14a249890eeaaa2930636; universidad cecbbd4dc366448b95f844fbf13d91f8; materia 9939f72eadb24a029e3003b71836c555; tareas aa54a6238df94e1f88c724e885a55e5a; calendario 39fb9404c64e44dfbb3248b5bc52d5c3; chat 290785ba2fdf4712a2f6e5182edb0fc8; finanzas f9d4ac55ec9e4a8ab3ffac775dbe8ccf.

## Sistema visual conservado

- Canvas #0a0e16; superficies #151922, #181c24, #1f2430; texto #dfe2ee, secundario #94a3b8.
- Calm: acentos #7dd3fc, #38bdf8 y #93c5fd; índigo #6366f1; éxito #86efac; coral #fca5a5; ámbar #fcd34d.
- Dark HUD universidad/chat: #0b0f17 y acento #67e8f9; finanzas #00daf3/#4edea3. Foundation comparte tokens Calm; especialización por dominio en sus fases.
- Inter cuerpo, Space Grotesk títulos y JetBrains Mono cifras: TTF empaquetadas para expo-font.
- Ritmo 8 puntos, margen 16, separación 16–24, tarjeta radio 16, controles radio 12, dock 72 más inset inferior.
- Tokens: src/theme/tokens.ts. Primitivas: View/Text/Pressable/ScrollView/FlatList/TextInput; sin DOM.

## Adaptación móvil

Flujo vertical: saludo → comando → briefing → prioridad → agenda → academia → finanzas → hábitos → próximos eventos → alertas → sugerencias. Dock con cinco pestañas y JARVIS central elevado. Sin sidebar ni layout de escritorio.

SafeAreaProvider, SafeAreaView, manejo de teclado, modales nativos, controles de 48 puntos, etiquetas de 12 puntos y fuente escalable. Las listas de tareas se virtualizan. Se conserva jerarquía y se adapta contenido largo mediante flexWrap y scroll.

Los avatares AIDA de Stitch se sustituyen por iniciales; MaterialCommunityIcons aporta un robot genérico. No se reproducen “Synced”, latencias, confianza ni modelo IA ficticios. Los datos de ejemplo y el modo local son explícitos. Los resúmenes y órdenes ahora usan la fecha real de Bogotá. Add global sigue pendiente.

El chat se consultó nuevamente con get_screen del MCP google_stitch y se inspeccionó su captura. Se conservan encabezado con orbe, mensajes del usuario desplazados a la derecha, tarjetas del asistente, acento azul, accesos rápidos y compositor inferior con micrófono. Los estados Escuchando/Hablando/Guardando corresponden a operaciones reales. La tarjeta de confirmación muestra importe/fecha o tarea/hábito antes de persistir. Los ajustes de voz usan tokens y controles nativos.

## Verificación

Las capturas del prototipo web anterior no validan esta versión móvil. El portado se contrasta con los tokens y la referencia visual guardada; falta comparación renderizada en teléfono. Registrar typecheck, lint, Jest, exportación Android/iOS y estado de Metro en docs/IMPLEMENTATION_PLAN.md al finalizar la fase.

Task Manager se consultó nuevamente mediante get_screen en google_stitch y se inspeccionó su captura completa. Se conservaron filtros horizontales, tarjetas verticales, etiquetas de materia, prioridad y progreso. El formulario y detalle usan primitivas del mismo tema; el selector de fecha es nativo. No se reproduce la ponderación decorativa de la maqueta como si fuera el algoritmo implementado ni se muestran acciones Pomodoro/IA no disponibles.
