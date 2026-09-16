# JARVIS — arquitectura móvil

Aplicación nativa Android/iOS con React Native, Expo y Expo Router en la raíz. El prototipo Next.js fue una interpretación incorrecta de plataforma; respaldo local en artifacts/legacy-web-before-mobile.zip (ignorado por Git).

## Capas

- src/app: rutas y navegación; Inicio, Tareas, JARVIS, Agenda y Perfil.
- src/components: primitivas nativas, safe areas, tarjetas y controles táctiles.
- src/theme: colores Calm Palette, espacios, radios y fuentes de Stitch.
- src/domain: modelos de universidad, productividad, finanzas y asistente.
- src/features: composición de pantallas, sin cálculos de dominio en JSX.
- src/engines y src/lib: lógica pura de prioridad, agenda, briefing y dinero.
- src/services/storage: migraciones SQLite, seed idempotente, repositorios y preferencias.
- src/features/jarvis: intérprete puro de órdenes, importes hablados y conversación con propuestas.
- src/services/voice: dictado Android y respuestas con expo-speech; adaptadores separados de los cambios de datos.

JARVIS conserva dos modos explícitos. El modo local funciona como antes: UI → contexto local → repositorios → SQLite del dispositivo. El modo distribuido exigido por el taller usa UI móvil → cliente tipado → FastAPI por Tailscale → orquestador → agentes → SQLite del servidor. Funciones puras producen los resúmenes y todas las escrituras conversacionales requieren confirmación. No se ejecuta SQL ni código procedente del texto del usuario.

## Modo distribuido multi-agente

`backend/app` contiene un servidor FastAPI autoalojado. El orquestador entrega a Ollama un catálogo cerrado de funciones; las llamadas se validan con Pydantic y se delegan a Secretaría, Finanzas o a ambos. Secretaría gestiona tareas, recordatorios, correo IMAP de solo lectura y borradores. Finanzas gestiona movimientos, liquidez, pasivos y metas. El webhook bancario usa salida JSON estructurada y una credencial independiente.

La persistencia del servidor usa SQLite relacional como alternativa justificada a Supabase/PocketBase: claves foráneas, checks, índices y migraciones transaccionales. La interfaz de repositorios permite reemplazarla por PostgreSQL sin cambiar el contrato HTTP. El detalle técnico, secuencias y esquema están en `docs/MULTI_AGENT_BACKEND.md`.

## Datos y tiempo

Datos de ejemplo identificados de septiembre de 2026. WorkspaceProvider usa el reloj actual, lo actualiza cada minuto y al volver al primer plano; «hoy» se resuelve en Bogotá. Las pruebas puras pueden inyectar una fecha fija. Instantes UTC y fechas civiles separados. Dinero en centavos bigint en motores y cadenas decimales al persistir, sin pérdida por Number.

Migraciones versionadas y seed transaccional único. Reiniciar no reinicia progreso ni hábitos. Preferencias pequeñas en AsyncStorage. Sin credenciales bancarias ni tokens remotos.

SQLite v2 permite tareas sin materia/fecha para Inbox y conserva datos v1 mediante copia transaccional antes de sustituir la tabla. Los formularios validan títulos y enteros; progreso 100 corresponde siempre a COMPLETED. El estado de inicio no implica trabajo completado. Las entregas de agenda se derivan de tareas pendientes y se actualizan al editar la tarea.

## Alcance y validación

Fundación móvil y portado inicial del Home existente. Otras áreas empiezan como vistas locales navegables; sus flujos completos pertenecen a fases posteriores. Asistente por reglas con entrada de voz y respuestas habladas; IA remota y sincronización pendientes.

## Órdenes por voz

Dictado del sistema → texto → interpretCommand (puro, sin escrituras) → propuesta visible/hablada → confirmación → executeJarvisAction → SQLite → recarga del contexto. La misma ruta recibe mensajes escritos. Solo se admiten acciones tipadas; no se evalúa código ni SQL procedente del texto.

SQLite v3 añade jarvis_actions. Cada propuesta tiene un UUID y el recibo se confirma en la misma transacción que la escritura. Reintentos de la misma propuesta no duplican gastos ni tareas, incluso si la recarga de UI falló después del commit. Reutilizar un ID para otro contenido se rechaza. Las versiones v1/v2 se migran sin reponer seed ni perder datos.

Reconocimiento mediante RecognizerIntent en Android; iOS conserva el dictado del teclado. expo-speech selecciona una voz instalada en español, permite silenciar y detiene la cola al escuchar o abandonar la pantalla. El servicio de reconocimiento del sistema puede enviar audio a su proveedor; la app no almacena grabaciones. El modo local no requiere backend; el modo evaluado del taller sí usa el backend autoalojado y dos tokens configurados por el usuario.

TypeScript, ESLint, Jest, React Native Testing Library y exportación Metro Android/iOS. Exportar comprueba el grafo y bytecode; safe areas, teclado, fuentes y persistencia nativa requieren ejecución en Expo Go. Windows no ofrece simulador iOS.
