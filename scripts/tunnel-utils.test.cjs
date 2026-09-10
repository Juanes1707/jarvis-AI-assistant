const { test } = require("node:test");
const assert = require("node:assert/strict");
const { inflateSync, crc32 } = require("node:zlib");
const { expoGoUrl, metroEnvironment, redact, qrPng } = require("./tunnel-utils.cjs");
test("el enlace de Expo Go usa TLS y rechaza origenes ambiguos", () => {
  assert.equal(expoGoUrl("https://example.ngrok-free.app"), "exps://example.ngrok-free.app");
  for (const invalid of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?token=a"]) assert.throws(() => expoGoUrl(invalid));
});
test("el authtoken no se hereda por Metro ni se imprime en errores", () => {
  const env = metroEnvironment({ NGROK_AUTHTOKEN: "test-secret", NGROK_API_KEY: "api-secret", PATH: "ok" }, "https://example.ngrok-free.app");
  assert.equal(env.NGROK_AUTHTOKEN, undefined); assert.equal(env.NGROK_API_KEY, undefined); assert.equal(env.PATH, "ok");
  assert.equal(redact("token test-secret rechazado", "test-secret"), "token [token oculto] rechazado");
});
test("el QR se guarda como PNG valido con borde blanco y checksums correctos", () => {
  const png = qrPng("exps://example.ngrok-free.app");
  assert.deepEqual([...png.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
  let offset = 8, raw, width;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset), type = png.toString("ascii", offset + 4, offset + 8), data = png.subarray(offset + 8, offset + 8 + length);
    assert.equal(png.readUInt32BE(offset + 8 + length), crc32(png.subarray(offset + 4, offset + 8 + length)));
    if (type === "IHDR") width = data.readUInt32BE(0);
    if (type === "IDAT") raw = inflateSync(data);
    offset += length + 12;
  }
  assert.equal(raw.length, width * (width + 1));
  assert.equal(raw[1], 255);
});
