import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBusinessInput, validateImageBytes } from "../src/lib/server/validation.ts";
import {
  isValidAdminPassword,
  normalizeAdminUsername,
  verifyAdminPassword,
} from "../src/lib/server/admin-password.ts";
import { createAdminSession, verifyAdminSession } from "../src/lib/server/admin-session.ts";
import { toPublicBusiness } from "../src/lib/server/business-view.ts";
import {
  formatBusinessDays,
  formatBusinessSchedule,
  normalizeBusinessDays,
  normalizeBusinessTime,
} from "../src/lib/business-hours.ts";
import { getInstagramProfileUrl } from "../src/lib/instagram.ts";
import { getBrowserImageUrl } from "../src/lib/drive-image.ts";
import { scrypt as scryptCallback, randomBytes } from "node:crypto";

const validBusiness = {
  nome: "Oficina Betesda",
  categoria_id: "cat-1",
  descricao: "",
  whatsapp: "21999999999",
  endereco: "",
  bairro: "",
  instagram: "",
  site: "",
  dias_funcionamento: [1, 3, 1],
  horario_abertura: "09:00",
  horario_fechamento: "18:00",
  responsavel: "Pessoa Responsável",
};

test("normaliza campos e dias de funcionamento", () => {
  const result = normalizeBusinessInput(validBusiness);
  assert.deepEqual(result.dias_funcionamento, [1, 3]);
  assert.equal(result.nome, "Oficina Betesda");
  assert.equal(result.tipo_imagem, "foto");
  assert.equal(
    normalizeBusinessInput({ ...validBusiness, tipo_imagem: "logo" }).tipo_imagem,
    "logo_escuro",
  );
  assert.equal(
    normalizeBusinessInput({ ...validBusiness, tipo_imagem: "logo_claro" }).tipo_imagem,
    "logo_claro",
  );
});

test("rejeita campos obrigatórios ausentes e horário inválido", () => {
  assert.throws(
    () => normalizeBusinessInput({ ...validBusiness, categoria_id: "" }),
    /Preencha/,
  );
  assert.throws(
    () => normalizeBusinessInput({ ...validBusiness, horario_abertura: "25:00" }),
    /horários/,
  );
  assert.throws(
    () => normalizeBusinessInput({ ...validBusiness, tipo_imagem: "banner" }),
    /tipo de imagem/i,
  );
});

test("aceita imagem PNG com assinatura correspondente", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(validateImageBytes("image/png", png), "image/png");
});

test("rejeita MIME falsificado e arquivo acima do limite", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
  assert.throws(() => validateImageBytes("image/png", jpeg), /JPEG, PNG ou WebP/);
  assert.throws(
    () => validateImageBytes("image/jpeg", new Uint8Array(5 * 1024 * 1024 + 1)),
    /5 MB/,
  );
});

test("valida somente hashes administrativos no formato definido", async () => {
  const salt = randomBytes(16);
  const derived = await new Promise((resolve, reject) => {
    scryptCallback(
      "SenhaDeTesteSegura123!",
      salt,
      32,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
  const hash = `scrypt$16384$8$1$${Buffer.from(derived).toString("hex")}`;
  assert.equal(
    await verifyAdminPassword("SenhaDeTesteSegura123!", hash, salt.toString("hex")),
    true,
  );
  assert.equal(await verifyAdminPassword("senha errada", hash, salt.toString("hex")), false);
  assert.equal(await verifyAdminPassword("senha", "legacy-format", "salt"), false);
});

test("normaliza usuário e exige senha com pelo menos 6 caracteres", () => {
  assert.equal(normalizeAdminUsername("  Administrador  "), "administrador");
  assert.equal(normalizeAdminUsername("   "), null);
  assert.equal(isValidAdminPassword("12345"), false);
  assert.equal(isValidAdminPassword("123456"), true);
  assert.equal(isValidAdminPassword("x".repeat(1025)), false);
});

test("assina sessão administrativa, expira e rejeita alteração", () => {
  process.env.ADMIN_SESSION_SECRET = "test-session-secret-0123456789-abcdefgh";
  const token = createAdminSession("administrador");
  assert.equal(verifyAdminSession(token)?.sub, "administrador");
  assert.equal(verifyAdminSession(`${token}x`), null);
});

test("resposta pública omite campos administrativos", () => {
  const result = toPublicBusiness({
    id: "business-1",
    nome: "Negócio",
    status: "aprovado",
    responsavel: "Privado",
    foto_drive_file_id: "drive-id",
    tipo_imagem: "logo",
    categorias: { nome: "Serviços", id: "private-category-id" },
  });
  assert.equal(result.nome, "Negócio");
  assert.deepEqual(result.categorias, { nome: "Serviços" });
  assert.equal("responsavel" in result, false);
  assert.equal("foto_drive_file_id" in result, false);
  assert.equal(result.tipo_imagem, "logo");
});

test("normaliza horários de célula em formatos string, Date e fração de dia", () => {
  assert.equal(normalizeBusinessTime("06:00:00"), "06:00");
  assert.equal(
    normalizeBusinessTime("Sat Dec 30 1899 06:00:00 GMT-0306 (Brasilia Standard Time)"),
    "06:00",
  );
  assert.equal(normalizeBusinessTime(new Date("2026-03-16T09:00:00.000Z")), "06:00");
  assert.equal(normalizeBusinessTime(0.25), "06:00");
  assert.equal(normalizeBusinessTime("25:00"), "");
});

test("normaliza e agrupa dias de funcionamento para exibição", () => {
  assert.deepEqual(normalizeBusinessDays("[1,2,3,4,5,5,9]"), [1, 2, 3, 4, 5]);
  assert.equal(formatBusinessDays([1, 2, 3, 4, 5]), "Segunda a sexta");
  assert.equal(formatBusinessDays("[0,1,2,3,4,5,6]"), "Todos os dias");
  assert.equal(formatBusinessSchedule([1, 2, 3, 4, 5], "08:00:00", "18:00"), "Segunda a sexta · 08:00 às 18:00");
  assert.equal(
    formatBusinessSchedule([0, 1, 2, 3, 4, 5, 6], "06:00:00", "22:00:00"),
    "Todos os dias · 06:00 às 22:00",
  );
});

test("gera links válidos para usuário Instagram com e sem arroba", () => {
  assert.equal(
    getInstagramProfileUrl("@betesda.negocios"),
    "https://www.instagram.com/betesda.negocios/",
  );
  assert.equal(
    getInstagramProfileUrl("betesda_negocios"),
    "https://www.instagram.com/betesda_negocios/",
  );
});

test("preserva perfil, barra final e parâmetros em URLs do Instagram", () => {
  assert.equal(
    getInstagramProfileUrl("https://www.instagram.com/loja.betesda/"),
    "https://www.instagram.com/loja.betesda/",
  );
  assert.equal(
    getInstagramProfileUrl("http://instagram.com/@loja.betesda?igsh=abc"),
    "https://www.instagram.com/loja.betesda/?igsh=abc",
  );
  assert.equal(
    getInstagramProfileUrl("www.instagram.com/loja.betesda?igsh=abc"),
    "https://www.instagram.com/loja.betesda/?igsh=abc",
  );
});

test("não cria links para identificadores Instagram vazios ou inválidos", () => {
  assert.equal(getInstagramProfileUrl(""), null);
  assert.equal(getInstagramProfileUrl("https://example.com/usuario"), null);
  assert.equal(getInstagramProfileUrl("https://www.instagram.com/"), null);
  assert.equal(getInstagramProfileUrl("@nome com espaço"), null);
});

test("converte URLs de visualização do Drive para thumbnail direto e preserva outros hosts", () => {
  assert.equal(
    getBrowserImageUrl("https://drive.google.com/uc?export=view&id=drive-file-123"),
    "https://drive.google.com/thumbnail?id=drive-file-123&sz=w2000",
  );
  assert.equal(
    getBrowserImageUrl("https://drive.google.com/file/d/drive-file-456/view"),
    "https://drive.google.com/thumbnail?id=drive-file-456&sz=w2000",
  );
  assert.equal(
    getBrowserImageUrl("https://lh3.googleusercontent.com/d/image-token"),
    "https://lh3.googleusercontent.com/d/image-token",
  );
  assert.equal(
    getBrowserImageUrl("https://images.example.com/business.png"),
    "https://images.example.com/business.png",
  );
});
