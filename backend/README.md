# Backend local multi-agente de JARVIS

Servidor FastAPI autoalojado que implementa la arquitectura pedida por el taller: orquestador central, agentes de Secretaría y Finanzas, Ollama con function calling, persistencia relacional y webhook bancario. El móvil lo alcanza por la IP privada de Tailscale; no se debe publicar el puerto en Internet.

## Preparación en Windows

Desde la raíz del repositorio:

```powershell
python -m venv backend/.venv
backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements-dev.txt
```

Genera dos secretos diferentes y guardalos cifrados con DPAPI, fuera del repositorio:

```powershell
npm run backend:secrets
```

Configura una sola vez el proxy HTTPS privado de Tailscale. Tailscale puede mostrar un enlace oficial para habilitar Serve en la tailnet:

```powershell
npm run backend:tailscale
```

Después inicia el backend:

```powershell
npm run backend:start
```

Los tokens se descifran solo durante ese proceso y se eliminan de su entorno al terminar. `tailscale serve` mostrará una URL HTTPS `https://<equipo>.<tailnet>.ts.net`; usa esa URL en el móvil. El backend queda escuchando solo en `127.0.0.1` y Tailscale termina TLS dentro de la tailnet. No uses `tailscale funnel`, porque Funnel haría público el servicio.

Si prefieres administrar las variables manualmente, `npm run backend:start:env` conserva el flujo anterior y exige `JARVIS_API_TOKEN` y `JARVIS_WEBHOOK_TOKEN` en el entorno.

`JARVIS_API_TOKEN` y `JARVIS_WEBHOOK_TOKEN` son obligatorios, distintos y deben tener 24 caracteres o más. `backend:secrets` los guarda en `%LOCALAPPDATA%\JARVIS` protegidos para el usuario actual de Windows. No los guardes en el repositorio ni los pongas en variables `EXPO_PUBLIC_*`.

## Endpoints

| Método y ruta | Autenticación | Uso |
|---|---|---|
| `GET /health` | Ninguna | Comprobación mínima, sin datos internos |
| `GET /v1/agents/status` | Bearer | Estado real de Ollama, correo y base |
| `POST /v1/assistant/messages` | Bearer | Enrutamiento y function calling multi-agente |
| `POST /v1/actions/{id}/confirm` | Bearer | Confirmación idempotente de una propuesta |
| `POST /v1/emails/sync` | Bearer | Lectura de no leídos mediante IMAP en modo solo lectura |
| `POST /v1/webhooks/bank-events` | `X-Jarvis-Webhook-Token` | Ingesta bancaria automática y deduplicada |

Las operaciones de escritura que llegan por conversación no se ejecutan durante el function calling. El servidor persiste una propuesta; la app debe mostrarla y llamar al endpoint de confirmación. Los reintentos de la misma confirmación devuelven el recibo anterior sin duplicar el cambio.

El webhook bancario es deliberadamente distinto: representa una automatización previamente autorizada. Usa structured output de Ollama, exige una confianza mínima de 0,65, persiste el movimiento sin interacción y deduplica por `event_id`. El texto bancario crudo se procesa en memoria; la base conserva solo su hash y los campos estructurados.

## Correo opcional

Configura IMAP con variables de entorno. La contraseña o token de aplicación permanece en el computador y nunca se devuelve al móvil:

```powershell
$env:JARVIS_IMAP_HOST = "imap.example.com"
$env:JARVIS_IMAP_PORT = "993"
$env:JARVIS_IMAP_USERNAME = "usuario@example.com"
$env:JARVIS_IMAP_PASSWORD = "<token de aplicación>"
```

La integración importa mensajes no leídos y permite consultar/resumirlos. La redacción crea borradores confirmados; esta versión no envía correos para evitar efectos externos accidentales.

## Pruebas

Con el entorno virtual activado:

```powershell
python -m unittest discover -s backend/tests -t backend -v
```
