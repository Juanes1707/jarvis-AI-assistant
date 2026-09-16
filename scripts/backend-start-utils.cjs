const net = require("node:net");

function connectionHost(host) {
  if (host === "0.0.0.0") return "127.0.0.1";
  if (host === "::" || host === "[::]") return "::1";
  return host;
}

function urlHost(host) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

function portIsOpen(host, port, timeoutMs) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function inspectBackend(host, port, timeoutMs = 1500) {
  const targetHost = connectionHost(host);
  const healthUrl = `http://${urlHost(targetHost)}:${port}/health`;
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    if (response.ok) {
      try {
        if (JSON.parse(body)?.status === "ok") return { state: "healthy" };
      } catch {
        // A listener that is not JARVIS still owns the port.
      }
    }
    return { state: "occupied" };
  } catch {
    return { state: await portIsOpen(targetHost, port, timeoutMs) ? "occupied" : "free" };
  }
}

module.exports = { inspectBackend };
