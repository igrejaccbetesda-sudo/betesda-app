import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Execute este utilitário em um terminal interativo.");
  }

  return new Promise((resolve, reject) => {
    const value = [];
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    };
    const onData = (chunk) => {
      for (const byte of chunk) {
        if (byte === 3) {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Operação cancelada."));
          return;
        }
        if (byte === 13 || byte === 10) {
          cleanup();
          process.stdout.write("\n");
          resolve(Buffer.from(value).toString("utf8"));
          return;
        }
        if (byte === 8 || byte === 127) {
          value.pop();
          while (value.length && (value[value.length - 1] & 0xc0) === 0x80) {
            value.pop();
          }
        } else if (byte >= 32) {
          value.push(byte);
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

try {
  if (!stdin.isTTY) {
    throw new Error("Execute este utilitário em um terminal interativo.");
  }
  const prompt = createInterface({ input: stdin, output: stdout });
  let username;
  try {
    username = (await prompt.question("Nome de usuário do administrador: ")).trim();
  } finally {
    prompt.close();
  }
  if (!username || username.length > 254) {
    throw new Error("Informe um nome de usuário com até 254 caracteres.");
  }
  const password = await readHidden("Nova senha administrativa (mínimo 6 caracteres): ");
  if (password.length < 6 || password.length > 1024) {
    throw new Error("A senha deve ter entre 6 e 1024 caracteres.");
  }
  const salt = randomBytes(16);
  const derivedKey = await new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      32,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
  console.log(`Atualize somente a linha do administrador "${username}":`);
  console.log(`senha_hash=scrypt$16384$8$1$${Buffer.from(derivedKey).toString("hex")}`);
  console.log(`senha_salt=${salt.toString("hex")}`);
  console.log("Não salve estes valores em arquivos públicos nem os envie em mensagens.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha ao gerar a senha.");
  process.exitCode = 1;
}
