/**
 * Guia Betesda API.
 *
 * Deploy as a Web App and keep API_SECRET in Script Properties.
 * The spreadsheet and Drive folder IDs are identifiers, not credentials.
 * This file never creates, clears, or recreates sheets.
 *
 * Supported actions:
 * health, listCategories, listBusinesses, adminListBusinesses, getBusiness,
 * checkWhatsapp, createBusiness, updateBusiness, setStatus, deleteBusiness,
 * getAdmin, resetAdminLoginAttempts, uploadPhoto, deletePhoto.
 *
 * Requests are POST JSON: { secret, action, data }.
 * Responses are always { ok: true, data } or { ok: false, error }.
 */
const CONFIG = Object.freeze({
  spreadsheetId: "1rbHmswEnk4nm4YVr8Kq6ghH5axoxMlJ3PHbuErkJW_8",
  imageFolderId: "1Zan7dug94EUZ2y7F7UB801v3x_RPF_Gn",
  secretProperty: "API_SECRET",
  loginWindowMs: 15 * 60 * 1000,
  loginMaxAttempts: 5,
  imageMaxBytes: 5 * 1024 * 1024,
});

const REQUIRED_HEADERS = Object.freeze({
  categorias: ["id", "nome", "slug", "icone", "ordem"],
  empresas: [
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
    "tipo_imagem",
  ],
  administradores: ["usuario", "senha_hash", "senha_salt"],
});

function doPost(event) {
  var action = "unknown";
  try {
    const request = JSON.parse(event.postData.contents);
    action = typeof request.action === "string" ? request.action : "unknown";
    if (!isValidSecret_(request.secret)) {
      return jsonResponse_({ ok: false, error: "Não autorizado." });
    }

    const data = request.data && typeof request.data === "object" ? request.data : {};
    const result = dispatch_(request.action, data);
    return jsonResponse_({ ok: true, data: result });
  } catch (error) {
    const message = error && error.message ? error.message : "Falha inesperada.";
    logAppsScriptError_("Apps Script action failed (" + action + ")", error);
    return jsonResponse_({ ok: false, error: message });
  }
}

function logAppsScriptError_(context, error) {
  const message = error && error.message ? String(error.message) : String(error);
  const stack = error && error.stack ? String(error.stack) : "";
  var logMessage = message + (stack ? "\nStack: " + stack : "");
  const apiSecret = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.secretProperty);
  if (apiSecret) logMessage = logMessage.split(apiSecret).join("[REDACTED]");
  logMessage = logMessage
    .replace(/("(?:secret|token|password|senha|base64)"\s*:\s*")[^"]*"/gi, '$1[REDACTED]"')
    .replace(/[A-Za-z0-9+/=_-]{120,}/g, "[REDACTED]");
  Logger.log(context + ": " + logMessage);
}

function dispatch_(action, data) {
  switch (action) {
    case "health":
      return { status: "ok" };
    case "listCategories":
      return listCategories_();
    case "listBusinesses":
      return listBusinesses_().filter(function (business) {
        return business.status === "aprovado";
      });
    case "adminListBusinesses":
      return listBusinesses_();
    case "getBusiness":
      return getBusiness_(data.id);
    case "checkWhatsapp":
      return checkWhatsapp_(data.whatsapp);
    case "createBusiness":
      return createBusiness_(data);
    case "updateBusiness":
      return updateBusiness_(data.id, data.business || data, data.photo);
    case "setStatus":
      return setStatus_(data.id, data.status);
    case "deleteBusiness":
      return deleteBusiness_(data.id);
    case "getAdmin":
      return getAdmin_(data.usuario);
    case "resetAdminLoginAttempts":
      return resetAdminLoginAttempts_(data.usuario);
    case "uploadPhoto":
      return uploadPhoto_(data);
    case "deletePhoto":
      return deletePhoto_(data.fileId);
    default:
      throw new Error("Ação não reconhecida.");
  }
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function isValidSecret_(provided) {
  const expected = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.secretProperty);
  if (!expected || typeof provided !== "string" || provided.length !== expected.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  return mismatch === 0;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.spreadsheetId);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error("A aba necessária não foi encontrada: " + name);
  const width = sheet.getLastColumn();
  if (!width) throw new Error("A aba não possui cabeçalhos: " + name);
  const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0]
    .map(function (header) { return String(header).trim(); });
  const required = REQUIRED_HEADERS[name] || [];
  required.forEach(function (header) {
    if (headers.indexOf(header) === -1) {
      throw new Error("Cabeçalho obrigatório ausente em " + name + ": " + header);
    }
  });
  return { sheet: sheet, headers: headers };
}

function rowObject_(headers, row) {
  const result = {};
  headers.forEach(function (header, index) {
    result[header] = row[index];
  });
  return result;
}

function allRows_(name) {
  const table = getSheet_(name);
  const lastRow = table.sheet.getLastRow();
  const rows = lastRow < 2
    ? []
    : table.sheet.getRange(2, 1, lastRow - 1, table.headers.length).getValues();
  return {
    sheet: table.sheet,
    headers: table.headers,
    rows: rows,
    records: rows.map(function (row, index) {
      return { rowNumber: index + 2, values: row, record: rowObject_(table.headers, row) };
    }),
  };
}

function valueForCell_(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return "";
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function serializeDays_(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return "[]";
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch (ignored) {
      return JSON.stringify(text.replace(/[{}]/g, "").split(",")
        .map(function (part) { return Number(part.trim()); })
        .filter(function (day) { return Number.isInteger(day) && day >= 0 && day <= 6; }));
    }
  }
  return "[]";
}

function parseDays_(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (ignored) {
    return value.replace(/[{}]/g, "").split(",")
      .map(function (part) { return Number(part.trim()); })
      .filter(function (day) { return Number.isInteger(day); });
  }
  return [];
}

function isoDate_(value) {
  if (value instanceof Date) return value.toISOString();
  return value ? String(value) : "";
}

function formatTime_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
  }
  if (typeof value === "number" && isFinite(value) && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60) % (24 * 60);
    return ("0" + Math.floor(totalMinutes / 60)).slice(-2) + ":" +
      ("0" + (totalMinutes % 60)).slice(-2);
  }
  if (typeof value !== "string") return "";

  const text = value.trim();
  const timeOnly = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(text);
  if (timeOnly) {
    const hours = Number(timeOnly[1]);
    return hours <= 23
      ? ("0" + hours).slice(-2) + ":" + timeOnly[2]
      : "";
  }

  const dateTextTime = /\b(\d{1,2}):([0-5]\d):[0-5]\d(?:\.\d+)?\b/.exec(text);
  if (dateTextTime && !/^\d{4}-\d\d-\d\dT/.test(text)) {
    const hours = Number(dateTextTime[1]);
    if (hours <= 23) return ("0" + hours).slice(-2) + ":" + dateTextTime[2];
  }

  const parsedDate = new Date(text);
  if (!isNaN(parsedDate.getTime())) {
    return Utilities.formatDate(
      parsedDate,
      Session.getScriptTimeZone(),
      "HH:mm",
    );
  }
  return "";
}

function categoryMap_() {
  const categories = allRows_("categorias").records;
  const map = {};
  categories.forEach(function (item) {
    const category = item.record;
    map[String(category.id)] = { id: String(category.id), nome: String(category.nome || "") };
  });
  return map;
}

function businessFromRecord_(record, categories) {
  const category = categories[String(record.categoria_id)] || null;
  return {
    id: String(record.id || ""),
    nome: String(record.nome || ""),
    categoria_id: String(record.categoria_id || ""),
    descricao: String(record.descricao || ""),
    whatsapp: String(record.whatsapp || ""),
    endereco: String(record.endereco || ""),
    bairro: String(record.bairro || ""),
    instagram: String(record.instagram || ""),
    site: String(record.site || ""),
    foto_url: String(record.foto_url || ""),
    tipo_imagem: String(record.tipo_imagem || "foto") === "logo"
      ? "logo_escuro"
      : String(record.tipo_imagem || "foto"),
    responsavel: String(record.responsavel || ""),
    status: String(record.status || "pendente"),
    dias_funcionamento: parseDays_(record.dias_funcionamento),
    horario_abertura: formatTime_(record.horario_abertura),
    horario_fechamento: formatTime_(record.horario_fechamento),
    created_at: isoDate_(record.created_at),
    foto_drive_file_id: String(record.foto_drive_file_id || ""),
    categorias: category ? { nome: category.nome } : null,
  };
}

function listCategories_() {
  return allRows_("categorias").records.map(function (item) {
    const record = item.record;
    return {
      id: String(record.id || ""),
      nome: String(record.nome || ""),
      slug: String(record.slug || ""),
      icone: String(record.icone || ""),
      ordem: Number(record.ordem || 0),
    };
  }).sort(function (left, right) {
    return left.nome.localeCompare(right.nome, "pt-BR");
  });
}

function listBusinesses_() {
  const categories = categoryMap_();
  return allRows_("empresas").records.map(function (item) {
    return businessFromRecord_(item.record, categories);
  }).sort(function (left, right) {
    return right.created_at.localeCompare(left.created_at);
  });
}

function findBusiness_(id) {
  if (typeof id !== "string" || !id.trim()) throw new Error("ID da empresa inválido.");
  const table = allRows_("empresas");
  const found = table.records.find(function (item) {
    return String(item.record.id) === id;
  }) || null;
  if (!found) return null;
  return {
    sheet: table.sheet,
    headers: table.headers,
    rowNumber: found.rowNumber,
    values: found.values,
    record: found.record,
  };
}

function getBusiness_(id) {
  const found = findBusiness_(String(id || ""));
  return found ? businessFromRecord_(found.record, categoryMap_()) : null;
}

function normalizeWhatsapp_(value) {
  return String(value || "").replace(/\D/g, "");
}

function checkWhatsapp_(whatsapp, excludedId) {
  const normalized = normalizeWhatsapp_(whatsapp);
  if (normalized.length < 8 || normalized.length > 15) {
    throw new Error("WhatsApp inválido.");
  }
  const exists = allRows_("empresas").records.some(function (item) {
    return String(item.record.id) !== String(excludedId || "") &&
      normalizeWhatsapp_(item.record.whatsapp) === normalized;
  });
  return { exists: exists };
}

function validateBusiness_(input, isUpdate) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Dados da empresa inválidos.");
  }
  const text = function (key, maxLength) {
    const value = input[key] === null || input[key] === undefined ? "" : input[key];
    if (typeof value !== "string" || value.length > maxLength) {
      throw new Error("Campo inválido: " + key);
    }
    return value.trim();
  };
  const business = {
    nome: text("nome", 160),
    categoria_id: text("categoria_id", 160),
    descricao: text("descricao", 5000),
    whatsapp: text("whatsapp", 32),
    endereco: text("endereco", 500),
    bairro: text("bairro", 200),
    instagram: text("instagram", 500),
    site: text("site", 500),
    responsavel: text("responsavel", 160),
    horario_abertura: text("horario_abertura", 8),
    horario_fechamento: text("horario_fechamento", 8),
    dias_funcionamento: parseDays_(input.dias_funcionamento),
    status: isUpdate ? text("status", 16) : "pendente",
    foto_url: text("foto_url", 1000),
    foto_drive_file_id: text("foto_drive_file_id", 200),
    tipo_imagem: (function () {
      const value = text("tipo_imagem", 16) || "foto";
      return value === "logo" ? "logo_escuro" : value;
    })(),
  };
  if (["foto", "logo_escuro", "logo_claro"].indexOf(business.tipo_imagem) === -1) {
    throw new Error("Tipo de imagem inválido.");
  }
  if (!business.nome || !business.categoria_id || !business.whatsapp || !business.responsavel) {
    throw new Error("Nome, categoria, WhatsApp e responsável são obrigatórios.");
  }
  if (normalizeWhatsapp_(business.whatsapp).length < 8 ||
      normalizeWhatsapp_(business.whatsapp).length > 15) {
    throw new Error("WhatsApp inválido.");
  }
  if (business.dias_funcionamento.length > 7 ||
      business.dias_funcionamento.some(function (day) {
        return !Number.isInteger(day) || day < 0 || day > 6;
      })) {
    throw new Error("Dias de funcionamento inválidos.");
  }
  [business.horario_abertura, business.horario_fechamento].forEach(function (time) {
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error("Horário inválido; use HH:mm.");
    }
  });
  if (isUpdate && ["pendente", "aprovado", "rejeitado"].indexOf(business.status) === -1) {
    throw new Error("Status inválido.");
  }
  if (!categoryMap_()[business.categoria_id]) throw new Error("Categoria não encontrada.");
  return business;
}

function businessRow_(headers, business, id, createdAt) {
  const values = {
    id: id,
    nome: business.nome,
    categoria_id: business.categoria_id,
    descricao: business.descricao,
    whatsapp: business.whatsapp,
    endereco: business.endereco,
    bairro: business.bairro,
    instagram: business.instagram,
    site: business.site,
    foto_url: business.foto_url,
    responsavel: business.responsavel,
    status: business.status,
    dias_funcionamento: serializeDays_(business.dias_funcionamento),
    horario_abertura: business.horario_abertura,
    horario_fechamento: business.horario_fechamento,
    created_at: createdAt,
    foto_drive_file_id: business.foto_drive_file_id,
    tipo_imagem: business.tipo_imagem,
  };
  return headers.map(function (header) { return valueForCell_(values[header] || ""); });
}

function createBusiness_(request) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const input = request.business || request;
    const business = validateBusiness_(input, false);
    if (checkWhatsapp_(business.whatsapp).exists) {
      throw new Error("WHATSAPP_ALREADY_EXISTS");
    }
    const categories = categoryMap_();
    const table = getSheet_("empresas");
    const id = Utilities.getUuid();
    const createdAt = new Date().toISOString();
    let uploadedPhoto = null;
    try {
      if (request.photo) {
        uploadedPhoto = uploadPhoto_(request.photo);
        business.foto_url = uploadedPhoto.foto_url;
        business.foto_drive_file_id = uploadedPhoto.fileId;
      }
      const result = businessFromRecord_(
        Object.assign({ id: id, created_at: createdAt }, business),
        categories,
      );
      table.sheet.appendRow(businessRow_(table.headers, business, id, createdAt));
      return result;
    } catch (error) {
      if (uploadedPhoto) {
        try { trashImage_(uploadedPhoto.fileId); } catch (ignored) {}
      }
      throw error;
    }
  } finally {
    lock.releaseLock();
  }
}

function updateBusiness_(id, input, photoData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const found = findBusiness_(String(id || ""));
    if (!found) throw new Error("Empresa não encontrada.");
    const business = validateBusiness_(input, true);
    if (checkWhatsapp_(business.whatsapp, String(id)).exists) {
      throw new Error("WHATSAPP_ALREADY_EXISTS");
    }

    const oldFileId = String(found.record.foto_drive_file_id || "");
    const newFileId = business.foto_drive_file_id || oldFileId;
    if (!business.foto_url && !business.foto_drive_file_id) {
      business.foto_url = String(found.record.foto_url || "");
      business.foto_drive_file_id = oldFileId;
    }
    const categories = categoryMap_();
    let uploadedPhoto = null;
    let rowUpdated = false;
    try {
      if (photoData) {
        uploadedPhoto = uploadPhoto_(photoData);
        business.foto_url = uploadedPhoto.foto_url;
        business.foto_drive_file_id = uploadedPhoto.fileId;
      }
      const nextRow = businessRow_(
        found.headers,
        business,
        String(id),
        isoDate_(found.record.created_at),
      );
      const result = businessFromRecord_(
        Object.assign(
          { id: String(id), created_at: isoDate_(found.record.created_at) },
          business,
        ),
        categories,
      );
      found.sheet.getRange(found.rowNumber, 1, 1, found.headers.length).setValues([nextRow]);
      rowUpdated = true;

      const finalFileId = business.foto_drive_file_id || oldFileId;
      if (oldFileId && finalFileId && oldFileId !== finalFileId) {
        trashImage_(oldFileId);
      }
      return result;
    } catch (error) {
      logAppsScriptError_("updateBusiness_ original error", error);
      if (rowUpdated) {
        found.sheet.getRange(found.rowNumber, 1, 1, found.headers.length)
          .setValues([found.values]);
      }
      if (uploadedPhoto) {
        try { trashImage_(uploadedPhoto.fileId); } catch (ignored) {}
      }
      if (error && error.message === "WHATSAPP_ALREADY_EXISTS") {
        throw error;
      }
      throw new Error("Não foi possível atualizar a empresa e sua foto; os dados anteriores foram preservados.");
    }
  } finally {
    lock.releaseLock();
  }
}

function setStatus_(id, status) {
  if (["aprovado", "rejeitado"].indexOf(status) === -1) {
    throw new Error("Status inválido.");
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const found = findBusiness_(String(id || ""));
    if (!found) throw new Error("Empresa não encontrada.");
    const statusColumn = found.headers.indexOf("status") + 1;
    found.sheet.getRange(found.rowNumber, statusColumn).setValue(status);
    return { id: String(id), status: status };
  } finally {
    lock.releaseLock();
  }
}

function deleteBusiness_(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const found = findBusiness_(String(id || ""));
    if (!found) throw new Error("Empresa não encontrada.");
    const fileId = String(found.record.foto_drive_file_id || "");
    if (fileId) trashImage_(fileId);
    try {
      found.sheet.deleteRow(found.rowNumber);
    } catch (error) {
      if (fileId) {
        try { DriveApp.getFileById(fileId).setTrashed(false); } catch (ignored) {}
      }
      throw new Error("Não foi possível excluir a empresa; a foto foi preservada.");
    }
    return { id: String(id), deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function loginAttemptKey_(username) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(username || "").toLowerCase(),
    Utilities.Charset.UTF_8,
  );
  return "LOGIN_" + digest.map(function (byte) {
    return ("0" + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join("");
}

function getAdmin_(username) {
  const normalized = String(username || "").trim().toLowerCase();
  if (!normalized || normalized.length > 254) throw new Error("Credenciais inválidas.");

  const properties = PropertiesService.getScriptProperties();
  const key = loginAttemptKey_(normalized);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now = Date.now();
    const previous = JSON.parse(properties.getProperty(key) || "{}");
    const record = previous.startedAt && now - previous.startedAt < CONFIG.loginWindowMs
      ? previous
      : { startedAt: now, count: 0 };
    if (record.count >= CONFIG.loginMaxAttempts) {
      throw new Error("LOGIN_RATE_LIMITED");
    }
    record.count += 1;
    properties.setProperty(key, JSON.stringify(record));
  } finally {
    lock.releaseLock();
  }

  const admins = allRows_("administradores").records;
  const match = admins.find(function (item) {
    return String(item.record.usuario || "").trim().toLowerCase() === normalized;
  });
  if (!match) return null;
  return {
    usuario: normalized,
    senha_hash: String(match.record.senha_hash || ""),
    senha_salt: String(match.record.senha_salt || ""),
  };
}

function resetAdminLoginAttempts_(username) {
  const normalized = String(username || "").trim().toLowerCase();
  if (!normalized || normalized.length > 254) throw new Error("Usuário inválido.");
  PropertiesService.getScriptProperties().deleteProperty(loginAttemptKey_(normalized));
  return { reset: true };
}

function imageMimeFromBytes_(bytes) {
  const u = function (index) { return (bytes[index] + 256) % 256; };
  if (bytes.length >= 3 && u(0) === 0xff && u(1) === 0xd8 && u(2) === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
        .every(function (byte, index) { return u(index) === byte; })) {
    return "image/png";
  }
  if (bytes.length >= 12 &&
      u(0) === 0x52 && u(1) === 0x49 && u(2) === 0x46 && u(3) === 0x46 &&
      u(8) === 0x57 && u(9) === 0x45 && u(10) === 0x42 && u(11) === 0x50) {
    return "image/webp";
  }
  return "";
}

function uploadPhoto_(data) {
  if (typeof data.base64 !== "string" || data.base64.length > Math.ceil(CONFIG.imageMaxBytes * 4 / 3) + 8) {
    throw new Error("Imagem inválida ou maior que 5 MB.");
  }
  const bytes = Utilities.base64Decode(data.base64);
  if (!bytes.length || bytes.length > CONFIG.imageMaxBytes) {
    throw new Error("Imagem inválida ou maior que 5 MB.");
  }
  const mimeType = imageMimeFromBytes_(bytes);
  if (!mimeType || mimeType !== data.mimeType) {
    throw new Error("Envie uma imagem JPEG, PNG ou WebP válida.");
  }

  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mimeType];
  const fileName = "betesda-" + Utilities.getUuid() + "." + extension;
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = DriveApp.getFolderById(CONFIG.imageFolderId);
  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    file.setTrashed(true);
    throw new Error("Não foi possível habilitar a visualização pública da imagem.");
  }
  return {
    fileId: file.getId(),
    foto_url: "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(file.getId()),
  };
}

function trashImage_(fileId) {
  if (typeof fileId !== "string" || !fileId.trim()) throw new Error("ID de imagem inválido.");
  const file = DriveApp.getFileById(fileId);
  const parents = file.getParents();
  let belongsToConfiguredFolder = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === CONFIG.imageFolderId) {
      belongsToConfiguredFolder = true;
      break;
    }
  }
  if (!belongsToConfiguredFolder) throw new Error("A imagem não pertence à pasta configurada.");
  file.setTrashed(true);
}

function deletePhoto_(fileId) {
  trashImage_(String(fileId || ""));
  return { fileId: String(fileId), deleted: true };
}
