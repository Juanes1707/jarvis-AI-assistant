const { spawn } = require("node:child_process");
const { createServer } = require("node:net");
const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve, join } = require("node:path");
const ngrok = require("@ngrok/ngrok");
const { expoGoUrl, metroEnvironment, redact, qrPng, printQr } = require("./tunnel-utils.cjs");
const root = resolve(__dirname, "..");
const token = process.env.NGROK_AUTHTOKEN?.trim();
const port = 8081;
let listener, metro, timer, stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  if (metro && metro.exitCode === null) metro.kill();
  if (listener) await listener.close().catch(() => {});
  process.exit(code);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
function assertPortFree() {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once("error", () => fail(new Error("El puerto 8081 esta ocupado. Deten el Metro anterior con Ctrl+C.")));
    server.listen(port, "127.0.0.1", () => server.close(done));
  });
}
async function waitForMetro() {
  const started = Date.now();
  while (!stopping && Date.now() - started < 120000) {
    if (metro.exitCode !== null) throw new Error("Metro se cerro antes de estar listo.");
    try {
      const response = await fetch("http://127.0.0.1:8081/status", { signal: AbortSignal.timeout(2000) });
      if (response.ok && (await response.text()).includes("packager-status:running")) return;
    } catch {}
    await new Promise(done => setTimeout(done, 500));
  }
  throw new Error("Metro no respondio a tiempo.");
}
async function main() {
  if (!token) throw new Error("Ejecuta npm run ngrok:configure antes de iniciar el tunel.");
  await assertPortFree();
  console.log("Conectando ngrok con tu cuenta...");
  timer = setTimeout(() => { console.error("ngrok no conecto en 60 segundos."); void stop(1); }, 60000);
  listener = await ngrok.forward({ addr: "127.0.0.1:" + port, authtoken: token });
  clearTimeout(timer);
  const url = listener.url(), expoUrl = expoGoUrl(url);
  const expoCli = require.resolve("expo/bin/cli");
  // Expo's --localhost mode prefers the IPv6 loopback interface on Windows.
  // The ngrok upstream below is deliberately IPv4, so use Expo's LAN host mode
  // to make Metro listen on 0.0.0.0 and keep the upstream unambiguous.
  metro = spawn(process.execPath, [expoCli, "start", "--lan", "--go", "--port", String(port)], {
    cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: metroEnvironment(process.env, url),
  });
  metro.stdout.on("data", chunk => process.stdout.write(redact(chunk, token)));
  metro.stderr.on("data", chunk => process.stderr.write(redact(chunk, token)));
  metro.on("error", error => { console.error(redact(error.message, token)); void stop(1); });
  metro.on("exit", code => { if (!stopping) void stop(code ?? 1); });
  await waitForMetro();
  const directory = join(root, "artifacts", "tunnel");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "expo-go.png"), qrPng(expoUrl));
  writeFileSync(join(directory, "connection.json"), JSON.stringify({ url, expoUrl, startedAt: new Date().toISOString() }, null, 2));
  console.log("\nEscanea este QR con Expo Go (Android) o la camara (iOS):");
  printQr(expoUrl);
  console.log("\n" + expoUrl + "\nMantén esta terminal abierta. Ctrl+C cierra Metro y ngrok.");
}
main().catch(error => { console.error(redact(error.message, token)); void stop(1); });
