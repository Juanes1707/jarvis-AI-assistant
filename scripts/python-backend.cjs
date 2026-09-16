const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
const { inspectBackend } = require("./backend-start-utils.cjs");

const root = join(__dirname, "..");
const candidates = process.platform === "win32"
  ? [join(root, "backend", ".venv", "Scripts", "python.exe"), "python"]
  : [join(root, "backend", ".venv", "bin", "python"), "python3", "python"];
const python = candidates.find(candidate => candidate === "python" || candidate === "python3" || existsSync(candidate));
const command = process.argv[2];
const host = process.env.JARVIS_HOST || "127.0.0.1";
const port = Number(process.env.JARVIS_PORT || "8787");
const args = command === "test"
  ? ["-m", "unittest", "discover", "-s", "backend/tests", "-t", "backend", "-v"]
  : command === "start"
    ? [
      "-m", "uvicorn", "app.main:app", "--app-dir", "backend",
      "--host", host,
      "--port", String(port),
    ]
    : null;

async function main() {
  if (!python || !args || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("Uso: node scripts/python-backend.cjs <test|start>");
    return 2;
  }
  if (command === "start") {
    const inspection = await inspectBackend(host, port);
    if (inspection.state === "healthy") {
      console.log(`JARVIS ya está ejecutándose en http://${host}:${port}.`);
      console.log("No se inició una segunda instancia.");
      return 0;
    }
    if (inspection.state === "occupied") {
      console.error(`El puerto ${host}:${port} está ocupado por otro servicio que no responde como JARVIS.`);
      return 1;
    }
  }
  const result = spawnSync(python, args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.error) {
    console.error(result.error.message);
    return 1;
  }
  return result.status ?? 1;
}

main()
  .then(code => { process.exitCode = code; })
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
