# Decisiones técnicas

1. **Nativo en raíz.** Instrucción del usuario del 8 de septiembre de 2026. Sustituir Next por Expo, conservando lógica pura y respaldo del prototipo.
2. **SDK 57 estable.** Versiones de expo-template-default, validadas con expo install. Usar módulos compatibles con Expo Go. Comprobar SDK admitido por la instalación del teléfono.
3. **StyleSheet + tokens.** Una sola estrategia nativa, sin HTML/CSS. Fuentes Inter, Space Grotesk y JetBrains Mono empaquetadas como TTF.
4. **SQLite + AsyncStorage.** Registros estructurados con migraciones/transacciones en expo-sqlite; solo preferencias en AsyncStorage. Prisma y better-sqlite3 dependen de Node.
5. **Dinero exacto.** Centavos bigint en motores, texto decimal persistido, sin convertir 64 bits a Number.
   En presentación, Intl recibe solo plantillas numéricas pequeñas; pesos y centavos se insertan como texto exacto con agrupación es-CO. Evita el error de Hermes Android al pasar bigint a Intl (captura del dispositivo, 10 de septiembre de 2026). Prueba de regresión reproduce esta restricción también al construir el dashboard.
6. **Estado acotado.** Contexto local pequeño, sin Zustand ni TanStack Query mientras no aporten valor.
7. **IA honesta.** Proveedor por reglas y contexto local; ninguna afirmación de LLM. Confirmar cambios sensibles cuando se implementen.
8. **Accesibilidad.** Márgenes 16, tarjetas 16, etiquetas mínimas 12, blancos táctiles 48, fuentes escalables, safe areas y teclado. Dock central destacado sin recortar el área táctil.
9. **Fidelidad.** Capturas y HTML renderizado prevalecen sobre tema global antiguo. Omitir sincronización y telemetría ficticias de mockups.

Fuentes técnicas consultadas: https://docs.expo.dev/router/installation/ y https://docs.expo.dev/get-started/create-a-project/. Versiones verificadas con la plantilla oficial publicada en npm.

10. **Peers Expo.** react-dom fijado transitivamente a 19.2.3, acorde al React de Expo Go. No representa una plataforma web de la app. No usar --legacy-peer-deps.
11. **Archivo reversible.** La revisión automática rechazó eliminar masivamente el prototipo. Se trasladó a artifacts/legacy-web-source y se verificó el ZIP previo; código y SQLite preservados.
12. **Auditoría.** 14 avisos moderados transitivos del SDK vigente. La corrección automática propone degradaciones incompatibles; pendientes de solución compatible antes de producción.
13. **Fuentes concretas.** Subrutas TTF y MaterialCommunityIcons evitan incluir todas las variantes. Metro excluye archivos de respaldo, docs y .next.

14. **Inbox y SQLite v2.** Materia y fecha opcionales; migración transaccional preserva la tabla v1 antes de reemplazarla. El seed nunca sobrescribe cambios.
15. **Entregas vinculadas.** Agenda proyecta fechas de tareas, sin duplicar eventos editables. Completar/eliminar retira la entrega; reprogramar cambia su fecha. La tarea no bloquea artificialmente una sesión de estudio.
16. **Fecha nativa en Bogotá.** DateTimePicker compatible con Expo Go; zona explícita America/Bogota. El nuevo plugin agrega un aviso transitivo al grupo ya conocido de config-plugins: auditoría actual 15 moderados, ninguno alto/crítico.

17. **Túnel personal de ngrok.** El usuario eligió su propia cuenta tras ERR_NGROK_108 de la cuenta compartida de Expo. SDK oficial @ngrok/ngrok solo de desarrollo. Authtoken introducido por entrada oculta, cifrado DPAPI fuera del repositorio, excluido del entorno de Metro y ocultado en errores. Expo usa EXPO_PACKAGER_PROXY_URL; el QR propio usa exps:// para HTTPS. No se considera verificado el túnel personal hasta autenticar y comprobar el enlace real.
