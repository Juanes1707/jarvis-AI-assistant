# Cerebro local con Ollama

JARVIS puede usar un modelo que ya está instalado en Ollama como cerebro conversacional. La conexión es directa desde la aplicación móvil a Ollama en el computador: no requiere una cuenta, API key ni backend de JARVIS.

Las órdenes que crean o modifican datos no se delegan al modelo. La aplicación las interpreta localmente y conserva la tarjeta de confirmación antes de escribir en SQLite. El modelo recibe únicamente un resumen de lectura de tareas, agenda y movimientos recientes para responder y sugerir.

## Preparar el computador Windows

Comprueba el nombre exacto del modelo:

```powershell
ollama list
```

Para que el teléfono pueda alcanzar el servicio, abre una terminal de PowerShell y ejecuta:

```powershell
$env:OLLAMA_HOST = "0.0.0.0:11434"
ollama serve
```

Mantén esa terminal abierta mientras uses JARVIS. Si Ollama ya se está ejecutando en segundo plano, reinícialo después de definir `OLLAMA_HOST` para que escuche fuera de `localhost`.

Busca la dirección IPv4 de la conexión Wi‑Fi con `ipconfig`. En la app escribirás, por ejemplo, `http://192.168.1.20:11434`, no `localhost`. El teléfono y el computador deben estar en la misma red Wi‑Fi. Permite el puerto TCP 11434 solo en redes privadas si el Firewall de Windows lo solicita.

Puedes comprobar Ollama en el computador antes de abrir la app:

```powershell
Invoke-RestMethod http://localhost:11434/api/tags
```

## Activarlo en JARVIS

1. Abre la pestaña **JARVIS** y pulsa **Ajustes**.
2. En **Cerebro local: Ollama**, escribe la dirección IPv4 y el nombre que devuelve `ollama list` (por defecto `qwen3.5:4b`).
3. Pulsa **Guardar cerebro local**, luego **Probar conexión**.
4. Activa **Usar Ollama para conversar**.

El estado superior mostrará **CEREBRO LOCAL ACTIVO** y **PENSANDO LOCALMENTE** durante una consulta. Si no hay conexión, JARVIS explica el problema y conserva la respuesta local por reglas, sin perder ni enviar datos a un proveedor externo.

Para un emulador Android que corre en el mismo PC se suele usar `http://10.0.2.2:11434`; en un teléfono físico, usa siempre la IPv4 privada del PC.

## Seguridad y límites

- Esta configuración usa HTTP para una LAN privada. No expongas el puerto 11434 a Internet ni abras el Firewall para redes públicas.
- La dirección y el modelo se guardan solo en las preferencias locales del dispositivo; no se almacenan claves.
- La primera respuesta de un modelo de 4B puede demorar mientras Ollama lo carga. JARVIS corta una petición tras 45 segundos para evitar que el chat quede bloqueado.
- El reconocimiento de voz de Android es independiente de Ollama y puede usar el servicio configurado por el teléfono.
