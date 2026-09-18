# Trazabilidad de requisitos del taller

Fuente de requisitos: `Taller_ Asistente Personal Móvil Multi-Agente con Control por Voz V2.pdf`, entregado por el usuario el 15 de septiembre de 2026. Este documento separa los requisitos académicos del PDF de las decisiones internas del repositorio.

| Requisito evaluado | Evidencia actual | Estado |
|---|---|---|
| App React Native con voz, TTS y respuesta visual | Expo SDK 57, dictado Android, teclado iOS, `expo-speech`, franja de estado de grabación en el compositor y respuestas estructuradas por herramienta | Implementado; validación física pendiente |
| Backend local REST o WebSocket | FastAPI en `backend/app`, endpoints REST autenticados | Implementado |
| Tailscale obligatorio | FastAPI en localhost, Tailscale Serve HTTPS, guía de tailnet sin Funnel y configuración del servidor con token enmascarado en la app | Implementado en arquitectura; prueba real pendiente |
| Orquestador con function calling | `Orchestrator` y herramientas JSON Schema de Ollama | Implementado y probado con dobles |
| Agente de Secretaría | Materias, tareas asociadas, eventos de calendario, prioridad, fecha y recordatorio; consulta IMAP; borradores confirmados | Implementado; cuenta IMAP real pendiente |
| Agente Financiero | Flujo de caja, ingresos/gastos, presupuesto mensual, pasivos, interés, vencimiento y metas de ahorro | Implementado en dominio/persistencia y sincronizado con el workspace móvil |
| Combinar ambos agentes | Varias tool calls y ruta `composite` | Implementado y probado |
| Ingesta bancaria cero-fricción | Webhook con token, JSON estructurado, confianza mínima e idempotencia | Implementado; Shortcuts o Tasker real pendiente |
| Persistencia relacional | PostgreSQL servidor con FK, checks, índices y migraciones transaccionales; SQLite solo en móvil/tests; snapshot autenticado hacia la app | Implementado y probado |
| Seguridad sin puerto público | Tailscale, tokens separados, sin CORS abierto, secretos por entorno | Implementado en código/guía; firewall real pendiente |
| Documento técnico | Topología, dos secuencias y esquema relacional en `MULTI_AGENT_BACKEND.md` | Implementado |
| Video demostrativo de 3 a 5 min | Debe grabarse con teléfono, datos móviles, Tailscale y automatización real | Pendiente del usuario y dispositivos |

## Riesgos y trabajo de integración

El 15 de septiembre de 2026 se cerró `X2C-001`: la aplicación ya expone el modo servidor. El usuario elige entre **Servidor**, **Local** y **Básico** desde un único control, configura la dirección de Tailscale y el token (enmascarado, nunca visible en la conversación), comprueba el estado real de los cuatro subsistemas del backend y ve qué agente respondió cada mensaje junto con los datos que consultó. Las propuestas de escritura siguen pendientes hasta que el usuario confirma, y un reintento reutiliza el mismo `request_id`.

Lo que sigue pendiente no es código de interfaz sino evidencia física, que ninguna prueba automatizada sustituye:

- Conexión real desde datos móviles a la tailnet, con el teléfono y el computador en la misma red Tailscale.
- Una cuenta IMAP real conectada para que Secretaría lea correo.
- Ollama respondiendo con function calling sobre el modelo configurado.
- Dictado y TTS en un teléfono Android e iOS reales.
- Un disparo real del webhook bancario desde Shortcuts, Tasker o el NotificationListener.
- El video demostrativo de 3 a 5 minutos.

La pantalla de Finanzas muestra el flujo de caja y el gasto por categoría del almacenamiento local del teléfono; las tarjetas, los préstamos y las metas de ahorro viven en el servidor y la pantalla lo dice explícitamente en lugar de simularlos.
