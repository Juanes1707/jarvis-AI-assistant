# JARVIS Mobile

Centro de comando personal para Android/iOS. React Native + Expo + Expo Router en la raíz, basado en **JARVIS Student Command Center** de Google Stitch.

## Ejecutar en teléfono

Node 24 y Expo Go compatible con SDK 57.

```powershell
npm install
npx expo start
```

Conecta teléfono y computador a la misma red. Abre el QR con Expo Go en Android o con la cámara en iOS. Para emulador Android instalado: npm run android. El simulador iOS requiere macOS. Si Metro ya está en 8081, reutilízalo o detén esa terminal antes de iniciar otro.

Para conectar el celular desde otra red o con datos móviles:

```powershell
npm run start:tunnel
```

Este comando usa tu cuenta personal mediante el SDK oficial @ngrok/ngrok, y arranca Metro automáticamente. El QR utiliza exps:// para una conexión HTTPS. Ambos dispositivos necesitan internet; conserva la terminal y el computador encendidos. Ctrl+C cierra el túnel y Metro. Se guarda también un QR en artifacts/tunnel/expo-go.png cuando Metro está listo.

Antes del primer arranque en Windows:

1. Abre https://dashboard.ngrok.com/get-started/your-authtoken e inicia sesión en tu cuenta.
2. Ejecuta npm run ngrok:configure y pega el authtoken en la entrada oculta de la terminal.
3. Ejecuta npm run start:tunnel y escanea el QR con Expo Go (Android) o la cámara (iOS).

El authtoken se cifra con DPAPI en %LOCALAPPDATA%/JARVIS/ngrok-token.dpapi. Solo tu usuario de Windows puede descifrarlo. El token no se pasa al proceso Metro ni al bundle móvil. Para reemplazarlo, repite ngrok:configure. No pegar tokens en el chat ni en archivos versionados.

El túnel incorporado de Expo devolvió ERR_NGROK_108 por el límite de sesiones de su cuenta compartida. Por eso se usa la cuenta propia; la conexión personal se comprobó el 10 de septiembre de 2026. Puedes comprobar las utilidades con npm run test:tunnel.

El modo local sigue funcionando sin cuenta, claves, base externa ni navegador. El modo evaluado por el taller añade un backend FastAPI autoalojado, accesible únicamente por Tailscale. Incluye datos de ejemplo de septiembre de 2026; las órdenes, agenda y resúmenes usan la fecha actual en Bogotá.

## Implementado

- Cinco pestañas nativas: Inicio, Tareas, JARVIS, Agenda y Perfil.
- Home con briefing, prioridad explicada, agenda, resumen académico/financiero, hábitos y alertas.
- Tareas: crear, editar, reprogramar, iniciar, completar y eliminar con confirmación; Inbox y seis filtros.
- Tareas, hábitos y movimientos en SQLite; preferencias en AsyncStorage. Entregas enlazadas a la agenda.
- Agenda diaria, materias y finanzas de consulta.
- Entrada libre sin preguntas sugeridas ni respuestas fingidas: en modo Servidor u Ollama cada consulta va al modelo; el motor básico por reglas queda identificado únicamente como fallback explícito.
- Cerebro conversacional opcional con Ollama y `qwen3.5:4b`, conectado directamente por la red local; las acciones siguen siendo deterministas y confirmadas.
- Backend local multi-agente con orquestador, Secretaría, Finanzas, function calling, correo IMAP, webhook bancario y persistencia relacional.
- Inter, Space Grotesk, JetBrains Mono; sistema visual Illuminated HUD y dock central nativo.

El sistema académico completo, edición avanzada de finanzas, proyectos, documentos e IA remota avanzan por fases. El asistente conserva los últimos 40 mensajes mientras está montado; el historial persistente sigue pendiente.

## Backend multi-agente y Tailscale

El backend del taller vive en `backend/`. No reemplaza silenciosamente el modo local: es un modo distribuido separado y el cliente móvil tipado está en `src/services/backend/client.ts`. En Windows, `npm run backend:secrets` genera y cifra con DPAPI los dos tokens, `npm run backend:tailscale` configura el HTTPS privado, `npm run backend:start` arranca FastAPI sin exponer el puerto a la LAN y `npm run backend:pair` copia el token al portapapeles sin imprimirlo para configurar el teléfono. Consulta [backend/README.md](backend/README.md) para la preparación completa y [docs/MULTI_AGENT_BACKEND.md](docs/MULTI_AGENT_BACKEND.md) para la topología, secuencias, esquema relacional y configuración de Tailscale.

La integración visual para guardar URL/token y mostrar propuestas del backend está registrada en `docs/AI_HANDOFF.md` como `X2C-001`, porque pertenece al frontend. Mientras se completa, la aplicación visible mantiene el modo local y Ollama directo.

## Hablar con JARVIS

En Expo Go Android, abre JARVIS y pulsa **Hablar con JARVIS**. Se abrirá el reconocimiento de voz del sistema. Di «agrega un gasto de cien mil pesos hoy»; JARVIS mostrará y leerá el importe y la fecha. Pulsa de nuevo el micrófono y di «confirmar», o toca Confirmar cambio. «Cancelar» descarta la propuesta. El gasto se reflejará en Finanzas e Inicio y seguirá guardado al cerrar la app.

También entiende «registra un ingreso de dos millones hoy», «crea una tarea repasar integrales», «completa la tarea taller de Lagrange» y «marca el hábito alemán hoy». Interpreta una acción a la vez; los ejemplos y límites están en docs/JARVIS_VOICE.md.

El botón **Voz** permite escuchar una muestra, elegir una voz en español del teléfono y desactivar las respuestas habladas. El perfil tiene tono grave y ritmo sereno; no reproduce una grabación ni una clonación de la voz de la película.

Usa expo-speech y expo-intent-launcher, incluidos en Expo Go. Android necesita un servicio que atienda el reconocimiento de voz; este puede usar Internet. En iPhone, dicta con el micrófono del teclado y pulsa Enviar; la respuesta hablada funciona con el modo silencio desactivado. No hay escucha continua ni palabra de activación en segundo plano.

## Atajo del teléfono

JARVIS responde al enlace `jarvis://talk`. Al abrirlo, la app entra directo a la conversación y **abre el micrófono sola**: no hay que tocar nada, solo hablar. Al terminar de dictar, la orden se envía igual que si la hubieras escrito.

Probarlo hoy en Expo Go, sin compilar nada:

```bash
npx uri-scheme open "exp://127.0.0.1:8081/--/talk" --android
```

Cambia la dirección por la que imprime `npx expo start`. Ese enlace ya funciona y sirve para comprobar que el micrófono se abre solo.

Para tener un icono real en la pantalla de inicio necesitas salir de Expo Go y compilar la app una vez, porque mientras vivas en Expo Go el esquema `jarvis://` le pertenece a Expo Go y no a JARVIS:

```bash
npx expo run:android
```

Con la app instalada, `jarvis://talk` es suyo. Para ponerlo en la pantalla de inicio, cualquier app de atajos (Shortcut Maker, Tasker, MacroDroid) crea un icono que abra esa URL. Si usas Tasker, además puedes atarlo a un gesto del sistema.

Sobre el doble clic del botón de apagado: ese gesto concreto no está disponible para apps de terceros en Android estándar, está reservado a la cámara. Algunas capas de fabricante (Samsung, Xiaomi) permiten remapearlo desde los ajustes del teléfono a la app que elijas; eso se configura en el sistema, no en JARVIS. En Android 12 o superior, **Pulsación rápida** (doble toque en la parte de atrás del teléfono) también puede abrir la app sin necesidad de nada más.

`android.package` e `ios.bundleIdentifier` están fijados en `app.json` como `com.juanesteban.jarvis`. Cámbialos antes de la primera compilación si prefieres otro identificador: después de instalar la app, cambiarlo equivale a una app distinta.

## Conectar Ollama como cerebro local

JARVIS puede consultar tu instalación local de Ollama para responder conversaciones y analizar el contexto de tu agenda, tareas y finanzas. Abre **JARVIS → Ajustes → Cerebro local: Ollama**, escribe la IPv4 privada de tu computador y el nombre exacto de tu modelo (el valor inicial es `qwen3.5:4b`), prueba la conexión y activa el interruptor.

En un teléfono no uses `localhost`: apunta a una dirección como `http://192.168.1.20:11434`, mantén ambos equipos en la misma Wi‑Fi y ejecuta Ollama escuchando en la red local. Consulta la guía completa, incluida la configuración de Windows y el Firewall, en [docs/OLLAMA_LOCAL.md](docs/OLLAMA_LOCAL.md). El modelo no ejecuta cambios por sí mismo: gastos, tareas y hábitos se siguen proponiendo y confirmando localmente.

## Comprobaciones

```powershell
npm run typecheck
npm run lint
npm test
npm run test:backend
npm run export:native
npx expo-doctor
```

123 pruebas aprobadas, incluyendo órdenes dictadas, confirmación/cancelación, errores de voz, dinero exacto, migración SQLite v3 y reintentos sin duplicación después de reabrir el archivo. Typecheck, lint y bundles Android/iOS aprobados. El bundle de desarrollo Android servido por Metro contiene los nuevos módulos. La voz, el dictado y la comparación visual siguen pendientes de validación en teléfono. Avisos transitivos npm documentados en el plan antes de distribución.

Documentación: docs/ARCHITECTURE.md, docs/DESIGN_SYNC.md, docs/IMPLEMENTATION_PLAN.md, docs/DECISIONS.md y docs/MASTER_PROMPT.md.

Prototipo web conservado en artifacts/legacy-web-source y artifacts/legacy-web-before-mobile.zip, excluidos de Git y Metro. Se reutilizaron motores y validaciones; la UI activa no usa Next.js ni DOM.
