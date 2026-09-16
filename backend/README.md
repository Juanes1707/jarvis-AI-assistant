# Backend local multi-agente de JARVIS

Servidor FastAPI autoalojado que implementa la arquitectura pedida por el taller: orquestador central, agentes de Secretaría y Finanzas, Ollama con function calling, persistencia relacional y webhook bancario. El móvil lo alcanza por la IP privada de Tailscale; no se debe publicar el puerto en Internet.

## Preparación en Windows

Abre PowerShell **como administrador** e instala PostgreSQL 17. El script usa el instalador oficial, rota la contraseña administrativa a un valor aleatorio y la cifra con DPAPI para el usuario actual:

```powershell
npm run backend:install-db
```

Desde la raíz del repositorio:

```powershell
python -m venv backend/.venv
backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements-dev.txt
```

Prepara la base `jarvis`, un usuario sin privilegios administrativos y una contraseña aleatoria protegida con DPAPI:

```powershell
npm run backend:database
```

Genera dos secretos diferentes y guardalos cifrados con DPAPI, fuera del repositorio:

```powershell
npm run backend:secrets
```

Cuando Tailscale Serve ya esté configurado, prepara el teléfono sin imprimir la credencial:

```powershell
npm run backend:pair
```

El comando muestra la dirección HTTPS privada y copia únicamente el token de acceso al portapapeles.
Pégalo inmediatamente en **Ajustes > Servidor JARVIS**; ejecutar el comando de nuevo reemplaza el
contenido actual del portapapeles, pero no rota ni expone el token.

Configura una sola vez el proxy HTTPS privado de Tailscale. Tailscale puede mostrar un enlace oficial para habilitar Serve en la tailnet:

```powershell
npm run backend:tailscale
```

Después inicia el backend:

```powershell
npm run backend:start
```

El arranque es idempotente: si JARVIS ya responde correctamente en el puerto configurado, el comando lo informa y termina sin crear otra instancia. Si otro programa ocupa el puerto, falla con un mensaje explícito. Los tokens se descifran solo durante ese proceso y se eliminan de su entorno al terminar. `tailscale serve` mostrará una URL HTTPS `https://<equipo>.<tailnet>.ts.net`; usa esa URL en el móvil. El backend queda escuchando solo en `127.0.0.1` y Tailscale termina TLS dentro de la tailnet. No uses `tailscale funnel`, porque Funnel haría público el servicio.

Si prefieres administrar las variables manualmente, `npm run backend:start:env` exige `JARVIS_API_TOKEN`, `JARVIS_WEBHOOK_TOKEN` y una `JARVIS_DATABASE_URL` con formato `postgresql+psycopg://usuario:contraseña@127.0.0.1:5432/jarvis`.

`JARVIS_API_TOKEN` y `JARVIS_WEBHOOK_TOKEN` son obligatorios, distintos y deben tener 24 caracteres o más. `backend:secrets` los guarda en `%LOCALAPPDATA%\JARVIS` protegidos para el usuario actual de Windows. No los guardes en el repositorio ni los pongas en variables `EXPO_PUBLIC_*`.

## Endpoints

| Método y ruta | Autenticación | Uso |
|---|---|---|
| `GET /health` | Ninguna | Comprobación mínima, sin datos internos |
| `GET /v1/agents/status` | Bearer | Estado real de Ollama, correo y base |
| `GET/PATCH /v1/profile` | Bearer | Consulta o actualización explícita del perfil real |
| `GET/POST /v1/memories` | Bearer | Consulta o creación manual de recuerdos confirmados |
| `DELETE /v1/memories/{id}` | Bearer | Olvido lógico y auditable de un recuerdo |
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
