const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
const candidates = process.platform === "win32"
  ? [join(root, "backend", ".venv", "Scripts", "python.exe"), "python"]
  : [join(root, "backend", ".venv", "bin", "python"), "python3", "python"];
const python = candidates.find(candidate => candidate === "python" || candidate === "python3" || existsSync(candidate));
const command = process.argv[2];
const args = command === "test"
  ? ["-m", "unittest", "discover", "-s", "backend/tests", "-t", "backend", "-v"]
  : command === "start"
    ? [
      "-m", "uvicorn", "app.main:app", "--app-dir", "backend",
      "--host", process.env.JARVIS_HOST || "127.0.0.1",
      "--port", process.env.JARVIS_PORT || "8787",
    ]
    : null;

if (!python || !args) {
  console.error("Uso: node scripts/python-backend.cjs <test|start>");
  process.exit(2);
}
const result = spawnSync(python, args, { cwd: root, stdio: "inherit", env: process.env });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
