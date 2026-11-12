import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("PWA manifest configures the Guia Betesda standalone app", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("public/site.webmanifest", root), "utf8"),
  );
  assert.equal(manifest.name, "Guia Betesda");
  assert.equal(manifest.short_name, "Guia Betesda");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.deepEqual(
    manifest.icons.map(({ src, sizes, purpose }) => ({ src, sizes, purpose })),
    [
      { src: "/pwa-icon-192.png", sizes: "192x192", purpose: "any" },
      { src: "/pwa-icon-512.png", sizes: "512x512", purpose: "any" },
    ],
  );
});

test("PWA icons and Apple touch icon are derived assets in public", async () => {
  const iconFiles = [
    ["public/pwa-icon-192.png", 192],
    ["public/pwa-icon-512.png", 512],
    ["public/apple-touch-icon.png", 180],
    ["public/favicon.png", 48],
  ];
  for (const [file, size] of iconFiles) {
    const bytes = await readFile(new URL(file, root));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
  await readFile(new URL("public/favicon.ico", root));
  await readFile(new URL("public/Logo_B.png", root));
});
