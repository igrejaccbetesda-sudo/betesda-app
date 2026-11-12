import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { callAppsScript } from "../src/lib/server/apps-script.ts";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("admin mutations use actions and payload fields supported by Code.gs", async () => {
  const [listRoute, statusRoute, businessRoute, dashboardPage, editorPage, appsScript] = await Promise.all([
    readSource("src/app/api/admin/businesses/route.ts"),
    readSource("src/app/api/admin/businesses/[id]/status/route.ts"),
    readSource("src/app/api/admin/businesses/[id]/route.ts"),
    readSource("src/app/admin/dashboard/page.tsx"),
    readSource("src/app/admin/dashboard/[id]/page.tsx"),
    readSource("apps-script/Code.gs"),
  ]);

  assert.match(listRoute, /callAppsScript<unknown\[\]>\("adminListBusinesses"\)/);
  assert.match(appsScript, /case "adminListBusinesses":[\s\S]*?listBusinesses_\(\)/);
  assert.match(dashboardPage, /method:\s*"PATCH"[\s\S]*?JSON\.stringify\(\{\s*status\s*\}\)/);
  assert.match(dashboardPage, /\/api\/admin\/businesses\/\$\{encodeURIComponent\(id\)\}\/status/);
  assert.match(statusRoute, /callAppsScript\("setStatus",\s*\{\s*id:\s*params\.id,\s*status:\s*body\.status/s);
  assert.match(businessRoute, /callAppsScript\("updateBusiness",\s*\{\s*id:\s*params\.id,\s*business,\s*photo:\s*photoPayload/s);
  assert.match(businessRoute, /callAppsScript\("deleteBusiness",\s*\{\s*id:\s*params\.id\s*\}\)/);
  assert.match(editorPage, /formData\.set\("business",\s*JSON\.stringify\(formulario\)\)/);
  assert.match(editorPage, /formData\.set\("foto",\s*novaFoto\)/);
  for (const action of ["setStatus", "updateBusiness", "deleteBusiness"]) {
    assert.match(appsScript, new RegExp(`case "${action}"`));
  }
  assert.match(appsScript, /case "setStatus":[\s\S]*?setStatus_\(data\.id,\s*data\.status\)/);
  assert.match(appsScript, /case "updateBusiness":[\s\S]*?updateBusiness_\(data\.id,\s*data\.business\s*\|\|\s*data,\s*data\.photo\)/);
  assert.match(appsScript, /case "deleteBusiness":[\s\S]*?deleteBusiness_\(data\.id\)/);
  assert.match(appsScript, /if \(photoData\) \{[\s\S]*?uploadedPhoto = uploadPhoto_\(photoData\)/);
  assert.match(appsScript, /business\.foto_url = uploadedPhoto\.foto_url;[\s\S]*?business\.foto_drive_file_id = uploadedPhoto\.fileId/);
  assert.match(appsScript, /if \(oldFileId && finalFileId && oldFileId !== finalFileId\) \{[\s\S]*?trashImage_\(oldFileId\)/);
  assert.match(appsScript, /if \(fileId\) trashImage_\(fileId\);[\s\S]*?found\.sheet\.deleteRow\(found\.rowNumber\)/);
});

test("Apps Script adapter sends the private envelope and returns successful data", async () => {
  process.env.APPS_SCRIPT_WEB_APP_URL = "https://apps-script.example.test/exec";
  process.env.APPS_SCRIPT_API_SECRET = "test-api-secret";
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ ok: true, data: { id: "business-1", status: "aprovado" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await callAppsScript("setStatus", {
      id: "business-1",
      status: "aprovado",
    });
    assert.deepEqual(result, { id: "business-1", status: "aprovado" });
    assert.deepEqual(sent, {
      secret: "test-api-secret",
      action: "setStatus",
      data: { id: "business-1", status: "aprovado" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Apps Script adapter logs backend errors without secrets or photo payload", async () => {
  process.env.APPS_SCRIPT_WEB_APP_URL = "https://apps-script.example.test/exec";
  process.env.APPS_SCRIPT_API_SECRET = "test-api-secret";
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const logs = [];
  const privatePhotoPayload = "A".repeat(160);
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ok: false,
        error: `Falha ao gravar ${privatePhotoPayload}; token=test-api-secret`,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  console.error = (...values) => logs.push(values.join(" "));

  try {
    await assert.rejects(
      callAppsScript("updateBusiness", { photo: { base64: privatePhotoPayload } }),
      /Falha ao gravar/,
    );
    const logText = logs.join(" ");
    assert.match(logText, /Falha ao gravar/);
    assert.doesNotMatch(logText, /test-api-secret/);
    assert.doesNotMatch(logText, new RegExp(privatePhotoPayload));
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});
