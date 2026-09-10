const { toQR } = require("toqr");
const { deflateSync, crc32 } = require("node:zlib");
function expoGoUrl(httpsUrl) {
  const parsed = new URL(httpsUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("ngrok no devolvio un origen HTTPS valido.");
  }
  return "exps://" + parsed.host;
}
function metroEnvironment(environment, url) {
  expoGoUrl(url);
  const clean = { ...environment, EXPO_PACKAGER_PROXY_URL: url };
  delete clean.NGROK_AUTHTOKEN;
  delete clean.NGROK_API_KEY;
  delete clean.NGROK_DOMAIN;
  return clean;
}
function redact(message, token) { return token ? String(message).split(token).join("[token oculto]") : String(message); }
function qrPng(url) {
  const matrix = toQR(url), side = Math.sqrt(matrix.length), scale = 8, margin = 4;
  const width = (side + margin * 2) * scale;
  const raw = Buffer.alloc((width + 1) * width, 255);
  for (let y = 0; y < width; y++) {
    raw[y * (width + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const mx = Math.floor(x / scale) - margin, my = Math.floor(y / scale) - margin;
      if (mx >= 0 && mx < side && my >= 0 && my < side && matrix[my * side + mx]) raw[y * (width + 1) + x + 1] = 0;
    }
  }
  function chunk(type, data) {
    const name = Buffer.from(type), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, checksum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(width, 4); header[8] = 8;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function printQr(url) {
  const data = toQR(url), side = Math.sqrt(data.length), margin = 4;
  const black = (x, y) => x >= 0 && y >= 0 && x < side && y < side && data[y * side + x];
  for (let y = -margin; y < side + margin; y += 2) {
    let line = "";
    for (let x = -margin; x < side + margin; x++) {
      const top = black(x, y), bottom = black(x, y + 1);
      line += top ? bottom ? " " : "▄" : bottom ? "▀" : "█";
    }
    console.log(line);
  }
}
module.exports = { expoGoUrl, metroEnvironment, redact, qrPng, printQr };
