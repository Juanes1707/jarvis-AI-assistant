const { execFileSync, spawnSync } = require("node:child_process");
const { join } = require("node:path");
const { runPairing } = require("./backend-pair-utils.cjs");

function readServeStatus() {
  return execFileSync("tailscale", ["serve", "status"], {
    encoding: "utf8",
    windowsHide: true,
  });
}

function copyProtectedToken() {
  if (process.platform !== "win32") {
    throw new Error("El emparejamiento protegido de JARVIS requiere Windows.");
  }
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", join(__dirname, "copy-backend-token.ps1"),
    ],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "No pude copiar el token protegido.").trim());
  }
}

runPairing({ readServeStatus, copyProtectedToken })
  .then(output => console.log(output))
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
