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
- src/services/ai: proveedor local determinista reemplazable.

UI → contexto local → repositorios → SQLite. Funciones puras producen los resúmenes. Escrituras validadas y actualización de UI después de persistir. Sin Prisma, servidores ni HTTP en el dispositivo.

## Datos y tiempo

Datos de demostración identificados. Fecha del escenario: 8 de septiembre de 2026, 14:00 Bogotá; no se presenta como fecha real. Instantes UTC y fechas civiles separados. Dinero en centavos bigint en motores y cadenas decimales al persistir, sin pérdida por Number.

Migraciones versionadas y seed transaccional único. Reiniciar no reinicia progreso ni hábitos. Preferencias pequeñas en AsyncStorage. Sin credenciales bancarias ni tokens remotos.

SQLite v2 permite tareas sin materia/fecha para Inbox y conserva datos v1 mediante copia transaccional antes de sustituir la tabla. Los formularios validan títulos y enteros; progreso 100 corresponde siempre a COMPLETED. El estado de inicio no implica trabajo completado. Las entregas de agenda se derivan de tareas pendientes y se actualizan al editar la tarea.

## Alcance y validación

Fundación móvil y portado inicial del Home existente. Otras áreas empiezan como vistas locales navegables; sus flujos completos pertenecen a fases posteriores. Asistente local por reglas, sin simular IA remota, voz ni sincronización.

TypeScript, ESLint, Jest, React Native Testing Library y exportación Metro Android/iOS. Exportar comprueba el grafo y bytecode; safe areas, teclado, fuentes y persistencia nativa requieren ejecución en Expo Go. Windows no ofrece simulador iOS.
