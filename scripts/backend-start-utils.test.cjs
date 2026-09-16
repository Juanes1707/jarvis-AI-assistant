const { after, before, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { inspectBackend } = require("./backend-start-utils.cjs");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

describe("backend start preflight", () => {
  let healthy;
  let foreign;
  let healthyPort;
  let foreignPort;

  before(async () => {
    healthy = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
    });
    foreign = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("another service");
    });
    healthyPort = await listen(healthy);
    foreignPort = await listen(foreign);
  });

  after(async () => {
    await Promise.all([close(healthy), close(foreign)]);
  });

  test("recognises an already-running JARVIS backend", async () => {
    assert.deepEqual(await inspectBackend("127.0.0.1", healthyPort), { state: "healthy" });
  });

  test("does not mistake another HTTP service for JARVIS", async () => {
    assert.deepEqual(await inspectBackend("127.0.0.1", foreignPort), { state: "occupied" });
  });

  test("allows startup when the port is free", async () => {
    const temporary = http.createServer();
    const freePort = await listen(temporary);
    await close(temporary);
    assert.deepEqual(await inspectBackend("127.0.0.1", freePort), { state: "free" });
  });
});
