function privateTailnetUrl(status) {
  for (const line of String(status).split(/\r?\n/)) {
    const match = line.trim().match(/^(https:\/\/\S+) \(tailnet only\)$/);
    if (match) return match[1];
  }
  return null;
}

async function runPairing({ readServeStatus, copyProtectedToken }) {
  const url = privateTailnetUrl(await readServeStatus());
  if (!url) {
    throw new Error("Tailscale Serve no está configurado como privado. Ejecuta npm run backend:tailscale.");
  }
  await copyProtectedToken();
  return [
    "Configuración segura para el teléfono:",
    `Dirección: ${url}`,
    "El token de acceso está en el portapapeles; pégalo en Ajustes > Servidor JARVIS.",
    "Por seguridad, el token no se imprimió en la terminal.",
  ].join("\n");
}

module.exports = { privateTailnetUrl, runPairing };
