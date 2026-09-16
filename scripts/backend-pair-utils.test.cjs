const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { runPairing } = require("./backend-pair-utils.cjs");

describe("backend pairing", () => {
  it("copies the protected token and returns only the private tailnet URL", async () => {
    let copied = false;
    const output = await runPairing({
      readServeStatus: async () => [
        "https://msi.example.ts.net (tailnet only)",
        "|-- / proxy http://127.0.0.1:8787",
      ].join("\n"),
      copyProtectedToken: async () => { copied = true; },
    });

    assert.equal(copied, true);
    assert.match(output, /https:\/\/msi\.example\.ts\.net/);
    assert.match(output, /portapapeles/);
    assert.doesNotMatch(output, /token-value|Bearer|backend-api-token/);
  });

  it("refuses pairing when Tailscale Serve is not private and configured", async () => {
    await assert.rejects(
      runPairing({
        readServeStatus: async () => "No serve config",
        copyProtectedToken: async () => { throw new Error("must not copy"); },
      }),
      /backend:tailscale/,
    );
  });
});
