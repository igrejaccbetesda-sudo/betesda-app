import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../apps-script/Code.gs", import.meta.url), "utf8");

function createAppsScriptContext({ businessPhotoId = "" } = {}) {
  const businessHeaders = [
    "id",
    "nome",
    "categoria_id",
    "descricao",
    "whatsapp",
    "endereco",
    "bairro",
    "instagram",
    "site",
    "foto_url",
    "responsavel",
    "status",
    "dias_funcionamento",
    "horario_abertura",
    "horario_fechamento",
    "created_at",
    "foto_drive_file_id",
  ];
  const categoryHeaders = ["id", "nome", "slug", "icone", "ordem"];
  const businesses = [[
    "business-1",
    "Oficina",
    "category-1",
    "Descrição",
    "21999999999",
    "Rua Um",
    "Centro",
    "",
    "",
    businessPhotoId ? `https://drive.google.com/uc?id=${businessPhotoId}` : "",
    "Responsável",
    "pendente",
    "[1,3]",
    "09:00",
    "18:00",
    "2026-01-01T10:00:00.000Z",
    businessPhotoId,
  ]];
  const categories = [["category-1", "Serviços", "servicos", "", 1]];
  const trashedFiles = [];

  function makeSheet(headers, rows, isBusinessSheet = false) {
    return {
      getLastColumn: () => headers.length,
      getLastRow: () => rows.length + 1,
      getRange(row, column, rowCount = 1, columnCount = 1) {
        return {
          getDisplayValues: () => [headers.slice(column - 1, column - 1 + columnCount)],
          getValues: () => rows
            .slice(row - 2, row - 2 + rowCount)
            .map((values) => values.slice(column - 1, column - 1 + columnCount)),
          setValue(value) {
            rows[row - 2][column - 1] = value;
          },
          setValues(values) {
            values.forEach((value, index) => {
              rows[row - 2 + index] = value.slice();
            });
          },
        };
      },
      deleteRow(rowNumber) {
        rows.splice(rowNumber - 2, 1);
      },
      rows,
      headers,
      isBusinessSheet,
    };
  }

  const sheets = {
    empresas: makeSheet(businessHeaders, businesses, true),
    categorias: makeSheet(categoryHeaders, categories),
  };
  const context = {
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: (name) => sheets[name] || null }),
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
    },
    DriveApp: {
      getFileById(fileId) {
        return {
          getParents: () => {
            let consumed = false;
            return {
              hasNext: () => !consumed,
              next() {
                consumed = true;
                return { getId: () => "1Zan7dug94EUZ2y7F7UB801v3x_RPF_Gn" };
              },
            };
          },
          setTrashed(value) {
            trashedFiles.push({ fileId, value });
          },
        };
      },
    },
    Utilities: {
      formatDate(date, timezone) {
        return new Intl.DateTimeFormat("en-GB", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(date);
      },
    },
    Session: { getScriptTimeZone: () => "America/Sao_Paulo" },
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => "test-secret" }),
    },
    console,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, sheets, trashedFiles };
}

test("Apps Script normalizes Sheet Date and numeric time values", () => {
  const { context } = createAppsScriptContext();
  const sheetDate = vm.runInContext('new Date("2026-03-16T09:00:00.000Z")', context);
  assert.equal(context.formatTime_(sheetDate), "06:00");
  assert.equal(context.formatTime_(0.25), "06:00");
  assert.equal(context.formatTime_("06:00:00"), "06:00");
  assert.equal(
    context.formatTime_("Sat Dec 30 1899 06:00:00 GMT-0306 (Brasilia Standard Time)"),
    "06:00",
  );
});

test("setStatus finds sheet headers and changes the matching status cell", () => {
  const { context, sheets } = createAppsScriptContext();
  const result = context.setStatus_("business-1", "aprovado");

  assert.equal(result.status, "aprovado");
  assert.equal(sheets.empresas.rows[0][sheets.empresas.headers.indexOf("status")], "aprovado");
});

test("updateBusiness updates fields while preserving identity, creation date and existing photo", () => {
  const { context, sheets } = createAppsScriptContext({ businessPhotoId: "drive-photo-1" });
  const result = context.updateBusiness_("business-1", {
    nome: "Oficina Atualizada",
    categoria_id: "category-1",
    descricao: "Descrição alterada",
    whatsapp: "21999999999",
    endereco: "Rua Dois",
    bairro: "Bairro Novo",
    instagram: "",
    site: "",
    responsavel: "Nova Responsável",
    status: "aprovado",
    dias_funcionamento: [2, 4],
    horario_abertura: "10:00",
    horario_fechamento: "19:00",
  });

  const row = sheets.empresas.rows[0];
  const value = (header) => row[sheets.empresas.headers.indexOf(header)];
  assert.equal(result.nome, "Oficina Atualizada");
  assert.equal(value("id"), "business-1");
  assert.equal(value("nome"), "Oficina Atualizada");
  assert.equal(value("status"), "aprovado");
  assert.equal(value("endereco"), "Rua Dois");
  assert.equal(value("dias_funcionamento"), "[2,4]");
  assert.equal(value("created_at"), "2026-01-01T10:00:00.000Z");
  assert.equal(value("foto_drive_file_id"), "drive-photo-1");
});

test("deleteBusiness removes the business row and trashes its Drive photo", () => {
  const { context, sheets, trashedFiles } = createAppsScriptContext({
    businessPhotoId: "drive-photo-1",
  });
  const result = context.deleteBusiness_("business-1");

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    id: "business-1",
    deleted: true,
  });
  assert.equal(sheets.empresas.rows.length, 0);
  assert.deepEqual(trashedFiles, [{ fileId: "drive-photo-1", value: true }]);
});
